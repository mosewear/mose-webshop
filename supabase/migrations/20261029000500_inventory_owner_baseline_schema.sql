-- Schema registration only. Owner confirmation records are never seeded or replayed.
create table if not exists public.inventory_owner_baseline_confirmations (
 id uuid primary key,
 recorded_at timestamptz not null default clock_timestamp(),
 evidence jsonb not null
);
alter table public.inventory_owner_baseline_confirmations enable row level security;
revoke all on public.inventory_owner_baseline_confirmations from public, anon, authenticated, service_role;
-- Runtime may inspect provenance; only an explicitly reviewed DBA transaction records it.
grant select on public.inventory_owner_baseline_confirmations to service_role;
