/** Local-only PostgreSQL check; never connects to Supabase or Shopify. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
if (!process.env.MOSE_PGLITE_MODULE?.startsWith('/')) throw new Error('Set MOSE_PGLITE_MODULE to local PGlite module')
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite()
let checks = 0
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0]
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++ }
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222'
const attempt = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const proof = 'a'.repeat(64)
const attrs = (p = proof, id = attempt) => ({ customAttributes: [
  { key: 'mose_source', value: 'unified-checkout' }, { key: 'mose_attempt', value: id }, { key: 'mose_account_proof', value: p },
] })
const save = (id, snapshot) => db.query(`insert into shopify_order_snapshots(shopify_order_id,order_name,source_updated_at,fulfillment_status,currency,total_amount,refunded_amount,snapshot)
  values($1,'#1',now(),'UNFULFILLED','EUR','20','0',$2::jsonb) on conflict(shopify_order_id) do update set snapshot=excluded.snapshot`, [id, JSON.stringify(snapshot)])
try {
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);')
  await db.exec(await readFile(new URL('../../supabase/migrations/20261027000100_shopify_pilot.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../../supabase/migrations/20261027000200_shopify_order_accounts.sql', import.meta.url), 'utf8'))
  await db.query('insert into auth.users(id) values($1),($2)', [a, b])
  await db.query('select * from reserve_shopify_checkout($1,\'session\',\'fingerprint\',\'buyer\',\'{}\',$1)', [attempt])
  await db.query('insert into shopify_checkout_owners(attempt_id,user_id,proof) values($1,$2,$3)', [attempt, a, proof])
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['shopify_order_accounts','shopify_checkout_owners']) {
      check(await scalar(`select has_table_privilege('${role}','public.${table}','select')`), false)
      check(await scalar(`select has_table_privilege('${role}','public.${table}','insert')`), false)
    }
    check(await scalar(`select has_function_privilege('${role}','public.link_shopify_order_account()','execute')`), false)
  }
  await save('guest', {})
  await save('guessed-attempt', attrs('b'.repeat(64)))
  await save('malformed', attrs(proof, 'bad-uuid'))
  const duplicate = attrs(); duplicate.customAttributes.push({ key: 'mose_attempt', value: attempt })
  await save('ambiguous', duplicate)
  check(await scalar('select count(*)::int from shopify_order_accounts'), 0)
  await save('valid', attrs())
  check(await scalar("select user_id from shopify_order_accounts where order_id='valid'"), a)
  // Refunds/order edits cannot remove or transfer the original verified association.
  await save('valid', { email: 'someone-else@example.com', customAttributes: [] })
  check(await scalar("select user_id from shopify_order_accounts where order_id='valid'"), a)
  check(await scalar("select count(*)::int from shopify_order_accounts where user_id=$1", [b]), 0)
  await assert.rejects(save('replayed-proof', attrs()), /unique constraint/); checks++
  check(await scalar("select count(*)::int from shopify_order_snapshots where shopify_order_id='replayed-proof'"), 0)
  // Account erasure unlinks personal ownership but retains operational order history.
  await db.query('delete from auth.users where id=$1', [a])
  check(await scalar('select count(*)::int from shopify_order_accounts'), 0)
  check(await scalar("select count(*)::int from shopify_order_snapshots where shopify_order_id='valid'"), 1)
  console.log(`Shopify account ownership migration: ${checks} checks passed (local PGlite only)`)
} finally { await db.close() }
