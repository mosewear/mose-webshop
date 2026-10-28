import{beforeEach,expect,it,vi}from'vitest'
import{reserveAndIssuePromo}from'@/lib/shopify/promo-issuer'
import{admin}from'@/lib/shopify/client'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn()}))
const id='00000000-0000-4000-8000-000000000001'
const input={attemptId:id,checkoutLease:id,issuanceLease:id,secret:'a'.repeat(32),staffelCents:0,
 promo:{id,code:'DO-NOT-EXPOSE',is_active:true,expires_at:null,discount_type:'percentage',discount_value:10,min_order_value:0,applies_to_sale_items:false,usage_limit:1,usage_count:0},
 lines:[{variantId:'gid://shopify/ProductVariant/1',unitCents:5900,quantity:1,onSale:false,giftCard:false}]}
beforeEach(()=>{delete process.env.SHOPIFY_BENEFIT_WRITES_ENABLED;delete process.env.ATOMIC_PROMO_ENABLED;vi.mocked(admin).mockReset()})
it('default off does not touch provider',async()=>{
 await expect(reserveAndIssuePromo({} as never,input)).rejects.toThrow('BENEFIT_WRITES_DISABLED');expect(admin).not.toHaveBeenCalled()
})
it('fences global use before issuer and binds capability before returning',async()=>{
 process.env.SHOPIFY_BENEFIT_WRITES_ENABLED='true';process.env.ATOMIC_PROMO_ENABLED='true'
 const rpc=vi.fn().mockResolvedValueOnce({data:'reserved'}).mockResolvedValueOnce({data:true}).mockResolvedValueOnce({data:true})
 vi.mocked(admin).mockResolvedValue({discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/1'},userErrors:[]}})
 const result=await reserveAndIssuePromo({rpc}as never,input)
 expect(result.discountCents).toBe(590);expect(result.code).not.toContain(input.promo.code)
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['reserve_shopify_promo','claim_shopify_promo_issuance','bind_shopify_promo_discount'])
 expect(vi.mocked(admin).mock.calls[0][1]).toMatchObject({input:{context:{all:'ALL'},customerGets:{value:{percentage:0.1}},usageLimit:1}})
})
it('never duplicates unknown issuance or silently releases hold',async()=>{
 process.env.SHOPIFY_BENEFIT_WRITES_ENABLED='true';process.env.ATOMIC_PROMO_ENABLED='true'
 const rpc=vi.fn().mockResolvedValueOnce({data:'reserved'}).mockResolvedValueOnce({data:false})
 await expect(reserveAndIssuePromo({rpc}as never,input)).rejects.toThrow('PROMO_ISSUANCE_ALREADY_PENDING')
 expect(admin).not.toHaveBeenCalled();expect(rpc.mock.calls).toHaveLength(2)
})
