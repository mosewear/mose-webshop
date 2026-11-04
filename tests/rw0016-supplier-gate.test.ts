// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { authorizeLines } from '@/lib/shopify/policy'

const input = {
  locale: 'nl' as const,
  country: 'NL' as const,
  attemptId: 'c6a7205c-f9aa-4bc4-8e8f-83276c4273be',
  lines: [{ variantId: 'mose-hoodie-coffee-l', quantity: 1 }],
}

const verifiedMapping = {
  mose_variant_id: 'mose-hoodie-coffee-l',
  shopify_variant_id: 'gid://shopify/ProductVariant/123456',
  fulfillment_owner: 'tapstitch' as const,
  supplier_model: 'RW0016-C001-V3',
  supplier_link_verified: true,
  sample_verified: true,
  enabled: true,
  price_eur_cents: 7900,
}

describe('RW0016 hoodie transition: fail closed', () => {
  it('rejects the cropped RW0041 even if its previous supplier mapping is otherwise verified', () => {
    expect(() => authorizeLines(input, [{
      ...verifiedMapping,
      supplier_model: 'RW0041-P001-V3',
    }])).toThrow('VARIANT_NOT_RELEASED')
  })

  it('accepts the replacement RW0016 only with a verified supplier link and sample', () => {
    const result = authorizeLines(input, [verifiedMapping])
    expect(result).toEqual([{
      localVariantId: input.lines[0].variantId,
      merchandiseId: verifiedMapping.shopify_variant_id,
      quantity: 1,
      expectedPriceCents: 7900,
    }])
    expect(() => authorizeLines(input, [{
      ...verifiedMapping,
      supplier_link_verified: false,
    }])).toThrow('VARIANT_NOT_RELEASED')
  })

  it('does not release a replacement merely because the model name changed', () => {
    expect(() => authorizeLines(input, [{
      ...verifiedMapping,
      sample_verified: false,
    }])).toThrow('VARIANT_NOT_RELEASED')
    expect(() => authorizeLines(input, [{
      ...verifiedMapping,
      enabled: false,
    }])).toThrow('VARIANT_NOT_RELEASED')
  })

  it('does not mistake a USD or unverified checkout for an authorized NL sale', () => {
    // Current checkoutInput intentionally accepts only NL. US requires
    // separate currency, pricing, shipping and tax verification before opening.
    expect(() => authorizeLines(input, [{
      ...verifiedMapping,
      supplier_model: 'RW0041-P001-V2',
    }])).toThrow('VARIANT_NOT_RELEASED')
  })
})
