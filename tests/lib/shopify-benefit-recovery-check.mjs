/** Actual additive migrations, local PostgreSQL only; no provider calls. */
import assert from 'node:assert/strict'
import{readFile}from'node:fs/promises'
import{pathToFileURL}from'node:url'
const{PGlite}=await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db=new PGlite();let checks=0
const q=(s,a=[])=>db.query(s,a),scalar=async(s,a=[])=>Object.values((await q(s,a)).rows[0])[0]
const check=(a,b)=>{assert.deepEqual(a,b);checks++}
const reject=async(s,a,code)=>{await assert.rejects(q(s,a),new RegExp(code));checks++}
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',promo='00000000-0000-4000-8000-000000000003'
const p1='gid://shopify/DiscountCodeNode/1',p2='gid://shopify/DiscountCodeNode/2',p3='gid://shopify/DiscountCodeNode/3'
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text unique);
 create function auth.uid() returns uuid language sql as 'select null::uuid';
 create function auth.jwt() returns jsonb language sql as 'select ''{}''::jsonb';
 create table profiles(id uuid primary key,is_admin boolean);
 create table promo_codes(id uuid primary key,code text unique,discount_type text,discount_value numeric,min_order_value numeric,applies_to_sale_items boolean,expires_at timestamptz,is_active boolean,usage_limit integer,usage_count integer);
 create table orders(id uuid primary key default gen_random_uuid(),promo_code text,discount_amount numeric,total numeric,status text default 'pending');
 create table promo_code_usage(promo_code_id uuid references promo_codes(id),order_id uuid references orders(id),discount_amount numeric,order_total numeric,user_id uuid);`)
 for(const name of['20260418000001_create_loyalty_system.sql','20261027000100_shopify_pilot.sql','20261027000200_shopify_order_accounts.sql','20261028000400_shopify_loyalty_ledger.sql','20261028000500_shopify_loyalty_outbox.sql','20261028000700_shopify_benefit_issuance.sql','20261028001000_atomic_promo_reservations.sql','20261028001100_shopify_benefit_recovery.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'))
 await q("insert into auth.users values($1,'owner@test.invalid')",[a])
 await q("insert into loyalty_points(user_id,email,points_balance,lifetime_points)values($1,'owner@test.invalid',500,500)",[a])
 const attempt=async(id)=>{await q("insert into shopify_checkout_attempts(id,session_hash,request_fingerprint,buyer_hash,status,lease_token,cart_snapshot)values($1,'s','f','b','creating',$1,'{}')",[id]);await q('insert into shopify_checkout_owners(attempt_id,user_id,proof) values($1,$2,$3)',[id,a,(id===a?'a':'b').repeat(64)])}
 await attempt(a)
 await q('select reserve_shopify_loyalty($1,$1,100)',[a])
 await q('select claim_shopify_benefit($1,$1,$2,$3)',[a,b,'a'.repeat(64)])
 await q('select complete_shopify_benefit($1,$2,$3)',[a,b,p1])
 await q("insert into promo_codes values($1,'PRIVATE','percentage',10,0,false,null,true,1,0)",[promo])
 const snapshot=await scalar('select shopify_promo_snapshot(p)from promo_codes p')
 await q('select reserve_shopify_promo($1,$1,$2,$3,590)',[a,promo,snapshot])
 await q('select claim_shopify_promo_issuance($1,$1,$2)',[a,b])
 await q('select bind_shopify_promo_discount($1,$2,$3,$4)',[a,b,p2,'b'.repeat(64)])
 await q("select claim_shopify_automatic_benefit($1,$1,'tier',$2,$3,$4)",[a,b,'c'.repeat(64),'d'.repeat(64)])
 await q("select bind_shopify_automatic_benefit($1,'tier',$2,$3)",[a,b,p3])
 check(await scalar('select points_balance from loyalty_points'),400)
 await reject('select record_shopify_no_cart($1,$2)',[a,b],'NO_CART_PROOF_NOT_AUTHORIZED')
 const proof=await scalar('select record_shopify_no_cart($1,$1)',[a])
 check(await scalar('select status from shopify_checkout_attempts where id=$1',[a]),'unknown')
 await reject('select complete_shopify_benefit_recovery($1,$2)',[a,b],'RECOVERY_PROOF_MISSING')
 await reject('select complete_shopify_benefit_recovery($1,$2)',[a,proof],'RECOVERY_REVOCATION_INCOMPLETE')
 check(await scalar('select points_balance from loyalty_points'),400)
 await reject('select record_shopify_benefit_revocation($1,$2,$3,$4)',[a,proof,p1,'b'.repeat(64)],'RECOVERY_COUPON_MISMATCH')
 for(const[id,hash]of[[p1,'a'],[p2,'b']])check(await scalar('select record_shopify_benefit_revocation($1,$2,$3,$4)',[a,proof,id,hash.repeat(64)]),true)
 await reject('select complete_shopify_benefit_recovery($1,$2)',[a,proof],'RECOVERY_REVOCATION_INCOMPLETE')
 check(await scalar('select points_balance from loyalty_points'),400)
 check(await scalar('select record_shopify_benefit_revocation($1,$2,$3,$4)',[a,proof,p3,'c'.repeat(64)]),true)
 const liabilities=await scalar('select shopify_benefit_liabilities()');check(liabilities.heldPoints,100);check(liabilities.heldPromoUses,1);check(liabilities.definitiveNoCartAwaitingRecovery,1)
 check(await scalar('select complete_shopify_benefit_recovery($1,$2)',[a,proof]),'recovered')
 check(await scalar('select points_balance from loyalty_points'),500)
 check(await scalar("select status from shopify_promo_reservations where attempt_id=$1",[a]),'released')
 check(await scalar('select status from shopify_checkout_attempts where id=$1',[a]),'failed')
 check(await scalar('select complete_shopify_benefit_recovery($1,$2)',[a,proof]),'recovered')
 check(await scalar('select points_balance from loyalty_points'),500)
 check(await scalar("select count(*)::int from shopify_loyalty_ledger where kind='release'"),1)
 check((await scalar('select shopify_benefit_liabilities()')).heldPromoUses,0)
 // A later unknown creation with no definitive CartCreate response is NOT recoverable.
 await attempt(b);await q('select reserve_shopify_loyalty($1,$2,100)',[b,a]);await q('select claim_shopify_benefit($1,$1,$2,$3)',[b,a,'e'.repeat(64)])
 await reject('select record_shopify_no_cart($1,$1)',[b],'RECOVERY_ISSUANCE_NOT_RESOLVED')
 check(await scalar('select points_balance from loyalty_points'),400)
 for(const role of['anon','authenticated']){
  check(await scalar(`select has_table_privilege('${role}','shopify_benefit_recovery','select')`),false)
  check(await scalar(`select has_function_privilege('${role}','complete_shopify_benefit_recovery(uuid,uuid)','execute')`),false)
 }
 check(await scalar("select has_table_privilege('service_role','shopify_benefit_recovery','update')"),false)
 console.log(`${checks} benefit recovery PostgreSQL assertions passed`)
}finally{await db.close()}
