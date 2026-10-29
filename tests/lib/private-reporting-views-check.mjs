/** Local-only reporting view isolation regression; no remote database connection.
 * MOSE_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/lib/private-reporting-views-check.mjs
 */
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const modulePath = process.env.MOSE_PGLITE_MODULE
if (!modulePath?.startsWith('/')) throw new Error('Set MOSE_PGLITE_MODULE to a local installed PGlite module')
const { PGlite } = await import(pathToFileURL(modulePath).href)
const db=new PGlite();let checks=0;const sql=await fs.readFile(new URL('../../supabase/migrations/20261029000300_private_reporting_views.sql',import.meta.url),'utf8');
try{
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
grant usage on schema public to anon,authenticated,service_role;
create table orders(id int,payment_status text,private_note text);insert into orders values(1,'paid','secret');alter table orders enable row level security;
create table product_variants(id int,is_available bool);insert into product_variants values(1,true),(2,false);alter table product_variants enable row level security;
create policy available_variants on product_variants for select using(is_available);
create view v_paid_orders as select * from orders where payment_status='paid';
create view v_ad_optimizer_signals as select count(*)::int as paid_count from orders;
create view product_variants_with_total_stock as select * from product_variants;
grant select on all tables in schema public to anon,authenticated,service_role;`);
await db.exec('set role anon');assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);assert.equal((await db.query('select count(*)::int as n from v_paid_orders')).rows[0].n,1);checks+=2;await db.exec('reset role');
await db.exec(sql);await db.exec(sql); // Safe migration replay.
for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);for(const view of ['v_paid_orders','v_ad_optimizer_signals']){await assert.rejects(()=>db.query(`select * from ${view}`),/permission denied/);checks++;}assert.equal((await db.query('select count(*)::int as n from product_variants_with_total_stock')).rows[0].n,1);checks++;await db.exec('reset role');}
await db.exec('set role service_role');assert.equal((await db.query('select count(*)::int as n from v_paid_orders')).rows[0].n,1);assert.equal((await db.query('select paid_count from v_ad_optimizer_signals')).rows[0].paid_count,1);assert.equal((await db.query('select count(*)::int as n from product_variants_with_total_stock')).rows[0].n,2);checks+=3;await db.exec('reset role');
const settings=await db.query("select reloptions from pg_class where relname in('v_paid_orders','v_ad_optimizer_signals','product_variants_with_total_stock')");for(const row of settings.rows){assert.ok(row.reloptions.includes('security_invoker=true'));checks++;}
console.log({passed:checks,productionMutations:false});
}finally{await db.close()}
