-- Verified MOSE account ownership is established before cart creation, never by email.
-- Guests remain guests. These tables must not be exposed directly through the Data API.
create table public.shopify_checkout_owners (
  attempt_id uuid primary key references public.shopify_checkout_attempts(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  proof text not null unique check (proof ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create table public.shopify_order_accounts (
  order_id text primary key references public.shopify_order_snapshots(shopify_order_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique references public.shopify_checkout_owners(attempt_id) on delete cascade,
  linked_at timestamptz not null default now()
);
create index shopify_order_accounts_user_page on public.shopify_order_accounts(user_id, linked_at desc, order_id);
alter table public.shopify_checkout_owners enable row level security;
alter table public.shopify_order_accounts enable row level security;
revoke all on public.shopify_checkout_owners, public.shopify_order_accounts from public, anon, authenticated;
grant select, insert, update, delete on public.shopify_checkout_owners, public.shopify_order_accounts to service_role;

create function public.link_shopify_order_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  attrs jsonb;
  attempt text;
  proof_value text;
  account_owner public.shopify_checkout_owners%rowtype;
begin
  -- Ownership is immutable; Shopify edits/refunds must never transfer an existing order.
  if exists(select 1 from public.shopify_order_accounts where order_id = new.shopify_order_id) then return new; end if;
  attrs := new.snapshot->'customAttributes';
  if jsonb_typeof(attrs) is distinct from 'array' then return new; end if;
  if (select count(*) from jsonb_array_elements(attrs) a where a->>'key' = 'mose_source' and a->>'value' = 'unified-checkout') <> 1
    or (select count(*) from jsonb_array_elements(attrs) a where a->>'key' = 'mose_attempt') <> 1
    or (select count(*) from jsonb_array_elements(attrs) a where a->>'key' = 'mose_account_proof') <> 1 then return new; end if;
  select a->>'value' into attempt from jsonb_array_elements(attrs) a where a->>'key' = 'mose_attempt';
  select a->>'value' into proof_value from jsonb_array_elements(attrs) a where a->>'key' = 'mose_account_proof';
  if attempt is null or attempt !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return new; end if;
  select * into account_owner from public.shopify_checkout_owners where attempt_id = attempt::uuid and proof = proof_value;
  if not found then return new; end if;
  -- A duplicate proof on another order is an operational error, never an ownership guess.
  insert into public.shopify_order_accounts(order_id, user_id, attempt_id)
  values(new.shopify_order_id, account_owner.user_id, account_owner.attempt_id);
  return new;
end $$;
revoke all on function public.link_shopify_order_account() from public, anon, authenticated;
create trigger shopify_order_account_link after insert or update on public.shopify_order_snapshots
for each row execute function public.link_shopify_order_account();
