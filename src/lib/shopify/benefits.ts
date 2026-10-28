import { createHash, createHmac } from 'node:crypto'
import { z } from 'zod'
import { moneyToCents } from './policy'

const variant = z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/)
const cents = z.number().int().positive().max(100_000_000)
export const benefitLineSchema = z.object({
  variantId: variant, quantity: z.number().int().min(1).max(100), unitCents: cents,
  giftCard: z.boolean(), onSale: z.boolean(),
})
export type BenefitLine = z.infer<typeof benefitLineSchema>
const promoSchema = z.object({
  id: z.string().uuid(), active: z.literal(true), expiresAt: z.string().datetime().nullable(),
  type: z.enum(['percentage', 'fixed']), value: z.number().positive(),
  minOrderCents: z.number().int().nonnegative(), includeSale: z.boolean(),
  usageLimit: z.number().int().positive().nullable(), usageCount: z.number().int().nonnegative(),
})
/** Inputs MUST come from current database rows and authenticated ownership, not
 * from browser price/discount fields. Integer cents preserve legacy rounding. */
export function planPromo(rawPromo: unknown, rawLines: unknown, staffelCents: number, now = Date.now()) {
  const p = promoSchema.parse(rawPromo)
  const lines = z.array(benefitLineSchema).min(1).max(100).parse(rawLines)
  if (!Number.isSafeInteger(staffelCents) || staffelCents < 0) throw new Error('BENEFITS_INVALID_STAFFEL')
  if (staffelCents) throw new Error('PROMO_STAFFEL_CONFLICT')
  if (p.expiresAt && Date.parse(p.expiresAt) <= now) throw new Error('PROMO_EXPIRED')
  if (p.usageLimit !== null && p.usageCount >= p.usageLimit) throw new Error('PROMO_EXHAUSTED')
  if (p.type === 'percentage' && p.value > 100) throw new Error('PROMO_INVALID_VALUE')
  const eligible = lines.filter(l => !l.giftCard && (p.includeSale || !l.onSale))
  const subtotal = eligible.reduce((n, l) => n + l.unitCents * l.quantity, 0)
  if (!Number.isSafeInteger(subtotal) || subtotal > 100_000_000) throw new Error('BENEFITS_INVALID_SUBTOTAL')
  if (!subtotal || subtotal < p.minOrderCents) throw new Error('PROMO_MINIMUM_NOT_MET')
  const discountCents = Math.min(subtotal, p.type === 'percentage' ? Math.round(subtotal * p.value / 100) : Math.round(p.value * 100))
  if (!discountCents) throw new Error('PROMO_ZERO_DISCOUNT')
  return { promoId: p.id, discountCents, eligibleVariants: [...new Set(eligible.map(l => l.variantId))], eligibleSubtotalCents: subtotal }
}

export function loyaltyDiscountPlan(input: {
  attemptId: string; customerId: string; points: number; secret: string;
  lines: BenefitLine[]; now?: number;
}) {
  z.string().uuid().parse(input.attemptId)
  z.string().regex(/^gid:\/\/shopify\/Customer\/[1-9][0-9]*$/).parse(input.customerId)
  z.number().int().min(100).max(20_000_000).multipleOf(100).parse(input.points)
  if (input.secret.length < 32) throw new Error('BENEFITS_SECRET_REQUIRED')
  const lines = z.array(benefitLineSchema).min(1).max(100).parse(input.lines).filter(l => !l.giftCard)
  const amount = input.points / 100 * 500
  const subtotal = lines.reduce((n, l) => n + l.unitCents * l.quantity, 0)
  if (!lines.length || amount > subtotal || !Number.isSafeInteger(subtotal)) throw new Error('LOYALTY_DISCOUNT_EXCEEDS_CART')
  // Stable across process retries; never create another capability after an
  // uncertain provider response. No user identity or promo appears in the code.
  const code = `MOSE-L-${createHmac('sha256', input.secret).update(`loyalty:v1:${input.attemptId}`).digest('hex').toUpperCase()}`
  const now = input.now ?? Date.now()
  return {
    eligibleVariants: [...new Set(lines.map(l => l.variantId))],
    code, codeHash: createHash('sha256').update(code).digest('hex'), discountCents: amount,
    basicCodeDiscount: {
      title: 'MOSE spaarpunten', code, startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 24 * 60 * 60_000).toISOString(), usageLimit: 1, appliesOncePerCustomer: true,
      context: { customers: { add: [input.customerId] } },
      combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: false },
      customerGets: {
        items: { all: true },
        value: { discountAmount: { amount: (amount / 100).toFixed(2), appliesOnEachItem: false } },
      },
    },
  }
}

export const BENEFITS_CART_QUERY = `query MoseBenefitsCart($id: ID!) {
  cart(id: $id) {
    id discountCodes { code applicable }
    deliveryGroups(first: 100) { pageInfo { hasNextPage } nodes { discountAllocations { __typename } } }
    lines(first: 100) { pageInfo { hasNextPage } nodes {
      quantity merchandise { ... on ProductVariant { id } }
      discountAllocations(lineLevelOnly: false) { __typename ... on CartCodeDiscountAllocation { code discountedAmount { amount currencyCode } } }
    } }
  }
}`
const money = z.object({ amount: z.string(), currencyCode: z.literal('EUR') })
const allocation = z.object({ __typename: z.literal('CartCodeDiscountAllocation'), code: z.string(), discountedAmount: money })
/** Every allocation is checked: an unexpected automatic/stacked code is not a
 * reason to silently change the promised amount. No capability in thrown errors. */
export function assertCartBenefits(raw: unknown, expected: { code: string; discountCents: number; eligibleVariants: string[] }[]) {
  const cart = z.object({
    discountCodes: z.array(z.object({ code: z.string(), applicable: z.boolean() })),
    deliveryGroups: z.object({ pageInfo: z.object({ hasNextPage: z.literal(false) }), nodes: z.array(z.object({ discountAllocations: z.array(z.unknown()).max(0) })) }),
    lines: z.object({ pageInfo: z.object({ hasNextPage: z.literal(false) }), nodes: z.array(z.object({
      quantity: z.number().int().positive(), merchandise: z.object({ id: variant }), discountAllocations: z.array(allocation),
    })) }),
  }).parse(raw)
  if (new Set(expected.map(e => e.code)).size !== expected.length || cart.discountCodes.length !== expected.length ||
    cart.discountCodes.some(c => !c.applicable || !expected.some(e => e.code === c.code))) throw new Error('BENEFITS_CODE_MISMATCH')
  const totals = new Map(expected.map(e => [e.code, 0]))
  const add = (a: z.infer<typeof allocation>, variantId?: string) => {
    const e = expected.find(e => e.code === a.code)
    if (!e || (variantId && !e.eligibleVariants.includes(variantId))) throw new Error('BENEFITS_ALLOCATION_MISMATCH')
    const value = moneyToCents(a.discountedAmount.amount)
    if (value < 0) throw new Error('BENEFITS_ALLOCATION_MISMATCH')
    totals.set(a.code, (totals.get(a.code) ?? 0) + value)
  }
  cart.lines.nodes.forEach(l => l.discountAllocations.forEach(a => add(a, l.merchandise.id)))
  if (expected.some(e => !Number.isSafeInteger(e.discountCents) || e.discountCents <= 0 || totals.get(e.code) !== e.discountCents)) throw new Error('BENEFITS_AMOUNT_MISMATCH')
}
