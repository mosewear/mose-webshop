import { describe, expect, it, vi, beforeEach } from 'vitest'
import { assertCartBenefits, loyaltyDiscountPlan, planPromo, type BenefitLine } from '@/lib/shopify/benefits'
import { issueLoyaltyDiscount } from '@/lib/shopify/benefit-issuer'
import { admin } from '@/lib/shopify/client'
vi.mock('@/lib/shopify/client', () => ({ admin: vi.fn() }))
const v1 = 'gid://shopify/ProductVariant/1'
const v2 = 'gid://shopify/ProductVariant/2'
const lines: BenefitLine[] = [
  { variantId: v1, quantity: 2, unitCents: 5900, giftCard: false, onSale: false },
  { variantId: v2, quantity: 1, unitCents: 7900, giftCard: false, onSale: true },
]
const promo = { id: 'cadc7a10-f1eb-4b36-8380-d8c159fc15ff', active: true, expiresAt: null,
  type: 'percentage', value: 10, minOrderCents: 0, includeSale: false, usageLimit: 1, usageCount: 0 }
const input = { attemptId: 'cadc7a10-f1eb-4b36-8380-d8c159fc15ff', customerId: 'gid://shopify/Customer/1',
  points: 100, secret: 'a'.repeat(32), lines, now: 100000 }
const amount = { amount: '5.00', currencyCode: 'EUR' }
const allocation = { __typename: 'CartCodeDiscountAllocation', code: 'private-example', discountedAmount: amount }
const cart = () => ({ discountCodes: [{ code: 'private-example', applicable: true }], deliveryGroups: { pageInfo: { hasNextPage: false }, nodes: [] },
  lines: { pageInfo: { hasNextPage: false }, nodes: [{ quantity: 2, merchandise: { id: v1 }, discountAllocations: [allocation] }] } })
const expected = [{ code: 'private-example', discountCents: 500, eligibleVariants: [v1] }]
describe('server-owned benefits', () => {
  it('excludes sale lines, preserves percentage cents and min-eligible rule', () => {
    expect(planPromo(promo, lines, 0)).toMatchObject({ discountCents: 1180, eligibleVariants: [v1] })
    expect(() => planPromo({ ...promo, minOrderCents: 12000 }, lines, 0)).toThrow('PROMO_MINIMUM_NOT_MET')
    expect(planPromo({ ...promo, includeSale: true }, lines, 0).discountCents).toBe(1970)
  })
  it('excludes gift cards even if sale stacking is permitted', () => {
    expect(() => planPromo({ ...promo, includeSale: true }, lines.map(l => ({ ...l, giftCard: true })), 0)).toThrow('PROMO_MINIMUM_NOT_MET')
  })
  it('caps fixed discount, rejects exhausted, expired and staffel stacking', () => {
    expect(planPromo({ ...promo, type: 'fixed', value: 999 }, lines, 0).discountCents).toBe(11800)
    expect(() => planPromo({ ...promo, usageCount: 1 }, lines, 0)).toThrow('PROMO_EXHAUSTED')
    expect(() => planPromo({ ...promo, expiresAt: '2020-01-01T00:00:00.000Z' }, lines, 0)).toThrow('PROMO_EXPIRED')
    expect(() => planPromo(promo, lines, 1)).toThrow('PROMO_STAFFEL_CONFLICT')
  })
  it('issues deterministic private capability restricted to account and actual variants', () => {
    const a = loyaltyDiscountPlan(input)
    expect(a.code).toBe(loyaltyDiscountPlan({ ...input, now: 110000 }).code)
    expect(a.code).not.toContain(input.attemptId)
    expect(a.basicCodeDiscount.context.customers.add).toEqual([input.customerId])
    expect(a.basicCodeDiscount.customerGets.value.discountAmount).toEqual({ amount: '5.00', appliesOnEachItem: false })
    expect(a.basicCodeDiscount.usageLimit).toBe(1)
    expect(a.basicCodeDiscount.combinesWith).toEqual({ orderDiscounts: true, productDiscounts: true, shippingDiscounts: false })
    expect(() => loyaltyDiscountPlan({ ...input, points: 101 })).toThrow()
    expect(() => loyaltyDiscountPlan({ ...input, points: 100000 })).toThrow('LOYALTY_DISCOUNT_EXCEEDS_CART')
    expect(() => loyaltyDiscountPlan({ ...input, customerId: '' })).toThrow()
  })
  it('checks actual full allocation totals, not just applicable status', () => {
    expect(() => assertCartBenefits(cart(), expected)).not.toThrow()
    expect(() => assertCartBenefits(cart(), [{ ...expected[0], discountCents: 501 }])).toThrow('BENEFITS_AMOUNT_MISMATCH')
    expect(() => assertCartBenefits(cart(), [{ ...expected[0], eligibleVariants: [v2] }])).toThrow('BENEFITS_ALLOCATION_MISMATCH')
    expect(() => assertCartBenefits({ ...cart(), discountCodes: [{ code: 'private-example', applicable: false }] }, expected)).toThrow('BENEFITS_CODE_MISMATCH')
  })
  it('rejects unknown automatic discounts and truncated or non-EUR allocation', () => {
    const a = cart(); a.lines.nodes[0].discountAllocations[0] = { ...allocation, __typename: 'CartAutomaticDiscountAllocation' }
    expect(() => assertCartBenefits(a, expected)).toThrow()
    expect(() => assertCartBenefits({ ...cart(), lines: { ...cart().lines, pageInfo: { hasNextPage: true } } }, expected)).toThrow()
    const b = cart(); b.lines.nodes[0].discountAllocations[0] = { ...allocation, discountedAmount: { ...amount, currencyCode: 'USD' } }
    expect(() => assertCartBenefits(b, expected)).toThrow()
  })
  beforeEach(() => { delete process.env.SHOPIFY_BENEFIT_WRITES_ENABLED; vi.mocked(admin).mockReset() })
  it('performs no provider write while default-off', async () => {
    await expect(issueLoyaltyDiscount(loyaltyDiscountPlan(input))).rejects.toThrow('BENEFIT_WRITES_DISABLED')
    expect(admin).not.toHaveBeenCalled()
  })
  it('returns only durable identifier/hash and does not retry uncertain provider errors', async () => {
    process.env.SHOPIFY_BENEFIT_WRITES_ENABLED = 'true'
    vi.mocked(admin).mockResolvedValue({ discountCodeBasicCreate: { codeDiscountNode: { id: 'gid://shopify/DiscountCodeNode/1' }, userErrors: [] } })
    const result = await issueLoyaltyDiscount(loyaltyDiscountPlan(input))
    expect(result).toMatchObject({ provider_discount_id: 'gid://shopify/DiscountCodeNode/1' })
    expect(result).not.toHaveProperty('code')
    vi.mocked(admin).mockRejectedValue(new Error('NETWORK_UNKNOWN'))
    await expect(issueLoyaltyDiscount(loyaltyDiscountPlan(input))).rejects.toThrow('NETWORK_UNKNOWN')
    expect(admin).toHaveBeenCalledTimes(2)
  })
})

