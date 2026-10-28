-- STAGED ONLY. No ownership rows, stock transfers or cron activation are created here.
-- Enable LEGACY_INVENTORY_ATOMIC_ENABLED only after RPC/trigger preflight.
create table public.shopify_stock_ownership (
  variant_id uuid primary key references public.product_variants(id),
  inventory_item_id text not null check (inventory_item_id ~ '^gid://shopify/InventoryItem/[0-9]+$'),
  location_id text not null check (location_id ~ '^gid://shopify/Location/[0-9]+$'),
  generation uuid not null default gen_random_uuid(),
  cutover_at timestamptz not null,
  verification_reference text not null check(length(verification_reference)>10)
);
create table public.shopify_legacy_stock_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  variant_id uuid not null references public.product_variants(id),
  generation uuid not null,
  inventory_item_id text not null,
  location_id text not null,
  delta integer not null check(delta<0),
  local_shortfall boolean not null default false,
  created_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  processed_at timestamptz,
  dead_letter_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique(order_id,variant_id)
);
create index shopify_legacy_stock_pending on public.shopify_legacy_stock_outbox(created_at) where processed_at is null;
alter table public.shopify_stock_ownership enable row level security;
alter table public.shopify_legacy_stock_outbox enable row level security;
revoke all on public.shopify_stock_ownership,public.shopify_legacy_stock_outbox from public,anon,authenticated;
grant all on public.shopify_stock_ownership,public.shopify_legacy_stock_outbox to service_role;

