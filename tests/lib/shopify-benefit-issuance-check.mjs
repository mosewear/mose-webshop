/** Local PostgreSQL integration: MOSE_PGLITE_MODULE=/absolute/path/index.js node tests/lib/shopify-benefit-issuance-check.mjs */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite()
let checks = 0
const q = (s,a=[]) => db.query(s,a)
const scalar = async (s,a=[]) => Object.values((await q(s,a)).rows[0])[0]
const check = (a,b) => { assert.deepEqual(a,b); checks++ }
const attempt = '00000000-0000-4000-8000-000000000001'
const lease = '00000000-0000-4000-8000-000000000002'
const issue = '00000000-0000-4000-8000-000000000003'
const hash = 'a'.repeat(64)
const provider = 'gid://shopify/DiscountCodeNode/1'
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table shopify_checkout_attempts(id uuid primary key,lease_token uuid,status text,cart_id text,checkout_url text,expires_at timestamptz);
    create table shopify_loyalty_reservations(attempt_id uuid primary key references shopify_checkout_attempts(id),status text);
    create table shopify_loyalty_discount_bindings(attempt_id uuid primary key references shopify_loyalty_reservations(attempt_id),provider_discount_id text unique,code_hash text unique);`)
  await db.exec(await readFile(new URL('../../supabase/migrations/20261028000700_shopify_benefit_issuance.sql',import.meta.url),'utf8'))
  for (const role of ['anon','authenticated']) {
    check(await scalar(`select has_table_privilege('${role}','shopify_benefit_issuance','select')`),false)
    check(await scalar(`select has_function_privilege('${role}','claim_shopify_benefit(uuid,uuid,uuid,text)','execute')`),false)
    check(await scalar(`select has_function_privilege('${role}','complete_shopify_benefit(uuid,uuid,text)','execute')`),false)
  }
  check(await scalar("select has_table_privilege('service_role','shopify_benefit_issuance','insert')"),false)
  await q("insert into shopify_checkout_attempts values($1,$2,'creating',null,null,now()+interval '1 hour')",[attempt,lease])
  await assert.rejects(q('select claim_shopify_benefit($1,$2,$3,$4)',[attempt,lease,issue,hash]),/BENEFIT_ATTEMPT_NOT_CREATING/);checks++
  await q("insert into shopify_loyalty_reservations values($1,'reserved')",[attempt])
  check(await scalar('select claim_shopify_benefit($1,$2,$3,$4)',[attempt,lease,issue,hash]),true)
  check(await scalar('select claim_shopify_benefit($1,$2,$3,$4)',[attempt,lease,issue,hash]),false)
  check(await scalar('select claim_shopify_benefit($1,$2,$3,$4)',[attempt,lease,lease,hash]),false)
  check(await scalar('select status from shopify_benefit_issuance'),'issuing')
  await assert.rejects(q("update shopify_loyalty_reservations set status='released' where attempt_id=$1",[attempt]),/LOYALTY_PROVIDER_DISCOUNT_NOT_RECONCILED/);checks++
  check(await scalar('select complete_shopify_benefit($1,$2,$3)',[attempt,lease,provider]),false)
  check(await scalar('select complete_shopify_benefit($1,$2,$3)',[attempt,issue,provider]),true)
  check(await scalar('select complete_shopify_benefit($1,$2,$3)',[attempt,issue,provider]),true)
  check(await scalar('select complete_shopify_benefit($1,$2,$3)',[attempt,issue,'gid://shopify/DiscountCodeNode/2']),false)
  check(await scalar('select count(*)::int from shopify_loyalty_discount_bindings'),1)
  check(await scalar('select code_hash from shopify_loyalty_discount_bindings'),hash)
  check(await scalar('select status from shopify_benefit_issuance'),'issued')
  console.log(`${checks} benefit issuance PostgreSQL assertions passed; no network/provider calls.`)
} finally { await db.close() }
