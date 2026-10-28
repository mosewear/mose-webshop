/** Local synthetic PostgreSQL regressions only. Never touches customer records. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite()
let checks=0
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const a='11111111-1111-4111-8111-111111111111',order='22222222-2222-4222-8222-222222222222',ret='33333333-3333-4333-8333-333333333333'
const email='synthetic@example.test'
const call=async(kind,key,{points=null,orderId=null,returnId=null,amount=null,reason=null,account=null}={})=>scalar('select atomic_legacy_loyalty($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[kind,key,email,a,points,orderId,returnId,amount,reason,account])
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create table loyalty_points(id uuid primary key default gen_random_uuid(),email text unique not null,user_id uuid,points_balance integer not null default 0,lifetime_points integer not null default 0,tier text not null default 'bronze',updated_at timestamptz);create table loyalty_transactions(id uuid primary key default gen_random_uuid(),email text,user_id uuid,type text,points integer,description text,order_id uuid,return_id uuid unique);`)
 await db.query('insert into auth.users values($1,$2)',[a,email])
 // Synthetic fixture exactly mirrors aggregate baseline, never live customer rows.
 await db.query("insert into loyalty_points(email,points_balance,lifetime_points) values($1,104,104)",[email])
 await db.exec("insert into loyalty_points(email,points_balance,lifetime_points) select 'fixture-'||n||'@example.test',case when n=53 then 176 else 112 end,case when n=53 then 176 else 112 end from generate_series(1,53)n")
 check(await scalar('select count(*)::integer from loyalty_points'),54,'fixture accounts')
 check(await scalar('select sum(points_balance)::integer from loyalty_points'),6104,'fixture aggregate')
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000600_atomic_legacy_loyalty.sql',import.meta.url),'utf8'))
 check(await scalar('select sum(points_balance)::integer from loyalty_points'),6104,'installation no balance changes')
 check(await scalar('select count(*)::integer from loyalty_points'),54,'installation no accounts rebuilt')
 const account=await scalar('select id from loyalty_points where email=$1',[email])
 for(const role of ['anon','authenticated'])for(const fn of ['atomic_legacy_loyalty(text,text,text,uuid,integer,uuid,uuid,numeric,text,uuid)','award_loyalty_points(text,uuid,uuid,numeric)','legacy_loyalty_writer_health()'])check(await scalar('select has_function_privilege($1,$2,\'execute\')',[role,fn]),false,'RPC private')
 check((await scalar('select generation from legacy_loyalty_writer_health()')),1,'health generation')
 const earned=await scalar('select award_loyalty_points($1,$2,$3,$4)',[email,a,order,79.99]);check(earned.points_awarded,79,'late legacy payment')
 const duplicate=await call('earn',`legacy:order:${order}:earn`,{orderId:order,amount:79.99});check(duplicate.duplicate,true,'SQL and webhook share key')
 check(await scalar("select count(*)::integer from loyalty_transactions where order_id=$1 and type='earned'",[order]),1,'one earn')
 await call('redeem','legacy:redeem:synthetic-operation',{points:100});check(await scalar('select points_balance from loyalty_points where id=$1',[account]),83,'redeem atomic')
 check((await call('redeem','legacy:redeem:synthetic-operation',{points:100})).duplicate,true,'redeem replay')
 await assert.rejects(call('redeem','legacy:redeem:synthetic-operation',{points:200}),/OPERATION_CONFLICT/);checks++
 const refunds=await Promise.all([call('refund',`legacy:return:${ret}:refund`,{orderId:order,returnId:ret,amount:50}),call('refund',`legacy:return:${ret}:refund`,{orderId:order,returnId:ret,amount:50})]);check(refunds.some(r=>r.duplicate),true,'parallel duplicate refund')
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),33,'refund once')
 await call('admin','legacy:admin:synthetic-add',{points:100,reason:'test',account});check(await scalar('select points_balance from loyalty_points where id=$1',[account]),133,'relative admin increment')
 const spendResults=await Promise.allSettled([call('redeem','legacy:redeem:parallel-one',{points:100}),call('redeem','legacy:redeem:parallel-two',{points:100})]);check(spendResults.filter(r=>r.status==='fulfilled').length,1,'competing redemption serialized')
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),33,'no stale overwrite')
 const lateOrder='44444444-4444-4444-8444-444444444444',lateReturn='55555555-5555-4555-8555-555555555555'
 const early=await call('refund',`legacy:return:${lateReturn}:refund`,{orderId:lateOrder,returnId:lateReturn,amount:80});check(early.pending,true,'refund before late payment queued')
 await call('earn',`legacy:order:${lateOrder}:earn`,{orderId:lateOrder,amount:80});check(await scalar('select points_balance from loyalty_points where id=$1',[account]),33,'late earning and queued refund converge')
 // Historical order transaction remains the authority, regardless of absent new journal.
 const historical='66666666-6666-4666-8666-666666666666';await db.query("insert into loyalty_transactions(email,type,points,order_id)values($1,'earned',20,$2)",[email,historical]);
 check((await call('earn',`legacy:order:${historical}:earn`,{orderId:historical,amount:20})).duplicate,true,'historical earn not repeated')
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),33,'history does not rebuild')
 // Shared Shopify-style relative writer takes same account row lock.
 await Promise.all([call('admin','legacy:admin:shared-lock',{points:10,reason:'test',account}),db.query('update loyalty_points set points_balance=points_balance+7 where id=$1',[account])]);check(await scalar('select points_balance from loyalty_points where id=$1',[account]),50,'shared lock relative mutation retained')
 // Spent-point debt is preserved when a refunded earning was spent.
 const debtOrder='77777777-7777-4777-8777-777777777777',debtReturn='88888888-8888-4888-8888-888888888888';await call('earn',`legacy:order:${debtOrder}:earn`,{orderId:debtOrder,amount:100});await call('redeem','legacy:redeem:debt',{points:100});await call('refund',`legacy:return:${debtReturn}:refund`,{orderId:debtOrder,returnId:debtReturn,amount:100});check(await scalar('select points_balance from loyalty_points where id=$1',[account]),-50,'refund debt not clamped')
 await assert.rejects(call('redeem','legacy:redeem:debt-retry',{points:100}),/INSUFFICIENT/);checks++
 // Real Shopify reservation RPC and legacy redemption share the same account.
 await db.exec(`create table shopify_checkout_attempts(id uuid primary key,status text,cart_id text,checkout_url text,expires_at timestamptz);
 create table shopify_checkout_owners(attempt_id uuid primary key references shopify_checkout_attempts(id),user_id uuid);
 create table shopify_order_snapshots(shopify_order_id text primary key,source_updated_at timestamptz,currency text,financial_status text);
 create table shopify_order_accounts(order_id text primary key references shopify_order_snapshots(shopify_order_id),user_id uuid,attempt_id uuid);`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000400_shopify_loyalty_ledger.sql',import.meta.url),'utf8'))
 await call('admin','legacy:admin:shopify-test',{points:250,reason:'synthetic shared ledger fixture',account})
 const attempt='99999999-9999-4999-8999-999999999999'
 await db.query("insert into shopify_checkout_attempts values($1,'creating',null,null,now()+interval '1 hour')",[attempt])
 await db.query('insert into shopify_checkout_owners values($1,$2)',[attempt,a])
 await Promise.all([db.query('select reserve_shopify_loyalty($1,$2,100)',[attempt,a]),call('redeem','legacy:redeem:with-shopify',{points:100})])
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),0,'real Shopify reserve + legacy redeem both retained')
 check(await scalar('select count(*)::integer from shopify_loyalty_ledger'),1,'real Shopify journal written')
 await assert.rejects(call('redeem','legacy:redeem:after-shopify',{points:100}),/INSUFFICIENT/);checks++
 const crossOrder='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',crossReturn='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
 await call('earn',`legacy:order:${crossOrder}:earn`,{orderId:crossOrder,amount:40})
 await call('refund',`legacy:return:${crossReturn}:refund`,{orderId:crossOrder,returnId:crossReturn,amount:20})
 await db.query("update shopify_checkout_attempts set status='failed' where id=$1",[attempt])
 await db.query('select release_failed_shopify_loyalty($1)',[attempt])
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),120,'Shopify reserve/legacy late earn/refund/release converge')
 await call('earn',`legacy:order:${crossOrder}:earn`,{orderId:crossOrder,amount:40})
 await call('refund',`legacy:return:${crossReturn}:refund`,{orderId:crossOrder,returnId:crossReturn,amount:20})
 await db.query('select release_failed_shopify_loyalty($1)',[attempt])
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),120,'cross-generation replay unchanged')
 // Any history failure rolls back account mutation and operation journal together.
 await db.exec("create function reject_synthetic_history()returns trigger language plpgsql as $$begin if new.description='Handmatige aanpassing: fail-test' then raise exception 'SYNTHETIC_HISTORY_FAILURE';end if;return new;end$$;create trigger reject_synthetic_history before insert on loyalty_transactions for each row execute function reject_synthetic_history();")
 await assert.rejects(call('admin','legacy:admin:rollback-test',{points:50,reason:'fail-test',account}),/SYNTHETIC_HISTORY_FAILURE/);checks++
 check(await scalar('select points_balance from loyalty_points where id=$1',[account]),120,'failed history does not alter balance')
 check(await scalar("select count(*)::integer from legacy_loyalty_operations where operation_key='legacy:admin:rollback-test'"),0,'failed history no operation receipt')
 check(await scalar('select count(*)::integer from loyalty_points'),54,'all accounts preserved')
 console.log(`${checks} atomic legacy loyalty migration checks passed (synthetic local PGlite only; Promise.all verifies interleaving, not separate PostgreSQL connections).`)
} finally {await db.close()}
