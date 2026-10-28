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
 create table public.order_items(order_id uuid,variant_id uuid,quantity integer,is_presale boolean,is_gift_card boolean);`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000900_stockownership_bridge.sql',import.meta.url),'utf8'))
 eq(await scalar("select has_function_privilege('anon','public.apply_legacy_paid_stock(uuid)','execute')"),false)
 eq(await scalar("select has_function_privilege('authenticated','public.claim_legacy_stock_delta()','execute')"),false)
 eq(await scalar("select has_table_privilege('authenticated','public.shopify_stock_ownership','insert')"),false)
 await q("insert into orders(id,payment_status)values($1,'paid'),($2,'pending')",[order,second])
 await q('insert into product_variants values($1,10,3),($2,0,0)',[variant,other])
 await q('insert into order_items values($1,$2,2,false,false),($1,$2,3,false,false)',[order,variant])
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true})
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select apply_legacy_paid_stock($1)',[order]),{ok:true,skipped:true,reason:'already_decremented'})
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select apply_legacy_paid_stock($1)',[second]),{ok:true,skipped:true,reason:'not_paid'})
 // A later failing line rolls back every previous write and the order stamp.
 await q("update orders set payment_status='paid' where id=$1",[second])
 await q('insert into order_items values($1,$2,1,false,false),($1,$3,1,false,false)',[second,variant,other])
 await assert.rejects(()=>q('select apply_legacy_paid_stock($1)',[second]),/INSUFFICIENT_STOCK/); checks++
 eq(await scalar('select stock_quantity from product_variants where id=$1',[variant]),5)
 eq(await scalar('select stock_decremented_at from orders where id=$1',[second]),null)
 await q('delete from order_items where order_id=$1',[second])
 // Presale is consumed first for presale-only lines, then regular/general lines share the remaining pools.
 await q('insert into order_items values($1,$2,2,true,false),($1,$2,6,false,false)',[second,variant])
 eq(await scalar('select apply_legacy_paid_stock($1)',[second]),{ok:true})
 eq((await q('select stock_quantity,presale_stock_quantity from product_variants where id=$1',[variant])).rows[0],{stock_quantity:0,presale_stock_quantity:0})
 // An explicitly cut-over historical payment queues one supplier-independent delta.
 await q('update orders set stock_decremented_at=null where id=$1',[order])
 await q('delete from order_items where order_id=$1',[order])
 await q('insert into order_items values($1,$2,1,false,false)',[order,variant])
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
 console.log(`${checks} local PostgreSQL atomic stock/outbox/lease/privilege assertions passed`)
}finally{await db.close()}
