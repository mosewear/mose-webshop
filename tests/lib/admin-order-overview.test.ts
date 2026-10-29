// @vitest-environment node
import {describe,it,expect,vi} from 'vitest'
vi.mock('@/lib/supabase/service',()=>({createServiceClient:vi.fn()}))
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn()}))
import {normalizeShopifyAdminOrder} from '@/lib/admin-order-overview'
const pageInfo={hasNextPage:false,endCursor:null}
const money=(amount:string)=>({shopMoney:{amount,currencyCode:'EUR'}})
const time='2026-10-29T21:02:55Z'
const order={id:'gid://shopify/Order/1',name:'#1001',updatedAt:time,cancelledAt:null,displayFinancialStatus:'PAID',displayFulfillmentStatus:'UNFULFILLED',currencyCode:'EUR',currentTotalPriceSet:money('0.01'),totalRefundedSet:money('0'),customAttributes:[],lineItems:{nodes:[],pageInfo},fulfillments:[],refunds:[],fulfillmentOrders:{nodes:[],pageInfo}}
const meta={createdAt:time,email:'rick@example.com',netPaymentSet:money('0.01')}
const row=(snapshot:unknown)=>({snapshot,synced_at:time})
describe('unified admin source normalization',()=>{
 it('counts the actual cent payment and preserves authoritative order identity',()=>{
  const v=normalizeShopifyAdminOrder(row(order),meta)
  expect(v).toMatchObject({name:'#1001',total:0.01,revenue:0.01,payment_status:'paid',created_at:time,source:'shopify'})
  expect(v.production_status).toBe('Productie niet afzonderlijk gemeld')
 })
 it('uses net payments without subtracting refunds twice from current order value',()=>{
  const v=normalizeShopifyAdminOrder(row({...order,displayFinancialStatus:'PARTIALLY_REFUNDED',currentTotalPriceSet:money('50'),totalRefundedSet:money('20')}),{...meta,netPaymentSet:money('50')})
  expect(v.revenue).toBe(50)
  expect(v.payment_status).toBe('partially_refunded')
 })
 it('keeps partial shipment separate from full shipment',()=>{
  expect(normalizeShopifyAdminOrder(row({...order,displayFulfillmentStatus:'PARTIALLY_FULFILLED'}),meta).status).toBe('partially_shipped')
 })
 it('fails closed on missing creation date or foreign currency rather than corrupting metrics',()=>{
  expect(()=>normalizeShopifyAdminOrder(row(order),undefined)).toThrow('ORDER_METADATA_UNAVAILABLE')
  expect(()=>normalizeShopifyAdminOrder(row({...order,currencyCode:'USD'}),meta)).toThrow('ORDER_CURRENCY_REQUIRES_CONVERSION')
 })
 it('does not expose private account proof or raw provider snapshot',()=>{
  const v=normalizeShopifyAdminOrder(row({...order,customAttributes:[{key:'mose_account_proof',value:'secret'}]}),meta)
  expect(JSON.stringify(v)).not.toContain('secret')
 })
})
