// @vitest-environment node
import {describe,expect,it} from 'vitest'
import {shopifyPurchasePayload} from '@/lib/meta/shopify-purchase'
const order={id:'gid://shopify/Order/1234',fullyPaid:true,test:false,cancelledAt:null,displayFinancialStatus:'PAID',email:'buyer@example.test',
 totalPriceSet:{presentmentMoney:{amount:'109.99',currencyCode:'USD'}},customAttributes:[{key:'mose_attempt',value:'attempt'}],
 lineItems:{nodes:[{quantity:2,variant:{id:'gid://shopify/ProductVariant/123'},customAttributes:[{key:'mose_content_id',value:'product:blue'}],discountedTotalSet:{presentmentMoney:{amount:'99.99',currencyCode:'USD'}}}],pageInfo:{hasNextPage:false}}}
const attribution={source_url:'https://www.mosewear.com/en/checkout',fbc:'fb.1.1795030000000.actual-click',client_user_agent:'Browser'}
describe('authoritative Shopify Purchase',()=>{
 it('uses the currency and final order total actually paid, with a stable retry ID and feed IDs',()=>{
  const event=shopifyPurchasePayload(order,attribution,1795030000)
  expect(event.custom_data).toMatchObject({currency:'USD',value:109.99,num_items:2,content_ids:['product:blue']})
  expect(event.event_id).toBe('shopify:1234');expect(event.event_id).toBe(shopifyPurchasePayload(structuredClone(order),attribution,1795030000).event_id)
  expect(event.user_data?.fbc).toBe(attribution.fbc)
 })
 it.each([{fullyPaid:false},{displayFinancialStatus:'PENDING'},{cancelledAt:'2026-11-18T01:00:00Z'},{lineItems:{...order.lineItems,pageInfo:{hasNextPage:true}}}])('rejects unpaid, cancelled, or incomplete data %o',change=>{
  expect(()=>shopifyPurchasePayload({...order,...change},attribution,1795030000)).toThrow('ORDER_PAYMENT_UNVERIFIED')
 })
 it('never sends a Shopify test order as a production Purchase',()=>{
  expect(()=>shopifyPurchasePayload({...order,test:true},attribution,1795030000)).toThrow('TEST_ORDER_EXCLUDED')
  expect(shopifyPurchasePayload({...order,test:true},{...attribution,test_event_code:'TEST72015'},1795030000).test_event_code).toBe('TEST72015')
 })
})
