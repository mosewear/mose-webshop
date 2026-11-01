// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import { authorizeLines, assertCheckoutUrl, checkoutInput, moneyToCents, type MappedVariant } from '@/lib/shopify/policy'
import { verifyWebhook, webhookEnvelope } from '@/lib/shopify/webhook'
import { contribution } from '@/lib/shopify/pricing'

const id = 'local-variant-123'
const shopifyId = 'gid://shopify/ProductVariant/123'
const mapped: MappedVariant = { mose_variant_id: id, shopify_variant_id: shopifyId, fulfillment_owner: 'tapstitch', supplier_model: 'RW0041-P001-V3', supplier_link_verified: true, sample_verified: true, enabled: true, price_eur_cents: 6995 }
const input = { attemptId: '12345678-1234-4123-8123-123456789abc', locale: 'nl' as const, country: 'NL' as const, lines: [{ variantId: id, quantity: 1 }] }

describe('pilot purchase boundary', () => {
  it('rejects client prices, foreign markets and invalid quantities', () => {
    expect(checkoutInput.safeParse({ ...input, price: 0.01 }).success).toBe(false)
    expect(checkoutInput.safeParse({ ...input, country: 'DE' }).success).toBe(false)
    for (const quantity of [-1, 0, 1.1, 11]) expect(checkoutInput.safeParse({ ...input, lines: [{ variantId: id, quantity }] }).success).toBe(false)
  })
  it('requires a real released supplier link and sample verification', () => {
    expect(() => authorizeLines(input, [])).toThrow()
    for (const field of ['enabled', 'supplier_link_verified', 'sample_verified']) expect(() => authorizeLines(input, [{ ...mapped, [field]: false }])).toThrow()
    expect(() => authorizeLines(input, [{ ...mapped, supplier_model: 'UNAPPROVED' }])).toThrow()
  })
  it('aggregates duplicate lines so quantity limits cannot be bypassed', () => {
    expect(authorizeLines({ ...input, lines: [...input.lines, ...input.lines] }, [mapped])[0].quantity).toBe(2)
    expect(() => authorizeLines({ ...input, lines: [{ variantId: id, quantity: 6 }, { variantId: id, quantity: 6 }] }, [mapped])).toThrow()
  })
  it('releases only the approved sports and denim models with verified supplier routes', () => {
    const approval = { ...mapped, sample_verified: false, owner_release_authorized_at: '2026-01-01T00:00:00Z', owner_release_reference: 'Owner approved the sports and denim selection; excluded waffle polo' }
    for (const supplier_model of ['MT0067-P001-V2', 'MB0035-P001-V2', 'UB0026-O001-V2', 'UT0101-C001-V2', 'MT0063-P001-V2']) {
      expect(authorizeLines(input, [{ ...approval, supplier_model }])).toHaveLength(1)
      expect(() => authorizeLines(input, [{ ...approval, supplier_model, supplier_link_verified: false }])).toThrow('VARIANT_NOT_RELEASED')
    }
    expect(() => authorizeLines(input, [{ ...approval, supplier_model: 'UT0111-C001-V2' }])).toThrow('VARIANT_NOT_RELEASED')
  })
  it('rejects lookalike checkout domains and embedded credentials', () => {
    expect(assertCheckoutUrl('https://mosewear.myshopify.com/cart/c/abc')).toContain('/cart/c/abc')
    expect(assertCheckoutUrl('https://checkout.mosewear.com/checkouts/abc')).toBe('https://checkout.mosewear.com/checkouts/abc')
    for (const url of ['https://mosewear.myshopify.com.evil.test/cart', 'http://mosewear.myshopify.com/cart', 'https://u:p@mosewear.myshopify.com/cart', 'https://mosewear.myshopify.com:444/cart']) expect(() => assertCheckoutUrl(url)).toThrow()
  })
  it('parses money without binary floating point price comparisons', () => {
    expect(moneyToCents('69.95')).toBe(6995)
    expect(moneyToCents('1.1')).toBe(110)
    for (const amount of ['-1', 'NaN', '1.001', '1e3', '']) expect(() => moneyToCents(amount)).toThrow()
  })
})

describe('webhook authenticity', () => {
  const raw = Buffer.from('{"id":123}')
  const signature = createHmac('sha256', 'test-secret').update(raw).digest('base64')
  it('accepts only the original raw bytes and correct secret', () => {
    expect(verifyWebhook(raw, signature, 'test-secret')).toBe(true)
    expect(verifyWebhook(Buffer.from('{ "id":123}'), signature, 'test-secret')).toBe(false)
    expect(verifyWebhook(raw, signature, 'different')).toBe(false)
    for (const invalid of [null, '', 'a', signature + '!', signature.slice(1)]) expect(verifyWebhook(raw, invalid, 'test-secret')).toBe(false)
  })
  it('rejects events from other shops and missing delivery identities', () => {
    const h = new Headers({ 'x-shopify-shop-domain': 'hp5szr-te.myshopify.com', 'x-shopify-topic': 'orders/paid', 'x-shopify-webhook-id': 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
    expect(webhookEnvelope(h)?.topic).toBe('orders/paid')
    h.set('x-shopify-shop-domain', 'other.myshopify.com')
    expect(webhookEnvelope(h)).toBe(null)
  })
})

describe('commercial scenario', () => {
  it('removes VAT, includes shipping revenue and subtracts variable costs', () => {
    const result = contribution({ retailInclVat: 121, customerShippingInclVat: 0, vatRate: .21, landedProductCost: 30, supplierShippingCost: 10, paymentRate: .02, paymentFixed: .3, returnReserveRate: .1, overheadPerOrder: 2, acquisitionCost: 15, discountRate: 0 })
    expect(result.revenueExVat).toBe(100)
    expect(result.afterAds).toBeCloseTo(30.28)
    expect(result.breakEvenAcquisitionCost).toBeCloseTo(45.28)
  })
  it('shows losses rather than clamping them to zero', () => {
    expect(contribution({ retailInclVat: 20, customerShippingInclVat: 0, vatRate: .21, landedProductCost: 30, supplierShippingCost: 10, paymentRate: .02, paymentFixed: .3, returnReserveRate: .1, overheadPerOrder: 2, acquisitionCost: 15, discountRate: 0 }).afterAds).toBeLessThan(0)
  })
})

it('separates explicit owner release from sample approval without accepting missing or future evidence', () => {
  const released = { ...mapped, sample_verified: false, owner_release_authorized_at: '2026-01-01T00:00:00Z', owner_release_reference: 'Owner expressly authorizes public sales before physical sample delivery' }
  expect(authorizeLines(input, [released])).toHaveLength(1)
  expect(released.sample_verified).toBe(false)
  expect(() => authorizeLines(input, [{ ...released, owner_release_reference: null }])).toThrow('VARIANT_NOT_RELEASED')
  expect(() => authorizeLines(input, [{ ...released, owner_release_authorized_at: '2999-01-01T00:00:00Z' }])).toThrow('VARIANT_NOT_RELEASED')
})