describe('durable loyalty issuance orchestration', () => {
  it('reserves and fences before provider, persists before returning capability', async () => {
    const { reserveAndIssueLoyaltyDiscount } = await import('@/lib/shopify/benefit-issuer')
    process.env.SHOPIFY_BENEFIT_WRITES_ENABLED = 'true'
    const rpc = vi.fn().mockResolvedValueOnce({ data: 'reserved' }).mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: true })
    vi.mocked(admin).mockReset().mockResolvedValue({ discountCodeBasicCreate: { codeDiscountNode: { id: 'gid://shopify/DiscountCodeNode/1' }, userErrors: [] } })
    const result = await reserveAndIssueLoyaltyDiscount({ rpc } as never, { ...input, userId: input.attemptId, checkoutLease: input.attemptId, issuanceLease: input.attemptId })
    expect(result.discountCents).toBe(500)
    expect(rpc.mock.calls.map(c => c[0])).toEqual(['reserve_shopify_loyalty', 'claim_shopify_benefit', 'complete_shopify_benefit'])
    expect(admin).toHaveBeenCalledTimes(1)
  })
  it('does not issue when prior mutation is uncertain', async () => {
    const { reserveAndIssueLoyaltyDiscount } = await import('@/lib/shopify/benefit-issuer')
    process.env.SHOPIFY_BENEFIT_WRITES_ENABLED = 'true'
    const rpc = vi.fn().mockResolvedValueOnce({ data: 'reserved' }).mockResolvedValueOnce({ data: false })
    vi.mocked(admin).mockReset()
    await expect(reserveAndIssueLoyaltyDiscount({ rpc } as never, { ...input, userId: input.attemptId, checkoutLease: input.attemptId, issuanceLease: input.attemptId })).rejects.toThrow('BENEFIT_ISSUANCE_ALREADY_PENDING')
    expect(admin).not.toHaveBeenCalled()
    expect(rpc.mock.calls.some(c => c[0] === 'release_failed_shopify_loyalty')).toBe(false)
  })
})

describe('provider original line subtotal proof', () => {
  const proof = { lines: [{variantId:v1,quantity:2,unitCents:5900}], payableMerchandiseCents:11300 }
  const priced = () => ({...cart(),lines:{...cart().lines,nodes:[{...cart().lines.nodes[0],cost:{amountPerQuantity:{amount:'59.00',currencyCode:'EUR'},subtotalAmount:{amount:'118.00',currencyCode:'EUR'}}}]}})
  it('proves original line prices minus all allocations rather than using CartCost before order discounts', () => {
    expect(() => assertCartBenefits(priced(),expected,proof)).not.toThrow()
    expect(() => assertCartBenefits(priced(),expected,{...proof,payableMerchandiseCents:11800})).toThrow('BENEFITS_PAYABLE_PROOF_MISMATCH')
  })
  it('rejects altered unit price/quantity, missing price and non-EUR cost', () => {
    expect(() => assertCartBenefits(cart(),expected,proof)).toThrow('BENEFITS_LINE_PROOF_MISMATCH')
    expect(() => assertCartBenefits(priced(),expected,{...proof,lines:[{...proof.lines[0],unitCents:5800}]})).toThrow('BENEFITS_LINE_PROOF_MISMATCH')
    expect(() => assertCartBenefits(priced(),expected,{...proof,lines:[{...proof.lines[0],quantity:1}]})).toThrow('BENEFITS_LINE_PROOF_MISMATCH')
    const altered=priced();altered.lines.nodes[0].cost.amountPerQuantity.currencyCode='USD'
    expect(() => assertCartBenefits(altered,expected,proof)).toThrow()
  })
  it('requires matching zero-benefit line prices and refuses unexpected automatic order savings', () => {
    const clean=priced();clean.discountCodes=[];clean.lines.nodes[0].discountAllocations=[]
    expect(() => assertCartBenefits(clean,[],{...proof,payableMerchandiseCents:11800})).not.toThrow()
    const automatic=priced();automatic.lines.nodes[0].discountAllocations[0].__typename='CartAutomaticDiscountAllocation'
    expect(() => assertCartBenefits(automatic,[],{...proof,payableMerchandiseCents:11800})).toThrow()
  })
})
