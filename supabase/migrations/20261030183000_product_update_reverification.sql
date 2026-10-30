-- Metadata edits must not permanently revoke a reviewed commercial release.
-- Apply after the inventory worker verifies supplier SKU, color and size.
begin;
create or replace function public.complete_shopify_event(p_id bigint, p_lease uuid, p_projection jsonb default null,
  p_product_id text default null, p_uninstalled boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare e public.shopify_webhook_inbox; o jsonb; l jsonb; f jsonb; r jsonb; accepted boolean;
begin
  select * into e from public.shopify_webhook_inbox where id = p_id for update;
  if not found or e.processed_at is not null or e.lease_token is distinct from p_lease or p_lease is null or e.lease_until is null or e.lease_until <= now() then return false; end if;
  if p_projection is not null then
    o := p_projection;
    insert into public.shopify_order_snapshots (shopify_order_id,order_name,source_updated_at,
      financial_status,fulfillment_status,currency,total_amount,refunded_amount,cancelled_at,snapshot)
    values (o->>'id',o->>'name',(o->>'updatedAt')::timestamptz,o->>'displayFinancialStatus',
      o->>'displayFulfillmentStatus',o->>'currencyCode',o->'currentTotalPriceSet'->'shopMoney'->>'amount',
      o->'totalRefundedSet'->'shopMoney'->>'amount',(o->>'cancelledAt')::timestamptz,o)
    on conflict (shopify_order_id) do update set order_name=excluded.order_name,
      source_updated_at=excluded.source_updated_at,financial_status=excluded.financial_status,
      fulfillment_status=excluded.fulfillment_status,currency=excluded.currency,total_amount=excluded.total_amount,
      refunded_amount=excluded.refunded_amount,cancelled_at=excluded.cancelled_at,snapshot=excluded.snapshot,synced_at=now()
    where excluded.source_updated_at >= shopify_order_snapshots.source_updated_at;
    accepted := found;
    if accepted then
      for l in select value from jsonb_array_elements(o->'lineItems'->'nodes') loop
        insert into public.shopify_order_lines (line_id,order_id,shopify_variant_id,mose_variant_id,fulfillment_owner,quantity,current_quantity,snapshot)
        values (l->>'id',o->>'id',l->'variant'->>'id',
          (select mose_variant_id from public.shopify_variant_mappings where shopify_variant_id=l->'variant'->>'id'),
          (select fulfillment_owner from public.shopify_variant_mappings where shopify_variant_id=l->'variant'->>'id'),
          (l->>'quantity')::integer,(l->>'currentQuantity')::integer,l)
        on conflict(line_id) do update set quantity=excluded.quantity,current_quantity=excluded.current_quantity,
          snapshot=excluded.snapshot,mose_variant_id=coalesce(shopify_order_lines.mose_variant_id,excluded.mose_variant_id),
          fulfillment_owner=coalesce(shopify_order_lines.fulfillment_owner,excluded.fulfillment_owner);
      end loop;
      delete from public.shopify_order_lines where order_id=o->>'id' and line_id not in
        (select value->>'id' from jsonb_array_elements(o->'lineItems'->'nodes'));
      delete from public.shopify_order_fulfillments where order_id=o->>'id';
      for f in select value from jsonb_array_elements(o->'fulfillments') loop
        insert into public.shopify_order_fulfillments values(f->>'id',o->>'id',f->>'status',f);
      end loop;
      delete from public.shopify_order_refunds where order_id=o->>'id';
      for r in select value from jsonb_array_elements(o->'refunds') loop
        insert into public.shopify_order_refunds values(r->>'id',o->>'id',r);
      end loop;
    end if;
  end if;
  if p_product_id is not null then
    if e.topic = 'products/delete' then
      update public.shopify_variant_mappings set enabled=false,verified_at=null,updated_at=now()
        where shopify_product_id=p_product_id;
    elsif e.topic = 'products/update' then
      -- Keep the owner's release decision. Fence stale/in-flight evidence and
      -- let the read-only worker recheck identity, price, location and policy.
      update public.shopify_variant_mappings set inventory_revision=gen_random_uuid(),
        inventory_lease_token=null,inventory_lease_until=null,updated_at=now()
        where shopify_product_id=p_product_id;
    else
      raise exception 'UNEXPECTED_PRODUCT_EVENT';
    end if;
    update public.product_variants v set supplier_orderable=false,supplier_checked_at=null
      from public.shopify_variant_mappings m
      where m.shopify_product_id=p_product_id and m.fulfillment_mode='made_to_order'
        and v.id::text=m.mose_variant_id and v.product_id::text=m.mose_product_id;
  end if;
  if p_uninstalled then
    update public.shopify_integration_state set app_installed=false,checkout_enabled=false,last_error='APP_UNINSTALLED' where id=1;
    update public.shopify_variant_mappings set enabled=false;
  end if;
  update public.shopify_webhook_inbox set processed_at=now(),lease_until=null,lease_token=null,last_error=null,payload='{}'::jsonb
    where id=p_id;
  update public.shopify_integration_state set last_worker_at=now() where id=1;
  return true;
end $$;
revoke all on function public.complete_shopify_event(bigint,uuid,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.complete_shopify_event(bigint,uuid,jsonb,text,boolean) to service_role;
commit;
