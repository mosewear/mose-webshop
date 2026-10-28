/** Local PostgreSQL only: leases, revision fencing, privacy and no fabricated stock. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
if (!process.env.MOSE_PGLITE_MODULE?.startsWith('/')) throw new Error('Set MOSE_PGLITE_MODULE to local PGlite module')
const { PGlite } = await import(pathToFileURL(process.env.MOSE_PGLITE_MODULE).href)
const db = new PGlite()
let checks = 0
const check = (a,b) => { assert.deepEqual(a,b); checks++ }
const scalar = async (sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0]
const claim = async () => (await db.query('select * from claim_shopify_inventory()')).rows
const finish = async (m,status='known',qty=3,lease=m.inventory_lease_token) => scalar('select complete_shopify_inventory($1,$2,$3,$4,$5,$6)',[m.mose_variant_id,lease,m.inventory_revision,status,qty,'INVENTORY_VERIFIED'])
try {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  for (const file of ['20261027000100_shopify_pilot.sql','20261028000100_shopify_inventory_evidence.sql']) {
    await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'))
  }
  for (const role of ['anon','authenticated']) {
    check(await scalar(`select has_table_privilege('${role}','shopify_inventory_snapshots','select')`),false)
    check(await scalar(`select has_table_privilege('${role}','shopify_inventory_snapshots','insert')`),false)
    for (const signature of ['claim_shopify_inventory()','complete_shopify_inventory(text,uuid,uuid,text,integer,text)','shopify_inventory_evidence(text[])'])
      check(await scalar(`select has_function_privilege('${role}','${signature}','execute')`),false)
  }
  check(await scalar('select inventory_verified from shopify_integration_state where id=1'),false)
  await db.exec(`insert into shopify_variant_mappings(mose_variant_id,mose_product_id,shopify_variant_id,shopify_product_id,fulfillment_owner,price_eur_cents,enabled,verified_at,verification_reference,inventory_location_id)
    values('v1','p1','gid://shopify/ProductVariant/1','gid://shopify/Product/1','mose',7900,true,now(),'review','gid://shopify/Location/1'),
    ('v2','p2','gid://shopify/ProductVariant/2','gid://shopify/Product/2','mose',7500,true,now(),'review','gid://shopify/Location/2');`)
  const a=(await claim())[0]
  check(a.mose_variant_id,'v1')
  check((await claim()).map(m=>m.mose_variant_id),['v2']) // Location isolation and active lease exclusion.
  check(await finish(a,'unknown',null),true)
  check(await scalar("select available_quantity from shopify_inventory_snapshots where mose_variant_id='v1'"),null)
  check(await finish(a),false) // Consumed token cannot replay.
  await assert.rejects(db.query("update shopify_inventory_snapshots set available_quantity=9999999 where mose_variant_id='v1'"),/check constraint/);checks++
  await db.exec("update shopify_inventory_snapshots set observed_at=now()-interval '6 minutes'")
  const b=(await claim())[0]
  check(await finish(b,'known',3,null),false)
  await db.exec("update shopify_variant_mappings set price_eur_cents=8000 where mose_variant_id='v1'")
  check(await finish(b),false) // Price changes invalidate in-flight observations.
  check(await scalar("select mapping_current from shopify_inventory_evidence(array['v1'])"),false)
  const c=(await claim())[0]
  check(await finish(c),true)
  check(await scalar("select mapping_current from shopify_inventory_evidence(array['v1'])"),true)
  await db.exec("update shopify_variant_mappings set inventory_location_id='gid://shopify/Location/9' where mose_variant_id='v1'")
  check(await scalar("select mapping_current from shopify_inventory_evidence(array['v1'])"),false)
  const d=(await claim())[0]
  await db.exec("update shopify_variant_mappings set inventory_lease_until=now()-interval '1 second' where mose_variant_id='v1'")
  check(await finish(d),false)
  const e=(await claim())[0]
  check(await finish(d),false) // New lease fences the old one after recovery.
  check(await finish(e),true)
  check(await scalar('select inventory_verified from shopify_integration_state where id=1'),false)
  check(await scalar('select checkout_enabled from shopify_integration_state where id=1'),false)
  console.log(`Shopify inventory migration: ${checks} checks passed (local PGlite only)`)
} finally { await db.close() }
