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
  expected_quantity integer check(expected_quantity>=0),
  target_quantity integer check(target_quantity>=0),
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
  unique(order_id,variant_id),
  check((expected_quantity is null and target_quantity is null) or (expected_quantity is not null and target_quantity is not null and target_quantity-expected_quantity=delta))
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
  if o.payment_status is distinct from 'paid' then return jsonb_build_object('ok',true,'skipped',true,'reason','not_paid'); end if;
  if o.stock_decremented_at is not null then return jsonb_build_object('ok',true,'skipped',true,'reason','already_decremented'); end if;
  if not exists(select 1 from public.order_items where order_id=p_order) then raise exception 'NO_ORDER_ITEMS'; end if;
  if exists(select 1 from public.order_items where order_id=p_order and (quantity is null or quantity<1)) then raise exception 'INVALID_ORDER_QUANTITY'; end if;
  perform set_config('mose.stock_owner_writer','legacy_paid',true);
  -- Lock all variant rows in deterministic order before processing duplicate/presale lines.
  perform 1 from public.product_variants where id in(select variant_id from public.order_items where order_id=p_order and not coalesce(is_gift_card,false) and variant_id is not null) order by id for update;
  for line in select variant_id,coalesce(is_presale,false) as presale,sum(quantity)::integer as qty
    from public.order_items where order_id=p_order and not coalesce(is_gift_card,false) and variant_id is not null
    group by variant_id,coalesce(is_presale,false) order by variant_id,coalesce(is_presale,false) desc loop
    select * into v from public.product_variants where id=line.variant_id;
    if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
    select * into own from public.shopify_stock_ownership where variant_id=line.variant_id;
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
  perform set_config('mose.stock_owner_writer','',true);
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
    dead_letter_at=case when p_error is not null and (attempts>=8 or p_error='STOCK_COMPARE_FAILED_REVIEW_REQUIRED') then now() else null end,
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
  if row(new.id,new.order_id,new.variant_id,new.generation,new.inventory_item_id,new.location_id,new.delta,new.expected_quantity,new.target_quantity)
    is distinct from row(old.id,old.order_id,old.variant_id,old.generation,old.inventory_item_id,old.location_id,old.delta,old.expected_quantity,old.target_quantity)
    then raise exception 'STOCK_DELTA_INTENT_IMMUTABLE'; end if;
  return new;
end $$;
create trigger guard_legacy_stock_intent before update on public.shopify_legacy_stock_outbox
for each row execute function public.guard_legacy_stock_intent();
revoke all on function public.guard_legacy_stock_intent() from public,anon,authenticated;

-- Retire the historical pending->paid status trigger: the stamped RPC/client path is the sole stock owner.
-- Deploy the atomic caller before enabling its flag; normal legacy client decrement remains available while off.
drop trigger if exists trigger_decrease_stock on public.orders;

alter table public.shopify_stock_ownership add column shopify_variant_id text check(shopify_variant_id ~ '^gid://shopify/ProductVariant/[0-9]+$');
alter table public.shopify_legacy_stock_outbox alter column order_id drop not null;
alter table public.shopify_legacy_stock_outbox drop constraint shopify_legacy_stock_outbox_delta_check;
alter table public.shopify_legacy_stock_outbox add constraint stock_outbox_nonzero_delta check(delta<>0);
alter table public.shopify_legacy_stock_outbox add column source_key text;
create unique index stock_outbox_source_variant on public.shopify_legacy_stock_outbox(source_key,variant_id) where source_key is not null;

create table public.inventory_command_journal (
  operation_id uuid primary key, actor_id uuid not null, kind text not null,
  payload jsonb not null,result jsonb not null,created_at timestamptz not null default now()
);
alter table public.inventory_command_journal enable row level security;
revoke all on public.inventory_command_journal from public,anon,authenticated;
grant all on public.inventory_command_journal to service_role;

