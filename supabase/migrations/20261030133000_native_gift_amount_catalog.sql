-- No product bindings, variants, issuer flags or balances are seeded.
create table public.shopify_native_gift_products (
 mose_product_id uuid primary key references public.products(id),
 shopify_product_id text not null unique check(shopify_product_id ~ '^gid://shopify/Product/[1-9][0-9]*$'),
 enabled boolean not null default false,
 variant_limit integer not null default 2000 check(variant_limit between 1 and 2048),
 review_reference text not null check(length(trim(review_reference)) >= 20),
 created_at timestamptz not null default now()
);
create table public.shopify_native_gift_amounts (
 mose_product_id uuid not null references public.shopify_native_gift_products(mose_product_id),
 amount_cents integer not null check(amount_cents between 2000 and 100000),
 shopify_variant_id text unique check(shopify_variant_id ~ '^gid://shopify/ProductVariant/[1-9][0-9]*$'),
 status text not null check(status in ('creating','ready','unknown')),
 intent_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(mose_product_id,amount_cents),
 check(status <> 'ready' or shopify_variant_id is not null)
);
alter table public.shopify_native_gift_products enable row level security;
alter table public.shopify_native_gift_amounts enable row level security;
revoke all on public.shopify_native_gift_products,public.shopify_native_gift_amounts from public,anon,authenticated,service_role;
grant select,insert,update on public.shopify_native_gift_products to service_role;
grant select on public.shopify_native_gift_amounts to service_role;

create function public.guard_native_gift_product_identity() returns trigger
language plpgsql set search_path=public as $$
begin
 if old.mose_product_id <> new.mose_product_id or old.shopify_product_id <> new.shopify_product_id then
  raise exception 'NATIVE_GIFT_PRODUCT_IDENTITY_IMMUTABLE';
 end if;
 return new;
end $$;
create trigger immutable_native_gift_product_identity before update on public.shopify_native_gift_products
 for each row execute function public.guard_native_gift_product_identity();

-- One in-flight append per product. An uncertain outcome blocks further
-- creation until reviewed; elapsed time never authorizes a second API mutation.
create function public.reserve_native_gift_variant(p_product uuid,p_amount integer,p_intent uuid,p_observed_count integer,p_provider_limit integer)
returns table(action text,variant_id text)
language plpgsql security definer set search_path=public as $$
declare binding public.shopify_native_gift_products%rowtype; existing public.shopify_native_gift_amounts%rowtype; source public.products%rowtype;
begin
 select * into binding from public.shopify_native_gift_products where mose_product_id=p_product for update;
 if not found or not binding.enabled then raise exception 'NATIVE_GIFT_PRODUCT_UNREGISTERED'; end if;
 select * into source from public.products where id=p_product;
 if not found or source.is_active is distinct from true or source.status is distinct from 'active' or source.is_gift_card is distinct from true or source.allows_custom_amount is distinct from true or
  p_amount is null or p_amount not between 2000 and 100000 or source.gift_card_min_amount is null or source.gift_card_max_amount is null or
  p_amount::numeric/100 < source.gift_card_min_amount or p_amount::numeric/100 > source.gift_card_max_amount then
  raise exception 'NATIVE_GIFT_AMOUNT_UNAVAILABLE';
 end if;
 select * into existing from public.shopify_native_gift_amounts where mose_product_id=p_product and amount_cents=p_amount;
 if found then
  return query select case when existing.status='ready' then 'ready' else 'pending' end,existing.shopify_variant_id;
  return;
 end if;
 if exists(select 1 from public.shopify_native_gift_amounts where mose_product_id=p_product and status in ('creating','unknown')) then
  return query select 'pending'::text,null::text; return;
 end if;
 if p_intent is null or p_observed_count is null or p_observed_count < 0 or p_provider_limit is null or p_provider_limit < 1 or
  p_observed_count >= least(binding.variant_limit,p_provider_limit) then raise exception 'NATIVE_GIFT_VARIANT_CAPACITY'; end if;
 -- Serialize the measured rolling creation budget across all native products;
 -- existing ready denominations returned above do not consume another slot.
 perform pg_advisory_xact_lock(hashtextextended('native-gift-catalog-create-budget',0));
 if (select count(*) from public.shopify_native_gift_amounts where created_at > now()-interval '1 hour') >= 25 or
  (select count(*) from public.shopify_native_gift_amounts where mose_product_id=p_product and created_at > now()-interval '1 hour') >= 25 then
  raise exception 'NATIVE_GIFT_CREATION_RATE_LIMIT';
 end if;
 insert into public.shopify_native_gift_amounts(mose_product_id,amount_cents,status,intent_id) values(p_product,p_amount,'creating',p_intent);
 return query select 'create'::text,null::text;
end $$;

create function public.bind_native_gift_variant(p_product uuid,p_amount integer,p_intent uuid,p_variant text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if p_variant is null or p_variant !~ '^gid://shopify/ProductVariant/[1-9][0-9]*$' then raise exception 'NATIVE_GIFT_VARIANT_INVALID'; end if;
 update public.shopify_native_gift_amounts set shopify_variant_id=p_variant,status='ready'
  where mose_product_id=p_product and amount_cents=p_amount and intent_id=p_intent and status='creating' and shopify_variant_id is null;
 return found;
end $$;
create function public.mark_native_gift_variant_unknown(p_product uuid,p_amount integer,p_intent uuid,p_variant text default null) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if p_variant is not null and p_variant !~ '^gid://shopify/ProductVariant/[1-9][0-9]*$' then raise exception 'NATIVE_GIFT_VARIANT_INVALID'; end if;
 update public.shopify_native_gift_amounts set shopify_variant_id=p_variant,status='unknown'
  where mose_product_id=p_product and amount_cents=p_amount and intent_id=p_intent and status='creating';
 return found;
end $$;
revoke all on function public.reserve_native_gift_variant(uuid,integer,uuid,integer,integer),public.bind_native_gift_variant(uuid,integer,uuid,text),public.mark_native_gift_variant_unknown(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_native_gift_variant(uuid,integer,uuid,integer,integer),public.bind_native_gift_variant(uuid,integer,uuid,text),public.mark_native_gift_variant_unknown(uuid,integer,uuid,text) to service_role;
revoke all on function public.guard_native_gift_product_identity() from public,anon,authenticated;
