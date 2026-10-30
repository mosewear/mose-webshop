/** Isolated PostgreSQL assertions; no Shopify/Supabase/production connection. */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite(),id='00000000-0000-4000-8000-000000000001',intent='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
let checks=0
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const check=(a,b)=>{assert.deepEqual(a,b);checks++}
const reject=async(sql,args,code)=>{await assert.rejects(db.query(sql,args),new RegExp(code));checks++}
const claim=(amount,lease=intent,count=3,limit=2000)=>db.query('select * from reserve_native_gift_variant($1,$2,$3,$4,$5)',[id,amount,lease,count,limit])
try {
await db.exec(`create role anon;create role authenticated;create role service_role;
create table products(id uuid primary key,is_active boolean,status text,is_gift_card boolean,allows_custom_amount boolean,gift_card_min_amount numeric,gift_card_max_amount numeric);
insert into products values('${id}',true,'active',true,true,20,1000);`)
await db.exec(await readFile(new URL('../../supabase/migrations/20261030133000_native_gift_amount_catalog.sql',import.meta.url),'utf8'))
check(await scalar('select count(*)::int from shopify_native_gift_products'),0)
check(await scalar('select count(*)::int from shopify_native_gift_amounts'),0)
for(const role of ['anon','authenticated']) {
check(await scalar(`select has_table_privilege('${role}','shopify_native_gift_amounts','select')`),false)
check(await scalar(`select has_function_privilege('${role}','reserve_native_gift_variant(uuid,integer,uuid,integer,integer)','execute')`),false)
}
check(await scalar("select has_table_privilege('service_role','shopify_native_gift_amounts','update')"),false)
await db.query("insert into shopify_native_gift_products(mose_product_id,shopify_product_id,review_reference) values($1,'gid://shopify/Product/1','manually reviewed native product')",[id])
await reject('select * from reserve_native_gift_variant($1,2025,$2,3,2000)',[id,intent],'NATIVE_GIFT_PRODUCT_UNREGISTERED')
await db.query('update shopify_native_gift_products set enabled=true where mose_product_id=$1',[id])
check((await claim(2025)).rows,[{action:'create',variant_id:null}])
check((await claim(2025)).rows,[{action:'pending',variant_id:null}])
check((await claim(2026,other)).rows,[{action:'pending',variant_id:null}])
check(await scalar("select bind_native_gift_variant($1,2025,$2,'gid://shopify/ProductVariant/2')",[id,other]),false)
check(await scalar("select bind_native_gift_variant($1,2025,$2,'gid://shopify/ProductVariant/2')",[id,intent]),true)
check((await claim(2025)).rows,[{action:'ready',variant_id:'gid://shopify/ProductVariant/2'}])
check(await scalar("select bind_native_gift_variant($1,2025,$2,'gid://shopify/ProductVariant/999')",[id,intent]),false)
await reject('select * from reserve_native_gift_variant($1,2026,$2,3,3)',[id,other],'NATIVE_GIFT_VARIANT_CAPACITY')
await reject('select * from reserve_native_gift_variant($1,1999,$2,3,2000)',[id,other],'NATIVE_GIFT_AMOUNT_UNAVAILABLE')
await db.query('update products set gift_card_min_amount=25 where id=$1',[id])
await reject('select * from reserve_native_gift_variant($1,2025,$2,3,2000)',[id,other],'NATIVE_GIFT_AMOUNT_UNAVAILABLE')
await db.query('update products set gift_card_min_amount=20 where id=$1',[id])
check((await claim(2026,other)).rows,[{action:'create',variant_id:null}])
check(await scalar('select mark_native_gift_variant_unknown($1,2026,$2,null)',[id,other]),true)
check((await claim(2027)).rows,[{action:'pending',variant_id:null}])
await reject("update shopify_native_gift_products set shopify_product_id='gid://shopify/Product/999' where mose_product_id=$1",[id],'NATIVE_GIFT_PRODUCT_IDENTITY_IMMUTABLE')
// Operator reconciliation is simulated only in this isolated database.
await db.query("update shopify_native_gift_amounts set status='ready',shopify_variant_id='gid://shopify/ProductVariant/3' where amount_cents=2026")
await db.query("insert into shopify_native_gift_amounts(mose_product_id,amount_cents,status,intent_id,shopify_variant_id) select $1,3000+i,'ready',$2,'gid://shopify/ProductVariant/' || (100+i)::text from generate_series(1,23)i",[id,intent])
await reject('select * from reserve_native_gift_variant($1,8000,$2,3,2000)',[id,intent],'NATIVE_GIFT_CREATION_RATE_LIMIT')
check((await claim(2025)).rows,[{action:'ready',variant_id:'gid://shopify/ProductVariant/2'}])
console.log(JSON.stringify({checks,productionConnections:0}))
}finally{await db.close()}
