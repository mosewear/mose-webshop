-- Additive, dormant loyalty foundation. No backfill, balance reset, readiness
-- changes, triggers or runtime activation. Existing accounts/points stay intact.
-- Invoke only after a reviewed settlement/discount adapter and legacy-writer
-- cutover. A cart timeout/TTL is NEVER evidence to release reserved points.
create table public.shopify_loyalty_reservations (
  attempt_id uuid primary key references public.shopify_checkout_owners(attempt_id),
  account_id uuid not null references public.loyalty_points(id),
  points integer not null check (points >= 100 and points % 100 = 0),
  status text not null default 'reserved' check (status in ('reserved','consumed','released')),
  order_id text unique references public.shopify_order_snapshots(shopify_order_id),
  created_at timestamptz not null default now(),
  check ((status = 'consumed') = (order_id is not null))
);
create table public.shopify_loyalty_settlements (
  order_id text primary key references public.shopify_order_accounts(order_id),
  account_id uuid not null references public.loyalty_points(id),
  source_updated_at timestamptz not null,
  paid_cents integer not null check (paid_cents between 0 and 100000000),
  refunded_cents integer not null check (refunded_cents between 0 and paid_cents),
  discount_cents integer not null check (discount_cents between 0 and 100000000),
  restored_points integer not null check (restored_points >= 0),
  earned_points integer not null check (earned_points >= 0),
  reversed_points integer not null check (reversed_points between 0 and earned_points)
);
create table public.shopify_loyalty_ledger (
  operation_key text primary key,
  account_id uuid not null references public.loyalty_points(id),
  attempt_id uuid not null references public.shopify_checkout_owners(attempt_id),
  order_id text references public.shopify_order_snapshots(shopify_order_id),
  kind text not null check (kind in ('reserve','release','earn','reverse','restore')),
  points integer not null check (points <> 0),
  lifetime_delta integer not null,
  transaction_id uuid not null unique references public.loyalty_transactions(id),
  created_at timestamptz not null default now()
);
alter table public.shopify_loyalty_reservations enable row level security;
alter table public.shopify_loyalty_settlements enable row level security;
alter table public.shopify_loyalty_ledger enable row level security;
revoke all on public.shopify_loyalty_reservations, public.shopify_loyalty_settlements, public.shopify_loyalty_ledger from public, anon, authenticated, service_role;
grant select on public.shopify_loyalty_reservations, public.shopify_loyalty_settlements, public.shopify_loyalty_ledger to service_role;

-- Internal primitive. Callers hold the account lock. All effects roll back on
-- any failure; no separate insert/update/compensating-write race.
create function public.post_shopify_loyalty(p_key text, p_account uuid, p_attempt uuid,
  p_order text, p_kind text, p_points integer, p_lifetime integer) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.loyalty_points%rowtype; tx uuid; new_lifetime integer;
begin
  select * into strict a from public.loyalty_points where id = p_account for update;
  if exists(select 1 from public.shopify_loyalty_ledger where operation_key = p_key) then
    raise exception 'LOYALTY_DUPLICATE_OPERATION';
  end if;
  new_lifetime := greatest(0, a.lifetime_points + p_lifetime);
  insert into public.loyalty_transactions(email,user_id,type,points,description)
    values(a.email,a.user_id,case when p_kind = 'earn' then 'earned' when p_kind = 'reserve' then 'redeemed' else 'adjusted' end,
      p_points,'Shopify loyalty: ' || p_kind) returning id into tx;
  insert into public.shopify_loyalty_ledger(operation_key,account_id,attempt_id,order_id,kind,points,lifetime_delta,transaction_id)
    values(p_key,p_account,p_attempt,p_order,p_kind,p_points,p_lifetime,tx);
  -- Preserve debt if earned points have already been spent; clamping balance to
  -- zero would allow refunded purchases to create spendable points repeatedly.
  update public.loyalty_points set points_balance = points_balance + p_points,
    lifetime_points = new_lifetime,
    tier = case when new_lifetime >= 1000 then 'gold' when new_lifetime >= 500 then 'silver' else 'bronze' end,
    updated_at = now() where id = p_account;
end $$;
revoke all on function public.post_shopify_loyalty(text,uuid,uuid,text,text,integer,integer) from public, anon, authenticated, service_role;

