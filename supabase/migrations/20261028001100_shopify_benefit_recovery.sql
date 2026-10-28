-- Recovery applies ONLY to a durable definitive CartCreate rejection: the
-- provider returned cart=null plus userErrors, not a transport timeout. The
-- trusted caller records that protocol fact under its original checkout lease.
-- Codes/URLs/customer identities are never copied into this recovery journal.
create table public.shopify_benefit_recovery (
 attempt_id uuid primary key references public.shopify_checkout_attempts(id),
 proof_token uuid not null unique default gen_random_uuid(),
 no_cart_proven_at timestamptz not null default now(),
 recovered_at timestamptz
);
create table public.shopify_benefit_revocations (
 attempt_id uuid not null references public.shopify_benefit_recovery(attempt_id),
 provider_discount_id text not null check(provider_discount_id ~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$'),
 code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),verified_at timestamptz not null default now(),
 primary key(attempt_id,provider_discount_id)
);
alter table public.shopify_benefit_recovery enable row level security;
alter table public.shopify_benefit_revocations enable row level security;
revoke all on public.shopify_benefit_recovery,public.shopify_benefit_revocations from public,anon,authenticated,service_role;
grant select on public.shopify_benefit_recovery,public.shopify_benefit_revocations to service_role;

create function public.shopify_attempt_coupons(p_attempt uuid)
returns table(provider_id text,code_hash text) language sql security definer set search_path='' as $$
 select b.provider_discount_id,b.code_hash from public.shopify_benefit_issuance b where b.attempt_id=p_attempt
 union all select p.provider_discount_id,p.code_hash from public.shopify_promo_reservations p where p.attempt_id=p_attempt and p.issuance_started
 union all select a.provider_discount_id,a.code_hash from public.shopify_automatic_benefits a where a.attempt_id=p_attempt;
$$;
-- Internal helper is not directly exposed to browser or service role callers.
revoke all on function public.shopify_attempt_coupons(uuid) from public,anon,authenticated,service_role;

create function public.record_shopify_no_cart(p_attempt uuid,p_checkout_lease uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare proof uuid; a public.shopify_checkout_attempts%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('shopify-recovery:'||p_attempt::text,0));
 select * into a from public.shopify_checkout_attempts where id=p_attempt for update;
 if not found or a.lease_token is distinct from p_checkout_lease or a.status<>'creating' or a.cart_id is not null or a.checkout_url is not null then raise exception 'NO_CART_PROOF_NOT_AUTHORIZED'; end if;
 if exists(select 1 from public.shopify_order_snapshots where snapshot->'customAttributes' @> jsonb_build_array(jsonb_build_object('key','mose_attempt','value',p_attempt::text))) then raise exception 'RECOVERY_ORDER_EXISTS'; end if;
 if not exists(select 1 from public.shopify_attempt_coupons(p_attempt)) or exists(select 1 from public.shopify_attempt_coupons(p_attempt) where provider_id is null or code_hash is null) then raise exception 'RECOVERY_ISSUANCE_NOT_RESOLVED'; end if;
 insert into public.shopify_benefit_recovery(attempt_id) values(p_attempt) returning proof_token into proof;
 update public.shopify_checkout_attempts set status='unknown',last_error='BENEFIT_CART_REJECTED' where id=p_attempt;
 return proof;
end $$;

