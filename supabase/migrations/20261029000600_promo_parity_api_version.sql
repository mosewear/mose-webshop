-- Bind proof to the Admin/Storefront API contract used by provider probes.
alter table public.shopify_promo_parity_evidence
 add column api_version text not null default '2026-10'
 check (api_version ~ '^[0-9]{4}-[0-9]{2}$');
-- Require future writers to explicitly identify the version they tested.
alter table public.shopify_promo_parity_evidence alter column api_version drop default;
