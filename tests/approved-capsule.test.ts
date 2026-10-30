import { describe, expect, it } from 'vitest'
import capsule from '../docs/shopify/approved-capsule-2026-10-30.json'
import { TAPSTITCH_PRODUCT_SOURCES, isTapstitchProduct } from '@/lib/tapstitch-products'
import { authorizeLines } from '@/lib/shopify/policy'
import { vertaalKleur } from '@/lib/kleurnaam'

describe('owner-approved six-model capsule', () => {
  it('retains the approved model identities, complete size ranges and retail prices', () => {
    expect(capsule.map(p => p.sku)).toEqual(['R00099', 'UT0276', 'RT0086', 'UT0289', 'UB0051', 'UT0320'])
    expect(capsule.map(p => p.priceEur)).toEqual([59, 59, 49, 79, 69, 49])
    expect(capsule.reduce((n, p) => n + p.colors.length * p.sizes.length, 0)).toBe(62)
    for (const product of capsule) {
      expect(isTapstitchProduct({ id: product.productId })).toBe(true)
      expect(TAPSTITCH_PRODUCT_SOURCES[product.productId]).toEqual({ sourceProductId: product.sourceProductId, sourceCode: product.sourceCode, sourcePage: product.sourcePage })
    }
  })

  it('requires a verified supplier link and owner release for every new model', () => {
    for (const product of capsule) {
      const input = { locale: 'nl' as const, country: 'NL' as const, attemptId: 'test', lines: [{ variantId: 'local', quantity: 1 }] }
      const mapping = { mose_variant_id: 'local', shopify_variant_id: 'gid://shopify/ProductVariant/123', fulfillment_owner: 'tapstitch' as const,
        supplier_model: product.sourceCode, supplier_link_verified: true, sample_verified: false, enabled: true,
        price_eur_cents: product.priceEur * 100, owner_release_authorized_at: '2026-10-30T16:05:16.769Z', owner_release_reference: 'Explicit owner approval of capsule, 2026-10-30' }
      expect(authorizeLines(input, [mapping])[0].expectedPriceCents).toBe(product.priceEur * 100)
      expect(() => authorizeLines(input, [{ ...mapping, supplier_link_verified: false }])).toThrow('VARIANT_NOT_RELEASED')
      expect(() => authorizeLines(input, [{ ...mapping, owner_release_authorized_at: null }])).toThrow('VARIANT_NOT_RELEASED')
    }
  })

  it('shows supplier colour names naturally in Dutch and English', () => {
    expect(vertaalKleur('Flower Gray', 'nl')).toBe('Grijs gemêleerd')
    expect(vertaalKleur('Pirate Gray', 'en')).toBe('Washed charcoal')
    expect(vertaalKleur('Black Beauty', 'nl')).toBe('Gewassen zwart')
  })
})
