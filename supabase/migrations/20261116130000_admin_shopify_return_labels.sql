create table public.admin_shopify_return_labels (
  order_id text primary key check (order_id ~ '^gid://shopify/Order/[0-9]+$'),
  created_at timestamptz not null default now(),
  sendcloud_return_id bigint unique,
  parcel_id bigint unique,
  tracking_code text,
  recipient_email text not null,
  email_sent_at timestamptz,
  email_claimed_at timestamptz,
  check (sendcloud_return_id is null or parcel_id is not null)
);

alter table public.admin_shopify_return_labels enable row level security;
revoke all on public.admin_shopify_return_labels from public, anon, authenticated;
grant select, insert, update, delete on public.admin_shopify_return_labels to service_role;

create function public.admin_search_shopify_orders_for_return(p_query text, p_limit integer)
returns table (id text, name text, email text, status text, total text, currency text, created_at text, item_count integer)
language sql stable set search_path = ''
as $$
  select s.shopify_order_id, s.order_name, s.snapshot->>'email',
    lower(s.snapshot->>'displayFulfillmentStatus'),
    s.snapshot #>> '{currentTotalPriceSet,shopMoney,amount}',
    s.snapshot->>'currencyCode',
    coalesce((s.snapshot->>'createdAt')::timestamptz, s.source_updated_at)::text,
    jsonb_array_length(s.snapshot #> '{lineItems,nodes}')
  from public.shopify_order_snapshots s
  where length(trim(p_query)) < 3
    or position(lower(trim(p_query)) in lower(concat_ws(' ', s.order_name,
      replace(s.order_name, '#', ''), s.shopify_order_id, s.snapshot->>'email'))) > 0
  order by coalesce((s.snapshot->>'createdAt')::timestamptz, s.source_updated_at) desc, s.shopify_order_id
  limit least(greatest(p_limit, 1), 500)
$$;

revoke execute on function public.admin_search_shopify_orders_for_return(text, integer) from public, anon, authenticated;
grant execute on function public.admin_search_shopify_orders_for_return(text, integer) to service_role;