create function public.reserve_shopify_loyalty(p_attempt uuid, p_user uuid, p_points integer)
returns text language plpgsql security definer set search_path = '' as $$
declare a public.loyalty_points%rowtype; r public.shopify_loyalty_reservations%rowtype; owner_user uuid;
begin
  if p_points is null or p_points < 100 or p_points > 20000000 or p_points % 100 <> 0 then raise exception 'INVALID_LOYALTY_POINTS'; end if;
  -- Serialize reservation/release/settlement for this attempt, then account.
  perform pg_advisory_xact_lock(hashtextextended('shopify-loyalty:' || p_attempt::text,0));
  select user_id into owner_user from public.shopify_checkout_owners where attempt_id = p_attempt;
  if owner_user is distinct from p_user or p_user is null then raise exception 'LOYALTY_OWNER_MISMATCH'; end if;
  select * into r from public.shopify_loyalty_reservations where attempt_id = p_attempt;
  if found then
    if r.points <> p_points then raise exception 'LOYALTY_RESERVATION_CONFLICT'; end if;
    return r.status;
  end if;
  if not exists(select 1 from public.shopify_checkout_attempts where id = p_attempt and status = 'creating'
    and cart_id is null and checkout_url is null and expires_at > now()) then raise exception 'LOYALTY_ATTEMPT_NOT_CREATING'; end if;
  -- Resolve only from the server-verified account email. Never accept a supplied
  -- customer email or transfer points from an account linked to another user.
  select lp.* into a from public.loyalty_points lp join auth.users u on lp.email = u.email
    where u.id = p_user and (lp.user_id is null or lp.user_id = p_user) for update of lp;
  if not found then raise exception 'LOYALTY_ACCOUNT_NOT_FOUND'; end if;
  if a.points_balance is null or a.lifetime_points is null then raise exception 'LOYALTY_BALANCE_INVALID'; end if;
  if a.points_balance < p_points then raise exception 'LOYALTY_INSUFFICIENT_POINTS'; end if;
  insert into public.shopify_loyalty_reservations(attempt_id,account_id,points) values(p_attempt,a.id,p_points);
  perform public.post_shopify_loyalty('reserve:' || p_attempt::text,a.id,p_attempt,null,'reserve',-p_points,0);
  return 'reserved';
end $$;

create function public.release_failed_shopify_loyalty(p_attempt uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.shopify_loyalty_reservations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('shopify-loyalty:' || p_attempt::text,0));
  select * into r from public.shopify_loyalty_reservations where attempt_id = p_attempt for update;
  if not found then return 'absent'; end if;
  if r.status = 'released' then return 'released'; end if;
  -- No TTL release. An unknown/ready cart can still be paid after expiration.
  if r.status <> 'reserved' or not exists(select 1 from public.shopify_checkout_attempts
    where id = p_attempt and status = 'failed' and cart_id is null and checkout_url is null)
    or exists(select 1 from public.shopify_order_accounts where attempt_id = p_attempt) then raise exception 'LOYALTY_RELEASE_NOT_PROVEN'; end if;
  perform public.post_shopify_loyalty('release:' || p_attempt::text,r.account_id,p_attempt,null,'release',r.points,0);
  update public.shopify_loyalty_reservations set status = 'released' where attempt_id = p_attempt;
  return 'released';
end $$;

-- A reviewed adapter supplies cumulative eligible EUR spend, eligible refunds,
-- actual point-discount value and cumulative points to restore. Do NOT derive
-- these from currentTotalPriceSet alone, line removals, raw webhooks or a cart.
create function public.settle_shopify_loyalty(p_order_id text, p_source_updated_at timestamptz,
  p_paid_cents integer, p_refunded_cents integer, p_discount_cents integer, p_restored_points integer)
returns text language plpgsql security definer set search_path = '' as $$
declare owner_row public.shopify_order_accounts%rowtype; a public.loyalty_points%rowtype;
  r public.shopify_loyalty_reservations%rowtype; s public.shopify_loyalty_settlements%rowtype;
  snap public.shopify_order_snapshots%rowtype; earned integer; reversed integer; delta integer; restore_delta integer;
