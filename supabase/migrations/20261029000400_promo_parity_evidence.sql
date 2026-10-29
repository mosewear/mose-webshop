-- No row is seeded: only actual provider probes may establish parity.
create table public.shopify_promo_parity_evidence (
 contract_version text primary key,
 config_fingerprint text not null check(config_fingerprint ~ '^[a-f0-9]{64}$'),
 verified_at timestamptz not null,
 expires_at timestamptz not null,
 probe_results jsonb not null check(jsonb_typeof(probe_results)='array'),
 verification_reference text not null check(length(verification_reference)>10),
 check(expires_at>verified_at and expires_at<=verified_at+interval '24 hours')
);
alter table public.shopify_promo_parity_evidence enable row level security;
revoke all on public.shopify_promo_parity_evidence from public,anon,authenticated;
grant select,insert,update,delete on public.shopify_promo_parity_evidence to service_role;
