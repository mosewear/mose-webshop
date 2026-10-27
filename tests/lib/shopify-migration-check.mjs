/** Local-only PostgreSQL engine check. Never connects to Supabase or Shopify.
 * npm install --prefix /tmp/mose-sqlcheck @electric-sql/pglite
 * MOSE_PGLITE_MODULE=/tmp/mose-sqlcheck/node_modules/@electric-sql/pglite/dist/index.js node tests/lib/shopify-migration-check.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const modulePath = process.env.MOSE_PGLITE_MODULE
if (!modulePath?.startsWith('/')) throw new Error('Set MOSE_PGLITE_MODULE to a local installed PGlite module')
const { PGlite } = await import(pathToFileURL(modulePath).href)
const db = new PGlite()
let checks = 0
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }
const query = (sql, args = []) => db.query(sql, args)
const scalar = async (sql, args = []) => Object.values((await query(sql, args)).rows[0])[0]
const uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const other = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
const orderId = 'gid://shopify/Order/123'
const projection = (amount = '20.00', time = '2026-10-27T12:00:00Z') => ({ id: orderId, name: '#123', updatedAt: time,
  displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED', currencyCode: 'EUR', cancelledAt: null,
  currentTotalPriceSet: { shopMoney: { amount, currencyCode: 'EUR' } }, totalRefundedSet: { shopMoney: { amount: '0', currencyCode: 'EUR' } },
  lineItems: { nodes: [{ id: 'gid://shopify/LineItem/1', quantity: 1, currentQuantity: 1, variant: { id: 'gid://shopify/ProductVariant/1' } }] },
  fulfillments: [], refunds: [], fulfillmentOrders: { nodes: [] } })
try {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(await readFile(new URL('../../supabase/migrations/20261027000100_shopify_pilot.sql', import.meta.url), 'utf8'))
  check(await scalar('select checkout_enabled from shopify_integration_state'), false, 'default closed')
  check(await scalar("select has_table_privilege('anon','public.shopify_order_snapshots','select')"), false, 'no anonymous order reads')
  check(await scalar("select has_function_privilege('anon','public.complete_shopify_event(bigint,uuid,jsonb,text,boolean)','execute')"), false, 'no anonymous mutation')
  async function event(name) {
    await query("insert into shopify_webhook_inbox(shop,delivery_id,topic,payload) values('hp5szr-te.myshopify.com',$1,'orders/paid','{\"id\":123}')", [name])
    return (await query('select * from claim_shopify_events(1)')).rows[0]
  }
  const e = await event('first')
  check(await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [e.id, other, JSON.stringify(projection())]), false, 'wrong lease rejected')
  check(await scalar('select count(*)::int from shopify_order_snapshots'), 0, 'wrong lease cannot write')
  check(await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [e.id, e.lease_token, JSON.stringify(projection())]), true, 'atomic projection')
  check(await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [e.id, e.lease_token, JSON.stringify(projection())]), false, 'duplicate cannot reapply')
  check(await scalar('select payload from shopify_webhook_inbox where id=$1', [e.id]), {}, 'processed raw PII removed')
  const older = await event('older')
  await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [older.id, older.lease_token, JSON.stringify(projection('1.00','2026-10-27T11:00:00Z'))])
  check(await scalar('select total_amount from shopify_order_snapshots'), '20.00', 'older state cannot overwrite')
  const stale = await event('expired')
  await query("update shopify_webhook_inbox set lease_until=now()-interval '1 second' where id=$1", [stale.id])
  check(await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [stale.id, stale.lease_token, JSON.stringify(projection())]), false, 'expired lease fenced')
  const reclaimed = (await query('select * from claim_shopify_events(1)')).rows[0]
  check(reclaimed.lease_token !== stale.lease_token, true, 'claim rotates lease')
  check(await scalar('select fail_shopify_event($1,$2,$3)', [stale.id, stale.lease_token, 'OLD']), false, 'old worker cannot alter retry')
  await scalar('select complete_shopify_event($1,$2,$3::jsonb)', [reclaimed.id, reclaimed.lease_token, JSON.stringify(projection())])
  const args = [uuid,'session','fingerprint','buyer','{}',uuid]
  await query('select * from reserve_shopify_checkout($1,$2,$3,$4,$5::jsonb,$6)', args)
  const repeated = (await query('select * from reserve_shopify_checkout($1,$2,$3,$4,$5::jsonb,$6)', [...args.slice(0,5),other])).rows
  check(repeated[0].lease_token, uuid, 'retry does not create second cart lease')
  check((await query('select * from reserve_shopify_checkout($1,$2,$3,$4,$5::jsonb,$6)', [uuid,'intruder',...args.slice(2)])).rows.length, 0, 'cross session denied')
  check(await scalar("select finish_shopify_checkout($1,$2,'ready','cart','https://mosewear.myshopify.com/cart')", [uuid,other]), false, 'checkout completion fenced')
  check(await scalar("select finish_shopify_checkout($1,$2,'ready','cart','https://mosewear.myshopify.com/cart')", [uuid,uuid]), true, 'checkout stored')
  check(await scalar("select finish_shopify_checkout($1,$2,'unknown')", [uuid,uuid]), false, 'late failure cannot erase ready cart')
  await query('update shopify_integration_state set app_installed=true')
  const recon = (await query('select * from claim_shopify_reconciliation()')).rows[0]
  const events = JSON.stringify([{ id: orderId, updatedAt: '2026-10-27T12:00:00Z' }])
  check(await scalar('select checkpoint_shopify_reconciliation($1,null,$2::jsonb)', [other,events]), false, 'reconciliation fenced')
  check(await scalar('select checkpoint_shopify_reconciliation($1,null,$2::jsonb)', [recon.reconcile_lease_token,events]), true, 'queue+checkpoint atomic')
  check(await scalar("select count(*)::int from shopify_webhook_inbox where topic='reconcile/order'"), 1, 'reconciliation queued')
  console.log(`${checks} PostgreSQL migration/lease/idempotency/privilege checks passed (local PGlite only).`)
} finally { await db.close() }
