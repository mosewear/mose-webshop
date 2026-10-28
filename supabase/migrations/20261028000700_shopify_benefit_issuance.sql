-- Dormant one-shot issuance fence. No live grants, balance backfill or readiness changes.
-- The provider mutation is outside SQL. A lost response stays issuing forever
-- until operator reconciliation; expiring the code alone never refunds points.
create table public.shopify_benefit_issuance (
  attempt_id uuid primary key references public.shopify_loyalty_reservations(attempt_id),
  lease_token uuid not null,
  code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'issuing' check(status in ('issuing','issued')),
  provider_discount_id text unique check(provider_discount_id ~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$'),
  created_at timestamptz not null default now(),
  check((status='issued')=(provider_discount_id is not null))
);
alter table public.shopify_benefit_issuance enable row level security;
revoke all on public.shopify_benefit_issuance from public,anon,authenticated,service_role;
grant select on public.shopify_benefit_issuance to service_role;

create function public.claim_shopify_benefit(p_attempt uuid,p_checkout_lease uuid,p_issuance_lease uuid,p_code_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('shopify-loyalty:'||p_attempt::text,0));
  perform pg_advisory_xact_lock(hashtextextended('shopify-benefit:'||p_attempt::text,0));
  if p_issuance_lease is null or p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_BENEFIT_CLAIM'; end if;
  if not exists(select 1 from public.shopify_checkout_attempts a
    join public.shopify_loyalty_reservations r on r.attempt_id=a.id
    where a.id=p_attempt and a.lease_token=p_checkout_lease and a.status='creating'
      and a.cart_id is null and a.checkout_url is null and a.expires_at>now() and r.status='reserved') then
    raise exception 'BENEFIT_ATTEMPT_NOT_CREATING';
  end if;
  if exists(select 1 from public.shopify_benefit_issuance where attempt_id=p_attempt) then return false; end if;
  insert into public.shopify_benefit_issuance(attempt_id,lease_token,code_hash) values(p_attempt,p_issuance_lease,p_code_hash);
  return true;
end $$;

create function public.complete_shopify_benefit(p_attempt uuid,p_issuance_lease uuid,p_provider_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare issued public.shopify_benefit_issuance%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('shopify-benefit:'||p_attempt::text,0));
  select * into issued from public.shopify_benefit_issuance where attempt_id=p_attempt for update;
  if not found or issued.lease_token is distinct from p_issuance_lease then return false; end if;
  if p_provider_id is null or p_provider_id !~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$' then raise exception 'INVALID_BENEFIT_PROVIDER_ID'; end if;
  if issued.status='issued' then return issued.provider_discount_id=p_provider_id; end if;
  if not exists(select 1 from public.shopify_loyalty_reservations where attempt_id=p_attempt and status='reserved') then raise exception 'BENEFIT_RESERVATION_CHANGED'; end if;
  insert into public.shopify_loyalty_discount_bindings(attempt_id,provider_discount_id,code_hash)
    values(p_attempt,p_provider_id,issued.code_hash);
  update public.shopify_benefit_issuance set status='issued',provider_discount_id=p_provider_id where attempt_id=p_attempt;
  return true;
end $$;
revoke all on function public.claim_shopify_benefit(uuid,uuid,uuid,text),public.complete_shopify_benefit(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_shopify_benefit(uuid,uuid,uuid,text),public.complete_shopify_benefit(uuid,uuid,text) to service_role;

-- A failed cart is insufficient proof once a live/uncertain voucher exists.
-- Keep the original ledger's release API safe for future callers too.
create function public.guard_shopify_benefit_release() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='released' and old.status<>'released' and exists(
    select 1 from public.shopify_benefit_issuance where attempt_id=new.attempt_id) then
    raise exception 'LOYALTY_PROVIDER_DISCOUNT_NOT_RECONCILED';
  end if;
  return new;
end $$;
revoke all on function public.guard_shopify_benefit_release() from public,anon,authenticated,service_role;
create trigger shopify_benefit_release_guard before update on public.shopify_loyalty_reservations
for each row execute function public.guard_shopify_benefit_release();
