-- Staged unified checkout foundation. No grants to browser roles; every release gate defaults OFF.
-- Do not apply to production until catalog, balances, inventory cutoff and provider access are verified.
create table public.shopify_integration_state (
  id smallint primary key default 1 check (id = 1),
  app_installed boolean not null default false,
  checkout_enabled boolean not null default false,
  catalog_verified boolean not null default false,
  inventory_verified boolean not null default false,
  benefits_verified boolean not null default false,
  fulfillment_verified boolean not null default false,
  market_verified boolean not null default false,
  last_worker_at timestamptz,
  last_reconciled_at timestamptz,
  last_error text,
  reconcile_watermark timestamptz not null default now() - interval '7 days',
  reconcile_cursor text,
  reconcile_window_end timestamptz,
  reconcile_lease_until timestamptz,
  reconcile_lease_token uuid
);
insert into public.shopify_integration_state (id) values (1);

create table public.shopify_variant_mappings (
  mose_variant_id text primary key check (length(mose_variant_id) between 1 and 160),
  mose_product_id text not null,
  shopify_variant_id text not null unique check (shopify_variant_id ~ '^gid://shopify/ProductVariant/[0-9]+$'),
  shopify_product_id text not null check (shopify_product_id ~ '^gid://shopify/Product/[0-9]+$'),
  fulfillment_owner text not null check (fulfillment_owner in ('mose','tapstitch','digital')),
  supplier_model text,
  supplier_color text,
  size text,
  supplier_reference text,
  supplier_link_verified boolean not null default false,
  sample_verified boolean not null default false,
  enabled boolean not null default false,
  price_eur_cents integer not null check (price_eur_cents > 0),
  verified_at timestamptz,
  verification_reference text,
  updated_at timestamptz not null default now(),
  check (fulfillment_owner <> 'tapstitch' or
    (supplier_model is not null and supplier_model in ('RW0041-P001-V3','RT0028-C001-V2','MB0001-C001-V2','MB0057-C001-V2',
      'UB0083-C001-V2','MB0030-C001-V2','MB0010-C001-V2','UB0018-C001-V2') and supplier_reference is not null)),
  check (not enabled or (verified_at is not null and verification_reference is not null)),
  check (not enabled or fulfillment_owner <> 'tapstitch' or (supplier_link_verified and sample_verified))
);

-- Cart IDs and checkout URLs contain capability secrets. Service role only; never log them.
create table public.shopify_checkout_attempts (
  id uuid primary key,
  session_hash text not null,
  request_fingerprint text not null,
  buyer_hash text not null,
  status text not null check (status in ('creating','ready','unknown','failed')),
  lease_token uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  cart_id text,
  checkout_url text,
  cart_snapshot jsonb not null,
  last_error text
);
create index shopify_attempt_rate on public.shopify_checkout_attempts (buyer_hash, created_at);

create function public.reserve_shopify_checkout(p_id uuid, p_session text, p_fingerprint text,
  p_buyer text, p_snapshot jsonb, p_lease uuid)
