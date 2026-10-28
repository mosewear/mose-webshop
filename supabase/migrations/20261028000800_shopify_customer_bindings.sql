-- Private identity map. No copied email/name/address, backfill or runtime enable.
create table public.shopify_customer_bindings (
  user_id uuid primary key references auth.users(id),
  shopify_customer_id text not null unique check(shopify_customer_id ~ '^gid://shopify/Customer/[1-9][0-9]*$'),
  email_hash text not null unique check(email_hash ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz not null default now()
);
alter table public.shopify_customer_bindings enable row level security;
revoke all on public.shopify_customer_bindings from public,anon,authenticated,service_role;
grant select on public.shopify_customer_bindings to service_role;
create function public.bind_shopify_customer(p_user uuid,p_customer text,p_email_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare old public.shopify_customer_bindings%rowtype;
begin
  if p_user is null or p_customer is null or p_customer !~ '^gid://shopify/Customer/[1-9][0-9]*$'
    or p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_CUSTOMER_BINDING'; end if;
  perform pg_advisory_xact_lock(hashtextextended('shopify-customer:'||p_user::text,0));
  select * into old from public.shopify_customer_bindings where user_id=p_user for update;
  if found then
    if old.shopify_customer_id is distinct from p_customer or old.email_hash is distinct from p_email_hash then raise exception 'CUSTOMER_BINDING_CONFLICT'; end if;
    update public.shopify_customer_bindings set verified_at=now() where user_id=p_user;
    return true;
  end if;
  insert into public.shopify_customer_bindings(user_id,shopify_customer_id,email_hash) values(p_user,p_customer,p_email_hash);
  return true;
end $$;
revoke all on function public.bind_shopify_customer(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bind_shopify_customer(uuid,text,text) to service_role;
