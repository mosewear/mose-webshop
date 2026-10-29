import { z } from 'zod'
import { calculateQuantityDiscount, type QuantityDiscountTier } from '@/lib/quantity-discount'
import { calculateTier, calculateTierDiscount, type LoyaltyTier } from '@/lib/loyalty'
import { benefitLineSchema, planPromo } from './benefits'
const quoteLine=benefitLineSchema.extend({productId:z.string().uuid()})
/** Financial parity quote over server rows. A shipping discount/gift balance is
 * never invented here. The caller fetches all rows with checked DB errors. */
export function quoteCheckoutBenefits(input:{
 lines:unknown; tiers:QuantityDiscountTier[]; promo?:unknown;
 loyalty?:{tier:LoyaltyTier|null;lifetimePoints:number}; points?:number;
}) {
 const lines=z.array(quoteLine).min(1).max(100).parse(input.lines)
 if(new Set(lines.map(l=>l.variantId)).size!==lines.length) throw new Error('BENEFIT_DUPLICATE_VARIANT')
 if(lines.some(l=>l.giftCard)) throw new Error('BENEFIT_GIFT_CARD_PARITY_REQUIRED')
 const quantities=new Map<string,number>()
 lines.forEach(l=>quantities.set(l.productId,(quantities.get(l.productId)??0)+l.quantity))
 const staffel=lines.map(l=>{
  const discounted=l.onSale?0:calculateQuantityDiscount(l.unitCents/100,quantities.get(l.productId)!,input.tiers.filter(t=>t.product_id===l.productId)).discountPerItem
  const perItemCents=Math.round(discounted*100)
  if(!Number.isSafeInteger(perItemCents)||perItemCents<0||perItemCents>l.unitCents) throw new Error('BENEFIT_INVALID_QUANTITY_TIER')
  return {variantId:l.variantId,quantity:l.quantity,perItemCents,totalCents:perItemCents*l.quantity}
 }).filter(l=>l.totalCents>0)
 const subtotal=lines.reduce((n,l)=>n+l.unitCents*l.quantity,0)
 const staffelCents=staffel.reduce((n,l)=>n+l.totalCents,0)
 const afterStaffel=subtotal-staffelCents
 const promo=input.promo?planPromo(input.promo,lines,staffelCents):null
 const tier=input.loyalty?.tier??calculateTier(input.loyalty?.lifetimePoints??0)
 const tierCents=Math.round(calculateTierDiscount(tier,afterStaffel/100)*100)
 const points=input.points??0
 z.number().int().min(0).max(20_000_000).multipleOf(100).parse(points)
 const redemptionCents=points/100*500
 const discountCents=staffelCents+(promo?.discountCents??0)+tierCents+redemptionCents
 if(!Number.isSafeInteger(discountCents)||discountCents>subtotal) throw new Error('BENEFITS_EXCEED_CART')
 if(redemptionCents>0&&discountCents===subtotal) throw new Error('LOYALTY_ZERO_SPEND_PARITY_REQUIRED')
 return {subtotalCents:subtotal,afterStaffelCents:afterStaffel,staffel,staffelCents,promo,tier,tierCents,redemptionCents,discountCents,payableMerchandiseCents:subtotal-discountCents}
}

/** A native per-item discount can cover several variants only when their rounded
 * per-item amounts match exactly. Keep unequal amounts in separate components. */
export function groupQuantityBenefits(staffel: ReturnType<typeof quoteCheckoutBenefits>['staffel']) {
 const groups = new Map<number, { perItemCents: number; totalCents: number; eligibleVariants: string[] }>()
 for (const line of staffel) {
  const group = groups.get(line.perItemCents) ?? { perItemCents: line.perItemCents, totalCents: 0, eligibleVariants: [] }
  group.totalCents += line.totalCents
  group.eligibleVariants.push(line.variantId)
  groups.set(line.perItemCents, group)
 }
 return [...groups.values()].sort((a, b) => a.perItemCents - b.perItemCents)
  .map(group => ({ ...group, eligibleVariants: group.eligibleVariants.sort() }))
}