returns setof public.shopify_checkout_attempts
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize rate accounting per buyer; store only a secret-keyed IP hash.
  perform pg_advisory_xact_lock(hashtextextended(p_buyer, 0));
  if exists(select 1 from public.shopify_checkout_attempts where id = p_id) then
    return query select * from public.shopify_checkout_attempts
      where id = p_id and session_hash = p_session;
    return;
  end if;
  if (select count(*) from public.shopify_checkout_attempts
      where buyer_hash = p_buyer and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'CHECKOUT_RATE_LIMIT';
  end if;
  return query insert into public.shopify_checkout_attempts
    (id,session_hash,request_fingerprint,buyer_hash,status,lease_token,cart_snapshot)
    values (p_id,p_session,p_fingerprint,p_buyer,'creating',p_lease,p_snapshot) returning *;
end $$;

create function public.finish_shopify_checkout(p_id uuid, p_lease uuid, p_status text,
  p_cart_id text default null, p_checkout_url text default null, p_error text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('ready','unknown','failed') then raise exception 'INVALID_STATE'; end if;
  if p_status = 'ready' and (p_cart_id is null or p_checkout_url is null) then raise exception 'MISSING_CART'; end if;
  update public.shopify_checkout_attempts set status = p_status, cart_id = p_cart_id,
    checkout_url = p_checkout_url, last_error = left(p_error,100)
    where id = p_id and lease_token = p_lease and status = 'creating' and expires_at > now();
  return found;
end $$;

create table public.shopify_webhook_inbox (
  id bigint generated always as identity primary key,
  shop text not null check (shop = 'hp5szr-te.myshopify.com'),
  delivery_id text not null,
  event_id text,
  topic text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  retry_after timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  dead_letter_at timestamptz,
  last_error text,
  unique (shop, delivery_id)
);
create index shopify_inbox_pending on public.shopify_webhook_inbox (retry_after)
  where processed_at is null and dead_letter_at is null;

create table public.shopify_order_snapshots (
  shopify_order_id text primary key,
  order_name text not null,
  source_updated_at timestamptz not null,
  financial_status text,
  fulfillment_status text not null,
  currency text not null,
  total_amount text not null,
  refunded_amount text not null,
  cancelled_at timestamptz,
  snapshot jsonb not null,
  synced_at timestamptz not null default now()
);
create table public.shopify_order_lines (
  line_id text primary key,
  order_id text not null references public.shopify_order_snapshots(shopify_order_id) on delete cascade,
  shopify_variant_id text,
  mose_variant_id text,
  fulfillment_owner text check (fulfillment_owner in ('mose','tapstitch','digital')),
  quantity integer not null check(quantity >= 0),
  current_quantity integer not null check(current_quantity >= 0),
  snapshot jsonb not null
);
create index shopify_lines_order on public.shopify_order_lines(order_id);
create table public.shopify_order_fulfillments (
  fulfillment_id text primary key,
  order_id text not null references public.shopify_order_snapshots(shopify_order_id) on delete cascade,
  status text not null,
  snapshot jsonb not null
);
create table public.shopify_order_refunds (
  refund_id text primary key,
  order_id text not null references public.shopify_order_snapshots(shopify_order_id) on delete cascade,
  snapshot jsonb not null
);

create function public.claim_shopify_events(batch_size integer default 10)
returns setof public.shopify_webhook_inbox
language sql security definer set search_path = public as $$
  update public.shopify_webhook_inbox set lease_until = now() + interval '3 minutes',
    lease_token = gen_random_uuid(), attempts = attempts + 1
  where id in (
    select id from public.shopify_webhook_inbox
    where processed_at is null and dead_letter_at is null and retry_after <= now()
      and (lease_until is null or lease_until < now())
    order by received_at for update skip locked limit least(greatest(batch_size, 1), 20)
  ) returning *;
$$;

-- Projection and acknowledgment share one transaction with a fenced, locked lease.
create function public.complete_shopify_event(p_id bigint, p_lease uuid, p_projection jsonb default null,
  p_product_id text default null, p_uninstalled boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare e public.shopify_webhook_inbox; o jsonb; l jsonb; f jsonb; r jsonb; accepted boolean;
begin
  select * into e from public.shopify_webhook_inbox where id = p_id for update;
  if not found or e.processed_at is not null or e.lease_token is distinct from p_lease or p_lease is null or e.lease_until is null or e.lease_until <= now() then return false; end if;
  if p_projection is not null then
    o := p_projection;
    insert into public.shopify_order_snapshots (shopify_order_id,order_name,source_updated_at,
      financial_status,fulfillment_status,currency,total_amount,refunded_amount,cancelled_at,snapshot)
    values (o->>'id',o->>'name',(o->>'updatedAt')::timestamptz,o->>'displayFinancialStatus',
      o->>'displayFulfillmentStatus',o->>'currencyCode',o->'currentTotalPriceSet'->'shopMoney'->>'amount',
      o->'totalRefundedSet'->'shopMoney'->>'amount',(o->>'cancelledAt')::timestamptz,o)
    on conflict (shopify_order_id) do update set order_name=excluded.order_name,
      source_updated_at=excluded.source_updated_at,financial_status=excluded.financial_status,
      fulfillment_status=excluded.fulfillment_status,currency=excluded.currency,total_amount=excluded.total_amount,
      refunded_amount=excluded.refunded_amount,cancelled_at=excluded.cancelled_at,snapshot=excluded.snapshot,synced_at=now()
    where excluded.source_updated_at >= shopify_order_snapshots.source_updated_at;
    accepted := found;
    if accepted then
      for l in select value from jsonb_array_elements(o->'lineItems'->'nodes') loop
        insert into public.shopify_order_lines (line_id,order_id,shopify_variant_id,mose_variant_id,fulfillment_owner,quantity,current_quantity,snapshot)
        values (l->>'id',o->>'id',l->'variant'->>'id',
          (select mose_variant_id from public.shopify_variant_mappings where shopify_variant_id=l->'variant'->>'id'),
          (select fulfillment_owner from public.shopify_variant_mappings where shopify_variant_id=l->'variant'->>'id'),
          (l->>'quantity')::integer,(l->>'currentQuantity')::integer,l)
        on conflict(line_id) do update set quantity=excluded.quantity,current_quantity=excluded.current_quantity,
          snapshot=excluded.snapshot,mose_variant_id=coalesce(shopify_order_lines.mose_variant_id,excluded.mose_variant_id),
          fulfillment_owner=coalesce(shopify_order_lines.fulfillment_owner,excluded.fulfillment_owner);
      end loop;
      delete from public.shopify_order_lines where order_id=o->>'id' and line_id not in
        (select value->>'id' from jsonb_array_elements(o->'lineItems'->'nodes'));
      delete from public.shopify_order_fulfillments where order_id=o->>'id';
      for f in select value from jsonb_array_elements(o->'fulfillments') loop
        insert into public.shopify_order_fulfillments values(f->>'id',o->>'id',f->>'status',f);
      end loop;
      delete from public.shopify_order_refunds where order_id=o->>'id';
      for r in select value from jsonb_array_elements(o->'refunds') loop
        insert into public.shopify_order_refunds values(r->>'id',o->>'id',r);
      end loop;
    end if;
  end if;
  if p_product_id is not null then
    -- Changes invalidate reviewed mapping; an explicit re-verification must release it again.
    update public.shopify_variant_mappings set enabled=false,verified_at=null,updated_at=now()
      where shopify_product_id=p_product_id;
  end if;
  if p_uninstalled then
    update public.shopify_integration_state set app_installed=false,checkout_enabled=false,last_error='APP_UNINSTALLED' where id=1;
    update public.shopify_variant_mappings set enabled=false;
  end if;
  update public.shopify_webhook_inbox set processed_at=now(),lease_until=null,lease_token=null,last_error=null,payload='{}'::jsonb
    where id=p_id;
  update public.shopify_integration_state set last_worker_at=now() where id=1;
  return true;
end $$;

create function public.fail_shopify_event(p_id bigint,p_lease uuid,p_error text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.shopify_webhook_inbox set last_error=left(p_error,100),lease_until=null,lease_token=null,
    retry_after=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)),
    dead_letter_at=case when attempts>=8 then now() else null end
  where id=p_id and lease_token=p_lease and lease_until>now() and processed_at is null;
  return found;
end $$;

-- A fresh enqueue cursor alone does not establish a healthy order-processing pipeline.
create function public.shopify_queue_health()
returns table (pending_count bigint, oldest_pending_at timestamptz, dead_letter_count bigint)
language sql security definer set search_path = public as $$
  select count(*) filter(where processed_at is null and dead_letter_at is null),
    min(received_at) filter(where processed_at is null and dead_letter_at is null),
    count(*) filter(where processed_at is null and dead_letter_at is not null)
  from public.shopify_webhook_inbox;
$$;

create function public.claim_shopify_reconciliation()
returns setof public.shopify_integration_state language sql security definer set search_path = public as $$
  update public.shopify_integration_state set reconcile_lease_until=now()+interval '2 minutes',
    reconcile_lease_token=gen_random_uuid(),reconcile_window_end=coalesce(reconcile_window_end,now())
    where id=1 and app_installed and (reconcile_lease_until is null or reconcile_lease_until<now()) returning *;
$$;
create function public.checkpoint_shopify_reconciliation(p_lease uuid,p_cursor text,p_events jsonb,p_error text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare s public.shopify_integration_state; e jsonb;
begin
  select * into s from public.shopify_integration_state where id=1 for update;
  if s.reconcile_lease_token is distinct from p_lease or p_lease is null or s.reconcile_lease_until is null or s.reconcile_lease_until<=now() then return false; end if;
  if p_error is not null then
    update public.shopify_integration_state set last_error=left(p_error,100),reconcile_lease_token=null,reconcile_lease_until=null where id=1;
    return true;
  end if;
  for e in select value from jsonb_array_elements(p_events) loop
    insert into public.shopify_webhook_inbox(shop,delivery_id,topic,payload)
      values('hp5szr-te.myshopify.com','reconcile:'||(e->>'id')||':'||(e->>'updatedAt'),'reconcile/order',
        jsonb_build_object('admin_graphql_api_id',e->>'id')) on conflict(shop,delivery_id) do nothing;
  end loop;
  update public.shopify_integration_state set reconcile_cursor=p_cursor,
    reconcile_watermark=case when p_cursor is null then reconcile_window_end else reconcile_watermark end,
    last_reconciled_at=case when p_cursor is null then now() else last_reconciled_at end,
    reconcile_window_end=case when p_cursor is null then null else reconcile_window_end end,
    reconcile_lease_token=null,reconcile_lease_until=null,last_error=null where id=1;
  return true;
end $$;

-- Explicit privilege boundary, including SECURITY DEFINER functions (PUBLIC execute defaults are removed).
do $$ declare t text; f record; begin
  foreach t in array array['shopify_integration_state','shopify_variant_mappings','shopify_checkout_attempts',
    'shopify_webhook_inbox','shopify_order_snapshots','shopify_order_lines','shopify_order_fulfillments','shopify_order_refunds'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('reserve_shopify_checkout','finish_shopify_checkout',
      'claim_shopify_events','complete_shopify_event','fail_shopify_event','claim_shopify_reconciliation',
      'checkpoint_shopify_reconciliation','shopify_queue_health') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
grant usage,select on sequence public.shopify_webhook_inbox_id_seq to service_role;
