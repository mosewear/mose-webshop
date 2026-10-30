-- Browser observations are separate from Shopify payment, stock and fulfillment.
-- No public/customer write access, supplier credentials, raw HTML or customer data.
create table public.tapstitch_production_observations (
  id bigint generated always as identity primary key,
  shopify_order_id text not null references public.shopify_order_snapshots(shopify_order_id),
  supplier_order_id text not null check (supplier_order_id ~ '^[1-9][0-9]{10,24}$'),
  shopify_order_name text not null,
  status text not null check (status in ('On Hold','In Review','In Production','Quality Check','Shipped','Delivered','Cancelled')),
  header_text text not null check (length(header_text) <= 600),
  source_url text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  run_id uuid not null,
  unique(run_id, shopify_order_id),
  check (source_url = 'https://www.tapstitch.com/order/detail/' || supplier_order_id),
  check (header_text = 'Order #' || supplier_order_id || ' ' || shopify_order_name || ' ' || status),
  check (observed_at <= recorded_at + interval '1 minute')
);
create index tapstitch_observations_latest on public.tapstitch_production_observations(shopify_order_id,observed_at desc,id desc);
alter table public.tapstitch_production_observations enable row level security;
revoke all on public.tapstitch_production_observations from public,anon,authenticated,service_role;
grant select,insert on public.tapstitch_production_observations to service_role;
grant usage,select on sequence public.tapstitch_production_observations_id_seq to service_role;

-- A supplier order cannot silently move between Shopify orders.
create table public.tapstitch_order_links (
  supplier_order_id text primary key check (supplier_order_id ~ '^[1-9][0-9]{10,24}$'),
  shopify_order_id text not null unique references public.shopify_order_snapshots(shopify_order_id),
  created_at timestamptz not null default now()
);
alter table public.tapstitch_order_links enable row level security;
revoke all on public.tapstitch_order_links from public,anon,authenticated,service_role;
grant select,insert on public.tapstitch_order_links to service_role;

create function public.validate_tapstitch_observation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.shopify_order_snapshots s
    where s.shopify_order_id=new.shopify_order_id and s.order_name=new.shopify_order_name)
    or not exists(select 1 from public.shopify_order_lines l
      where l.order_id=new.shopify_order_id and l.fulfillment_owner='tapstitch' and l.current_quantity>0)
    then raise exception 'SUPPLIER_ORDER_MISMATCH'; end if;
  insert into public.tapstitch_order_links(supplier_order_id,shopify_order_id)
    values(new.supplier_order_id,new.shopify_order_id) on conflict do nothing;
  if not exists(select 1 from public.tapstitch_order_links l
    where l.shopify_order_id=new.shopify_order_id and l.supplier_order_id=new.supplier_order_id)
    then raise exception 'SUPPLIER_LINK_CONFLICT'; end if;
  return new;
end $$;
revoke all on function public.validate_tapstitch_observation() from public,anon,authenticated,service_role;
create trigger tapstitch_observation_identity before insert on public.tapstitch_production_observations
for each row execute function public.validate_tapstitch_observation();

create view public.tapstitch_latest_production as
select distinct on (shopify_order_id) shopify_order_id,supplier_order_id,shopify_order_name,status,header_text,source_url,observed_at,run_id
from public.tapstitch_production_observations order by shopify_order_id,observed_at desc,id desc;
revoke all on public.tapstitch_latest_production from public,anon,authenticated;
grant select on public.tapstitch_latest_production to service_role;

-- One durable cloud job at a time; defaults dormant until server access is approved.
create table public.tapstitch_sync_runtime (
  id smallint primary key default 1 check(id=1),
  enabled boolean not null default false,
  state text not null default 'idle' check(state in ('idle','starting','running','unknown','failed','completed')),
  run_id uuid,
  request_id uuid,
  targets jsonb not null default '[]',
  lease_token uuid,
  lease_until timestamptz,
  next_run_at timestamptz not null default now(),
  started_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  checked_orders integer not null default 0,
  failed_orders integer not null default 0
  ,budget_usd_micros bigint not null default 10000000 check(budget_usd_micros>=0)
  ,spent_usd_micros bigint not null default 0 check(spent_usd_micros>=0)
  ,reserved_usd_micros bigint not null default 0 check(reserved_usd_micros>=0)
  ,check(spent_usd_micros+reserved_usd_micros<=budget_usd_micros)
);
insert into public.tapstitch_sync_runtime(id) values(1);
alter table public.tapstitch_sync_runtime enable row level security;
revoke all on public.tapstitch_sync_runtime from public,anon,authenticated;
grant select,update on public.tapstitch_sync_runtime to service_role;

create function public.claim_tapstitch_sync() returns setof public.tapstitch_sync_runtime
language plpgsql security definer set search_path='' as $$
begin
  return query update public.tapstitch_sync_runtime set lease_token=gen_random_uuid(),lease_until=now()+interval '4 minutes'
  where id=1 and enabled and (lease_until is null or lease_until<now())
    and (state in ('starting','running') or (state in ('idle','completed','failed') and next_run_at<=now())) returning *;
end $$;
revoke all on function public.claim_tapstitch_sync() from public,anon,authenticated;
grant execute on function public.claim_tapstitch_sync() to service_role;
