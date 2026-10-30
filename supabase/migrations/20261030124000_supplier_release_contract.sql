-- Owner release is a commercial decision, never evidence that physical samples passed.
-- Made-to-order availability is separate from physical inventory. No stock is seeded.
begin;
alter table public.shopify_variant_mappings
  add column if not exists owner_release_authorized_at timestamptz,
  add column if not exists owner_release_reference text,
  add column if not exists fulfillment_mode text not null default 'local_stock';
alter table public.shopify_variant_mappings
  drop constraint if exists supplier_fulfillment_mode_contract;
alter table public.shopify_variant_mappings add constraint supplier_fulfillment_mode_contract
  check (fulfillment_mode in ('local_stock','made_to_order') and
    (fulfillment_mode <> 'made_to_order' or fulfillment_owner='tapstitch'));
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.shopify_variant_mappings'::regclass
    and contype='c' and pg_get_constraintdef(oid) like '%sample_verified%'
  loop execute format('alter table public.shopify_variant_mappings drop constraint %I',c.conname); end loop;
end $$;
alter table public.shopify_variant_mappings add constraint supplier_release_evidence_contract
  check (not enabled or fulfillment_owner <> 'tapstitch' or
    (supplier_link_verified and (sample_verified or
      (owner_release_authorized_at is not null and owner_release_reference is not null and length(trim(owner_release_reference)) >= 20))));

alter table public.product_variants
  add column if not exists fulfillment_mode text not null default 'local_stock',
  add column if not exists supplier_orderable boolean not null default false,
  add column if not exists supplier_checked_at timestamptz;
alter table public.product_variants drop constraint if exists product_variant_fulfillment_mode_contract;
alter table public.product_variants add constraint product_variant_fulfillment_mode_contract
  check (fulfillment_mode in ('local_stock','made_to_order'));

alter table public.shopify_inventory_snapshots drop constraint if exists shopify_inventory_snapshots_status_check;
alter table public.shopify_inventory_snapshots add constraint shopify_inventory_snapshots_status_check
  check (status in ('known','made_to_order','unknown','error'));
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.shopify_inventory_snapshots'::regclass
    and contype='c' and pg_get_constraintdef(oid) like '%available_quantity%'
  loop execute format('alter table public.shopify_inventory_snapshots drop constraint %I',c.conname); end loop;
end $$;
alter table public.shopify_inventory_snapshots add constraint inventory_quantity_or_supplier_contract
  check ((status='known' and available_quantity is not null and available_quantity>=0)
    or (status='made_to_order' and available_quantity is null and reason='SUPPLIER_MADE_TO_ORDER_VERIFIED')
    or (status in ('unknown','error') and available_quantity is null));

create or replace function public.complete_shopify_inventory(p_id text,p_lease uuid,p_revision uuid,p_status text,p_quantity integer,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_mapping public.shopify_variant_mappings;
begin
  select * into current_mapping from public.shopify_variant_mappings where mose_variant_id=p_id for update;
  if not found or p_lease is null or p_revision is null or current_mapping.inventory_lease_until is null or not current_mapping.enabled or current_mapping.inventory_revision<>p_revision
    or current_mapping.inventory_lease_token is distinct from p_lease or current_mapping.inventory_lease_until<=now() then return false; end if;
  if p_status='made_to_order' and (current_mapping.fulfillment_owner<>'tapstitch' or current_mapping.fulfillment_mode<>'made_to_order'
    or not current_mapping.supplier_link_verified or not (current_mapping.sample_verified or
      (current_mapping.owner_release_authorized_at is not null and current_mapping.owner_release_reference is not null and current_mapping.owner_release_authorized_at<=now() and length(trim(current_mapping.owner_release_reference))>=20)))
    then raise exception 'SUPPLIER_RELEASE_UNVERIFIED'; end if;
  insert into public.shopify_inventory_snapshots(mose_variant_id,mapping_revision,observed_at,status,available_quantity,reason)
  values(p_id,p_revision,now(),p_status,p_quantity,p_reason)
  on conflict(mose_variant_id) do update set mapping_revision=excluded.mapping_revision,observed_at=excluded.observed_at,
    status=excluded.status,available_quantity=excluded.available_quantity,reason=excluded.reason;
  if current_mapping.fulfillment_mode='made_to_order' then
    update public.product_variants set fulfillment_mode='made_to_order',
      supplier_orderable=(p_status='made_to_order'), supplier_checked_at=now()
    where id::text=p_id and product_id::text=current_mapping.mose_product_id;
  end if;
  update public.shopify_variant_mappings set inventory_lease_token=null,inventory_lease_until=null where mose_variant_id=p_id;
  return true;
end $$;
revoke all on function public.complete_shopify_inventory(text,uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_shopify_inventory(text,uuid,uuid,text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
