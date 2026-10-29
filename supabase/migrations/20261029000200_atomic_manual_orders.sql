-- New manual orders only. No historical stock stamps or quantities are altered.
create table public.manual_order_commands (
 id uuid primary key,request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 order_id uuid not null unique references public.orders(id),created_at timestamptz not null default now()
);
alter table public.manual_order_commands enable row level security;
revoke all on public.manual_order_commands from public,anon,authenticated,service_role;
grant select on public.manual_order_commands to service_role;
create function public.create_atomic_manual_order(p_id uuid,p_hash text,p_order jsonb,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.manual_order_commands%rowtype; result jsonb; full_name text; created timestamptz;
begin
 if p_id is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 then raise exception 'INVALID_MANUAL_ORDER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.manual_order_commands where id=p_id;
 if found then
   if existing.request_hash<>p_hash then raise exception 'MANUAL_ORDER_INTENT_MISMATCH'; end if;
   return jsonb_build_object('ok',true,'orderId',existing.order_id,'reused',true);
 end if;
 -- Lock every variant before checking availability/ownership; transfer takes these same locks.
 perform 1 from public.product_variants where id in(select (v->>'variant_id')::uuid from jsonb_array_elements(p_items) v) order by id for update;
 if exists(select 1 from jsonb_array_elements(p_items) i left join public.product_variants v on v.id=(i->>'variant_id')::uuid
   where v.id is null or not coalesce(v.is_available,false) or v.product_id<>(i->>'product_id')::uuid or (i->>'quantity')::integer<1) then raise exception 'INVALID_MANUAL_ORDER_VARIANT'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) i join public.shopify_stock_ownership o on o.variant_id=(i->>'variant_id')::uuid) then raise exception 'MANUAL_ORDER_SHOPIFY_OWNED'; end if;
 insert into public.orders(id,email,status,payment_status,paid_at,payment_method,subtotal,total,shipping_cost,tax_amount,discount_amount,shipping_address,billing_address,delivery_method,internal_notes,checkout_started_at,locale)
 values(p_id,p_order->>'email',p_order->>'status',p_order->>'payment_status',(p_order->>'paid_at')::timestamptz,p_order->>'payment_method',(p_order->>'subtotal')::numeric,(p_order->>'total')::numeric,(p_order->>'shipping_cost')::numeric,0,0,p_order->'shipping_address',p_order->'billing_address',p_order->>'delivery_method',p_order->>'internal_notes',null,p_order->>'locale') returning created_at into created;
 insert into public.order_items(order_id,product_id,variant_id,product_name,size,color,sku,quantity,original_price,quantity_discount_amount,price_at_purchase,subtotal,image_url)
 select p_id,(i->>'product_id')::uuid,(i->>'variant_id')::uuid,i->>'product_name',i->>'size',i->>'color',i->>'sku',(i->>'quantity')::integer,(i->>'original_price')::numeric,(i->>'quantity_discount_amount')::numeric,(i->>'price_at_purchase')::numeric,(i->>'subtotal')::numeric,i->>'image_url' from jsonb_array_elements(p_items) i;
 if p_order->>'payment_status'='paid' then
   result:=public.apply_legacy_paid_stock(p_id);
   if result->>'ok' is distinct from 'true' then raise exception 'MANUAL_ORDER_STOCK_FAILED'; end if;
 end if;
 full_name:=btrim(p_order->'shipping_address'->>'name');
 perform public.upsert_customer_profile(p_order->>'email',split_part(full_name,' ',1),nullif(btrim(substr(full_name,length(split_part(full_name,' ',1))+1)),''),p_order->'shipping_address'->>'phone');
 if p_order->>'payment_status'='paid' then perform public.update_customer_stats(p_order->>'email',(p_order->>'total')::numeric,created); end if;
 insert into public.manual_order_commands(id,request_hash,order_id) values(p_id,p_hash,p_id);
 return jsonb_build_object('ok',true,'orderId',p_id,'reused',false);
end $$;
revoke all on function public.create_atomic_manual_order(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_atomic_manual_order(uuid,text,jsonb,jsonb) to service_role;
