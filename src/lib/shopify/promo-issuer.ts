import { createHash, createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { admin } from './client'
import { CREATE_LOYALTY_DISCOUNT } from './benefit-issuer'
import { planPromo, type BenefitLine } from './benefits'
import { promoSnapshot } from './promo-reservation'

/** Current trusted rows only. Native percentage retains exact source percentage;
 * fixed amount is once per order. Targets exclude sale/gift card variants.
 * Promo+staffel remains prohibited by source policy. */
export async function reserveAndIssuePromo(db: SupabaseClient, input: {
  attemptId: string; checkoutLease: string; issuanceLease: string; secret: string;
  promo: Record<string, unknown>; lines: BenefitLine[]; staffelCents: number;
  customerId?: string; now?: number; orderWide?: boolean;
}) {
  if (process.env.SHOPIFY_BENEFIT_WRITES_ENABLED !== 'true' || process.env.ATOMIC_PROMO_ENABLED !== 'true') throw new Error('BENEFIT_WRITES_DISABLED')
  z.string().uuid().parse(input.attemptId)
  if(input.secret.length<32) throw new Error('BENEFITS_SECRET_REQUIRED')
  if(input.customerId) z.string().regex(/^gid:\/\/shopify\/Customer\/[1-9][0-9]*$/).parse(input.customerId)
  const p=input.promo
  if (['max_discount','max_discount_amount','maximum_discount_amount'].some(key=>p[key]!=null&&Number(p[key])>0)) throw new Error('PROMO_ABSOLUTE_CAP_PARITY_REQUIRED')
  const plan=planPromo({ id:p.id,active:p.is_active,expiresAt:p.expires_at,type:p.discount_type,
    value:Number(p.discount_value),minOrderCents:Math.round(Number(p.min_order_value??0)*100),includeSale:p.applies_to_sale_items,
    usageLimit:p.usage_limit,usageCount:p.usage_count },input.lines,input.staffelCents,input.now)
  const held=await db.rpc('reserve_shopify_promo',{p_attempt:input.attemptId,p_checkout_lease:input.checkoutLease,p_promo:p.id,p_snapshot:promoSnapshot(p),p_discount:plan.discountCents})
  if(held.error||held.data!=='reserved') throw new Error('PROMO_RESERVATION_UNCONFIRMED')
  const claimed=await db.rpc('claim_shopify_promo_issuance',{p_attempt:input.attemptId,p_checkout_lease:input.checkoutLease,p_issuance_lease:input.issuanceLease})
  if(claimed.error||claimed.data!==true) throw new Error('PROMO_ISSUANCE_ALREADY_PENDING')
  const code=`MOSE-P-${createHmac('sha256',input.secret).update(`promo:v1:${input.attemptId}`).digest('hex').toUpperCase()}`
  const now=input.now??Date.now()
  const expiry=Math.min(now+24*60*60_000,p.expires_at?Date.parse(String(p.expires_at)):Infinity)
  const value=p.discount_type==='percentage'?{percentage:Number(p.discount_value)/100}:{discountAmount:{amount:(plan.discountCents/100).toFixed(2),appliesOnEachItem:false}}
  const response=await admin<unknown>(CREATE_LOYALTY_DISCOUNT,{input:{
    title:'MOSE korting',code,startsAt:new Date(now-60_000).toISOString(),endsAt:new Date(expiry).toISOString(),
    usageLimit:1,context:input.customerId?{customers:{add:[input.customerId]}}:{all:'ALL'},
    combinesWith:{orderDiscounts:true,productDiscounts:true,shippingDiscounts:false},
    customerGets:{value,items:input.orderWide===true?{all:true}:{products:{productVariantsToAdd:plan.eligibleVariants}}},
    ...(Number(p.min_order_value)>0?{minimumRequirement:{subtotal:{greaterThanOrEqualToSubtotal:String(p.min_order_value)}}}:{}),
  }})
  const payload=z.object({discountCodeBasicCreate:z.object({codeDiscountNode:z.object({id:z.string().regex(/^gid:\/\/shopify\/DiscountCodeNode\/[1-9][0-9]*$/)}).nullable(),userErrors:z.array(z.unknown())})}).parse(response).discountCodeBasicCreate
  if(!payload.codeDiscountNode||payload.userErrors.length) throw new Error('PROMO_ISSUANCE_UNCONFIRMED')
  const codeHash=createHash('sha256').update(code).digest('hex')
  const saved=await db.rpc('bind_shopify_promo_discount',{p_attempt:input.attemptId,p_issuance_lease:input.issuanceLease,p_provider:payload.codeDiscountNode.id,p_code_hash:codeHash})
  if(saved.error||saved.data!==true) throw new Error('PROMO_BINDING_UNCONFIRMED')
  return {code,discountCents:plan.discountCents,eligibleVariants:plan.eligibleVariants}
}
