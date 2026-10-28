/** Synthetic local real PostgreSQL integration. Reject non-loopback connections.
 * MOSE_PG_MODULE=/absolute/path/to/pg/lib/index.js MOSE_PG_URL=postgresql://...@127.0.0.1:PORT/postgres node tests/lib/shopify-combined-postgres-check.mjs
 * No production rows, auth/customer exports or credentials are needed.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const url = new URL(process.env.MOSE_PG_URL)
assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'local synthetic server only')
const { default: pg } = await import(pathToFileURL(process.env.MOSE_PG_MODULE).href)
const db = new pg.Client({connectionString:url.href}); await db.connect()
let checks=0
const check=(a,b,label)=>{assert.deepEqual(a,b,label); checks++}
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const user='11111111-1111-4111-8111-111111111111', attempt='22222222-2222-4222-8222-222222222222'
const order='33333333-3333-4333-8333-333333333333', ret='44444444-4444-4444-8444-444444444444'
const email='synthetic@example.invalid'
const files=['20261027000100_shopify_pilot.sql','20261027000200_shopify_order_accounts.sql','20261028000100_shopify_inventory_evidence.sql','20261028000400_shopify_loyalty_ledger.sql','20261028000500_shopify_loyalty_outbox.sql','20261028000600_atomic_legacy_loyalty.sql']
const sqls=await Promise.all(files.map(f=>readFile(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8')))
const tx=async(sql,args=[])=>{const c=new pg.Client({connectionString:url.href}); await c.connect();try{await c.query('begin');await c.query("set local statement_timeout='10s'");const result=await c.query(sql,args);await c.query('commit');return result.rows}catch(e){await c.query('rollback');throw e}finally{await c.end()}}
try {
 const major = await scalar("select current_setting('server_version_num')::int/10000")
 check([17,18].includes(major),true,'supported local PostgreSQL major')
 await db.query(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text unique);create function auth.uid()returns uuid language sql as 'select null::uuid';create function auth.jwt()returns jsonb language sql as 'select ''{}''::jsonb';
 create table profiles(id uuid primary key,is_admin boolean);create table returns(id uuid primary key);
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;`)
 await db.query(await readFile(new URL('../../supabase/migrations/20260418000001_create_loyalty_system.sql',import.meta.url),'utf8'))
 await db.query(await readFile(new URL('../../supabase/migrations/20260419150000_loyalty_transactions_return_id.sql',import.meta.url),'utf8'))
 await db.query('insert into auth.users values($1,$2)',[user,email])
 await db.query("insert into loyalty_points(email,user_id,points_balance,lifetime_points)values($1,$2,104,104)",[email,user])
 await db.query("insert into loyalty_points(email,points_balance,lifetime_points)select 'fixture-'||n||'@example.invalid',case when n=53 then 176 else 112 end,case when n=53 then 176 else 112 end from generate_series(1,53)n")
 const opening=(await db.query('select * from loyalty_points order by email')).rows
 await db.query('begin');for(const sql of sqls)await db.query(sql);await db.query('rollback')
 check(await scalar("select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'shopify_%'"),0,'all six migrations roll back completely')
 await db.query('begin');for(const sql of sqls)await db.query(sql);await db.query('commit')
 check((await db.query('select * from loyalty_points order by email')).rows,opening,'installation preserves all54 accounts byte-for-byte')
 check(await scalar('select sum(points_balance)::int from loyalty_points'),6104,'opening6104 points unchanged')
 check(await scalar('select count(*)::int from loyalty_transactions'),0,'no backfill transactions')
 check(await scalar('select checkout_enabled from shopify_integration_state'),false,'checkout closed')
 check(await scalar('select cutover_at from shopify_loyalty_runtime'),null,'loyalty runtime dormant')
 const tables=(await db.query("select tablename from pg_tables where schemaname='public' and (tablename like 'shopify_%' or tablename like 'legacy_loyalty_%') order by tablename")).rows.map(r=>r.tablename)
 check(tables.length,19,'complete additive schema count')
 for(const table of tables){check(await scalar('select relrowsecurity from pg_class where oid=$1::regclass',[table]),true,'RLS '+table)
  for(const role of ['anon','authenticated'])for(const privilege of ['select','insert','update','delete'])check(await scalar('select has_table_privilege($1,$2,$3)',[role,table,privilege]),false,role+' cannot '+privilege+' '+table)
 }
 for(const table of ['loyalty_points','loyalty_transactions'])for(const role of ['anon','authenticated'])for(const privilege of ['insert','update','delete','truncate','references','trigger'])check(await scalar('select has_table_privilege($1,$2,$3)',[role,table,privilege]),false,'legacy browser financial mutation denied')
 // Supabase default grants must not leave direct service-role financial writes.
 for(const table of ['shopify_loyalty_reservations','shopify_loyalty_settlements','shopify_loyalty_ledger','shopify_loyalty_runtime','shopify_loyalty_outbox','legacy_loyalty_operations','legacy_loyalty_refund_claims']){
  check(await scalar("select has_table_privilege('service_role',$1,'select')",[table]),true,'server reads '+table)
  for(const privilege of ['insert','update','delete'])check(await scalar("select has_table_privilege('service_role',$1,$2)",[table,privilege]),false,'service financial writes only through RPC '+table)
 }
 check(await scalar("select has_table_privilege('service_role','shopify_loyalty_discount_bindings','insert')"),true,'server creates verified discount binding')
 check(await scalar("select has_table_privilege('service_role','shopify_loyalty_discount_bindings','update')"),false,'binding immutable to ordinary server')
 check(await scalar("select has_table_privilege('service_role','shopify_loyalty_discount_bindings','delete')"),false,'binding cannot silently disappear')
 for(const role of ['anon','authenticated']){await db.query('set role '+role);await assert.rejects(db.query('select * from shopify_order_snapshots'),/permission denied/);checks++;await assert.rejects(db.query("select atomic_legacy_loyalty('admin','test-key','synthetic@example.invalid',null)"),/permission denied/);checks++;await db.query('reset role')}
 await db.query("insert into shopify_checkout_attempts(id,session_hash,request_fingerprint,buyer_hash,status,lease_token,cart_snapshot)values($1,'session','fingerprint','buyer','creating',$1,'{}')",[attempt])
 await db.query("insert into shopify_checkout_owners(attempt_id,user_id,proof)values($1,$2,repeat('a',64))",[attempt,user])
 await db.query("select atomic_legacy_loyalty('admin','legacy:admin:prepare',$1,$2,96,null,null,null,'synthetic fixture',(select id from loyalty_points where email=$1))",[email,user])
 // Separate sessions compete for the same physical account row. Both must retain
 // their relative debits; the old read/overwrite strategy loses one of them.
 await Promise.all([tx('select reserve_shopify_loyalty($1,$2,100)',[attempt,user]),tx("select atomic_legacy_loyalty('redeem','legacy:redeem:simultaneous',$1,$2,100)",[email,user])])
 check(await scalar('select points_balance from loyalty_points where email=$1',[email]),0,'separate Shopify+legacy sessions keep both debits')
 await db.query('insert into returns values($1)',[ret])
 await Promise.all([tx('select award_loyalty_points($1,$2,$3,100)',[email,user,order]),tx("select atomic_legacy_loyalty('refund','legacy:return:simultaneous',$1,$2,null,$3,$4,50)",[email,user,order,ret]),tx("select atomic_legacy_loyalty('admin','legacy:admin:simultaneous',$1,$2,30,null,null,null,'synthetic',(select id from loyalty_points where email=$1))",[email,user])])
 check(await scalar('select points_balance from loyalty_points where email=$1',[email]),80,'late payment/refund/admin sessions converge')
 await Promise.all([tx('select award_loyalty_points($1,$2,$3,100)',[email,user,order]),tx("select atomic_legacy_loyalty('refund','legacy:return:simultaneous',$1,$2,null,$3,$4,50)",[email,user,order,ret])])
 check(await scalar('select points_balance from loyalty_points where email=$1',[email]),80,'concurrent provider replays unchanged')
 const results=await Promise.allSettled([tx("select atomic_legacy_loyalty('redeem','legacy:redeem:race-a',$1,$2,100)",[email,user]),tx("select atomic_legacy_loyalty('redeem','legacy:redeem:race-b',$1,$2,100)",[email,user])])
 check(results.every(r=>r.status==='rejected'),true,'insufficient balance never spent')
 await db.query("select atomic_legacy_loyalty('admin','legacy:admin:topup',$1,$2,50,null,null,null,'synthetic',(select id from loyalty_points where email=$1))",[email,user])
 const competing=await Promise.allSettled([tx("select atomic_legacy_loyalty('redeem','legacy:redeem:race-c',$1,$2,100)",[email,user]),tx("select atomic_legacy_loyalty('redeem','legacy:redeem:race-d',$1,$2,100)",[email,user])])
 check(competing.filter(r=>r.status==='fulfilled').length,1,'two simultaneous redemptions only one funded')
 check(await scalar('select points_balance from loyalty_points where email=$1',[email]),30,'no overspend or overwrite')
 const fresh='55555555-5555-4555-8555-555555555555',freshAttempt='66666666-6666-4666-8666-666666666666',freshLegacyOrder='77777777-7777-4777-8777-777777777777'
 const freshEmail='first-buyer@example.invalid',shopifyOrder='gid://shopify/Order/999'
 await db.query('insert into auth.users values($1,$2)',[fresh,freshEmail])
 await db.query("insert into shopify_checkout_attempts(id,session_hash,request_fingerprint,buyer_hash,status,lease_token,cart_snapshot)values($1,'session2','fingerprint2','buyer2','creating',$1,'{}')",[freshAttempt])
 await db.query("insert into shopify_checkout_owners(attempt_id,user_id,proof)values($1,$2,repeat('b',64))",[freshAttempt,fresh])
 const attrs={customAttributes:[{key:'mose_source',value:'unified-checkout'},{key:'mose_attempt',value:freshAttempt},{key:'mose_account_proof',value:'b'.repeat(64)}]}
 await db.query("insert into shopify_order_snapshots(shopify_order_id,order_name,source_updated_at,financial_status,fulfillment_status,currency,total_amount,refunded_amount,snapshot)values($1,'synthetic','2026-10-28T12:00:00Z','PAID','UNFULFILLED','EUR',79,0,$2)",[shopifyOrder,attrs])
 await Promise.all([tx("select settle_shopify_loyalty($1,'2026-10-28T12:00:00Z',7900,0,0,0)",[shopifyOrder]),tx('select award_loyalty_points($1,$2,$3,79)',[freshEmail,fresh,freshLegacyOrder])])
 check(await scalar('select points_balance from loyalty_points where email=$1',[freshEmail]),158,'separate first-purchase Shopify/legacy creators share one account and retain both earnings')
 check(await scalar('select count(*)::int from loyalty_points where email=$1',[freshEmail]),1,'concurrent first earning creates exactly one account')
 check(await scalar('select count(*)::int from loyalty_points'),55,'opening54 plus one actual new buyer only')
 console.log(`${checks} combined real PostgreSQL${major} migration/RLS/separate-session concurrency checks passed; ${tables.length} private RLS tables; synthetic only.`)
}finally{await db.end()}
