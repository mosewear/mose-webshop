-- Additive default-off shared cap ledger. Neither holds nor consumed uses expire
-- automatically; a refund does not make a single-use welcome code reusable.
create table public.shopify_promo_reservations (
  attempt_id uuid primary key references public.shopify_checkout_attempts(id),
  promo_id uuid not null references public.promo_codes(id),
  promo_snapshot jsonb not null,
  status text not null default 'reserved' check(status in ('reserved','consumed','released')),
  discount_cents integer not null check(discount_cents between 1 and 100000000),
  provider_discount_id text unique check(provider_discount_id ~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$'),
  code_hash text unique check(code_hash ~ '^[a-f0-9]{64}$'),
  issuance_lease uuid,
  issuance_started boolean not null default false,
  order_id text unique,
  created_at timestamptz not null default now(),
  check ((status='consumed')=(order_id is not null)),
  check ((provider_discount_id is null)=(code_hash is null))
);
alter table public.shopify_promo_reservations enable row level security;
revoke all on public.shopify_promo_reservations from public,anon,authenticated,service_role;
grant select on public.shopify_promo_reservations to service_role;

create function public.shopify_promo_snapshot(p public.promo_codes) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('id',p.id,'discount_type',p.discount_type,'discount_value',p.discount_value,
   'min_order_value',p.min_order_value,'applies_to_sale_items',p.applies_to_sale_items,
   'expires_at',p.expires_at,'is_active',p.is_active,'usage_limit',p.usage_limit)
$$;
revoke all on function public.shopify_promo_snapshot(public.promo_codes) from public,anon,authenticated;
grant execute on function public.shopify_promo_snapshot(public.promo_codes) to service_role;

create function public.reserve_shopify_promo(p_attempt uuid,p_checkout_lease uuid,p_promo uuid,p_snapshot jsonb,p_discount integer)
returns text language plpgsql security definer set search_path='' as $$
declare p public.promo_codes%rowtype; r public.shopify_promo_reservations%rowtype; holds bigint;
begin
  if p_discount is null or p_discount not between 1 and 100000000 then raise exception 'INVALID_PROMO_DISCOUNT'; end if;
  select * into p from public.promo_codes where id=p_promo for update;
  if not found then raise exception 'PROMO_NOT_FOUND'; end if;
  if not exists(select 1 from public.shopify_checkout_attempts where id=p_attempt and lease_token=p_checkout_lease and status='creating'
    and cart_id is null and checkout_url is null and expires_at>now()) then raise exception 'PROMO_ATTEMPT_NOT_CREATING'; end if;
  select * into r from public.shopify_promo_reservations where attempt_id=p_attempt;
  if found then
    if r.promo_id<>p_promo or r.promo_snapshot<>p_snapshot or r.discount_cents<>p_discount then raise exception 'PROMO_RESERVATION_CONFLICT'; end if;
    return r.status;
  end if;
  if (public.shopify_promo_snapshot(p)-'expires_at') is distinct from (p_snapshot-'expires_at') or p.expires_at is distinct from (p_snapshot->>'expires_at')::timestamptz then raise exception 'PROMO_CHANGED'; end if;
  if not p.is_active or p.expires_at<=now() then raise exception 'PROMO_EXPIRED'; end if;
  select count(*) into holds from public.shopify_promo_reservations where promo_id=p.id and status='reserved';
  if p.usage_limit is not null and coalesce(p.usage_count,0)+holds>=p.usage_limit then raise exception 'PROMO_EXHAUSTED'; end if;
  insert into public.shopify_promo_reservations(attempt_id,promo_id,promo_snapshot,discount_cents) values(p_attempt,p.id,p_snapshot,p_discount);
  return 'reserved';
end $$;

create function public.claim_shopify_promo_issuance(p_attempt uuid,p_checkout_lease uuid,p_issuance_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_issuance_lease is null then raise exception 'INVALID_PROMO_LEASE'; end if;
  if not exists(select 1 from public.shopify_checkout_attempts where id=p_attempt and lease_token=p_checkout_lease
    and status='creating' and cart_id is null and checkout_url is null and expires_at>now()) then raise exception 'PROMO_ATTEMPT_NOT_CREATING'; end if;
  update public.shopify_promo_reservations set issuance_started=true,issuance_lease=p_issuance_lease
    where attempt_id=p_attempt and status='reserved' and not issuance_started;
  return found;
end $$;
create function public.bind_shopify_promo_discount(p_attempt uuid,p_issuance_lease uuid,p_provider text,p_code_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.shopify_promo_reservations%rowtype;
begin
  if p_provider is null or p_provider !~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$' or p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_PROMO_BINDING'; end if;
  select * into r from public.shopify_promo_reservations where attempt_id=p_attempt for update;
  if not found or r.issuance_lease is distinct from p_issuance_lease or not r.issuance_started or r.status<>'reserved' then return false; end if;
  if r.provider_discount_id is not null then return r.provider_discount_id=p_provider and r.code_hash=p_code_hash; end if;
  update public.shopify_promo_reservations set provider_discount_id=p_provider,code_hash=p_code_hash where attempt_id=p_attempt;
  return true;
end $$;
-- Called only by authoritative payment reconciliation after matching actual
-- provider code/allocation to this reservation. No use is restored on refund.
create function public.consume_shopify_promo(p_attempt uuid,p_order text,p_code_hash text,p_discount integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.shopify_promo_reservations%rowtype; p public.promo_codes%rowtype;
begin
  select pc.* into p from public.promo_codes pc join public.shopify_promo_reservations held on held.promo_id=pc.id where held.attempt_id=p_attempt for update of pc;
  if not found then raise exception 'PROMO_RESERVATION_ABSENT'; end if;
  select * into r from public.shopify_promo_reservations where attempt_id=p_attempt for update;
  if r.status='consumed' then return r.order_id=p_order and r.code_hash=p_code_hash and r.discount_cents=p_discount; end if;
  if r.status<>'reserved' or r.provider_discount_id is null or r.code_hash is distinct from p_code_hash or r.discount_cents<>p_discount
    or p_order is null or p_order !~ '^gid://shopify/Order/[1-9][0-9]*$' then raise exception 'PROMO_PAYMENT_NOT_VERIFIED'; end if;
  if not exists(select 1 from public.shopify_order_snapshots where shopify_order_id=p_order and financial_status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')
    and snapshot->'customAttributes' @> jsonb_build_array(jsonb_build_object('key','mose_source','value','unified-checkout'),jsonb_build_object('key','mose_attempt','value',p_attempt::text))) then raise exception 'PROMO_PAYMENT_NOT_VERIFIED'; end if;
  update public.promo_codes set usage_count=coalesce(usage_count,0)+1 where id=p.id;
  update public.shopify_promo_reservations set status='consumed',order_id=p_order where attempt_id=p_attempt;
  return true;
end $$;

-- Legacy transaction: cap check, order insert and usage event commit together.
-- Dynamic identifiers come exclusively from pg_attribute, never caller strings.
-- Only supplied columns are inserted so existing column defaults/triggers run.
create function public.create_legacy_promo_order(p_order jsonb,p_promo uuid,p_snapshot jsonb)
returns setof public.orders language plpgsql security definer set search_path='' as $$
declare p public.promo_codes%rowtype; held bigint; cols text; vals text; saved public.orders%rowtype; discount numeric;
begin
  if jsonb_typeof(p_order)<>'object' or p_order ? 'id' then raise exception 'INVALID_PROMO_ORDER'; end if;
  select * into p from public.promo_codes where id=p_promo for update;
  if not found or (public.shopify_promo_snapshot(p)-'expires_at') is distinct from (p_snapshot-'expires_at') or p.expires_at is distinct from (p_snapshot->>'expires_at')::timestamptz then raise exception 'PROMO_CHANGED'; end if;
  if not p.is_active or p.expires_at<=now() then raise exception 'PROMO_EXPIRED'; end if;
  if p_order->>'promo_code' is distinct from p.code then raise exception 'PROMO_CODE_MISMATCH'; end if;
  discount := (p_order->>'discount_amount')::numeric;
  if discount is null or discount<=0 or discount>1000000 then raise exception 'INVALID_PROMO_DISCOUNT'; end if;
  select count(*) into held from public.shopify_promo_reservations where promo_id=p.id and status='reserved';
  if p.usage_limit is not null and coalesce(p.usage_count,0)+held>=p.usage_limit then raise exception 'PROMO_EXHAUSTED'; end if;
  select string_agg(format('%I',a.attname),',' order by a.attnum),string_agg(format('r.%I',a.attname),',' order by a.attnum)
    into cols,vals from pg_catalog.pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped
      and a.attgenerated='' and p_order ? a.attname;
  if cols is null or (select count(*) from jsonb_object_keys(p_order))<>(select count(*) from pg_catalog.pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated='' and p_order ? a.attname) then raise exception 'INVALID_PROMO_ORDER_COLUMNS'; end if;
  execute format('insert into public.orders(%s) select %s from jsonb_populate_record(null::public.orders,$1) r returning *',cols,vals) into saved using p_order;
  update public.promo_codes set usage_count=coalesce(usage_count,0)+1 where id=p.id;
  insert into public.promo_code_usage(promo_code_id,order_id,discount_amount,order_total,user_id) values(p.id,saved.id,discount,saved.total,null);
  return next saved;
end $$;
revoke all on function public.reserve_shopify_promo(uuid,uuid,uuid,jsonb,integer),public.claim_shopify_promo_issuance(uuid,uuid,uuid),public.bind_shopify_promo_discount(uuid,uuid,text,text),public.consume_shopify_promo(uuid,text,text,integer),public.create_legacy_promo_order(jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_shopify_promo(uuid,uuid,uuid,jsonb,integer),public.claim_shopify_promo_issuance(uuid,uuid,uuid),public.bind_shopify_promo_discount(uuid,uuid,text,text),public.consume_shopify_promo(uuid,text,text,integer),public.create_legacy_promo_order(jsonb,uuid,jsonb) to service_role;

-- Existing paid orders may be replayed late. An existing usage record is the
-- idempotency key; never count it twice or reject a historical payment callback.
create function public.track_legacy_promo_usage_atomic(p_code text,p_order uuid,p_discount numeric,p_total numeric,p_user uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare p public.promo_codes%rowtype;
begin
  select * into p from public.promo_codes where code=upper(p_code) for update;
  if not found then raise exception 'PROMO_NOT_FOUND'; end if;
  if exists(select 1 from public.promo_code_usage where promo_code_id=p.id and order_id=p_order) then return true; end if;
  if not exists(select 1 from public.orders where id=p_order and promo_code=p.code and discount_amount=p_discount and total=p_total) then raise exception 'PROMO_ORDER_MISMATCH'; end if;
  update public.promo_codes set usage_count=coalesce(usage_count,0)+1 where id=p.id;
  insert into public.promo_code_usage(promo_code_id,order_id,discount_amount,order_total,user_id) values(p.id,p_order,p_discount,p_total,p_user);
  return true;
end $$;
revoke all on function public.track_legacy_promo_usage_atomic(text,uuid,numeric,numeric,uuid) from public,anon,authenticated;
grant execute on function public.track_legacy_promo_usage_atomic(text,uuid,numeric,numeric,uuid) to service_role;

create table public.shopify_benefit_runtime (
 id smallint primary key default 1 check(id=1),cutover_at timestamptz,review_reference text,last_worker_at timestamptz,
 check((cutover_at is null)=(review_reference is null)),check(review_reference is null or length(review_reference) between 8 and 500)
);
insert into public.shopify_benefit_runtime(id) values(1);
create table public.shopify_benefit_outbox (
 order_id text primary key references public.shopify_order_snapshots(shopify_order_id),attempt_id uuid not null references public.shopify_promo_reservations(attempt_id),
 source_updated_at timestamptz not null,status text not null default 'pending' check(status in ('pending','processing','processed','dead_letter')),
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),queued_at timestamptz not null default now(),last_error text
);
alter table public.shopify_benefit_runtime enable row level security;
alter table public.shopify_benefit_outbox enable row level security;
revoke all on public.shopify_benefit_runtime,public.shopify_benefit_outbox from public,anon,authenticated,service_role;
grant select on public.shopify_benefit_runtime,public.shopify_benefit_outbox to service_role;
create function public.enqueue_shopify_benefits() returns trigger language plpgsql security definer set search_path='' as $$
declare attempt uuid;
begin
 if new.financial_status is null or new.financial_status not in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then return new; end if;
 select p.attempt_id into attempt from public.shopify_promo_reservations p join public.shopify_checkout_attempts a on a.id=p.attempt_id
 cross join public.shopify_benefit_runtime r where r.id=1 and r.cutover_at<=now() and a.created_at>=r.cutover_at
 and new.snapshot->'customAttributes' @> jsonb_build_array(jsonb_build_object('key','mose_source','value','unified-checkout'),jsonb_build_object('key','mose_attempt','value',p.attempt_id::text));
 if attempt is null then return new; end if;
 insert into public.shopify_benefit_outbox(order_id,attempt_id,source_updated_at) values(new.shopify_order_id,attempt,new.source_updated_at)
 on conflict(order_id) do update set source_updated_at=excluded.source_updated_at,status='pending',attempts=0,lease_token=null,lease_until=null,next_attempt_at=now(),queued_at=now(),last_error=null
 where excluded.source_updated_at>shopify_benefit_outbox.source_updated_at;
 return new;
end $$;
create trigger zz_shopify_benefit_enqueue after insert or update on public.shopify_order_snapshots for each row execute function public.enqueue_shopify_benefits();
create function public.claim_shopify_benefits() returns setof public.shopify_benefit_outbox language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
 if not exists(select 1 from public.shopify_benefit_runtime where id=1 and cutover_at<=now()) then return; end if;
 select order_id into chosen from public.shopify_benefit_outbox where (status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now()) order by queued_at for update skip locked limit 1;
 if chosen is null then return; end if;
 return query update public.shopify_benefit_outbox set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes' where order_id=chosen returning *;
end $$;
create function public.complete_shopify_benefits(p_order text,p_lease uuid,p_version timestamptz,p_code_hash text,p_discount integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare job public.shopify_benefit_outbox%rowtype; snap_version timestamptz; applied boolean;
begin
 select source_updated_at into snap_version from public.shopify_order_snapshots where shopify_order_id=p_order for share;
 select * into job from public.shopify_benefit_outbox where order_id=p_order for update;
 if not found or job.status<>'processing' or job.lease_token is distinct from p_lease or job.lease_until<=now() or job.source_updated_at is distinct from p_version or snap_version is distinct from p_version then return false; end if;
 applied:=public.consume_shopify_promo(job.attempt_id,p_order,p_code_hash,p_discount);
 if not applied then return false; end if;
 update public.shopify_benefit_outbox set status='processed',lease_token=null,lease_until=null,last_error=null where order_id=p_order;
 return true;
end $$;
create function public.fail_shopify_benefits(p_order text,p_lease uuid,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.shopify_benefit_outbox set status=case when attempts>=8 then 'dead_letter' else 'pending' end,
 lease_token=null,lease_until=null,next_attempt_at=now()+make_interval(secs=>least(3600,power(2,least(attempts,11))::integer)),
 last_error=case when p_error~'^[A-Z][A-Z0-9_]{1,79}$' then p_error else 'BENEFIT_WORKER_FAILED' end
 where order_id=p_order and status='processing' and lease_token=p_lease and lease_until>now();
 return found;
end $$;
create function public.heartbeat_shopify_benefits() returns void language sql security definer set search_path='' as $$ update public.shopify_benefit_runtime set last_worker_at=now() where id=1 and cutover_at<=now(); $$;
create function public.shopify_benefits_health() returns table(cutover_at timestamptz,review_reference text,last_worker_at timestamptz,pending_count bigint,oldest_pending_at timestamptz,dead_letter_count bigint)
language sql security definer set search_path='' as $$
 select r.cutover_at,r.review_reference,r.last_worker_at,
 (select count(*) from public.shopify_benefit_outbox where status in ('pending','processing')),
 (select min(queued_at) from public.shopify_benefit_outbox where status in ('pending','processing')),
 (select count(*) from public.shopify_benefit_outbox where status='dead_letter') from public.shopify_benefit_runtime r where r.id=1;
$$;
revoke all on function public.enqueue_shopify_benefits() from public,anon,authenticated,service_role;
revoke all on function public.claim_shopify_benefits(),public.complete_shopify_benefits(text,uuid,timestamptz,text,integer),public.fail_shopify_benefits(text,uuid,text),public.heartbeat_shopify_benefits(),public.shopify_benefits_health() from public,anon,authenticated;
grant execute on function public.claim_shopify_benefits(),public.complete_shopify_benefits(text,uuid,timestamptz,text,integer),public.fail_shopify_benefits(text,uuid,text),public.heartbeat_shopify_benefits(),public.shopify_benefits_health() to service_role;

-- One-shot issuance for automatic tier/staffel components. No points or code
-- usage liability is changed here; the caller verifies all actual allocations.
create table public.shopify_automatic_benefits (
 attempt_id uuid not null references public.shopify_checkout_attempts(id),component_key text not null check(component_key ~ '^(tier|staffel:[a-f0-9]{16})$'),
 lease_token uuid not null,code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),plan_hash text not null check(plan_hash ~ '^[a-f0-9]{64}$'),
 provider_discount_id text unique check(provider_discount_id ~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$'),created_at timestamptz not null default now(),primary key(attempt_id,component_key)
);
alter table public.shopify_automatic_benefits enable row level security;
revoke all on public.shopify_automatic_benefits from public,anon,authenticated,service_role;
grant select on public.shopify_automatic_benefits to service_role;
create function public.claim_shopify_automatic_benefit(p_attempt uuid,p_checkout_lease uuid,p_component text,p_lease uuid,p_code_hash text,p_plan_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('shopify-automatic:'||p_attempt::text,0));
 if not exists(select 1 from public.shopify_checkout_attempts where id=p_attempt and lease_token=p_checkout_lease and status='creating' and cart_id is null and checkout_url is null and expires_at>now()) then raise exception 'BENEFIT_ATTEMPT_NOT_CREATING'; end if;
 if exists(select 1 from public.shopify_automatic_benefits where attempt_id=p_attempt and component_key=p_component) then return false; end if;
 insert into public.shopify_automatic_benefits(attempt_id,component_key,lease_token,code_hash,plan_hash) values(p_attempt,p_component,p_lease,p_code_hash,p_plan_hash);
 return true;
end $$;
create function public.bind_shopify_automatic_benefit(p_attempt uuid,p_component text,p_lease uuid,p_provider text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_provider is null or p_provider !~ '^gid://shopify/DiscountCodeNode/[1-9][0-9]*$' then raise exception 'INVALID_BENEFIT_BINDING'; end if;
 update public.shopify_automatic_benefits set provider_discount_id=p_provider where attempt_id=p_attempt and component_key=p_component and lease_token=p_lease and (provider_discount_id is null or provider_discount_id=p_provider);
 return found;
end $$;
revoke all on function public.claim_shopify_automatic_benefit(uuid,uuid,text,uuid,text,text),public.bind_shopify_automatic_benefit(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_shopify_automatic_benefit(uuid,uuid,text,uuid,text,text),public.bind_shopify_automatic_benefit(uuid,text,uuid,text) to service_role;
