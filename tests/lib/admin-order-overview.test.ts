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
  expect(normalizeShopifyAdminOrder(row({...order,displayFulfillmentStatus:'PARTIALLY_FULFILLED'}),meta).status).toBe('processing')
 })
 it('fails closed on missing creation date or foreign currency rather than corrupting metrics',()=>{
  expect(()=>normalizeShopifyAdminOrder(row(order),undefined)).toThrow('ORDER_METADATA_UNAVAILABLE')
  expect(()=>normalizeShopifyAdminOrder(row({...order,currencyCode:'USD'}),meta)).toThrow('ORDER_CURRENCY_REQUIRES_CONVERSION')
 })
 it('requires delivery evidence for every current line before the delivered filter can match',()=>{
  const line={id:'gid://shopify/LineItem/1',name:'Hoodie L',sku:null,quantity:1,currentQuantity:1,variant:null,originalUnitPriceSet:money('79'),discountedTotalSet:money('0.01')}
  const shipment={id:'gid://shopify/Fulfillment/1',status:'SUCCESS',displayStatus:'DELIVERED',createdAt:time,updatedAt:time,location:null,trackingInfo:[],fulfillmentLineItems:{nodes:[{quantity:1,lineItem:{id:line.id}}],pageInfo}}
  const shipped={...order,displayFulfillmentStatus:'FULFILLED',lineItems:{nodes:[line],pageInfo},fulfillments:[shipment]}
  expect(normalizeShopifyAdminOrder(row(shipped),meta).status).toBe('delivered')
  expect(normalizeShopifyAdminOrder(row({...shipped,fulfillments:[{...shipment,displayStatus:'IN_TRANSIT'}]}),meta).status).toBe('shipped')
  expect(normalizeShopifyAdminOrder(row({...shipped,fulfillments:[{...shipment,displayStatus:'LABEL_PRINTED'}]}),meta).status).toBe('fulfilled')
  expect(normalizeShopifyAdminOrder(row({...shipped,lineItems:{nodes:[line,{...line,id:'gid://shopify/LineItem/2'}],pageInfo}}),meta).status).not.toBe('delivered')
 })
 it('does not expose private account proof or raw provider snapshot',()=>{
  const v=normalizeShopifyAdminOrder(row({...order,customAttributes:[{key:'mose_account_proof',value:'secret'}]}),meta)
  expect(JSON.stringify(v)).not.toContain('secret')
 })
})

describe('legacy confirmed refund accounting', () => {
 it('does not count a pending provider refund just because the return workflow says refunded', async () => {
  const { legacyRefundTotals } = await import('@/lib/admin-order-overview')
  const refund={id:'r1',order_id:'o1',status:'refunded',refund_amount:'0.01',mollie_refund_id:'re_1',stripe_refund_id:'re_1',mollie_refund_status:'pending',stripe_refund_status:'succeeded',refunded_at:time}
  expect(legacyRefundTotals([refund]).size).toBe(0)
 })
 it('deduplicates provider refunds and counts partial refunds only once', async () => {
  const { legacyRefundTotals, normalizeLegacyAdminOrder } = await import('@/lib/admin-order-overview')
  const refund={id:'r1',order_id:'o1',status:'refunded',refund_amount:'20.00',mollie_refund_id:'re_1',stripe_refund_id:'re_1',mollie_refund_status:'refunded',stripe_refund_status:'succeeded',refunded_at:time}
  const totals=legacyRefundTotals([refund,{...refund,id:'r2'}])
  expect(totals.get('o1')).toBe(2000)
  expect(normalizeLegacyAdminOrder({id:'o1',created_at:time,total:70,payment_status:'paid'},totals.get('o1'))).toMatchObject({revenue:50,payment_status:'partially_refunded'})
  expect(()=>legacyRefundTotals([refund,{...refund,id:'r2',refund_amount:'25.00'}])).toThrow('CONFLICTING_REFUND_EVIDENCE')
 })
 it('does not subtract again from an already fully refunded payment status', async () => {
  const { normalizeLegacyAdminOrder } = await import('@/lib/admin-order-overview')
  expect(normalizeLegacyAdminOrder({id:'o1',created_at:time,total:70,payment_status:'refunded'},7000).revenue).toBe(0)
  expect(()=>normalizeLegacyAdminOrder({id:'o1',created_at:time,total:70,payment_status:'paid'},8000)).toThrow('REFUNDS_EXCEED_ORDER_TOTAL')
 })
})