create function public.guard_owned_stock_write() returns trigger
language plpgsql security definer set search_path=public as $$
declare own public.shopify_stock_ownership%rowtype; writer text; key text; requested integer;
begin
  select * into own from public.shopify_stock_ownership where variant_id=new.id;
  if not found then return new; end if;
  writer:=current_setting('mose.stock_owner_writer',true);
  if writer='legacy_paid' then return new; end if;
  if writer='mirror' then
    if new.presale_stock_quantity is distinct from old.presale_stock_quantity then raise exception 'OWNED_PRESALE_WRITE_FORBIDDEN'; end if;
    return new;
  end if;
  if writer='inventory_command' then
    if new.presale_stock_quantity is distinct from old.presale_stock_quantity then raise exception 'OWNED_PRESALE_WRITE_FORBIDDEN'; end if;
    key:=nullif(current_setting('mose.stock_operation',true),'');
    requested:=nullif(current_setting('mose.stock_requested_delta',true),'')::integer;
    if key is null or requested is null or requested=0 then raise exception 'STOCK_OPERATION_REQUIRED'; end if;
    insert into public.shopify_legacy_stock_outbox(variant_id,generation,inventory_item_id,location_id,delta,source_key,local_shortfall,expected_quantity,target_quantity)
      values(new.id,own.generation,own.inventory_item_id,own.location_id,requested,key,coalesce(old.stock_quantity,0)+requested<0,
        nullif(current_setting('mose.stock_expected',true),'')::integer,
        case when nullif(current_setting('mose.stock_expected',true),'') is not null then nullif(current_setting('mose.stock_expected',true),'')::integer+requested else null end);
    return new;
  end if;
  if new.stock_quantity is distinct from old.stock_quantity or new.presale_stock_quantity is distinct from old.presale_stock_quantity
    then raise exception 'SHOPIFY_OWNS_STOCK_USE_REVIEWED_INVENTORY_COMMAND'; end if;
  return new;
end $$;
create trigger guard_owned_stock_write before update on public.product_variants for each row execute function public.guard_owned_stock_write();
revoke all on function public.guard_owned_stock_write() from public,anon,authenticated;