create function public.shopify_benefit_recovery_state(p_attempt uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('attemptId',r.attempt_id,'proofToken',r.proof_token,'recoveredAt',r.recovered_at,
 'coupons',(select coalesce(jsonb_agg(jsonb_build_object('providerId',c.provider_id,'codeHash',c.code_hash)),'[]'::jsonb) from public.shopify_attempt_coupons(r.attempt_id)c))
 from public.shopify_benefit_recovery r where r.attempt_id=p_attempt;
$$;

-- The trusted operator service calls this only after an actual Admin read of
-- this exact provider ID/code hash confirms non-active status and zero uses.
-- Zero asyncUsageCount alone is NEVER a no-cart or no-order proof.
create function public.record_shopify_benefit_revocation(p_attempt uuid,p_proof uuid,p_provider text,p_code_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('shopify-recovery:'||p_attempt::text,0));
 if not exists(select 1 from public.shopify_benefit_recovery where attempt_id=p_attempt and proof_token=p_proof and recovered_at is null) then raise exception 'RECOVERY_PROOF_MISSING'; end if;
 if not exists(select 1 from public.shopify_attempt_coupons(p_attempt) where provider_id=p_provider and code_hash=p_code_hash) then raise exception 'RECOVERY_COUPON_MISMATCH'; end if;
 insert into public.shopify_benefit_revocations(attempt_id,provider_discount_id,code_hash) values(p_attempt,p_provider,p_code_hash)
 on conflict(attempt_id,provider_discount_id) do update set verified_at=now() where shopify_benefit_revocations.code_hash=excluded.code_hash;
 return found;
end $$;

-- Existing point-release API remains closed unless this narrowly proved,
-- completed recovery transaction has certified every associated voucher.
create or replace function public.guard_shopify_benefit_release() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='released' and old.status<>'released' and exists(select 1 from public.shopify_benefit_issuance where attempt_id=new.attempt_id)
 and not exists(select 1 from public.shopify_benefit_recovery where attempt_id=new.attempt_id and recovered_at is not null) then raise exception 'LOYALTY_PROVIDER_DISCOUNT_NOT_RECONCILED'; end if;
 return new;
end $$;
revoke all on function public.guard_shopify_benefit_release() from public,anon,authenticated,service_role;

create function public.complete_shopify_benefit_recovery(p_attempt uuid,p_proof uuid) returns text
language plpgsql security definer set search_path='' as $$
declare r public.shopify_benefit_recovery%rowtype; a public.shopify_checkout_attempts%rowtype; promo uuid;
begin
 -- Same lock order as loyalty issuance/release; no double restoration.
 perform pg_advisory_xact_lock(hashtextextended('shopify-loyalty:'||p_attempt::text,0));
 perform pg_advisory_xact_lock(hashtextextended('shopify-recovery:'||p_attempt::text,0));
 select * into r from public.shopify_benefit_recovery where attempt_id=p_attempt for update;
 if not found or r.proof_token is distinct from p_proof then raise exception 'RECOVERY_PROOF_MISSING'; end if;
 if r.recovered_at is not null then return 'recovered'; end if;
 select * into a from public.shopify_checkout_attempts where id=p_attempt for update;
 if a.status<>'unknown' or a.last_error<>'BENEFIT_CART_REJECTED' or a.cart_id is not null or a.checkout_url is not null then raise exception 'RECOVERY_CART_NOT_DEFINITIVE'; end if;
 if exists(select 1 from public.shopify_order_snapshots where snapshot->'customAttributes' @> jsonb_build_array(jsonb_build_object('key','mose_attempt','value',p_attempt::text))) then raise exception 'RECOVERY_ORDER_EXISTS'; end if;
 if not exists(select 1 from public.shopify_attempt_coupons(p_attempt)) or exists(
  select 1 from public.shopify_attempt_coupons(p_attempt)c where c.provider_id is null or c.code_hash is null or not exists(
   select 1 from public.shopify_benefit_revocations v where v.attempt_id=p_attempt and v.provider_discount_id=c.provider_id and v.code_hash=c.code_hash and v.verified_at>=now()-interval '5 minutes')) then raise exception 'RECOVERY_REVOCATION_INCOMPLETE'; end if;
 select promo_id into promo from public.shopify_promo_reservations where attempt_id=p_attempt;
 if promo is not null then perform 1 from public.promo_codes where id=promo for update; end if;
 if exists(select 1 from public.shopify_promo_reservations where attempt_id=p_attempt and status<>'reserved') then raise exception 'RECOVERY_PROMO_ALREADY_SETTLED'; end if;
 update public.shopify_benefit_recovery set recovered_at=now() where attempt_id=p_attempt;
 update public.shopify_checkout_attempts set status='failed',last_error='BENEFIT_REVOKED_NO_CART' where id=p_attempt;
 perform public.release_failed_shopify_loyalty(p_attempt);
 update public.shopify_promo_reservations set status='released' where attempt_id=p_attempt and status='reserved';
 return 'recovered';
end $$;

create function public.shopify_benefit_liabilities() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object(
 'heldPoints',coalesce((select sum(points) from public.shopify_loyalty_reservations where status='reserved'),0),
 'heldPointReservations',(select count(*) from public.shopify_loyalty_reservations where status='reserved'),
 'heldPromoUses',(select count(*) from public.shopify_promo_reservations where status='reserved'),
 'oldestHeldPointsAt',(select min(created_at) from public.shopify_loyalty_reservations where status='reserved'),
 'oldestHeldPromoAt',(select min(created_at) from public.shopify_promo_reservations where status='reserved'),
 'definitiveNoCartAwaitingRecovery',(select count(*) from public.shopify_benefit_recovery where recovered_at is null),
 'unknownCheckoutAttempts',(select count(*) from public.shopify_checkout_attempts where status='unknown'),
 'unresolvedLoyaltyIssuance',(select count(*) from public.shopify_benefit_issuance where status='issuing'),
 'unresolvedPromoIssuance',(select count(*) from public.shopify_promo_reservations where issuance_started and provider_discount_id is null),
 'unresolvedAutomaticIssuance',(select count(*) from public.shopify_automatic_benefits where provider_discount_id is null)
 );
$$;
revoke all on function public.record_shopify_no_cart(uuid,uuid),public.shopify_benefit_recovery_state(uuid),public.record_shopify_benefit_revocation(uuid,uuid,text,text),public.complete_shopify_benefit_recovery(uuid,uuid),public.shopify_benefit_liabilities() from public,anon,authenticated;
grant execute on function public.record_shopify_no_cart(uuid,uuid),public.shopify_benefit_recovery_state(uuid),public.record_shopify_benefit_revocation(uuid,uuid,text,text),public.complete_shopify_benefit_recovery(uuid,uuid),public.shopify_benefit_liabilities() to service_role;

create function public.shopify_benefit_recovery_candidates() returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('attemptId',a.id,'createdAt',a.created_at,'noCartProven',r.attempt_id is not null,'recovered',r.recovered_at is not null) order by a.created_at),'[]'::jsonb)
 from (select * from public.shopify_checkout_attempts where status='unknown' order by created_at limit 100)a
 left join public.shopify_benefit_recovery r on r.attempt_id=a.id;
$$;
revoke all on function public.shopify_benefit_recovery_candidates() from public,anon,authenticated;
grant execute on function public.shopify_benefit_recovery_candidates() to service_role;
create index shopify_held_loyalty_age on public.shopify_loyalty_reservations(created_at) where status='reserved';
create index shopify_held_promo_age on public.shopify_promo_reservations(created_at) where status='reserved';
