import{beforeEach,expect,it,vi}from'vitest'
import{issueCheckoutBenefits,readCheckoutBenefitQuote}from'@/lib/shopify/checkout-benefits'
import{quoteCheckoutBenefits}from'@/lib/shopify/benefit-quote'
import{admin}from'@/lib/shopify/client'
import{bindAuthenticatedShopifyCustomer}from'@/lib/shopify/customer-binding'
import{reserveAndIssuePromo}from'@/lib/shopify/promo-issuer'
import{reserveAndIssueLoyaltyDiscount}from'@/lib/shopify/benefit-issuer'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn()}))
vi.mock('@/lib/shopify/customer-binding',()=>({bindAuthenticatedShopifyCustomer:vi.fn()}))
vi.mock('@/lib/shopify/promo-issuer',()=>({reserveAndIssuePromo:vi.fn()}))
vi.mock('@/lib/shopify/benefit-issuer',()=>({CREATE_LOYALTY_DISCOUNT:'mutation',reserveAndIssueLoyaltyDiscount:vi.fn()}))
const id='00000000-0000-4000-8000-000000000001',v='gid://shopify/ProductVariant/1'
const lines=[{productId:id,variantId:v,quantity:2,unitCents:5900,onSale:false,giftCard:false}]
const basic={attemptId:id,checkoutLease:id,secret:'a'.repeat(32),lines,user:null,points:0,promo:undefined,orderWidePromo:true,expectedSubtotalBeforeOrderCents:11800}
beforeEach(()=>{vi.clearAllMocks();delete process.env.SHOPIFY_BENEFIT_WRITES_ENABLED})
it('no-benefit guest makes zero provider/identity mutations',async()=>{
 const quote=quoteCheckoutBenefits({lines,tiers:[]})
 expect(await issueCheckoutBenefits({}as never,{...basic,quote})).toEqual([])
 expect(admin).not.toHaveBeenCalled();expect(bindAuthenticatedShopifyCustomer).not.toHaveBeenCalled()
})
it('constructs mutually combinable native order tier alongside promo/redemption',async()=>{
 process.env.SHOPIFY_BENEFIT_WRITES_ENABLED='true'
 const quote=quoteCheckoutBenefits({lines,tiers:[],promo:{id,active:true,expiresAt:null,type:'percentage',value:10,minOrderCents:0,includeSale:false,usageLimit:null,usageCount:0},loyalty:{tier:'gold',lifetimePoints:1000},points:100})
 vi.mocked(bindAuthenticatedShopifyCustomer).mockResolvedValue({customerId:'gid://shopify/Customer/1',email:'owner@test.invalid'})
 vi.mocked(reserveAndIssuePromo).mockResolvedValue({code:'private-promo',discountCents:1180,eligibleVariants:[v]})
 vi.mocked(reserveAndIssueLoyaltyDiscount).mockResolvedValue({code:'private-redemption',discountCents:500,eligibleVariants:[v]})
 vi.mocked(admin).mockResolvedValue({discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/1'},userErrors:[]}})
 const rpc=vi.fn().mockResolvedValue({data:true})
 const result=await issueCheckoutBenefits({rpc}as never,{...basic,quote,promo:{id},user:{id,email:'owner@test.invalid',email_confirmed_at:'2026-10-28T00:00:00Z'},points:100})
 expect(result.map(r=>r.discountCents)).toEqual([1180,1180,500])
 expect(vi.mocked(admin).mock.calls[0][1]).toMatchObject({input:{context:{customers:{add:['gid://shopify/Customer/1']}},customerGets:{items:{all:true},value:{percentage:0.1}},combinesWith:{orderDiscounts:true,productDiscounts:true,shippingDiscounts:false}}})
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['claim_shopify_automatic_benefit','bind_shopify_automatic_benefit'])
})
it('fails closed on DB tier read error instead of silently dropping earned benefits',async()=>{
 const eq=vi.fn().mockResolvedValue({error:{message:'unavailable'}})
 const db={from:()=>({select:()=>({in:()=>({eq})})})}
 await expect(readCheckoutBenefitQuote(db as never,{lines})).rejects.toThrow('BENEFIT_TIERS_UNAVAILABLE')
})
it('groups six size/color variants with equal per-item staffel into one exact native discount', async()=>{
 process.env.SHOPIFY_BENEFIT_WRITES_ENABLED='true'
 const groupedLines=Array.from({length:6},(_,i)=>({...lines[0],variantId:`gid://shopify/ProductVariant/${i+1}`,quantity:1}))
 const tiers=[{product_id:id,min_quantity:2,discount_type:'fixed' as const,discount_value:5,is_active:true}]
 const eq=vi.fn().mockResolvedValue({data:tiers,error:null})
 const db={from:()=>({select:()=>({in:()=>({eq})})}),rpc:vi.fn().mockResolvedValue({data:true})}
 const plan=await readCheckoutBenefitQuote(db as never,{lines:groupedLines})
 vi.mocked(admin).mockResolvedValue({discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/1'},userErrors:[]}})
 const result=await issueCheckoutBenefits(db as never,{...plan,attemptId:id,checkoutLease:id,secret:'a'.repeat(32)})
 expect(admin).toHaveBeenCalledTimes(1)
 expect(result[0]).toMatchObject({discountCents:3000,eligibleVariants:groupedLines.map(l=>l.variantId)})
 expect(vi.mocked(admin).mock.calls[0][1]).toMatchObject({input:{customerGets:{items:{products:{productVariantsToAdd:groupedLines.map(l=>l.variantId)}},value:{discountAmount:{amount:'5.00',appliesOnEachItem:true}}}}})
})
it('still blocks more than five distinct per-item discounts before any provider mutation',async()=>{
 const distinctLines=Array.from({length:6},(_,i)=>({...lines[0],variantId:`gid://shopify/ProductVariant/${i+1}`,unitCents:1000*(i+1),quantity:1}))
 const tiers=[{product_id:id,min_quantity:2,discount_type:'percentage',discount_value:10,is_active:true}]
 const eq=vi.fn().mockResolvedValue({data:tiers,error:null})
 const db={from:()=>({select:()=>({in:()=>({eq})})})}
 await expect(readCheckoutBenefitQuote(db as never,{lines:distinctLines})).rejects.toThrow('BENEFIT_CODE_LIMIT')
 expect(admin).not.toHaveBeenCalled()
})
