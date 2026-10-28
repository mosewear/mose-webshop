/** Local PostgreSQL only. MOSE_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/lib/legacy-stock-bridge-check.mjs */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite(); let checks=0
const q=(s,a=[])=>db.query(s,a), scalar=async(s,a=[])=>Object.values((await q(s,a)).rows[0])[0]
const eq=(a,b)=>{assert.deepEqual(a,b);checks++}
const order='11111111-1111-4111-8111-111111111111', second='22222222-2222-4222-8222-222222222222'
const variant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.orders(id uuid primary key,payment_status text,stock_decremented_at timestamptz,created_at timestamptz default now()-interval '1 day');
 create table public.product_variants(id uuid primary key,stock_quantity integer,presale_stock_quantity integer);
 create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid,variant_id uuid,quantity integer,is_presale boolean,is_gift_card boolean);`)
 await db.exec(`create schema auth;create function auth.uid() returns uuid language sql as $$select 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid$$;create table profiles(id uuid primary key,is_admin boolean);insert into profiles values('cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);create table returns(id uuid primary key,order_id uuid,status text,return_items jsonb,received_at timestamptz default now());`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20260420100000_inventory_system_v2.sql',import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../../supabase/migrations/20261027000100_shopify_pilot.sql',import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000100_shopify_inventory_evidence.sql',import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000900_stockownership_bridge.sql',import.meta.url),'utf8'))
 eq(await scalar("select has_function_privilege('anon','public.apply_legacy_paid_stock(uuid)','execute')"),false)
 eq(await scalar("select has_function_privilege('authenticated','public.claim_legacy_stock_delta()','execute')"),false)
 eq(await scalar("select has_table_privilege('authenticated','public.shopify_stock_ownership','insert')"),false)
 await q("insert into orders(id,payment_status)values($1,'paid'),($2,'pending')",[order,second])
 await q('insert into product_variants values($1,10,3),($2,0,0)',[variant,other])
 await q('insert into order_items(order_id,variant_id,quantity,is_presale,is_gift_card) values($1,$2,2,false,false),($1,$2,3,false,false)',[order,variant])
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true})
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true,skipped:true,reason:'already_decremented'})
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select apply_legacy_paid_stock($1)',[second]),{ok:true,skipped:true,reason:'not_paid'})
 // A later failing line rolls back every previous write and the order stamp.
 await q("update orders set payment_status='paid' where id=$1",[second])
 await q('insert into order_items(order_id,variant_id,quantity,is_presale,is_gift_card) values($1,$2,1,false,false),($1,$3,1,false,false)',[second,variant,other])
 await assert.rejects(()=>q('select apply_legacy_paid_stock($1)',[second]),/INSUFFICIENT_STOCK/); checks++
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select stock_decremented_at from orders where id=$1',[second]),null)
 await q('delete from order_items where order_id=$1',[second])
 // Presale is consumed first for presale-only lines, then regular/general lines share the remaining pools.
 await q('insert into order_items(order_id,variant_id,quantity,is_presale,is_gift_card) values($1,$2,2,true,false),($1,$2,6,false,false)',[second,variant])
 eq(await scalar('select apply_legacy_paid_stock($1)',[second]),{ok:true})
 eq((await q('select stock_quantity,presale_stock_quantity from product_variants where id=$1',[variant])).rows[0],{stock_quantity:0,presale_stock_quantity:0})
 // An explicitly cut-over historical payment queues one supplier-independent delta.
 await q('update orders set stock_decremented_at=null where id=$1',[order])
 await q('delete from order_items where order_id=$1',[order])
 await q('insert into order_items(order_id,variant_id,quantity,is_presale,is_gift_card) values($1,$2,1,false,false)',[order,variant])
 const returnOrder='33333333-3333-4333-8333-333333333333'
 await q("insert into orders(id,payment_status,stock_decremented_at)values($1,'paid',now())",[returnOrder])
 const returnLine=await scalar('insert into order_items(order_id,variant_id,quantity,is_presale,is_gift_card) values($1,$2,2,false,false) returning id',[returnOrder,variant])
 await q("insert into shopify_stock_ownership(variant_id,inventory_item_id,location_id,cutover_at,verification_reference)values($1,'gid://shopify/InventoryItem/123','gid://shopify/Location/456',now(),'reviewed fixture cutover')",[variant])
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true})
 eq(await scalar('select count(*)::int from shopify_legacy_stock_outbox'),1)
 eq(await scalar('select delta from shopify_legacy_stock_outbox'),-1)
 await assert.rejects(()=>q('update shopify_legacy_stock_outbox set delta=-2'),/STOCK_DELTA_INTENT_IMMUTABLE/);checks++
 eq(await scalar('select local_shortfall from shopify_legacy_stock_outbox'),true)
 await scalar('select apply_legacy_paid_stock($1)',[order]);eq(await scalar('select count(*)::int from shopify_legacy_stock_outbox'),1)
 await assert.rejects(()=>q("update shopify_stock_ownership set location_id='gid://shopify/Location/999' where variant_id=$1",[variant]),/PENDING_STOCK_DELTA_PINS_OWNERSHIP/);checks++
 const e=(await q('select * from claim_legacy_stock_delta()')).rows[0]
 eq((await q('select * from claim_legacy_stock_delta()')).rows.length,0)
 eq(await scalar('select finish_legacy_stock_delta($1,$2)',[e.id,second]),false)
 await q("update shopify_legacy_stock_outbox set lease_until=now()-interval '1 second' where id=$1",[e.id])
 eq(await scalar('select finish_legacy_stock_delta($1,$2)',[e.id,e.lease_token]),false)
 const retry=(await q('select * from claim_legacy_stock_delta()')).rows[0]
 eq(retry.id,e.id);eq(retry.lease_token===e.lease_token,false)
 eq(await scalar('select finish_legacy_stock_delta($1,$2)',[retry.id,retry.lease_token]),true)
 eq(await scalar('select finish_legacy_stock_delta($1,$2)',[retry.id,retry.lease_token]),false)
 const health=await scalar('select legacy_stock_bridge_health()');eq(health.pending,0);eq(health.shortfalls,1)
 // New legacy orders cannot silently continue after ownership transfer.
 await q('update orders set stock_decremented_at=null,created_at=now()+interval\'1 day\' where id=$1',[order])
 await assert.rejects(()=>q('select apply_legacy_paid_stock($1)',[order]),/NEW_LEGACY_ORDER_AFTER_STOCK_CUTOVER/);checks++
 // Old uncertain delivery cannot be replayed after provider idempotency retention expires.
 await q("update shopify_legacy_stock_outbox set processed_at=null,first_attempt_at=now()-interval '23 hours',lease_until=null")
 eq((await q('select * from claim_legacy_stock_delta()')).rows.length,0)
 eq(await scalar('select dead_letter_at is not null from shopify_legacy_stock_outbox'),true)
 // Explicit manual reconciliation in this local fixture permits exercising the next owner lifecycle.
 await q("update shopify_legacy_stock_outbox set processed_at=now(),dead_letter_at=null,local_shortfall=false")
 await q("update shopify_stock_ownership set shopify_variant_id='gid://shopify/ProductVariant/789' where variant_id=$1",[variant])
 await q("insert into shopify_variant_mappings(mose_variant_id,mose_product_id,shopify_variant_id,shopify_product_id,fulfillment_owner,enabled,price_eur_cents,verified_at,verification_reference,inventory_location_id,inventory_item_id) values($1,'product','gid://shopify/ProductVariant/789','gid://shopify/Product/77','mose',true,7500,now(),'reviewed source contract','gid://shopify/Location/456','gid://shopify/InventoryItem/123')",[variant])
 const revision=await scalar('select inventory_revision from shopify_variant_mappings where mose_variant_id=$1',[variant])
 await q("insert into shopify_inventory_snapshots values($1,$2,now(),'known',7,'INVENTORY_VERIFIED')",[variant,revision])
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),7)
 eq((await scalar('select legacy_stock_bridge_health()')).verifiedOwnershipCount,1)
 eq((await scalar('select legacy_stock_bridge_health()')).lastWorkerAt,null)
 await assert.rejects(()=>q('update order_items set quantity=99 where id=$1',[returnLine]),/SHOPIFY_OWNED_LEGACY_ORDER_EDIT_FORBIDDEN/);checks++
 await assert.rejects(()=>q('update product_variants set stock_quantity=999 where id=$1',[variant]),/SHOPIFY_OWNS_STOCK/);checks++
 const op='dddddddd-dddd-4ddd-8ddd-dddddddddddd',receipt='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
 const adjust={variantId:variant,delta:2,field:'regular',reason:'manual',notes:null}
 const first=await scalar("select apply_inventory_command($1,'adjust',$2::jsonb)",[op,JSON.stringify(adjust)])
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),9)
 eq(await scalar("select apply_inventory_command($1,'adjust',$2::jsonb)",[op,JSON.stringify(adjust)]),first)
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),9)
 await assert.rejects(()=>q("select apply_inventory_command($1,'adjust',$2::jsonb)",[op,JSON.stringify({...adjust,delta:3})]),/INVENTORY_OPERATION_CONFLICT/);checks++
 eq((await scalar('select legacy_stock_bridge_health()')).verifiedOwnershipCount,0)
 eq(await scalar('select mirror_owned_shopify_stock($1)',[variant]),false)
 const rec={title:'Test delivery',notes:null,expectedTotal:3,lines:[{variant_id:variant,quantity_added:1,inventory_type:'regular'},{variant_id:variant,quantity_added:2,inventory_type:'regular'}]}
 await scalar("select apply_inventory_command($1,'receive',$2::jsonb)",[receipt,JSON.stringify(rec)])
 await scalar("select apply_inventory_command($1,'receive',$2::jsonb)",[receipt,JSON.stringify(rec)])
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),12)
 eq(await scalar('select count(*)::int from stock_receipts'),1)
 eq(await scalar('select count(*)::int from stock_receipt_lines'),1)
 await assert.rejects(()=>q("select apply_inventory_command($1,'adjust',$2::jsonb)",[other,JSON.stringify({...adjust,field:'presale',delta:-1})]),/OWNED_PRESALE_WRITE_FORBIDDEN/);checks++
 const rid='ffffffff-ffff-4fff-8fff-ffffffffffff'
 const item=returnLine
 await q("insert into returns(id,order_id,status,return_items) values($1,$2,'return_received',$3::jsonb)",[rid,returnOrder,JSON.stringify([{order_item_id:item,quantity:1}])])
 eq((await scalar('select legacy_stock_bridge_health()')).returnStockCutoverReady,false)
 await assert.rejects(()=>q("select apply_inventory_command($1,'return',$2::jsonb)",[rid,JSON.stringify({returnId:rid})]),/LEGACY_RETURN_STOCK_REVIEW_REQUIRED/);checks++
 await q("update inventory_return_stock_cutover set cutover_at=now()-interval '1 second'")
 eq((await scalar('select legacy_stock_bridge_health()')).returnStockCutoverReady,true)
 const parallelReturn='66666666-6666-4666-8666-666666666666'
 await q("insert into returns(id,order_id,status,return_items)values($1,$2,'return_received',$3::jsonb)",[parallelReturn,returnOrder,JSON.stringify([{order_item_id:item,quantity:1}])])
 await scalar("select apply_inventory_command($1,'return',$2::jsonb)",[rid,JSON.stringify({returnId:rid})])
 await scalar("select apply_inventory_command($1,'return',$2::jsonb)",[rid,JSON.stringify({returnId:rid})])
 await scalar("select apply_inventory_command($1,'return',$2::jsonb)",[parallelReturn,JSON.stringify({returnId:parallelReturn})])
 eq(await scalar('select quantity from inventory_return_stock_lines where return_id=$1',[parallelReturn]),1)
 const extraReturn='44444444-4444-4444-8444-444444444444'
 await q("insert into returns(id,order_id,status,return_items)values($1,$2,'return_received',$3::jsonb)",[extraReturn,returnOrder,JSON.stringify([{order_item_id:item,quantity:2}])])
 await assert.rejects(()=>q("select apply_inventory_command($1,'return',$2::jsonb)",[extraReturn,JSON.stringify({returnId:extraReturn})]),/CUMULATIVE_RETURN_QUANTITY_EXCEEDS_ORDER/);checks++
 await q('delete from returns where id=$1',[extraReturn])
 await q("insert into returns(id,order_id,status,return_items)values($1,$2,'return_received','[]')",[extraReturn,returnOrder])
 await assert.rejects(()=>q("select apply_inventory_command($1,'return',$2::jsonb)",[extraReturn,JSON.stringify({returnId:extraReturn})]),/RETURN_ITEMS_REQUIRED/);checks++
 await q('delete from returns where id=$1',[extraReturn])
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),14)
 eq((await scalar('select legacy_stock_bridge_health()')).pending,4)
 await q("update shopify_legacy_stock_outbox set processed_at=now() where processed_at is null")
 eq(await scalar('select mirror_owned_shopify_stock($1)',[variant]),false)
 await q("update shopify_inventory_snapshots set available_quantity=14,observed_at=now() where mose_variant_id=$1",[variant])
 eq((await scalar('select legacy_stock_bridge_health()')).verifiedOwnershipCount,1)
 eq(await scalar('select count(*)::int from shopify_legacy_stock_outbox'),5)
 await scalar('select mark_legacy_stock_worker()')
 eq((await scalar('select legacy_stock_bridge_health()')).lastWorkerAt!==null,true)
 const cas='55555555-5555-4555-8555-555555555555'
 await assert.rejects(()=>q("select apply_inventory_command($1,'adjust',$2::jsonb)",[cas,JSON.stringify({...adjust,delta:-1,expectedStock:13})]),/STOCK_CHANGED_RELOAD_REQUIRED/);checks++
 await scalar("select apply_inventory_command($1,'adjust',$2::jsonb)",[cas,JSON.stringify({...adjust,delta:-1,expectedStock:14})])
 eq((await q('select expected_quantity,target_quantity from shopify_legacy_stock_outbox where source_key=$1',[cas])).rows[0],{expected_quantity:14,target_quantity:13})
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),13)
 eq(await scalar("select has_table_privilege('authenticated','public.inventory_command_journal','select')"),false)
 await q('update orders set payment_status=null where id=$1',[order])
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true,skipped:true,reason:'not_paid'})
 console.log(`${checks} local PostgreSQL atomic stock/outbox/lease/privilege assertions passed`)
}finally{await db.close()}
