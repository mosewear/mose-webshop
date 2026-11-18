// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
describe('durable Meta purchase delivery',()=>{
 it('excludes unpaid orders, queues paid once, fences leases and never reclaims delivered purchases',async()=>{
  const db=new PGlite()
  try {
   await db.exec('create role anon;create role authenticated;create role service_role;create table shopify_checkout_attempts(id uuid primary key);create table shopify_order_snapshots(shopify_order_id text primary key,financial_status text);')
   await db.exec(readFileSync('supabase/migrations/20261118193000_meta_shopify_purchase_delivery.sql','utf8'))
   await db.exec("insert into shopify_order_snapshots values('one','PENDING')")
   expect((await db.query('select * from meta_purchase_jobs')).rows).toHaveLength(0)
   await db.exec("update shopify_order_snapshots set financial_status='PAID';update shopify_order_snapshots set financial_status='PAID'")
   const job=(await db.query<{lease_token:string}>('select * from claim_meta_purchase()')).rows[0]
   expect(job).toBeTruthy();expect((await db.query('select * from claim_meta_purchase()')).rows).toHaveLength(0)
   expect((await db.query<{ok:boolean}>("select finish_meta_purchase('one',gen_random_uuid(),'sent') as ok")).rows[0].ok).toBe(false)
   await db.query("select finish_meta_purchase('one',$1,'pending',null,'NETWORK')",[job.lease_token])
   expect((await db.query('select * from claim_meta_purchase()')).rows).toHaveLength(0)
   await db.exec("update meta_purchase_jobs set next_attempt_at=now()-interval '1 minute'")
   const retry=(await db.query<{lease_token:string}>('select * from claim_meta_purchase()')).rows[0]
   expect(retry.lease_token).not.toBe(job.lease_token)
   await db.query("select finish_meta_purchase('one',$1,'sent')",[retry.lease_token])
   expect((await db.query('select * from claim_meta_purchase()')).rows).toHaveLength(0)
   await db.exec('set role anon')
   await expect(db.query('select * from meta_checkout_attribution')).rejects.toThrow(/permission denied/)
  } finally {await db.close()}
 },30000)
})
