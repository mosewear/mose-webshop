// @vitest-environment node
import { describe,expect,it,vi } from 'vitest'
import { NATIVE_GIFT_PRODUCT_ID,nativeGiftAmountCents,nativeGiftLineSchema,nativeGiftRecipientAttributes,normalizeNativeGiftLines } from '@/lib/shopify/native-gift-input'
import { nativeGiftCutoverReady } from '@/lib/shopify/native-gift-cutover'
import { assertCreatedCartLines,aggregateBenefitLines } from '@/lib/shopify/cart-line-proof'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn(),storefront:vi.fn()}))
const now=Date.parse('2026-10-30T12:00:00Z'),gift={productId:NATIVE_GIFT_PRODUCT_ID,amountCents:2001,quantity:1} as const
describe('native gift request and issuer boundary',()=>{
 it('accepts exact cents and refuses malformed, under/over-limit or fractional-cent amounts',()=>{
  expect(nativeGiftAmountCents('20.01')).toBe(2001);expect(nativeGiftAmountCents(1000)).toBe(100000)
  for(const amount of [19.99,1000.01,20.001,NaN,Infinity,'20,01','20e1',null])expect(()=>nativeGiftAmountCents(amount)).toThrow()
  expect(nativeGiftLineSchema.safeParse({...gift,rawGiftCode:'SECRET'}).success).toBe(false)
  expect(nativeGiftLineSchema.safeParse({...gift,productId:'other'}).success).toBe(false)
 })
 it('keeps recipients distinct while producing a stable merged fingerprint',()=>{
  const a={...gift,recipient:{recipientEmail:'a@example.test'}},b={...gift,recipient:{recipientEmail:'b@example.test'}}
  expect(normalizeNativeGiftLines([b,a])).toEqual(normalizeNativeGiftLines([a,b]))
  expect(normalizeNativeGiftLines([a,a])).toEqual([{...a,quantity:2}])
  expect(normalizeNativeGiftLines([a,b])).toHaveLength(2)
  expect(()=>normalizeNativeGiftLines([{...a,quantity:6},{...b,quantity:6}])).toThrow('GIFT_QUANTITY_LIMIT')
 })
 it('sends only documented case-sensitive native recipient properties, including sender in the message',()=>{
  const attrs=nativeGiftRecipientAttributes({...gift,recipient:{recipientEmail:'a@example.test',recipientName:'A',senderName:'Rick',personalMessage:'Voor jou',sendOn:'2026-11-10',timezoneOffsetMinutes:-60}},'nl',now)
  expect(attrs).toEqual([{key:'__shopify_send_gift_card_to_recipient',value:'true'},{key:'Recipient email',value:'a@example.test'},{key:'Recipient name',value:'A'},{key:'Message',value:'Van: Rick\n\nVoor jou'},{key:'Send on',value:'2026-11-10'},{key:'__shopify_offset',value:'-60'}])
  expect(nativeGiftRecipientAttributes(gift,'nl',now)).toEqual([])
  expect(()=>nativeGiftRecipientAttributes({...gift,recipient:{recipientEmail:'a@example.test',personalMessage:'x'.repeat(200),senderName:'Rick'}},'nl',now)).toThrow('NATIVE_GIFT_MESSAGE_TOO_LONG')
  for(const date of ['2026-02-30','2026-10-29','2027-02-01'])expect(()=>nativeGiftRecipientAttributes({...gift,recipient:{recipientEmail:'a@example.test',sendOn:date,timezoneOffsetMinutes:-60}},'nl',now)).toThrow()
 })
 it('requires the exclusive native issuer, real DB writer generation and zero legacy obligations',()=>{
  const health={issuer:'shopify_native',activatedAt:'2026-10-30T11:00:00Z',shopifyProductIds:['gid://shopify/Product/1'],reviewReference:'Reviewed native product and automatic gift-only fulfillment',expiryPolicy:'never',writerGeneration:1,nativeCards:0,balances:0,pendingDelivery:0,pendingLegacyGiftOrders:0}
  expect(nativeGiftCutoverReady(health,now)).toBe(true)
  for(const changed of [{issuer:'mose'},{writerGeneration:0},{nativeCards:1},{balances:1},{pendingDelivery:1},{pendingLegacyGiftOrders:1},{activatedAt:'2027-01-01T00:00:00Z'},{shopifyProductIds:[]}])expect(nativeGiftCutoverReady({...health,...changed},now)).toBe(false)
 })
})
describe('native gift line proofs',()=>{
 const variant='gid://shopify/ProductVariant/20',a=[{key:'Recipient email',value:'a@example.test'}],b=[{key:'Recipient email',value:'b@example.test'}]
 it('proves two same-value gifts by exact recipient properties and quantity, refusing silently swapped recipients',()=>{
  const expected=[{merchandiseId:variant,quantity:1,attributes:a},{merchandiseId:variant,quantity:2,attributes:b}]
  const actual=[{merchandise:{id:variant},quantity:2,attributes:b},{merchandise:{id:variant},quantity:1,attributes:a}]
  expect(()=>assertCreatedCartLines(actual,expected)).not.toThrow()
  expect(()=>assertCreatedCartLines([{...actual[0],attributes:a},actual[1]],expected)).toThrow('CART_LINE_PROOF_MISMATCH')
  expect(()=>assertCreatedCartLines([{...actual[0],quantity:1},actual[1]],expected)).toThrow('CART_LINE_PROOF_MISMATCH')
 })
 it('aggregates only financially identical variant lines for benefit proof',()=>{
  const line={variantId:variant,quantity:1,unitCents:2000,productId:NATIVE_GIFT_PRODUCT_ID,giftCard:true,onSale:false}
  expect(aggregateBenefitLines([line,{...line,quantity:2}])).toEqual([{...line,quantity:3}])
  expect(()=>aggregateBenefitLines([line,{...line,unitCents:1}])).toThrow('BENEFIT_VARIANT_IDENTITY_CONFLICT')
 })
})