-- The paid order lock owns idempotency. Every line and the stamp commit or roll back together.
-- Shopify-native orders never enter this legacy orders table/RPC.
create function public.apply_legacy_paid_stock(p_order uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; line record; v public.product_variants%rowtype;
  own public.shopify_stock_ownership%rowtype; reg integer; pre integer; take_reg integer;
begin
  select * into o from public.orders where id=p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_status <> 'paid' then return jsonb_build_object('ok',true,'skipped',true,'reason','not_paid'); end if;
  if o.stock_decremented_at is not null then return jsonb_build_object('ok',true,'skipped',true,'reason','already_decremented'); end if;
  if not exists(select 1 from public.order_items where order_id=p_order) then raise exception 'NO_ORDER_ITEMS'; end if;
  if exists(select 1 from public.order_items where order_id=p_order and (quantity is null or quantity<1)) then raise exception 'INVALID_ORDER_QUANTITY'; end if;
  -- Lock all variant rows in deterministic order before processing duplicate/presale lines.
  perform 1 from public.product_variants where id in(select variant_id from public.order_items where order_id=p_order and not coalesce(is_gift_card,false) and variant_id is not null) order by id for update;
  for line in select variant_id,coalesce(is_presale,false) as presale,sum(quantity)::integer as qty
    from public.order_items where order_id=p_order and not coalesce(is_gift_card,false) and variant_id is not null
    group by variant_id,coalesce(is_presale,false) order by variant_id,coalesce(is_presale,false) desc loop
    select * into v from public.product_variants where id=line.variant_id;
    if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
    select * into own from public.shopify_stock_ownership where variant_id=line.variant_id for share;
    reg:=coalesce(v.stock_quantity,0); pre:=coalesce(v.presale_stock_quantity,0);
    if found then
      -- Only historical paid orders may create adjustments after Shopify owns availability.
      if o.created_at>=own.cutover_at then raise exception 'NEW_LEGACY_ORDER_AFTER_STOCK_CUTOVER'; end if;
      if line.presale or pre>0 then raise exception 'PRESALE_STOCK_CUTOVER_UNSUPPORTED'; end if;
      insert into public.shopify_legacy_stock_outbox(order_id,variant_id,generation,inventory_item_id,location_id,delta,local_shortfall)
        values(p_order,line.variant_id,own.generation,own.inventory_item_id,own.location_id,-line.qty,reg<line.qty);
      -- Local value is only a shadow after ownership changes. A shortfall stays visible in the outbox.
      update public.product_variants set stock_quantity=greatest(0,reg-line.qty) where id=line.variant_id;
    elsif line.presale then
      if pre<line.qty then raise exception 'INSUFFICIENT_PRESALE_STOCK'; end if;
      update public.product_variants set presale_stock_quantity=pre-line.qty where id=line.variant_id;
    else
      if reg+pre<line.qty then raise exception 'INSUFFICIENT_STOCK'; end if;
      take_reg:=least(reg,line.qty);
      update public.product_variants set stock_quantity=reg-take_reg,presale_stock_quantity=pre-(line.qty-take_reg) where id=line.variant_id;
    end if;
  end loop;
  update public.orders set stock_decremented_at=now() where id=p_order;
  return jsonb_build_object('ok',true);
end $$;

create function public.claim_legacy_stock_delta() returns setof public.shopify_legacy_stock_outbox
language plpgsql security definer set search_path=public as $$
begin
  -- Provider idempotency has finite retention. Old uncertain outcomes need reconciliation, not a new key.
  update public.shopify_legacy_stock_outbox set dead_letter_at=now(),last_error='IDEMPOTENCY_WINDOW_REQUIRES_RECONCILIATION'
    where processed_at is null and dead_letter_at is null and first_attempt_at < now()-interval '22 hours' and (lease_until is null or lease_until<now());
  return query with candidate as (
    select q.id from public.shopify_legacy_stock_outbox q where q.processed_at is null and q.dead_letter_at is null
      and (q.lease_until is null or q.lease_until<now()) order by q.created_at,q.id for update skip locked limit 1
  ) update public.shopify_legacy_stock_outbox q set lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',
    first_attempt_at=coalesce(q.first_attempt_at,now()),attempts=q.attempts+1 from candidate c where q.id=c.id returning q.*;
end $$;
create function public.finish_legacy_stock_delta(p_id uuid,p_lease uuid,p_error text default null) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update public.shopify_legacy_stock_outbox set processed_at=case when p_error is null then now() else null end,
    dead_letter_at=case when p_error is not null and attempts>=8 then now() else null end,
    last_error=left(p_error,120),lease_until=case when p_error is null then null else now()+interval '5 minutes' end,lease_token=null
    where id=p_id and lease_token=p_lease and lease_until>now() and processed_at is null and dead_letter_at is null;
  return found;
end $$;
create function public.legacy_stock_bridge_health() returns jsonb
language sql security definer set search_path=public as $$
  select jsonb_build_object('pending',count(*) filter(where processed_at is null),
    'deadLetters',count(*) filter(where dead_letter_at is not null),
    'shortfalls',count(*) filter(where local_shortfall),
    'oldestPendingAt',min(created_at) filter(where processed_at is null)) from public.shopify_legacy_stock_outbox;
$$;
revoke all on function public.apply_legacy_paid_stock(uuid),public.claim_legacy_stock_delta(),public.finish_legacy_stock_delta(uuid,uuid,text),public.legacy_stock_bridge_health() from public,anon,authenticated;
grant execute on function public.apply_legacy_paid_stock(uuid),public.claim_legacy_stock_delta(),public.finish_legacy_stock_delta(uuid,uuid,text),public.legacy_stock_bridge_health() to service_role;

-- Ownership changes serialize with paid-stock writes. A pending/unknown remote delta pins its route.
create function public.guard_stock_ownership_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' and new.variant_id<>old.variant_id then raise exception 'STOCK_OWNERSHIP_ID_IMMUTABLE'; end if;
  perform 1 from public.product_variants where id=case when tg_op='DELETE' then old.variant_id else new.variant_id end for update;
  if exists(select 1 from public.shopify_legacy_stock_outbox where variant_id=case when tg_op='DELETE' then old.variant_id else new.variant_id end and processed_at is null)
    then raise exception 'PENDING_STOCK_DELTA_PINS_OWNERSHIP'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger guard_stock_ownership_change before insert or update or delete on public.shopify_stock_ownership
for each row execute function public.guard_stock_ownership_change();
revoke all on function public.guard_stock_ownership_change() from public,anon,authenticated;

create function public.guard_legacy_stock_intent() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if row(new.id,new.order_id,new.variant_id,new.generation,new.inventory_item_id,new.location_id,new.delta)
    is distinct from row(old.id,old.order_id,old.variant_id,old.generation,old.inventory_item_id,old.location_id,old.delta)
    then raise exception 'STOCK_DELTA_INTENT_IMMUTABLE'; end if;
  return new;
end $$;
create trigger guard_legacy_stock_intent before update on public.shopify_legacy_stock_outbox
for each row execute function public.guard_legacy_stock_intent();
revoke all on function public.guard_legacy_stock_intent() from public,anon,authenticated;
