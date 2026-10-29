import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {PGlite}=await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db=new PGlite();let checks=0
const scalar=async(s,a=[])=>Object.values((await db.query(s,a)).rows[0])[0]
const eq=(a,b)=>{assert.deepEqual(a,b);checks++}
const id='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222',v='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',product='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
try{
await db.exec(`create role anon;create role authenticated;create role service_role;
create table orders(id uuid primary key,email text,status text,payment_status text,paid_at timestamptz,payment_method text,subtotal numeric,total numeric,shipping_cost numeric,tax_amount numeric,discount_amount numeric,shipping_address jsonb,billing_address jsonb,delivery_method text,internal_notes text,checkout_started_at timestamptz,locale text,created_at timestamptz default now(),stock_decremented_at timestamptz);
create table product_variants(id uuid primary key,product_id uuid,is_available boolean,stock_quantity int,presale_stock_quantity int);
create table order_items(id uuid default gen_random_uuid(),order_id uuid,product_id uuid,variant_id uuid,product_name text,size text,color text,sku text,quantity int,original_price numeric,quantity_discount_amount numeric,price_at_purchase numeric,subtotal numeric,image_url text,is_presale boolean,is_gift_card boolean);
create table shopify_stock_ownership(variant_id uuid,cutover_at timestamptz,generation uuid,inventory_item_id text,location_id text);
create table shopify_legacy_stock_outbox(order_id uuid,variant_id uuid,generation uuid,inventory_item_id text,location_id text,delta int,local_shortfall boolean);
create table stats_calls(total numeric);create function upsert_customer_profile(text,text,text,text) returns void language sql as $$select$$;
create function update_customer_stats(text,numeric,timestamptz) returns void language sql as $$insert into stats_calls values($2)$$;
insert into product_variants values('${v}','${product}',true,5,0);`)
const bridge=await readFile(new URL('../../supabase/migrations/20261028000900_stockownership_bridge.sql',import.meta.url),'utf8');await db.exec(bridge.slice(bridge.indexOf('create function public.apply_legacy_paid_stock'),bridge.indexOf('create function public.claim_legacy_stock_delta')))
await db.exec(await readFile(new URL('../../supabase/migrations/20261029000200_atomic_manual_orders.sql',import.meta.url),'utf8'))
const order={email:'fixture@example.invalid',status:'processing',payment_status:'paid',paid_at:new Date().toISOString(),subtotal:20,total:20,shipping_cost:0,shipping_address:{name:'Test Fixture'},billing_address:{},delivery_method:'shipping',locale:'nl'}
const item={product_id:product,variant_id:v,quantity:2,original_price:10,quantity_discount_amount:0,price_at_purchase:10,subtotal:20}
const call=(id,hash='a'.repeat(64),items=[item])=>scalar('select create_atomic_manual_order($1,$2,$3,$4)',[id,hash,order,JSON.stringify(items)])
eq((await call(id)).reused,false);eq(await scalar('select stock_quantity from product_variants'),3);eq(await scalar('select stock_decremented_at is not null from orders'),true)
eq((await call(id)).reused,true);eq(await scalar('select stock_quantity from product_variants'),3);eq(await scalar('select count(*)::int from orders'),1);eq(await scalar('select count(*)::int from stats_calls'),1)
await assert.rejects(()=>call(id,'b'.repeat(64)),/MANUAL_ORDER_INTENT_MISMATCH/);checks++
await assert.rejects(()=>call(second,'a'.repeat(64),[item,item]),/INSUFFICIENT_STOCK/);checks++
eq(await scalar('select count(*)::int from orders'),1);eq(await scalar('select stock_quantity from product_variants'),3);eq(await scalar('select count(*)::int from manual_order_commands'),1)
await db.query("insert into shopify_stock_ownership(variant_id)values($1)",[v]);await assert.rejects(()=>call(second),/MANUAL_ORDER_SHOPIFY_OWNED/);checks++
eq(await scalar("select has_function_privilege('authenticated','create_atomic_manual_order(uuid,text,jsonb,jsonb)','execute')"),false)
console.log(`Atomic manual order: ${checks} PostgreSQL checks passed`)
}finally{await db.close()}