-- One stable operation UUID per unchanged admin action. Authenticated browser roles cannot touch the journal/outbox directly.
create function public.apply_inventory_command(p_operation uuid,p_kind text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid; old public.inventory_command_journal%rowtype; result jsonb; line record; receipt jsonb;
  variant uuid; qty integer; invtype text; return_cutoff timestamptz; received timestamptz; return_items jsonb;
begin
  actor:=public._inventory_assert_admin();
  if p_operation is null or p_payload is null then raise exception 'INVENTORY_OPERATION_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('inventory_command:'||p_operation::text,0));
  select * into old from public.inventory_command_journal where operation_id=p_operation;
  if found then
    if (old.actor_id<>actor and p_kind<>'return') or old.kind<>p_kind or old.payload<>p_payload then raise exception 'INVENTORY_OPERATION_CONFLICT'; end if;
    return old.result;
  end if;
  perform set_config('mose.stock_owner_writer','inventory_command',true);
  perform set_config('mose.stock_operation',p_operation::text,true);
  perform set_config('mose.stock_expected','',true);
  if p_kind='adjust' then
    variant:=(p_payload->>'variantId')::uuid; qty:=(p_payload->>'delta')::integer; invtype:=p_payload->>'field';
    if p_payload->>'expectedStock' is not null then
      select stock_quantity into qty from public.product_variants where id=variant for update;
      if qty is distinct from (p_payload->>'expectedStock')::integer then raise exception 'STOCK_CHANGED_RELOAD_REQUIRED'; end if;
      perform set_config('mose.stock_expected',qty::text,true);
      qty:=(p_payload->>'delta')::integer;
    end if;
    if invtype='presale' and exists(select 1 from public.shopify_stock_ownership where variant_id=variant) then raise exception 'OWNED_PRESALE_WRITE_FORBIDDEN'; end if;
    if qty is null or qty=0 then raise exception 'INVALID_STOCK_DELTA'; end if;
    perform set_config('mose.stock_requested_delta',qty::text,true);
    if invtype='regular' then
      result:=public.inventory_apply_regular_delta(variant,qty,coalesce(p_payload->>'reason','manual'),p_payload->>'notes',null);
    elsif invtype='presale' then
      result:=public.inventory_apply_presale_delta(variant,qty,coalesce(p_payload->>'reason','manual'),p_payload->>'notes',null);
    else raise exception 'INVALID_INVENTORY_TYPE'; end if;
  elsif p_kind='receive' then
    if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines')=0 then raise exception 'RECEIPT_LINES_REQUIRED'; end if;
    if exists(select 1 from jsonb_array_elements(p_payload->'lines') e where (e->>'quantity_added')::integer is null or (e->>'quantity_added')::integer<1 or (e->>'variant_id') is null or coalesce(e->>'inventory_type','regular') not in('regular','presale')) then raise exception 'INVALID_RECEIPT_LINE'; end if;
    if exists(select 1 from jsonb_array_elements(p_payload->'lines') e join public.shopify_stock_ownership o on o.variant_id=(e->>'variant_id')::uuid where e->>'inventory_type'='presale') then raise exception 'OWNED_PRESALE_WRITE_FORBIDDEN'; end if;
    -- Existing receipt transaction/audit is reused. Per-line deltas are set by its regular-delta wrapper below.
    select jsonb_agg(jsonb_build_object('variant_id',r.variant,'quantity_added',r.qty,'inventory_type',r.invtype) order by r.variant,r.invtype) into receipt
      from(select (e->>'variant_id')::uuid variant,sum((e->>'quantity_added')::integer)::integer qty,coalesce(e->>'inventory_type','regular') invtype
        from jsonb_array_elements(p_payload->'lines') e group by (e->>'variant_id')::uuid,coalesce(e->>'inventory_type','regular')) r;
    result:=public.inventory_commit_receipt(p_payload->>'title',receipt,p_payload->>'notes',(p_payload->>'expectedTotal')::integer);
  elsif p_kind='return' then
    -- Validated order/return binding, never a request-supplied variant or quantity.
    select received_at,public.returns.return_items into received,return_items from public.returns where id=(p_payload->>'returnId')::uuid and status in('return_received','refunded','refund_processing') for update;
    if not found then raise exception 'RETURN_NOT_RECEIVED'; end if;
    if jsonb_typeof(return_items) is distinct from 'array' then raise exception 'RETURN_ITEMS_REQUIRED'; end if;
    if jsonb_array_length(return_items)=0 then raise exception 'RETURN_ITEMS_REQUIRED'; end if;
    select cutover_at into return_cutoff from public.inventory_return_stock_cutover where id=1;
    if return_cutoff is null or received is null or received<return_cutoff then raise exception 'LEGACY_RETURN_STOCK_REVIEW_REQUIRED'; end if;
    perform 1 from public.order_items where id in(select (ri->>'order_item_id')::uuid from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri where r.id=(p_payload->>'returnId')::uuid) order by id for update;
    if exists(select 1 from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      left join public.order_items oi on oi.id=(ri->>'order_item_id')::uuid and oi.order_id=r.order_id
      where r.id=(p_payload->>'returnId')::uuid and (oi.id is null or (ri->>'quantity')::integer is null or (ri->>'quantity')::integer<1))
      then raise exception 'INVALID_RETURN_STOCK_BINDING'; end if;
    if exists(select 1 from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      join public.order_items oi on oi.id=(ri->>'order_item_id')::uuid and oi.order_id=r.order_id
      where r.id=(p_payload->>'returnId')::uuid group by oi.id,oi.quantity having sum((ri->>'quantity')::integer)>oi.quantity)
      then raise exception 'RETURN_QUANTITY_EXCEEDS_ORDER'; end if;
    -- Unknown pre-cutoff restocks must be reconciled before this line can be returned again.
    if exists(select 1 from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      join public.returns prior on prior.order_id=r.order_id and prior.id<>r.id and prior.status in('return_received','refunded','refund_processing')
      cross join lateral jsonb_array_elements(prior.return_items) pi
      where r.id=(p_payload->>'returnId')::uuid and (prior.received_at is null or prior.received_at<return_cutoff) and pi->>'order_item_id'=ri->>'order_item_id'
        and not exists(select 1 from public.inventory_return_stock_lines l where l.return_id=prior.id and l.order_item_id=(pi->>'order_item_id')::uuid))
      then raise exception 'LEGACY_RETURN_STOCK_REVIEW_REQUIRED'; end if;
    if exists(select 1 from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      join public.order_items oi on oi.id=(ri->>'order_item_id')::uuid
      where r.id=(p_payload->>'returnId')::uuid group by oi.id,oi.quantity having
        sum((ri->>'quantity')::integer)+coalesce((select sum(quantity) from public.inventory_return_stock_lines where order_item_id=oi.id),0)>oi.quantity)
      then raise exception 'CUMULATIVE_RETURN_QUANTITY_EXCEEDS_ORDER'; end if;
    insert into public.inventory_return_stock_lines(return_id,order_item_id,quantity)
      select r.id,oi.id,sum((ri->>'quantity')::integer)::integer
      from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      join public.order_items oi on oi.id=(ri->>'order_item_id')::uuid and oi.order_id=r.order_id
      where r.id=(p_payload->>'returnId')::uuid group by r.id,oi.id;
    for line in select oi.variant_id,sum((ri->>'quantity')::integer)::integer qty
      from public.returns r cross join lateral jsonb_array_elements(r.return_items) ri
      join public.order_items oi on oi.id=(ri->>'order_item_id')::uuid and oi.order_id=r.order_id
      where r.id=(p_payload->>'returnId')::uuid and oi.variant_id is not null and not coalesce(oi.is_gift_card,false)
        and (ri->>'quantity')::integer between 1 and oi.quantity
      group by oi.variant_id order by oi.variant_id loop
      perform set_config('mose.stock_requested_delta',line.qty::text,true);
      perform public.inventory_apply_regular_delta(line.variant_id,line.qty,'return',null,null);
    end loop;
    result:=jsonb_build_object('return_id',p_payload->>'returnId','restocked',true);
  else raise exception 'INVALID_INVENTORY_COMMAND'; end if;
  perform set_config('mose.stock_owner_writer','',true);perform set_config('mose.stock_requested_delta','',true);perform set_config('mose.stock_operation','',true);perform set_config('mose.stock_expected','',true);
  if exists(select 1 from public.shopify_legacy_stock_outbox where source_key=p_operation::text) then result:=result||jsonb_build_object('shopify_pending',true); end if;
  insert into public.inventory_command_journal(operation_id,actor_id,kind,payload,result) values(p_operation,actor,p_kind,p_payload,result);
  return result;
end $$;
revoke all on function public.apply_inventory_command(uuid,text,jsonb) from public,anon;
grant execute on function public.apply_inventory_command(uuid,text,jsonb) to authenticated,service_role;

-- Preserve the original locked/audited adjustment, carrying each receipt line delta into the bridge.
CREATE OR REPLACE FUNCTION public.inventory_apply_regular_delta(
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_receipt_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_prev int;
  v_new int;
  v_actual int;
BEGIN
  v_uid := public._inventory_assert_admin();
  if current_setting('mose.stock_owner_writer',true)='inventory_command' then
    perform set_config('mose.stock_requested_delta',p_delta::text,true);
  end if;

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'variant_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT stock_quantity INTO v_prev FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_new := GREATEST(0, COALESCE(v_prev, 0) + p_delta);
  v_actual := v_new - COALESCE(v_prev, 0);

  UPDATE public.product_variants
  SET stock_quantity = v_new
  WHERE id = p_variant_id;

  INSERT INTO public.inventory_logs (
    variant_id, profile_id, change_amount, previous_stock, new_stock,
    inventory_type, reason, notes, receipt_id
  ) VALUES (
    p_variant_id, v_uid, v_actual, COALESCE(v_prev, 0), v_new,
    'regular', trim(p_reason), p_notes, p_receipt_id
  );

  RETURN jsonb_build_object(
    'variant_id', p_variant_id,
    'previous_stock', COALESCE(v_prev, 0),
    'new_stock', v_new,
    'change_amount', v_actual,
    'inventory_type', 'regular'
  );
END;
$$;

-- Refresh only a current, fresh known provider snapshot after every outstanding delta has settled.
create function public.mirror_owned_shopify_stock(p_variant uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare own public.shopify_stock_ownership%rowtype; mapping public.shopify_variant_mappings%rowtype;
  snap public.shopify_inventory_snapshots%rowtype; last_delivery timestamptz;
begin
  perform 1 from public.product_variants where id=p_variant for update;
  select * into own from public.shopify_stock_ownership where variant_id=p_variant;
  if not found then return false; end if;
  select * into mapping from public.shopify_variant_mappings where mose_variant_id=p_variant::text;
  if not found or not mapping.enabled or mapping.fulfillment_owner<>'mose' or mapping.shopify_variant_id is distinct from own.shopify_variant_id
    or mapping.inventory_location_id is distinct from own.location_id or mapping.inventory_item_id is distinct from own.inventory_item_id then return false; end if;
  if exists(select 1 from public.shopify_legacy_stock_outbox where variant_id=p_variant and processed_at is null) then return false; end if;
  select max(processed_at) into last_delivery from public.shopify_legacy_stock_outbox where variant_id=p_variant;
  select * into snap from public.shopify_inventory_snapshots where mose_variant_id=p_variant::text;
  if not found or snap.mapping_revision<>mapping.inventory_revision or snap.status<>'known' or snap.available_quantity is null
    or snap.observed_at<now()-interval '15 minutes' or snap.observed_at>now() or snap.observed_at<own.cutover_at
    or (last_delivery is not null and snap.observed_at<=last_delivery) then return false; end if;
  perform set_config('mose.stock_owner_writer','mirror',true);
  update public.product_variants set stock_quantity=snap.available_quantity where id=p_variant;
  perform set_config('mose.stock_owner_writer','',true);
  return true;
end $$;
revoke all on function public.mirror_owned_shopify_stock(uuid) from public,anon,authenticated;
grant execute on function public.mirror_owned_shopify_stock(uuid) to service_role;

alter table public.shopify_variant_mappings add column inventory_item_id text check(inventory_item_id ~ '^gid://shopify/InventoryItem/[0-9]+$');
create table public.shopify_stock_bridge_state(id smallint primary key check(id=1),last_worker_at timestamptz);
insert into public.shopify_stock_bridge_state(id) values(1);
alter table public.shopify_stock_bridge_state enable row level security;
revoke all on public.shopify_stock_bridge_state from public,anon,authenticated;
grant all on public.shopify_stock_bridge_state to service_role;
create function public.mark_legacy_stock_worker() returns void
language sql security definer set search_path=public as $$ update public.shopify_stock_bridge_state set last_worker_at=now() where id=1 $$;
revoke all on function public.mark_legacy_stock_worker() from public,anon,authenticated;
grant execute on function public.mark_legacy_stock_worker() to service_role;
create table public.inventory_return_stock_cutover(id smallint primary key check(id=1),cutover_at timestamptz);
insert into public.inventory_return_stock_cutover(id) values(1);
create table public.inventory_return_stock_lines(return_id uuid references public.returns(id),order_item_id uuid references public.order_items(id),quantity integer not null check(quantity>0),primary key(return_id,order_item_id));
alter table public.inventory_return_stock_cutover enable row level security;
alter table public.inventory_return_stock_lines enable row level security;
revoke all on public.inventory_return_stock_cutover,public.inventory_return_stock_lines from public,anon,authenticated;
grant all on public.inventory_return_stock_cutover,public.inventory_return_stock_lines to service_role;
create or replace function public.legacy_stock_bridge_health() returns jsonb
language sql security definer set search_path=public as $$
  select jsonb_build_object('pending',count(*) filter(where processed_at is null),
    'deadLetters',count(*) filter(where dead_letter_at is not null),'shortfalls',count(*) filter(where local_shortfall),
    'oldestPendingAt',min(created_at) filter(where processed_at is null),
    'expectedOwnershipCount',(select count(*) from public.shopify_variant_mappings where enabled and fulfillment_owner='mose'),
    'verifiedOwnershipCount',(select count(*) from public.shopify_variant_mappings m
      join public.shopify_stock_ownership o on o.variant_id::text=m.mose_variant_id
      join public.product_variants v on v.id=o.variant_id
      join public.shopify_inventory_snapshots s on s.mose_variant_id=m.mose_variant_id
      where m.enabled and m.fulfillment_owner='mose' and m.shopify_variant_id=o.shopify_variant_id
        and m.inventory_item_id=o.inventory_item_id and m.inventory_location_id=o.location_id and o.cutover_at<=now()
        and s.mapping_revision=m.inventory_revision and s.status='known' and s.available_quantity=v.stock_quantity
        and coalesce(v.presale_stock_quantity,0)=0 and s.observed_at between greatest(o.cutover_at,now()-interval '15 minutes') and now()
        and not exists(select 1 from public.shopify_legacy_stock_outbox q where q.variant_id=o.variant_id and
          (q.processed_at is null or q.processed_at>=s.observed_at))),
    'returnStockCutoverReady',(select cutover_at is not null and cutover_at<=now() from public.inventory_return_stock_cutover where id=1),
    'lastWorkerAt',(select last_worker_at from public.shopify_stock_bridge_state where id=1)) from public.shopify_legacy_stock_outbox;
$$;

create function public.mirror_stock_snapshot_trigger() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.mose_variant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform public.mirror_owned_shopify_stock(new.mose_variant_id::uuid);
  end if;
  return new;
end $$;
create trigger mirror_stock_snapshot after insert or update on public.shopify_inventory_snapshots
for each row execute function public.mirror_stock_snapshot_trigger();
revoke all on function public.mirror_stock_snapshot_trigger() from public,anon,authenticated;
create function public.guard_stock_source_key() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.source_key is distinct from old.source_key then raise exception 'STOCK_SOURCE_KEY_IMMUTABLE'; end if;
  return new;
end $$;
create trigger guard_stock_source_key before update on public.shopify_legacy_stock_outbox for each row execute function public.guard_stock_source_key();
revoke all on function public.guard_stock_source_key() from public,anon,authenticated;

create function public.guard_owned_legacy_order_line() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.product_variants where id in (case when tg_op='DELETE' then old.variant_id else new.variant_id end,case when tg_op='UPDATE' then old.variant_id else null end) order by id for update;
  if exists(select 1 from public.shopify_stock_ownership where variant_id=case when tg_op='DELETE' then old.variant_id else new.variant_id end)
    or (tg_op='UPDATE' and exists(select 1 from public.shopify_stock_ownership where variant_id=old.variant_id))
    then raise exception 'SHOPIFY_OWNED_LEGACY_ORDER_EDIT_FORBIDDEN'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger guard_owned_legacy_order_line before insert or update or delete on public.order_items
for each row execute function public.guard_owned_legacy_order_line();
revoke all on function public.guard_owned_legacy_order_line() from public,anon,authenticated;
