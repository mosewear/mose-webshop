// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
afterAll(() => db.close())
it('preserves physical stock and sample truth while fencing made-to-order observations', async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table shopify_variant_mappings(mose_variant_id text primary key,mose_product_id text,fulfillment_owner text,supplier_link_verified boolean not null default false,sample_verified boolean not null default false,enabled boolean default false,inventory_revision uuid default gen_random_uuid(),inventory_lease_token uuid,inventory_lease_until timestamptz,
      check(not enabled or fulfillment_owner<>'tapstitch' or (supplier_link_verified and sample_verified)));
    create table product_variants(id uuid primary key,product_id uuid,stock_quantity integer,presale_stock_quantity integer);
    create table shopify_inventory_snapshots(mose_variant_id text primary key,mapping_revision uuid,observed_at timestamptz,status text check(status in ('known','unknown','error')),available_quantity integer,reason text,
      check((status='known' and available_quantity is not null and available_quantity>=0)or(status<>'known' and available_quantity is null)));
    insert into product_variants values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',0,0);
    insert into shopify_variant_mappings(mose_variant_id,mose_product_id,fulfillment_owner,supplier_link_verified,inventory_lease_token,inventory_lease_until)
      values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','tapstitch',true,'33333333-3333-4333-8333-333333333333',now()+interval '2 minutes');`)
  const migration = await readFile(new URL('../../supabase/migrations/20261030124000_supplier_release_contract.sql', import.meta.url), 'utf8')
  await db.exec(migration)
  await expect(db.exec('update shopify_variant_mappings set enabled=true')).rejects.toThrow()
  await expect(db.exec("update shopify_variant_mappings set enabled=true,owner_release_authorized_at=now(),owner_release_reference=null")).rejects.toThrow()
  await db.exec("update shopify_variant_mappings set enabled=true,fulfillment_mode='made_to_order',owner_release_authorized_at=now(),owner_release_reference='Owner explicitly releases before sample delivery 2026-10-30'")
  const row = await db.query("select complete_shopify_inventory(mose_variant_id,inventory_lease_token,inventory_revision,'made_to_order',null,'SUPPLIER_MADE_TO_ORDER_VERIFIED') ok from shopify_variant_mappings")
  expect(row.rows[0]).toEqual({ ok: true })
  const product = await db.query('select stock_quantity,presale_stock_quantity,fulfillment_mode,supplier_orderable from product_variants')
  expect(product.rows[0]).toEqual({ stock_quantity: 0, presale_stock_quantity: 0, fulfillment_mode: 'made_to_order', supplier_orderable: true })
  expect((await db.query('select sample_verified from shopify_variant_mappings')).rows[0]).toEqual({ sample_verified: false })
  expect((await db.query('select available_quantity from shopify_inventory_snapshots')).rows[0]).toEqual({ available_quantity: null })
  await expect(db.exec('update shopify_inventory_snapshots set available_quantity=9999999')).rejects.toThrow()
  expect((await db.query("select has_function_privilege('anon','complete_shopify_inventory(text,uuid,uuid,text,integer,text)','execute') allowed")).rows[0]).toEqual({ allowed: false })
  await db.exec(migration)
  expect((await db.query('select stock_quantity from product_variants')).rows[0]).toEqual({ stock_quantity: 0 })
}, 15_000)
