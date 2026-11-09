-- A paid Shopify order may race a cart edit. Authorize each checked
-- percentage quote before touching the provider cart, then settle only the
-- amount Shopify actually allocated under the same bound one-use code.
create table public.shopify_promo_revision_amounts (
  attempt_id uuid not null references public.shopify_promo_reservations(attempt_id),
  discount_cents integer not null check (discount_cents between 1 and 100000000),
  primary key (attempt_id, discount_cents)
);
alter table public.shopify_promo_revision_amounts enable row level security;
revoke all on public.shopify_promo_revision_amounts from public,anon,authenticated,service_role;

create function public.record_shopify_promo_revision(p_attempt uuid,p_lease uuid,p_discount integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.shopify_promo_reservations%rowtype;
begin
  if p_discount is null or p_discount not between 1 and 100000000 then return false; end if;
  perform 1 from public.shopify_checkout_attempts
    where id=p_attempt and lease_token=p_lease and status='creating' and cart_id is not null and checkout_url is not null and expires_at>now()
    for update;
  if not found then return false; end if;
  select * into r from public.shopify_promo_reservations where attempt_id=p_attempt for update;
  if not found or r.status<>'reserved' or r.provider_discount_id is null or r.promo_snapshot->>'discount_type'<>'percentage'
  then return false; end if;
  if exists(select 1 from public.shopify_promo_revision_amounts where attempt_id=p_attempt and discount_cents=p_discount) then return true; end if;
  if (select count(*) from public.shopify_promo_revision_amounts where attempt_id=p_attempt)>=100 then return false; end if;
  insert into public.shopify_promo_revision_amounts values(p_attempt,p_discount);
  return true;
end $$;

create function public.read_shopify_promo_revisions(p_attempt uuid)
returns integer[] language sql stable security definer set search_path='' as $$
  select coalesce(array_agg(discount_cents),array[]::integer[])
  from public.shopify_promo_revision_amounts where attempt_id=p_attempt;
$$;

revoke all on function public.record_shopify_promo_revision(uuid,uuid,integer), public.read_shopify_promo_revisions(uuid) from public,anon,authenticated;
grant execute on function public.record_shopify_promo_revision(uuid,uuid,integer), public.read_shopify_promo_revisions(uuid) to service_role;

create or replace function public.consume_shopify_promo(p_attempt uuid,p_order text,p_code_hash text,p_discount integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.shopify_promo_reservations%rowtype; p public.promo_codes%rowtype;
begin
  select pc.* into p from public.promo_codes pc join public.shopify_promo_reservations held on held.promo_id=pc.id where held.attempt_id=p_attempt for update of pc;
  if not found then raise exception 'PROMO_RESERVATION_ABSENT'; end if;
  select * into r from public.shopify_promo_reservations where attempt_id=p_attempt for update;
  if r.status='consumed' then return r.order_id=p_order and r.code_hash=p_code_hash and r.discount_cents=p_discount; end if;
  if r.status<>'reserved' or r.provider_discount_id is null or r.code_hash is distinct from p_code_hash or p_discount is null or (r.discount_cents<>p_discount and not exists(
      select 1 from public.shopify_promo_revision_amounts where attempt_id=p_attempt and discount_cents=p_discount))
    or p_order is null or p_order !~ '^gid://shopify/Order/[1-9][0-9]*$' then raise exception 'PROMO_PAYMENT_NOT_VERIFIED'; end if;
  if not exists(select 1 from public.shopify_order_snapshots where shopify_order_id=p_order and financial_status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')
    and snapshot->'customAttributes' @> jsonb_build_array(jsonb_build_object('key','mose_source','value','unified-checkout'),jsonb_build_object('key','mose_attempt','value',p_attempt::text))) then raise exception 'PROMO_PAYMENT_NOT_VERIFIED'; end if;
  update public.promo_codes set usage_count=coalesce(usage_count,0)+1 where id=p.id;
  update public.shopify_promo_reservations set status='consumed',order_id=p_order,discount_cents=p_discount where attempt_id=p_attempt;
  return true;
end $$;
