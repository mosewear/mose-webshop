-- Extend the explicit supplier identity contract for the five additional owner-approved models; UT0111 is deliberately excluded.
-- This does not grant a mapping release or claim physical sample approval.
begin;
set local lock_timeout = '5s';
alter table public.shopify_variant_mappings
  drop constraint shopify_variant_mappings_check,
  add constraint shopify_variant_mappings_check check (
    fulfillment_owner <> 'tapstitch' or (
      supplier_model is not null and supplier_model in (
        'RW0041-P001-V3','RT0028-C001-V2','MB0001-C001-V2','MB0057-C001-V2',
        'UB0083-C001-V2','MB0030-C001-V2','MB0010-C001-V2','UB0018-C001-V2',
        'R00099-C001-V6','UT0276-C001-V2','RT0086-C001-V4',
        'UT0289-P001-V4','UB0051-P001-V2','UT0320-P001-V2',
        'MT0067-P001-V2','MB0035-P001-V2','UB0026-O001-V2',
        'UT0101-C001-V2','MT0063-P001-V2'
      ) and supplier_reference is not null
    )
  );
commit;
