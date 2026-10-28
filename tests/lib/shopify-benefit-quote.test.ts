import { expect,it } from 'vitest'
import {quoteCheckoutBenefits} from '@/lib/shopify/benefit-quote'
const p='00000000-0000-4000-8000-000000000001'
const line={productId:p,variantId:'gid://shopify/ProductVariant/1',unitCents:5900,quantity:2,onSale:false,giftCard:false}
const promo={id:p,active:true,expiresAt:null,type:'percentage',value:10,minOrderCents:0,includeSale:false,usageLimit:null,usageCount:0}
it('matches source tier stacking: tier uses subtotal before promo, not discounted subtotal',()=>{
 expect(quoteCheckoutBenefits({lines:[line],tiers:[],promo,loyalty:{tier:'silver',lifetimePoints:500},points:100})).toMatchObject({subtotalCents:11800,tierCents:590,promo:{discountCents:1180},redemptionCents:500,discountCents:2270,payableMerchandiseCents:9530})
})
it('groups variants for quantity tier but preserves per-unit cent rounding',()=>{
 const other={...line,variantId:'gid://shopify/ProductVariant/2',unitCents:3333,quantity:1}
 expect(quoteCheckoutBenefits({lines:[{...line,quantity:1},other],tiers:[{product_id:p,min_quantity:2,discount_type:'percentage',discount_value:15,is_active:true}],loyalty:{tier:'gold',lifetimePoints:1000}})).toMatchObject({staffelCents:1385,afterStaffelCents:7848,tierCents:785})
})
it('blocks promo plus staffel and excludes sale from quantity savings',()=>{
 const tiers=[{product_id:p,min_quantity:2,discount_type:'percentage' as const,discount_value:15,is_active:true}]
 expect(()=>quoteCheckoutBenefits({lines:[line],tiers,promo})).toThrow('PROMO_STAFFEL_CONFLICT')
 expect(quoteCheckoutBenefits({lines:[{...line,onSale:true}],tiers})).toMatchObject({staffelCents:0})
})
it('does not overdiscount or silently include unsupported gift card obligations',()=>{
 expect(()=>quoteCheckoutBenefits({lines:[line],tiers:[],points:100000})).toThrow('BENEFITS_EXCEED_CART')
 expect(()=>quoteCheckoutBenefits({lines:[{...line,giftCard:true}],tiers:[]})).toThrow('BENEFIT_GIFT_CARD_PARITY_REQUIRED')
})
