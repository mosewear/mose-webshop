import { describe, expect, it } from 'vitest'
import {
  canRotateCheckoutAttempt, checkoutRedirectUrl, createShopifyCartSnapshot, getCheckoutAttempt, shouldUseLegacyRecovery,
} from '@/lib/shopify-cart'
import type { CartItem } from '@/store/cart'

const item = (variantId: string, quantity = 1): CartItem => ({
  productId: 'product', variantId, quantity, slug: 'hoodie', name: 'Hoodie',
  size: 'M', color: 'Black', colorHex: '#000', price: 75, image: '', stock: 10, sku: 'hoodie-m',
})
const id1 = 'c6a7205c-f9aa-4bc4-8e8f-83276c4273be'
const id2 = '34fa1f30-2326-4111-84f8-1d321f0a7b84'

describe('one Shopify cart for the whole MOSE collection', () => {
  it('keeps every local variant and quantity but never sends client prices or supplier data', () => {
    const result = createShopifyCartSnapshot([item('existing-mose'), item('new-tapstitch', 2)], 'nl')
    expect(result).toEqual({ locale: 'nl', country: 'NL', lines: [
      { variantId: 'existing-mose', quantity: 1 }, { variantId: 'new-tapstitch', quantity: 2 },
    ] })
  })
  it('uses one stable attempt for reordered/merged lines, and rotates it when quantities change', () => {
    const initial = createShopifyCartSnapshot([item('b'), item('a'), item('a')], 'nl')
    const attempt = getCheckoutAttempt(initial, null, () => id1)
    expect(getCheckoutAttempt(createShopifyCartSnapshot([item('a', 2), item('b')], 'nl'), attempt, () => id2).attemptId).toBe(id1)
    expect(getCheckoutAttempt(createShopifyCartSnapshot([item('a', 3), item('b')], 'nl'), attempt, () => id2).attemptId).toBe(id2)
  })
  it('does not silently omit unsupported gift-card recipient data or accept impossible quantities', () => {
    expect(() => createShopifyCartSnapshot([item('regular'), { ...item('gift'), isGiftCard: true, giftCardRecipient: { recipientEmail: 'gift@example.test' } }], 'nl')).toThrow('UNSUPPORTED_CART')
    expect(() => createShopifyCartSnapshot([item('a', 6), item('a', 6)], 'nl')).toThrow('INVALID_CART')
    expect(() => createShopifyCartSnapshot([item('a', NaN)], 'nl')).toThrow('INVALID_CART')
  })
  it('rejects malicious or malformed redirects, allowing only verified Shopify hosts', () => {
    expect(checkoutRedirectUrl('https://mosewear.myshopify.com/checkouts/cart')).toContain('mosewear.myshopify.com')
    for (const value of ['javascript:alert(1)', 'https://mosewear.myshopify.com.evil.test/cart', 'https://evil.test/cart', 'https://user@mosewear.myshopify.com/cart']) {
      expect(() => checkoutRedirectUrl(value)).toThrow()
    }
    expect(checkoutRedirectUrl('https://checkout.mosewear.com/checkouts/a', 'checkout.mosewear.com')).toContain('checkout.mosewear.com')
  })
  it('keeps historical payment recovery on the old screen without letting a stale order ID select it', () => {
    expect(shouldUseLegacyRecovery('order', null, null)).toBe(true)
    expect(shouldUseLegacyRecovery(null, 'true', 'order')).toBe(true)
    expect(shouldUseLegacyRecovery(null, null, 'old-order')).toBe(false)
    expect(shouldUseLegacyRecovery(null, 'false', 'old-order')).toBe(false)
  })
  it('rotates expired attempts only when the server explicitly proves no checkout was issued', () => {
    expect(canRotateCheckoutAttempt({ code: 'ATTEMPT_EXPIRED', retrySafe: true })).toBe(true)
    expect(canRotateCheckoutAttempt({ code: 'ATTEMPT_FAILED', retrySafe: true })).toBe(true)
    expect(canRotateCheckoutAttempt({ code: 'BENEFIT_UNAVAILABLE', retrySafe: true })).toBe(true)
    expect(canRotateCheckoutAttempt({ code: 'BENEFIT_UNAVAILABLE', retrySafe: false })).toBe(false)
    for (const result of [{ code: 'ATTEMPT_EXPIRED' }, { code: 'ATTEMPT_EXPIRED', retrySafe: false }, { code: 'ATTEMPT_PENDING', retrySafe: true }, { code: 'INPUT_CHANGED', retrySafe: 'true' }]) {
      expect(canRotateCheckoutAttempt(result)).toBe(false)
    }
  })
  it('includes normalized optional benefits in idempotency without client discount authority', () => {
    const snapshot = createShopifyCartSnapshot([item('a')], 'nl', { promoCode: ' welcome_10 ', loyaltyPoints: 200 })
    expect(snapshot).toEqual({ locale: 'nl', country: 'NL', promoCode: 'WELCOME_10', loyaltyPoints: 200, lines: [{ variantId: 'a', quantity: 1 }] })
    const first = getCheckoutAttempt(snapshot, null, () => id1)
    expect(getCheckoutAttempt(createShopifyCartSnapshot([item('a')], 'nl', { promoCode: 'WELCOME_10', loyaltyPoints: 200 }), first, () => id2).attemptId).toBe(id1)
    expect(() => getCheckoutAttempt(createShopifyCartSnapshot([item('a')], 'nl', { promoCode: 'OTHER', loyaltyPoints: 200 }), { ...first, locked: true }, () => id2)).toThrow('ATTEMPT_REVIEW_REQUIRED')
    expect(() => getCheckoutAttempt(createShopifyCartSnapshot([item('a')], 'nl', { promoCode: 'WELCOME_10', loyaltyPoints: 100 }), { ...first, locked: true }, () => id2)).toThrow('ATTEMPT_REVIEW_REQUIRED')
    expect(snapshot).not.toHaveProperty('discountAmount'); expect(snapshot).not.toHaveProperty('tier')
  })
  it('rejects malformed benefit selections and preserves uncertain changed baskets', () => {
    for (const loyaltyPoints of [NaN, -100, 50, 100.5, 20_000_100]) expect(() => createShopifyCartSnapshot([item('a')], 'nl', { loyaltyPoints })).toThrow('INVALID_LOYALTY')
    expect(() => createShopifyCartSnapshot([item('a')], 'nl', { promoCode: 'BAD CODE' })).toThrow('INVALID_PROMO')
    const locked = { ...getCheckoutAttempt(createShopifyCartSnapshot([item('a')], 'nl'), null, () => id1), locked: true }
    expect(() => getCheckoutAttempt(createShopifyCartSnapshot([item('b')], 'nl'), locked, () => id2)).toThrow('ATTEMPT_REVIEW_REQUIRED')
    expect(getCheckoutAttempt(createShopifyCartSnapshot([item('a')], 'nl'), locked, () => id2).attemptId).toBe(id1)
  })

})
