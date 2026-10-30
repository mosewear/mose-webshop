// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
afterAll(() => db.close())
it('rechecks edited products without losing owner release, fences old observations, and closes deleted products', async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table product_variants(id uuid primary key, product_id uuid, stock_quantity integer, presale_stock_quantity integer);`)
  for (const name of ['20261027000100_shopify_pilot.sql','20261028000100_shopify_inventory_evidence.sql','20261030124000_supplier_release_contract.sql','20261030183000_product_update_reverification.sql'])
    await db.exec(await readFile(new URL('../../supabase/migrations/'+name, import.meta.url), 'utf8'))
  const variant = '11111111-1111-4111-8111-111111111111', product = '22222222-2222-4222-8222-222222222222'
  await db.query(`insert into product_variants(id,product_id,stock_quantity,presale_stock_quantity,fulfillment_mode,supplier_orderable) values($1,$2,0,0,'made_to_order',true)`, [variant, product])
  await db.query(`insert into shopify_variant_mappings(mose_variant_id,mose_product_id,shopify_variant_id,shopify_product_id,fulfillment_owner,price_eur_cents,enabled,verified_at,verification_reference,inventory_location_id,supplier_model,supplier_reference,supplier_link_verified,owner_release_authorized_at,owner_release_reference,fulfillment_mode)
    values($1,$2,'gid://shopify/ProductVariant/1','gid://shopify/Product/1','tapstitch',7900,true,now(),'review','gid://shopify/Location/1','RW0041-P001-V3','supplier-sku',true,now(),'Owner explicitly approved the product release','made_to_order')`, [variant, product])
  const claim = async () => (await db.query('select * from claim_shopify_inventory()')).rows[0] as Record<string, string>
  const finish = async (m: Record<string,string>) => (await db.query("select complete_shopify_inventory($1,$2,$3,'made_to_order',null,'SUPPLIER_MADE_TO_ORDER_VERIFIED') ok", [m.mose_variant_id,m.inventory_lease_token,m.inventory_revision])).rows[0]
  const old = await claim()
  const event = async (topic: string) => {
    await db.query("insert into shopify_webhook_inbox(shop,delivery_id,topic,payload) values('hp5szr-te.myshopify.com',$1,$2,'{\"id\":1}')", [topic,topic])
    return (await db.query('select * from claim_shopify_events(1)')).rows[0] as Record<string,string>
  }
  const update = await event('products/update')
  expect((await db.query('select complete_shopify_event($1,$2,null,$3) ok',[update.id,update.lease_token,'gid://shopify/Product/1'])).rows[0]).toEqual({ok:true})
  expect(await finish(old)).toEqual({ok:false})
  expect((await db.query('select enabled,sample_verified,verified_at is not null as reviewed from shopify_variant_mappings')).rows[0]).toEqual({enabled:true,sample_verified:false,reviewed:true})
  expect((await db.query('select supplier_orderable,stock_quantity from product_variants')).rows[0]).toEqual({supplier_orderable:false,stock_quantity:0})
  const fresh = await claim()
  expect(fresh.inventory_revision).not.toBe(old.inventory_revision)
  expect(await finish(fresh)).toEqual({ok:true})
  expect((await db.query('select supplier_orderable,stock_quantity from product_variants')).rows[0]).toEqual({supplier_orderable:true,stock_quantity:0})
  const deleted = await event('products/delete')
  await db.query('select complete_shopify_event($1,$2,null,$3)', [deleted.id,deleted.lease_token,'gid://shopify/Product/1'])
  expect((await db.query('select enabled,verified_at from shopify_variant_mappings')).rows[0]).toEqual({enabled:false,verified_at:null})
  expect((await db.query('select supplier_orderable from product_variants')).rows[0]).toEqual({supplier_orderable:false})
  expect((await db.query("select has_function_privilege('anon','complete_shopify_event(bigint,uuid,jsonb,text,boolean)','execute') allowed")).rows[0]).toEqual({allowed:false})
},15_000)
