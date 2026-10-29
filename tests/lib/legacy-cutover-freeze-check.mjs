/** Local PostgreSQL semantics. No production connections. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite()
let checks = 0
const q = (sql) => db.query(sql)
const reject = async (sql, message) => { await assert.rejects(() => q(sql), message); checks++ }
const scalar = async sql => Object.values((await q(sql)).rows[0])[0]
const eq = (a,b) => { assert.deepEqual(a,b); checks++ }
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create table orders(id integer primary key,payment_status text);
    create table order_items(id integer primary key,order_id integer,quantity integer);
    create table product_variants(id integer primary key,stock_quantity integer,presale_stock_quantity integer,title text);
    insert into orders values(1,'pending');insert into order_items values(1,1,2);
    insert into product_variants values(1,10,0,'hoodie');`)
  await db.exec(await readFile(new URL('../../supabase/migrations/20261029000100_legacy_cutover_freeze.sql',import.meta.url),'utf8'))
  eq(await scalar('select checkout_frozen from legacy_cutover_control'),false)
  eq(await scalar("select has_function_privilege('authenticated','set_legacy_cutover_freeze(boolean,boolean,text)','execute')"),false)
  eq(await scalar("select has_table_privilege('service_role','legacy_cutover_control','update')"),false)
  eq(await scalar("select has_table_privilege('anon','legacy_cutover_control','select')"),false)
  await reject("select set_legacy_cutover_freeze(false,true,'invalid phase transition')",/INVALID_CUTOVER_FREEZE/)
  await reject("select set_legacy_cutover_freeze(true,false,'')",/INVALID_CUTOVER_FREEZE/)
  await q("select set_legacy_cutover_freeze(true,false,'fixture checkout maintenance')")
  await reject("insert into orders values(2,'pending')",/LEGACY_CHECKOUT_FROZEN/)
  await reject('delete from orders where id=1',/LEGACY_CHECKOUT_FROZEN/)
  await reject('insert into order_items values(2,1,3)',/LEGACY_CHECKOUT_FROZEN/)
  await reject('update order_items set quantity=3 where id=1',/LEGACY_CHECKOUT_FROZEN/)
  await reject('delete from order_items where id=1',/LEGACY_CHECKOUT_FROZEN/)
  await q("update orders set payment_status='paid' where id=1")
  eq(await scalar('select payment_status from orders where id=1'),'paid')
  await q('update product_variants set stock_quantity=8 where id=1')
  await q("select set_legacy_cutover_freeze(true,true,'fixture inventory transfer pause')")
  await reject('update product_variants set stock_quantity=7 where id=1',/LEGACY_STOCK_FROZEN/)
  await reject('update product_variants set presale_stock_quantity=2 where id=1',/LEGACY_STOCK_FROZEN/)
  await reject("insert into product_variants values(2,3,0,'tee')",/LEGACY_STOCK_FROZEN/)
  await reject('delete from product_variants where id=1',/LEGACY_STOCK_FROZEN/)
  await q("update product_variants set title='new name' where id=1")
  eq(await scalar('select stock_quantity from product_variants where id=1'),8)
  await q("select set_legacy_cutover_freeze(true,false,'fixture transfer verified resume stock')")
  await q('update product_variants set stock_quantity=7 where id=1')
  await reject("insert into orders values(2,'pending')",/LEGACY_CHECKOUT_FROZEN/)
  await q("select set_legacy_cutover_freeze(false,false,'fixture maintenance fully ended')")
  await q("insert into orders values(2,'pending')")
  eq(await scalar('select count(*)::int from legacy_cutover_control_history'),4)
  console.log(`Legacy cutover freeze: ${checks} PostgreSQL checks passed`)
} finally { await db.close() }
