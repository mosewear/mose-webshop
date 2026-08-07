import { describe, expect, it } from 'vitest'
import { parseCatalogContentId } from '@/lib/catalog-ids'
import { parseMetaProductsParam } from '@/lib/meta-checkout'

describe('parseMetaProductsParam', () => {
  it('parses uuid:colorSlug:quantity (catalog ids contain a colon)', () => {
    const id = '7562c8b3-a7f7-457a-925e-145035b00feb:zwart'
    const parsed = parseMetaProductsParam(`${id}:2`)
    expect(parsed).toEqual([{ contentId: id, quantity: 2 }])
  })

  it('parses multiple products and URL-encoded input', () => {
    const a = '7562c8b3-a7f7-457a-925e-145035b00feb:zwart'
    const b = '3692f227-52fc-41d5-911c-5c539448070b:groen'
    const raw = encodeURIComponent(`${a}:1,${b}:3`)
    expect(parseMetaProductsParam(raw)).toEqual([
      { contentId: a, quantity: 1 },
      { contentId: b, quantity: 3 },
    ])
  })

  it('parses bare UUID content ids', () => {
    const id = '7562c8b3-a7f7-457a-925e-145035b00feb'
    expect(parseMetaProductsParam(`${id}:1`)).toEqual([{ contentId: id, quantity: 1 }])
  })
})

describe('parseCatalogContentId', () => {
  it('splits uuid:colorSlug', () => {
    expect(parseCatalogContentId('7562c8b3-a7f7-457a-925e-145035b00feb:off-white')).toEqual({
      productId: '7562c8b3-a7f7-457a-925e-145035b00feb',
      colorSlug: 'off-white',
    })
  })

  it('returns bare UUID', () => {
    expect(parseCatalogContentId('7562c8b3-a7f7-457a-925e-145035b00feb')).toEqual({
      productId: '7562c8b3-a7f7-457a-925e-145035b00feb',
      colorSlug: null,
    })
  })
})
