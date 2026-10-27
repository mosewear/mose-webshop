// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assertCurrentLocalCatalog, localVariantPriceCents } from '@/lib/shopify/local-checkout'
const variant = { id: 'v1', product_id: 'p1', is_available: true, price_adjustment: 0, presale_enabled: false, presale_stock_quantity: 0 }
const product = { id: 'p1', status: 'active', is_active: true, is_gift_card: false, base_price: 69.95, sale_price: null }
const lines = [{ localVariantId: 'v1', expectedPriceCents: 6995 }]
describe('current local publication gate', () => {
  it('requires the actual database parent to be published and the variant available', () => {
    expect(() => assertCurrentLocalCatalog(lines, [variant], [product])).not.toThrow()
    for (const changed of [{ ...product, status: 'draft' }, { ...product, is_active: false }, { ...product, is_gift_card: true }]) {
      expect(() => assertCurrentLocalCatalog(lines, [variant], [changed])).toThrow('LOCAL_PRODUCT_UNAVAILABLE')
    }
    expect(() => assertCurrentLocalCatalog(lines, [{ ...variant, product_id: 'p2' }], [product])).toThrow()
    expect(() => assertCurrentLocalCatalog(lines, [{ ...variant, is_available: false }], [product])).toThrow()
  })
  it('rejects absent, malformed and ambiguous metadata', () => {
    for (const records of [[], [{}], [variant, variant], [{ ...variant, is_available: 'true' }]]) {
      expect(() => assertCurrentLocalCatalog(lines, records, [product])).toThrow()
    }
    expect(() => assertCurrentLocalCatalog(lines, [variant], [product, product])).toThrow('LOCAL_CATALOG_AMBIGUOUS')
    expect(() => assertCurrentLocalCatalog(lines, [variant], [{ ...product, base_price: null }])).toThrow('LOCAL_PRICE_CHANGED')
  })
  it('uses Shopify inventory authority but rejects unverified presale promises', () => {
    expect(() => assertCurrentLocalCatalog(lines, [{ ...variant, stock_quantity: 0 }], [product])).not.toThrow()
    expect(() => assertCurrentLocalCatalog(lines, [{ ...variant, presale_enabled: true, presale_stock_quantity: 2 }], [product])).toThrow('PRESALE_NOT_RELEASED')
  })
})
describe('local decimal prices', () => {
  it('adds decimal amounts exactly, including negative adjustments and sale pricing', () => {
    expect(localVariantPriceCents({ base_price: '89.95', sale_price: '64.95' }, { price_adjustment: '5.00' })).toBe(6995)
    expect(localVariantPriceCents({ base_price: '1.10' }, { price_adjustment: '-0.20' })).toBe(90)
    expect(localVariantPriceCents({ base_price: 0.29 }, { price_adjustment: 0.01 })).toBe(30)
    expect(localVariantPriceCents({ base_price: 69.95, sale_price: 79.95 }, {})).toBe(6995)
  })
  it('does not turn invalid prices into free or underpriced items', () => {
    for (const value of [NaN, Infinity, '', 'abc', 1.005, 0, -1, {}, '9007199254740991']) {
      expect(localVariantPriceCents({ base_price: value }, {})).toBe(null)
    }
    expect(localVariantPriceCents({ base_price: 69.95, sale_price: 'invalid' }, {})).toBe(null)
    expect(localVariantPriceCents({ base_price: 69.95 }, { price_adjustment: -70 })).toBe(null)
  })
})
