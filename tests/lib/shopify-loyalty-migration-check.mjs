/** Local-only real PostgreSQL assertions. No Supabase/Shopify connection.
 * MOSE_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/lib/shopify-loyalty-migration-check.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const modulePath = process.env.MOSE_PGLITE_MODULE
if (!modulePath?.startsWith('/')) throw new Error('Set MOSE_PGLITE_MODULE to a local installed PGlite module')
const { PGlite } = await import(pathToFileURL(modulePath).href)
const db = new PGlite()
let checks = 0
const query = (sql, args = []) => db.query(sql, args)
const scalar = async (sql, args = []) => Object.values((await query(sql,args)).rows[0])[0]
const check = (actual,expected,label) => { assert.deepEqual(actual,expected,label); checks++ }
const reject = async (sql,args,code) => { await assert.rejects(query(sql,args),new RegExp(code)); checks++ }
const user = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
let sequence = 0
const attempt = async (owner = user) => {
  const id = `11111111-1111-4111-8111-${String(++sequence).padStart(12,'0')}`
  await query("insert into shopify_checkout_attempts(id,session_hash,request_fingerprint,buyer_hash,status,lease_token,cart_snapshot) values($1,'session','fingerprint','buyer','creating',$1,'{}')",[id])
  await query('insert into shopify_checkout_owners(attempt_id,user_id,proof) values($1,$2,$3)',[id,owner,String(sequence).padStart(64,'0')])
  return id
}
const order = async (attemptId, id = `gid://shopify/Order/${sequence}`, financialStatus = 'PAID') => {
  const proof = await scalar('select proof from shopify_checkout_owners where attempt_id=$1',[attemptId])
  const snapshot = { customAttributes: [{ key:'mose_source',value:'unified-checkout' },{ key:'mose_attempt',value:attemptId },{ key:'mose_account_proof',value:proof }] }
  await query("insert into shopify_order_snapshots(shopify_order_id,order_name,source_updated_at,financial_status,fulfillment_status,currency,total_amount,refunded_amount,snapshot) values($1,'#test','2026-10-28T12:00:00Z',$2,'UNFULFILLED','EUR','10.99','0',$3::jsonb)",[id,financialStatus,JSON.stringify(snapshot)])
  return id
}
const balance = () => scalar('select points_balance from loyalty_points where user_id=$1',[user])
const lifetime = () => scalar('select lifetime_points from loyalty_points where user_id=$1',[user])
const reserve = (a,points = 100,owner = user) => query('select reserve_shopify_loyalty($1,$2,$3)',[a,owner,points])
const settle = (o,{ time='2026-10-28T12:00:00Z',paid=1099,refund=0,discount=500,restore=0 } = {}) => scalar('select settle_shopify_loyalty($1,$2,$3,$4,$5,$6)',[o,time,paid,refund,discount,restore])
const advance = (o,time,status='PARTIALLY_REFUNDED') => query('update shopify_order_snapshots set source_updated_at=$2,financial_status=$3 where shopify_order_id=$1',[o,time,status])
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text unique);
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create function auth.jwt() returns jsonb language sql as 'select ''{}''::jsonb';
    create table profiles(id uuid primary key,is_admin boolean);`)
  for (const file of ['20260418000001_create_loyalty_system.sql','20261027000100_shopify_pilot.sql','20261027000200_shopify_order_accounts.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'))
  }
  await db.exec(`insert into auth.users(id,email) select ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,'customer' || i || '@test.invalid' from generate_series(1,54) i;
    insert into loyalty_points(user_id,email,points_balance,lifetime_points)
      select id,email,case when email='customer1@test.invalid' then 1000 when email='customer2@test.invalid' then 112 else 96 end,
      case when email='customer1@test.invalid' then 1000 when email='customer2@test.invalid' then 112 else 96 end from auth.users;`)
  const preserved = (await query('select * from loyalty_points order by email')).rows
  await db.exec(await readFile(new URL('../../supabase/migrations/20261028000400_shopify_loyalty_ledger.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../../supabase/migrations/20261028000500_shopify_loyalty_outbox.sql',import.meta.url),'utf8'))
  check((await query('select * from loyalty_points order by email')).rows,preserved,'migration preserves all 54 existing accounts byte for byte')
  check(await scalar('select sum(points_balance)::int from loyalty_points'),6104,'6104 opening points preserved')
  check(await scalar('select count(*)::int from loyalty_transactions'),0,'no synthetic backfill transactions')
  check(await scalar('select checkout_enabled from shopify_integration_state'),false,'checkout stays disabled')
  for (const role of ['anon','authenticated']) {
    for (const table of ['shopify_loyalty_ledger','shopify_loyalty_reservations','shopify_loyalty_settlements']) {
      check(await scalar(`select has_table_privilege('${role}','public.${table}','select')`),false,`${role} cannot read ${table}`)
    }
    for (const fn of ['reserve_shopify_loyalty(uuid,uuid,integer)','release_failed_shopify_loyalty(uuid)','settle_shopify_loyalty(text,timestamptz,integer,integer,integer,integer)']) {
      check(await scalar(`select has_function_privilege('${role}','public.${fn}','execute')`),false,`${role} cannot invoke ${fn}`)
    }
  }
  check(await scalar("select has_function_privilege('service_role','public.post_shopify_loyalty(text,uuid,uuid,text,text,integer,integer)','execute')"),false,'internal posting cannot be invoked directly')
  const a = await attempt()
  await reject('select reserve_shopify_loyalty($1,$2,100)',[a,other],'LOYALTY_OWNER_MISMATCH')
  await reject('select reserve_shopify_loyalty($1,$2,99)',[a,user],'INVALID_LOYALTY_POINTS')
  await reserve(a)
  check(await balance(),900,'reservation debits balance once')
  check(await lifetime(),1000,'reservation does not affect tier lifetime')
  await reserve(a)
  check(await balance(),900,'duplicate reservation does not spend twice')
  await reject('select reserve_shopify_loyalty($1,$2,200)',[a,user],'LOYALTY_RESERVATION_CONFLICT')
  await reject('select release_failed_shopify_loyalty($1)',[a],'LOYALTY_RELEASE_NOT_PROVEN')
  await query("update shopify_checkout_attempts set status='unknown',expires_at=now()-interval '1 day' where id=$1",[a])
  await reject('select release_failed_shopify_loyalty($1)',[a],'LOYALTY_RELEASE_NOT_PROVEN')
  await query("update shopify_checkout_attempts set status='failed' where id=$1",[a])
  check(await scalar('select release_failed_shopify_loyalty($1)',[a]),'released','definite no-cart failure releases')
  await query('select release_failed_shopify_loyalty($1)',[a])
  check(await balance(),1000,'repeated release credits only once')
  const b = await attempt()
  await reserve(b,900)
  const competing = await attempt()
  await reject('select reserve_shopify_loyalty($1,$2,200)',[competing,user],'LOYALTY_INSUFFICIENT_POINTS')
  check(await scalar('select count(*)::int from shopify_loyalty_reservations where attempt_id=$1',[competing]),0,'failed reservation leaves no hold')
  await query("update shopify_checkout_attempts set status='failed' where id=$1",[b])
  await query('select release_failed_shopify_loyalty($1)',[b])
  const c = await attempt()
  await reserve(c)
  const o = await order(c)
  await assert.rejects(settle(o,{discount:0}),/LOYALTY_DISCOUNT_MISMATCH/); checks++
  check(await balance(),900,'unverified discount cannot award points or consume hold')
  check(await settle(o),'applied','verified settlement earns and consumes')
  check(await balance(),910,'paid order adds whole-euro points')
  check(await lifetime(),1010,'earn changes lifetime')
  check(await scalar('select status from shopify_loyalty_reservations where attempt_id=$1',[c]),'consumed','redemption reserved then consumed without double debit')
  check(await settle(o),'duplicate','same snapshot deduplicated')
  await assert.rejects(settle(o,{refund:120,restore:10}),/LOYALTY_REFUND_NOT_VERIFIED/); checks++
  await assert.rejects(settle(o,{paid:2099}),/LOYALTY_SETTLEMENT_CONFLICT/); checks++
  await reject('select release_failed_shopify_loyalty($1)',[c],'LOYALTY_RELEASE_NOT_PROVEN')
  await advance(o,'2026-10-28T12:01:00Z')
  await settle(o,{time:'2026-10-28T12:01:00Z',refund:60})
  check(await balance(),910,'first sub-euro partial refund reverses zero points')
  await advance(o,'2026-10-28T12:02:00Z')
  await assert.rejects(settle(o),/LOYALTY_PAYMENT_NOT_VERIFIED/); checks++
  await assert.rejects(settle(o,{time:'2026-10-28T12:02:00Z',refund:120,restore:20}),/LOYALTY_RESTORATION_MISMATCH/); checks++
  await settle(o,{time:'2026-10-28T12:02:00Z',refund:120,restore:10})
  check(await balance(),919,'cumulative partial refunds reverse one point and restore 10 redeemed points')
  await settle(o,{time:'2026-10-28T12:02:00Z',refund:120,restore:10})
  check(await balance(),919,'refund replay has no effect')
  await advance(o,'2026-10-28T12:03:00Z','REFUNDED')
  await assert.rejects(settle(o,{time:'2026-10-28T12:03:00Z',refund:1099,restore:99}),/LOYALTY_RESTORATION_MISMATCH/); checks++
  await settle(o,{time:'2026-10-28T12:03:00Z',refund:1099,restore:100})
  check(await balance(),1000,'full refund exactly restores opening spendable balance')
  check(await lifetime(),1000,'full refund restores opening lifetime')
  await advance(o,'2026-10-28T12:04:00Z','REFUNDED')
  await assert.rejects(settle(o,{time:'2026-10-28T12:04:00Z',refund:100,restore:100}),/LOYALTY_REFUND_NOT_VERIFIED/); checks++
  await assert.rejects(settle(o,{time:'2026-10-28T12:04:00Z',refund:1099,restore:101}),/LOYALTY_DISCOUNT_MISMATCH/); checks++
  const d = await attempt()
  const refundedFirst = await order(d,undefined,'REFUNDED')
  await settle(refundedFirst,{refund:1099,discount:0})
  check(await balance(),1000,'refund arriving before paid event never leaves extra points')
  const pending = await order(await attempt(),undefined,'PENDING')
  await assert.rejects(settle(pending,{discount:0}),/LOYALTY_PAYMENT_NOT_VERIFIED/); checks++
  const nonEuro = await order(await attempt())
  await query("update shopify_order_snapshots set currency='USD' where shopify_order_id=$1",[nonEuro])
  await assert.rejects(settle(nonEuro,{discount:0}),/LOYALTY_PAYMENT_NOT_VERIFIED/); checks++
  await assert.rejects(settle('gid://shopify/Order/999',{discount:0}),/LOYALTY_ORDER_OWNER_UNVERIFIED/); checks++
  // Force a downstream write failure: reservation + journal + history + balance
  // must all roll back together, without compensating writes.
  const failed = await attempt()
  await db.exec("create function public.fail_loyalty_test() returns trigger language plpgsql as $$ begin raise exception 'SIMULATED_STORAGE_FAILURE'; end $$; create trigger fail_loyalty_test before update on loyalty_points for each row execute function public.fail_loyalty_test();")
  const transactionsBefore = await scalar('select count(*)::int from loyalty_transactions')
  await reject('select reserve_shopify_loyalty($1,$2,100)',[failed,user],'SIMULATED_STORAGE_FAILURE')
  check(await scalar('select count(*)::int from loyalty_transactions'),transactionsBefore,'failed storage rolls transaction history back')
  check(await scalar('select count(*)::int from shopify_loyalty_reservations where attempt_id=$1',[failed]),0,'failed storage rolls reservation back')
  check(await balance(),1000,'failed storage preserves balance')
  await db.exec('drop trigger fail_loyalty_test on loyalty_points; drop function fail_loyalty_test();')
  // A refund after points were spent retains a debt rather than laundering the
  // clawback via max(0,balance). Future reservation must not spend that debt.
  const earnedThenSpent = await order(await attempt())
  await settle(earnedThenSpent,{paid:100000,discount:0})
  const spender = await attempt()
  await reserve(spender,2000)
  await advance(earnedThenSpent,'2026-10-28T12:05:00Z','REFUNDED')
  await settle(earnedThenSpent,{time:'2026-10-28T12:05:00Z',paid:100000,refund:100000,discount:0})
  check(await balance(),-1000,'spent/refunded earning is retained as debt')
  const cannotSpend = await attempt()
  await reject('select reserve_shopify_loyalty($1,$2,100)',[cannotSpend,user],'LOYALTY_INSUFFICIENT_POINTS')
  await query("update shopify_checkout_attempts set status='failed' where id=$1",[spender])
  await query('select release_failed_shopify_loyalty($1)',[spender])
  check(await balance(),1000,'release repays debt without minting points')
  check(await scalar('select count(*)::int from loyalty_points'),54,'no implicit new account creation')
  check(await scalar('select count(*)::int from shopify_loyalty_outbox'),0,'dormant runtime never queues historical fixture snapshots')
  check((await query('select * from claim_shopify_loyalty()')).rows,[],'no claim before reviewed cutover')
  for (const role of ['anon','authenticated']) {
    check(await scalar(`select has_function_privilege('${role}','public.complete_shopify_loyalty(text,uuid,timestamptz,integer,integer,integer,integer)','execute')`),false,`${role} cannot settle/ack queue`)
    check(await scalar(`select has_table_privilege('${role}','public.shopify_loyalty_discount_bindings','select')`),false,`${role} cannot read private code bindings`)
  }
  await db.exec("update shopify_loyalty_runtime set cutover_at=now()-interval '1 hour',review_reference='test-reviewed-cutover' where id=1")
  const preCutoff = await attempt()
  await query("update shopify_checkout_attempts set created_at=now()-interval '2 hours' where id=$1",[preCutoff])
  await order(preCutoff)
  check(await scalar('select count(*)::int from shopify_loyalty_outbox'),0,'old attempts never get retrospective loyalty')
  const queuedOrder = await order(await attempt())
  check(await scalar('select count(*)::int from shopify_loyalty_outbox'),1,'verified account snapshot atomically enqueues after link trigger')
  let claimed = (await query('select * from claim_shopify_loyalty()')).rows[0]
  const complete = (lease=claimed.lease_token,version=claimed.source_updated_at,refund=0,discount=0) => scalar('select complete_shopify_loyalty($1,$2,$3,1099,$4,$5,0)',[queuedOrder,lease,version,refund,discount])
  check(await complete(other),false,'wrong worker lease cannot settle')
  check(await balance(),1000,'wrong lease cannot credit balance')
  check(await complete(),true,'settlement and queue acknowledgement commit together')
  check(await balance(),1010,'outbox settlement credits once')
  check(await complete(),false,'replayed acknowledged lease cannot credit again')
  await advance(queuedOrder,'2026-10-28T12:00:00Z','PAID')
  check((await query('select * from claim_shopify_loyalty()')).rows,[],'same snapshot version does not requeue')
  await advance(queuedOrder,'2026-10-28T12:01:00Z')
  claimed=(await query('select * from claim_shopify_loyalty()')).rows[0]
  const oldLease=claimed.lease_token
  await advance(queuedOrder,'2026-10-28T12:02:00Z')
  check(await complete(oldLease,'2026-10-28T12:01:00Z',60),false,'new snapshot fences old in-flight worker')
  claimed=(await query('select * from claim_shopify_loyalty()')).rows[0]
  check(claimed.lease_token!==oldLease,true,'new version gets a new lease')
  check(await complete(claimed.lease_token,'2026-10-28T12:02:00Z',120),true,'new snapshot applies cumulative partial refund')
  check(await balance(),1009,'partial refund converges after stale worker')
  await advance(queuedOrder,'2026-10-28T12:03:00Z')
  claimed=(await query('select * from claim_shopify_loyalty()')).rows[0]
  await query("update shopify_loyalty_outbox set lease_until=now()-interval '1 second' where order_id=$1",[queuedOrder])
  const expired=claimed.lease_token
  claimed=(await query('select * from claim_shopify_loyalty()')).rows[0]
  check(claimed.lease_token!==expired,true,'expired lease is recoverable')
  check(await complete(expired,'2026-10-28T12:03:00Z',120),false,'expired worker cannot settle')
  await assert.rejects(complete(claimed.lease_token,'2026-10-28T12:03:00Z',120,500),/LOYALTY_RESERVATION_MISSING/); checks++
  check(await scalar('select status from shopify_loyalty_outbox where order_id=$1',[queuedOrder]),'processing','failed settlement cannot acknowledge queue')
  check(await balance(),1009,'failed settlement does not corrupt balance')
  for (let retry=0;retry<7;retry++) {
    check(await scalar('select fail_shopify_loyalty($1,$2,$3)',[queuedOrder,claimed.lease_token,'private code/customer']),true,'fenced failure retained')
    await query('update shopify_loyalty_outbox set next_attempt_at=now() where order_id=$1',[queuedOrder])
    const next=(await query('select * from claim_shopify_loyalty()')).rows[0]
    if (next) claimed=next
  }
  check(await scalar('select status from shopify_loyalty_outbox where order_id=$1',[queuedOrder]),'dead_letter','bounded retries expose dead letter')
  check(await scalar('select last_error from shopify_loyalty_outbox where order_id=$1',[queuedOrder]),'LOYALTY_WORKER_FAILED','provider/private values never stored as queue error')
  check(Number((await query('select * from shopify_loyalty_health()')).rows[0].dead_letter_count),1,'health reflects real dead letters')
  // A first-time verified buyer earns without a pre-existing legacy balance.
  const fresh = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  await query("insert into auth.users(id,email) values($1,'first-buyer@test.invalid')",[fresh])
  const firstOrder = await order(await attempt(fresh))
  check(await scalar("select count(*)::int from loyalty_points where email='first-buyer@test.invalid'"),0,'checkout proof does not precreate points')
  check(await settle(firstOrder,{paid:7900,discount:0}),'applied','first purchase settles')
  check(await scalar('select points_balance from loyalty_points where user_id=$1',[fresh]),79,'first purchase credits its exact verified owner')
  check(await settle(firstOrder,{paid:7900,discount:0}),'duplicate','first purchase replay is idempotent')
  check(await scalar('select count(*)::int from loyalty_points'),55,'only the actual verified buyer account is created')
  const conflictUser = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  await query("insert into auth.users(id,email) values($1,'mismatched-buyer@test.invalid')",[conflictUser])
  await query("insert into loyalty_points(email,user_id) values('mismatched-buyer@test.invalid',$1)",[other])
  const conflictOrder = await order(await attempt(conflictUser))
  await assert.rejects(settle(conflictOrder,{paid:7900,discount:0}),/LOYALTY_ACCOUNT_NOT_FOUND/);checks++
  check(await scalar("select points_balance from loyalty_points where email='mismatched-buyer@test.invalid'"),0,'existing account never transfers to different user')
  console.log(`${checks} loyalty PostgreSQL preservation/idempotency/partial-refund/privilege/atomicity assertions passed (local PGlite only).`)
} finally { await db.close() }
