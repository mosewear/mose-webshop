import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite(); let checks=0
const q=(s,a=[])=>db.query(s,a)
const scalar=async(s,a=[])=>Object.values((await q(s,a)).rows[0])[0]
const check=(a,b)=>{assert.deepEqual(a,b);checks++}
const reject=async(s,a,code)=>{await assert.rejects(q(s,a),new RegExp(code));checks++}
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', promo='00000000-0000-4000-8000-000000000003'
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table promo_codes(id uuid primary key,code text unique,discount_type text,discount_value numeric,min_order_value numeric,applies_to_sale_items boolean,expires_at timestamptz,is_active boolean,usage_limit integer,usage_count integer);
 create table shopify_checkout_attempts(id uuid primary key,lease_token uuid,status text,cart_id text,checkout_url text,expires_at timestamptz,created_at timestamptz default now());
 create table shopify_order_snapshots(shopify_order_id text primary key,financial_status text,snapshot jsonb,source_updated_at timestamptz default now());
 create table orders(id uuid primary key default gen_random_uuid(),promo_code text,discount_amount numeric,total numeric,status text default 'pending');
 create table promo_code_usage(promo_code_id uuid references promo_codes(id),order_id uuid references orders(id),discount_amount numeric,order_total numeric,user_id uuid);`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028001000_atomic_promo_reservations.sql',import.meta.url),'utf8'))
 await q("insert into promo_codes values($1,'PRIVATE','percentage',10,0,false,null,true,1,0)",[promo])
 for(const id of [a,b]) await q("insert into shopify_checkout_attempts(id,lease_token,status,cart_id,checkout_url,expires_at) values($1,$1,'creating',null,null,now()+interval '1 hour')",[id])
 const snapshot=await scalar('select shopify_promo_snapshot(p) from promo_codes p where id=$1',[promo])
 check(await scalar('select reserve_shopify_promo($1,$1,$2,$3,1000)',[a,promo,snapshot]),'reserved')
 check(await scalar('select reserve_shopify_promo($1,$1,$2,$3,1000)',[a,promo,snapshot]),'reserved')
 await reject('select reserve_shopify_promo($1,$1,$2,$3,1000)',[b,promo,snapshot],'PROMO_EXHAUSTED')
 const order={promo_code:'PRIVATE',discount_amount:10,total:90}
 await reject('select * from create_legacy_promo_order($1,$2,$3)',[order,promo,snapshot],'PROMO_EXHAUSTED')
 check(await scalar('select count(*)::int from orders'),0)
 check(await scalar('select claim_shopify_promo_issuance($1,$1,$1)',[a]),true)
 check(await scalar('select claim_shopify_promo_issuance($1,$1,$1)',[a]),false)
 check(await scalar('select bind_shopify_promo_discount($1,$1,$2,$3)',[a,'gid://shopify/DiscountCodeNode/1','a'.repeat(64)]),true)
 await q("insert into shopify_order_snapshots(shopify_order_id,financial_status,snapshot) values('gid://shopify/Order/1','PAID',$1)",[{customAttributes:[{key:'mose_source',value:'unified-checkout'},{key:'mose_attempt',value:a}]}])
 check(await scalar('select consume_shopify_promo($1,$2,$3,1000)',[a,'gid://shopify/Order/1','a'.repeat(64)]),true)
 check(await scalar('select consume_shopify_promo($1,$2,$3,1000)',[a,'gid://shopify/Order/1','a'.repeat(64)]),true)
 check(await scalar('select usage_count from promo_codes'),1)
 await q("update shopify_benefit_runtime set cutover_at=now()-interval '1 day',review_reference='local-test-review' where id=1")
 await q("update shopify_order_snapshots set source_updated_at=now()+interval '1 second' where shopify_order_id='gid://shopify/Order/1'")
 const job=(await q('select * from claim_shopify_benefits()')).rows[0]
 check(job.attempt_id,a)
 check(await scalar('select complete_shopify_benefits($1,$2,$3,$4,1000)',[job.order_id,b,job.source_updated_at,'a'.repeat(64)]),false)
 check(await scalar('select complete_shopify_benefits($1,$2,$3,$4,1000)',[job.order_id,job.lease_token,job.source_updated_at,'a'.repeat(64)]),true)
 check(await scalar("select status from shopify_benefit_outbox"),'processed')
 check(await scalar('select usage_count from promo_codes'),1)
 await q("update shopify_order_snapshots set source_updated_at=now()+interval '2 seconds' where shopify_order_id='gid://shopify/Order/1'")
 const newerJob=(await q('select * from claim_shopify_benefits()')).rows[0]
 check(await scalar('select complete_shopify_benefits($1,$2,$3,$4,1000)',[job.order_id,job.lease_token,job.source_updated_at,'a'.repeat(64)]),false)
 check(await scalar('select complete_shopify_benefits($1,$2,$3,$4,1000)',[newerJob.order_id,newerJob.lease_token,newerJob.source_updated_at,'a'.repeat(64)]),true)

 check(await scalar('select consume_shopify_promo($1,$2,$3,999)',[a,'gid://shopify/Order/1','a'.repeat(64)]),false)
 await q('update promo_codes set usage_limit=2 where id=$1',[promo])
 const newer=await scalar('select shopify_promo_snapshot(p) from promo_codes p where id=$1',[promo])
 const saved=(await q('select * from create_legacy_promo_order($1,$2,$3)',[order,promo,newer])).rows[0]
 check(saved.status,'pending')
 check(await scalar('select usage_count from promo_codes'),2)
 check(await scalar('select count(*)::int from promo_code_usage'),1)
 check(await scalar('select track_legacy_promo_usage_atomic($1,$2,10,90)', ['PRIVATE',saved.id]),true)
 check(await scalar('select usage_count from promo_codes'),2)
 await reject('select * from create_legacy_promo_order($1,$2,$3)',[order,promo,newer],'PROMO_EXHAUSTED')
 await q('update promo_codes set usage_limit=3 where id=$1',[promo])
 const latest=await scalar('select shopify_promo_snapshot(p) from promo_codes p where id=$1',[promo])
 await reject('select * from create_legacy_promo_order($1,$2,$3)',[{...order,imaginary_column:1},promo,latest],'INVALID_PROMO_ORDER_COLUMNS')
 check(await scalar('select usage_count from promo_codes'),2)
 for(const role of ['anon','authenticated']) {
  check(await scalar(`select has_function_privilege('${role}','create_legacy_promo_order(jsonb,uuid,jsonb)','execute')`),false)
  check(await scalar(`select has_table_privilege('${role}','shopify_promo_reservations','select')`),false)
 }
} finally {await db.close()}
console.log(`${checks} promo PostgreSQL assertions passed`)
