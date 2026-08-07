import { describe, expect, it } from 'vitest'
import {
  catalogContentId,
  parseCatalogContentId,
  slugifyCatalogColor,
} from '@/lib/catalog-ids'

describe('catalogContentId', () => {
  const productId = '3692f227-52fc-41d5-911c-5c539448070b'

  it('returns bare product UUID when color is missing', () => {
    expect(catalogContentId(productId)).toBe(productId)
    expect(catalogContentId(productId, null)).toBe(productId)
    expect(catalogContentId(productId, '   ')).toBe(productId)
  })

  it('appends a slugified color for multi-color feed / pixel match', () => {
    expect(catalogContentId(productId, 'Zwart')).toBe(`${productId}:zwart`)
    expect(catalogContentId(productId, 'Off White')).toBe(`${productId}:off-white`)
    expect(catalogContentId(productId, 'Bruin')).toBe(`${productId}:bruin`)
  })

  it('keeps Google Merchant id length under 50 chars for current colors', () => {
    const id = catalogContentId(productId, 'Off White')
    expect(id.length).toBeLessThanOrEqual(50)
  })
})

describe('slugifyCatalogColor', () => {
  it('normalizes accents and spaces', () => {
    expect(slugifyCatalogColor('  Off White ')).toBe('off-white')
    expect(slugifyCatalogColor('Zilver')).toBe('zilver')
  })
})

describe('parseCatalogContentId', () => {
  const productId = '3692f227-52fc-41d5-911c-5c539448070b'

  it('round-trips catalogContentId', () => {
    expect(parseCatalogContentId(catalogContentId(productId, 'Off White'))).toEqual({
      productId,
      colorSlug: 'off-white',
    })
  })
})