begin
  if p_order_id is null or p_order_id !~ '^gid://shopify/Order/[1-9][0-9]*$' or p_source_updated_at is null
    or p_paid_cents is null or p_paid_cents not between 0 and 100000000
    or p_refunded_cents is null or p_refunded_cents not between 0 and p_paid_cents
    or p_discount_cents is null or p_discount_cents not between 0 and 100000000
    or p_restored_points is null or p_restored_points < 0 then raise exception 'INVALID_LOYALTY_SETTLEMENT'; end if;
  select * into owner_row from public.shopify_order_accounts where order_id = p_order_id;
  if not found then raise exception 'LOYALTY_ORDER_OWNER_UNVERIFIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('shopify-loyalty:' || owner_row.attempt_id::text,0));
  select * into snap from public.shopify_order_snapshots where shopify_order_id = p_order_id for share;
  if snap.source_updated_at is distinct from p_source_updated_at or snap.currency <> 'EUR'
    or snap.financial_status not in ('PAID','PARTIALLY_REFUNDED','REFUNDED') or snap.financial_status is null then
    raise exception 'LOYALTY_PAYMENT_NOT_VERIFIED'; end if;
  if (snap.financial_status = 'PAID' and (p_refunded_cents <> 0 or p_restored_points <> 0))
    or (snap.financial_status = 'REFUNDED' and p_refunded_cents <> p_paid_cents)
    or (p_restored_points > 0 and p_refunded_cents = 0) then raise exception 'LOYALTY_REFUND_NOT_VERIFIED'; end if;
  -- A verified first purchase may create its own empty account. Serialize with
  -- late legacy earning by exact auth email; never import, case-fold or transfer
  -- an existing account belonging to another authenticated user.
  declare
    verified_email text;
  begin
    select email into verified_email from auth.users where id = owner_row.user_id;
    if verified_email is null then raise exception 'LOYALTY_ACCOUNT_NOT_FOUND'; end if;
    perform pg_advisory_xact_lock(hashtextextended('loyalty-account:' || verified_email,0));
    insert into public.loyalty_points(email,user_id) values(verified_email,owner_row.user_id)
      on conflict(email) do nothing;
  end;
  select lp.* into a from public.loyalty_points lp join auth.users u on lp.email = u.email
    where u.id = owner_row.user_id and (lp.user_id is null or lp.user_id = u.id) for update of lp;
  if not found then raise exception 'LOYALTY_ACCOUNT_NOT_FOUND'; end if;
  if a.points_balance is null or a.lifetime_points is null then raise exception 'LOYALTY_BALANCE_INVALID'; end if;
  select * into r from public.shopify_loyalty_reservations where attempt_id = owner_row.attempt_id for update;
  if found then
    if r.account_id <> a.id or r.status = 'released' or (r.order_id is not null and r.order_id <> p_order_id)
      or p_discount_cents <> (r.points / 100) * 500 or p_restored_points > r.points then raise exception 'LOYALTY_DISCOUNT_MISMATCH'; end if;
    if p_restored_points > floor(r.points::numeric * p_refunded_cents / greatest(p_paid_cents,1))
      or (snap.financial_status = 'REFUNDED' and p_restored_points <> r.points) then raise exception 'LOYALTY_RESTORATION_MISMATCH'; end if;
  elsif p_discount_cents <> 0 or p_restored_points <> 0 then raise exception 'LOYALTY_RESERVATION_MISSING'; end if;
  select * into s from public.shopify_loyalty_settlements where order_id = p_order_id;
  if found then
    if s.account_id <> a.id then raise exception 'LOYALTY_ACCOUNT_MISMATCH'; end if;
    if p_source_updated_at < s.source_updated_at then return 'stale'; end if;
    if p_source_updated_at = s.source_updated_at then
      if (s.paid_cents,s.refunded_cents,s.discount_cents,s.restored_points) is distinct from
        (p_paid_cents,p_refunded_cents,p_discount_cents,p_restored_points) then raise exception 'LOYALTY_SETTLEMENT_CONFLICT'; end if;
      return 'duplicate';
    end if;
    if p_paid_cents < s.paid_cents or p_refunded_cents < s.refunded_cents or p_restored_points < s.restored_points
      or p_discount_cents <> s.discount_cents then raise exception 'LOYALTY_NONMONOTONIC_SETTLEMENT'; end if;
  end if;
  earned := p_paid_cents / 100;
  reversed := least(earned,p_refunded_cents / 100);
  -- Record earning and reversal independently; refund-first/replay converge on
  -- the same cumulative result, including multiple sub-euro partial refunds.
  delta := earned - coalesce(s.earned_points,0);
  if delta > 0 then perform public.post_shopify_loyalty('earn:' || p_order_id || ':' || earned::text,
    a.id,owner_row.attempt_id,p_order_id,'earn',delta,delta); end if;
  delta := reversed - coalesce(s.reversed_points,0);
  if delta > 0 then perform public.post_shopify_loyalty('reverse:' || p_order_id || ':' || reversed::text,
    a.id,owner_row.attempt_id,p_order_id,'reverse',-delta,-delta); end if;
  restore_delta := p_restored_points - coalesce(s.restored_points,0);
  if restore_delta > 0 then perform public.post_shopify_loyalty('restore:' || p_order_id || ':' || p_restored_points::text,
    a.id,owner_row.attempt_id,p_order_id,'restore',restore_delta,0); end if;
  if r.attempt_id is not null and r.status = 'reserved' then
    update public.shopify_loyalty_reservations set status = 'consumed',order_id = p_order_id where attempt_id = owner_row.attempt_id;
  end if;
  insert into public.shopify_loyalty_settlements(order_id,account_id,source_updated_at,paid_cents,refunded_cents,discount_cents,restored_points,earned_points,reversed_points)
    values(p_order_id,a.id,p_source_updated_at,p_paid_cents,p_refunded_cents,p_discount_cents,p_restored_points,earned,reversed)
    on conflict(order_id) do update set source_updated_at=excluded.source_updated_at,paid_cents=excluded.paid_cents,
      refunded_cents=excluded.refunded_cents,restored_points=excluded.restored_points,earned_points=excluded.earned_points,reversed_points=excluded.reversed_points;
  return 'applied';
end $$;
revoke all on function public.reserve_shopify_loyalty(uuid,uuid,integer),
  public.release_failed_shopify_loyalty(uuid),public.settle_shopify_loyalty(text,timestamptz,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.reserve_shopify_loyalty(uuid,uuid,integer),
  public.release_failed_shopify_loyalty(uuid),public.settle_shopify_loyalty(text,timestamptz,integer,integer,integer,integer) to service_role;
