-- Staged read-only Shopify inventory evidence. Apply only after review; no release gate is enabled.
-- Supplier untracked/sentinel quantities never become MOSE stock quantities.
alter table public.shopify_variant_mappings
  add column inventory_location_id text check (inventory_location_id ~ '^gid://shopify/Location/[0-9]+$'),
  add column inventory_revision uuid not null default gen_random_uuid(),
  add column inventory_lease_token uuid,
  add column inventory_lease_until timestamptz;

create function public.invalidate_shopify_inventory_revision() returns trigger
language plpgsql set search_path = public as $$
begin
  if (to_jsonb(new) - array['inventory_revision','inventory_lease_token','inventory_lease_until','updated_at'])
     is distinct from (to_jsonb(old) - array['inventory_revision','inventory_lease_token','inventory_lease_until','updated_at']) then
    new.inventory_revision := gen_random_uuid();
    new.inventory_lease_token := null;
    new.inventory_lease_until := null;
  end if;
  return new;
end $$;
create trigger shopify_inventory_mapping_revision before update on public.shopify_variant_mappings
for each row execute function public.invalidate_shopify_inventory_revision();

create table public.shopify_inventory_snapshots (
  mose_variant_id text primary key references public.shopify_variant_mappings(mose_variant_id) on delete cascade,
  mapping_revision uuid not null,
  observed_at timestamptz not null,
  status text not null check (status in ('known','unknown','error')),
  available_quantity integer,
  reason text not null check (reason ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  check ((status = 'known' and available_quantity is not null and available_quantity >= 0)
      or (status <> 'known' and available_quantity is null))
);
alter table public.shopify_inventory_snapshots enable row level security;
revoke all on public.shopify_inventory_snapshots from public, anon, authenticated;
grant all on public.shopify_inventory_snapshots to service_role;

-- One location per batch, oldest/missing evidence first. No OFFSET starvation; expired leases recover.
create function public.claim_shopify_inventory() returns setof public.shopify_variant_mappings
language plpgsql security definer set search_path = public as $$
declare selected_location text;
begin
  perform pg_advisory_xact_lock(hashtextextended('shopify_inventory_claim',0));
  select m.inventory_location_id into selected_location from public.shopify_variant_mappings m
  left join public.shopify_inventory_snapshots s using (mose_variant_id)
  where m.enabled and (m.inventory_lease_until is null or m.inventory_lease_until < now())
    and (s.mapping_revision is distinct from m.inventory_revision or s.observed_at < now() - interval '5 minutes')
  order by case when s.mapping_revision is distinct from m.inventory_revision then 0 else 1 end, s.observed_at nulls first, m.mose_variant_id limit 1;
  return query with candidates as (
    select m.mose_variant_id from public.shopify_variant_mappings m
    left join public.shopify_inventory_snapshots s using (mose_variant_id)
    where m.enabled and m.inventory_location_id is not distinct from selected_location
      and (m.inventory_lease_until is null or m.inventory_lease_until < now())
      and (s.mapping_revision is distinct from m.inventory_revision or s.observed_at < now() - interval '5 minutes')
    order by s.observed_at nulls first, m.mose_variant_id limit 50 for update of m skip locked
  ) update public.shopify_variant_mappings m set inventory_lease_token=gen_random_uuid(), inventory_lease_until=now()+interval '2 minutes'
    from candidates c where m.mose_variant_id=c.mose_variant_id returning m.*;
end $$;

-- Fences both old leases and changes of location/price/identity while Shopify is in flight.
create function public.complete_shopify_inventory(p_id text,p_lease uuid,p_revision uuid,p_status text,p_quantity integer,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_mapping public.shopify_variant_mappings;
begin
  select * into current_mapping from public.shopify_variant_mappings where mose_variant_id=p_id for update;
  if not found or p_lease is null or p_revision is null or current_mapping.inventory_lease_until is null or not current_mapping.enabled or current_mapping.inventory_revision<>p_revision
    or current_mapping.inventory_lease_token is distinct from p_lease or current_mapping.inventory_lease_until<=now() then return false; end if;
  insert into public.shopify_inventory_snapshots(mose_variant_id,mapping_revision,observed_at,status,available_quantity,reason)
  values(p_id,p_revision,now(),p_status,p_quantity,p_reason)
  on conflict(mose_variant_id) do update set mapping_revision=excluded.mapping_revision,observed_at=excluded.observed_at,
    status=excluded.status,available_quantity=excluded.available_quantity,reason=excluded.reason;
  update public.shopify_variant_mappings set inventory_lease_token=null,inventory_lease_until=null where mose_variant_id=p_id;
  return true;
end $$;

create function public.shopify_inventory_evidence(p_ids text[] default null)
returns table(mose_variant_id text,mapping_revision uuid,mapping_current boolean,status text,available_quantity integer,observed_at timestamptz,reason text)
language sql stable security definer set search_path=public as $$
  select m.mose_variant_id,s.mapping_revision,s.mapping_revision=m.inventory_revision,s.status,s.available_quantity,s.observed_at,s.reason
  from public.shopify_variant_mappings m left join public.shopify_inventory_snapshots s using(mose_variant_id)
  where m.enabled and (p_ids is null or m.mose_variant_id=any(p_ids));
$$;
revoke all on function public.invalidate_shopify_inventory_revision() from public,anon,authenticated;
revoke all on function public.claim_shopify_inventory() from public,anon,authenticated;
revoke all on function public.complete_shopify_inventory(text,uuid,uuid,text,integer,text) from public,anon,authenticated;
revoke all on function public.shopify_inventory_evidence(text[]) from public,anon,authenticated;
grant execute on function public.claim_shopify_inventory() to service_role;
grant execute on function public.complete_shopify_inventory(text,uuid,uuid,text,integer,text) to service_role;
grant execute on function public.shopify_inventory_evidence(text[]) to service_role;