describe('retained provider metadata', () => {
 it('keeps historical orders readable from their authoritative projection without a fresh provider lookup', () => {
  const v=normalizeShopifyAdminOrder(row({...order,createdAt:time,email:'archived@example.com',netPaymentSet:money('0.01')}),undefined)
  expect(v).toMatchObject({revenue:0.01,email:'archived@example.com',created_at:time})
 })
 it('uses financial metadata from the same snapshot as its payment and fulfillment state', () => {
  const v=normalizeShopifyAdminOrder(row({...order,createdAt:time,email:null,netPaymentSet:money('0.01')}),{...meta,netPaymentSet:money('658')})
  expect(v.revenue).toBe(0.01)
 })
})

describe('complete admin report pagination', () => {
 async function reader(pages: unknown[][]) {
  const { createServiceClient } = await import('@/lib/supabase/service')
  const chain: any = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(),
   then: (resolve: (value: unknown) => void) => resolve({ data: pages.shift() ?? [], error: null }) }
  vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any)
  return chain
 }
 const page = (start: number, count=500) => Array.from({length:count},(_,i)=>({id:String(start+i).padStart(6,'0')}))
 it('uses a stable key cursor rather than offsets that can double-count concurrent inserts', async () => {
  const chain=await reader([page(0),page(500,1)])
  const { readAllAdminRows }=await import('@/lib/admin-order-overview')
  expect((await readAllAdminRows('orders','id','id')).length).toBe(501)
  expect(chain.gt).toHaveBeenCalledWith('id','000499')
 })
 it('fails closed on duplicate source rows instead of overstating totals', async () => {
  await reader([page(0),page(499,1)])
  const { readAllAdminRows }=await import('@/lib/admin-order-overview')
  await expect(readAllAdminRows('orders','id','id')).rejects.toThrow('ORDER_OVERVIEW_DUPLICATE')
 })
 it('allows an exact 10,000-row report but never silently truncates a larger one', async () => {
  const pages=Array.from({length:20},(_,i)=>page(i*500))
  const { readAllAdminRows }=await import('@/lib/admin-order-overview')
  await reader([...pages,[]]);expect((await readAllAdminRows('orders','id','id')).length).toBe(10000)
  await reader([...pages,page(10000,1)]);await expect(readAllAdminRows('orders','id','id')).rejects.toThrow('ORDER_OVERVIEW_LIMIT')
 })
})


describe('financial evidence validation', () => {
 it('rejects missing refund amounts instead of treating unknown cash as zero', async () => {
  const {legacyRefundTotals}=await import('@/lib/admin-order-overview')
  const refund={id:'r1',order_id:'o1',status:'refunded',refund_amount:null,mollie_refund_id:'re_1',stripe_refund_id:null,mollie_refund_status:'refunded',stripe_refund_status:null,refunded_at:time}
  expect(()=>legacyRefundTotals([refund as any])).toThrow()
 })
 it('does not invent a capture amount for an unsupported partially-paid legacy record', async () => {
  const {normalizeLegacyAdminOrder}=await import('@/lib/admin-order-overview')
  expect(()=>normalizeLegacyAdminOrder({id:'o1',created_at:time,total:70,payment_status:'partially_paid'})).toThrow('LEGACY_CAPTURE_AMOUNT_REQUIRED')
 })
})
