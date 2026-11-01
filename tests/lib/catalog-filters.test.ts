import { describe, it, expect } from 'vitest'
import {
  catalogFilterParams,
  catalogTiles,
  productPriceRange,
  colorKey,
  emptyCatalogFilters,
  filterCatalog,
  matchesCatalogProduct,
  parseCatalogFilters,
  sizeKey,
  type CatalogProduct,
} from '@/lib/catalog-filters'
const base: CatalogProduct = {
  id: 'p1',
  name: 'MOSE Boxy Hoodie',
  name_en: 'MOSE Boxy Hoodie',
  slug: 'hoodie',
  category_id: 'c1',
  category: { name: 'Hoodies', slug: 'hoodies' },
  base_price: 79,
  sale_price: null,
  created_at: '2026-10-30',
  display_order: 1,
  variants: [
    { size: 'L', color: 'Zwart', stock_quantity: 0, is_available: true },
    { size: 'M', color: 'Wit', stock_quantity: 5, is_available: true },
  ],
}
const f = { ...emptyCatalogFilters }
describe('retail facets use one actual size-colour variation', () => {
  it('does not fabricate a white L by combining a black L and a white M', () => {
    expect(
      matchesCatalogProduct(base, { ...f, sizes: ['L'], colors: ['white'] }),
    ).toBe(false)
    expect(
      matchesCatalogProduct(base, { ...f, sizes: ['M'], colors: ['white'] }),
    ).toBe(true)
  })
  it('requires available stock on the selected variation rather than another size', () => {
    expect(
      matchesCatalogProduct(base, {
        ...f,
        sizes: ['L'],
        colors: ['black'],
        stock: true,
      }),
    ).toBe(false)
    expect(
      matchesCatalogProduct(base, { ...f, sizes: ['M'], stock: true }),
    ).toBe(true)
    expect(
      matchesCatalogProduct(
        {
          ...base,
          variants: [
            { size: 'M', color: 'Wit', stock_quantity: 5, is_available: false },
          ],
        },
        { ...f, stock: true },
      ),
    ).toBe(false)
  })
  it('keeps unavailable styles discoverable until the shopper explicitly requests orderable items', () => {
    expect(matchesCatalogProduct(base, { ...f, sizes: ['L'] })).toBe(true)
  })
  it('filters split colour tiles individually', () => {
    expect(
      matchesCatalogProduct(base, { ...f, colors: ['white'] }, 'Zwart'),
    ).toBe(false)
    expect(
      matchesCatalogProduct(base, { ...f, colors: ['white'] }, 'Wit'),
    ).toBe(true)
  })
  it('uses OR within sizes and AND across colour and size', () => {
    expect(
      matchesCatalogProduct(base, {
        ...f,
        sizes: ['S', 'M'],
        colors: ['white'],
      }),
    ).toBe(true)
    expect(
      matchesCatalogProduct(base, {
        ...f,
        sizes: ['S', 'XL'],
        colors: ['white'],
      }),
    ).toBe(false)
  })
  it('supports true active presale and digital gift cards without inventing physical stock', () => {
    expect(
      matchesCatalogProduct(
        {
          ...base,
          variants: [
            {
              size: 'L',
              presale_enabled: true,
              presale_stock_quantity: 2,
              stock_quantity: 0,
              is_available: true,
            },
          ],
        },
        { ...f, sizes: ['L'], stock: true },
      ),
    ).toBe(true)
    const gift = { ...base, is_gift_card: true, variants: [] }
    expect(matchesCatalogProduct(gift, { ...f, stock: true })).toBe(true)
    expect(matchesCatalogProduct(gift, { ...f, sizes: ['L'] })).toBe(false)
  })
})
describe('complete shareable filters', () => {
  it('round-trips every filter and retains unrelated campaign parameters', () => {
    const filters = {
      ...f,
      category: 'broeken',
      q: 'Denim jeans',
      min: 50,
      max: 90,
      sizes: ['L', 'M'],
      colors: ['black', 'white'],
      stock: true,
      sort: 'price-asc' as const,
    }
    const params = catalogFilterParams(
      filters,
      new URLSearchParams('utm_source=email&category=old&color=old'),
    )
    expect(parseCatalogFilters(params)).toEqual(filters)
    expect(params.get('utm_source')).toBe('email')
    expect(params.getAll('color')).toEqual(['black', 'white'])
  })
  it('clears filter parameters without deleting attribution or retaining old facets', () => {
    const params = catalogFilterParams(
      f,
      new URLSearchParams(
        'utm_source=email&category=old&q=old&size=M&stock=1&min=4&max=90&sort=name',
      ),
    )
    expect(params.toString()).toBe('utm_source=email')
  })
  it('normalizes malformed URLs, duplicated values and inverted price bounds', () => {
    expect(
      parseCatalogFilters(
        new URLSearchParams(
          'min=90&max=50&size=XXL&size=2XL&color=Zwart&color=black&sort=wrong',
        ),
      ),
    ).toMatchObject({
      min: 50,
      max: 90,
      sizes: ['2XL'],
      colors: ['black'],
      sort: 'featured',
    })
    expect(
      parseCatalogFilters(
        new URLSearchParams('min=NaN&max=Infinity&category=<script>'),
      ),
    ).toMatchObject({ min: null, max: null, category: 'all' })
    expect(sizeKey('One Size')).toBe('ONE SIZE')
    expect(colorKey('Grijs')).toBe('gray')
  })
})
describe('search and price ordering', () => {
  it('finds words in any order, normalizes accents and includes category and colour names', () => {
    expect(matchesCatalogProduct(base, { ...f, q: 'hoodie boxy zwart' })).toBe(
      true,
    )
    expect(
      matchesCatalogProduct({ ...base, name: 'MOSE Tée' }, { ...f, q: 'tee' }),
    ).toBe(true)
  })
  it('uses the actual sale price including zero and keeps ties deterministic', () => {
    const free = { ...base, id: 'free', sale_price: 0 },
      other = { ...base, id: 'p2', base_price: 59 }
    expect(
      filterCatalog([base, free, other], { ...f, sort: 'price-asc' }, 'nl').map(
        (p) => p.id,
      ),
    ).toEqual(['free', 'p2', 'p1'])
    expect(matchesCatalogProduct(free, { ...f, min: 0, max: 0 })).toBe(true)
    expect(filterCatalog([other, base], f, 'nl').map((p) => p.id)).toEqual([
      'p1',
      'p2',
    ])
  })
})


describe('one truthful card per model', () => {
  it('prioritizes and selects the freshly verified supplier colour at zero physical stock', () => {
    const unavailable = { ...base, id: 'unavailable', display_order: 0, variants: [base.variants![0]] }
    const supplier: CatalogProduct = { ...base, id: 'supplier', display_order: 9, variants: [
      base.variants![0],
      { size: 'L', color: 'Wit', stock_quantity: 0, is_available: true, fulfillment_mode: 'made_to_order', supplier_orderable: true, supplier_checked_at: new Date().toISOString() },
    ] }
    expect(filterCatalog([unavailable, supplier], f, 'nl').map(p => p.id)).toEqual(['supplier', 'unavailable'])
    expect(catalogTiles([supplier], f)[0].color).toBe('Wit')
    expect(matchesCatalogProduct(supplier, {...f, sizes: ['L'], colors: ['white'], stock: true})).toBe(true)
  })
  it('prioritizes buyable clothing only for the featured sort and keeps gift cards last', () => {
    const unavailable = { ...base, id: 'unavailable', display_order: 0, variants: [{ size: 'L', color: 'Zwart', stock_quantity: 0, is_available: true }] }
    const gift = { ...base, id: 'gift', display_order: -1, is_gift_card: true, variants: [] }
    expect(filterCatalog([gift, unavailable, base], f, 'nl').map((p) => p.id)).toEqual(['p1', 'unavailable', 'gift'])
    expect(filterCatalog([base, { ...unavailable, base_price: 25 }], { ...f, sort: 'price-asc' }, 'nl').map((p) => p.id)).toEqual(['unavailable', 'p1'])
  })
  it('selects an actual matching available colour without splitting a model', () => {
    const split = { ...base, show_color_variants_on_shop: true }
    expect(catalogTiles([split], f)).toMatchObject([{ tileKey: 'p1', color: 'Wit' }])
    expect(catalogTiles([split], { ...f, sizes: ['L'], colors: ['black'] })).toMatchObject([{ tileKey: 'p1', color: 'Zwart' }])
  })
  it('uses actual variant prices in the same size-colour-price filter and card range', () => {
    const adjusted = { ...base, variants: [
      { size: 'L', color: 'Zwart', price_adjustment: 10, stock_quantity: 2, is_available: true },
      { size: 'M', color: 'Wit', price_adjustment: 0, stock_quantity: 2, is_available: true },
    ] }
    expect(productPriceRange(adjusted)).toEqual({ min: 79, max: 89 })
    expect(productPriceRange(adjusted, 'Zwart')).toEqual({ min: 89, max: 89 })
    expect(matchesCatalogProduct(adjusted, { ...f, sizes: ['L'], max: 80 })).toBe(false)
    expect(catalogTiles([adjusted], { ...f, min: 85 })[0].color).toBe('Zwart')
  })
  it('does not treat disabled presale units as available', () => {
    expect(matchesCatalogProduct({ ...base, variants: [{ is_available: true, stock_quantity: 0, presale_stock_quantity: 5, presale_enabled: false }] }, { ...f, stock: true })).toBe(false)
  })
})
it('uses the same filtered variation price for the range and explicit price ordering', () => {
  const adjusted = { ...base, id: 'adjusted', base_price: 20, variants: [
    { color: 'Zwart', size: 'M', price_adjustment: 0, stock_quantity: 5, is_available: true },
    { color: 'Zwart', size: 'XL', price_adjustment: 30, stock_quantity: 1, is_available: true },
  ] }
  const other = { ...base, id: 'other', base_price: 40, variants: [{ color: 'Zwart', size: 'XL', stock_quantity: 1, is_available: true }] }
  const filters = { ...f, sizes: ['XL'], sort: 'price-asc' as const }
  expect(productPriceRange(adjusted, 'Zwart', filters)).toEqual({ min: 50, max: 50 })
  expect(filterCatalog([adjusted, other], filters, 'nl').map(p => p.id)).toEqual(['other','adjusted'])
})

describe('shop merchandising and sport collection', () => {
  const make = (slug: string, order: number, price = 79): CatalogProduct => ({
    ...base, id: slug, slug, display_order: order, base_price: price,
    variants: [{size: 'L', color: 'Black', stock_quantity: 2, is_available: true}],
  })
  it('round-trips the sport collection with facets and preserves unrelated URL parameters', () => {
    const value = {...f, collection: 'sport' as const, sizes: ['L'], stock: true}
    const params = catalogFilterParams(value, new URLSearchParams('utm_source=mail&collection=old'))
    expect(params.get('utm_source')).toBe('mail')
    expect(parseCatalogFilters(params)).toEqual(value)
    expect(catalogFilterParams({...value, collection: undefined}, params).has('collection')).toBe(false)
    expect(parseCatalogFilters(new URLSearchParams('collection=unverified')).collection).toBeUndefined()
    expect(parseCatalogFilters(new URLSearchParams('collection=sport&category=hoodies')).category).toBe('all')
  })
  it('includes only verified sport models, and combines sport with the same real variant facets', () => {
    const tee = {...make('mose-training-tee', 10), variants: [
      {size:'L', color:'Black', stock_quantity:2, is_available:true},
      {size:'M', color:'White', stock_quantity:2, is_available:true},
    ]}
    const items = [tee, make('mose-training-pants', 11), make('mose-fleece-shorts', 12)]
    expect(filterCatalog(items, {...f, collection:'sport'}, 'nl').map(p => p.slug)).toEqual(['mose-training-tee', 'mose-training-pants'])
    expect(filterCatalog(items, {...f, collection:'sport', sizes:['L'], colors:['white']}, 'nl')).toEqual([])
    expect(filterCatalog(items, {...f, collection:'sport', sizes:['M'], colors:['white']}, 'nl').map(p => p.slug)).toEqual(['mose-training-tee'])
  })
  it('curates only recommended results, keeping availability and unknown admin ordering intact', () => {
    const items = [make('new-unlisted-design', 1, 39), make('mose-denim-zip-jacket', 30, 119), make('boxy-fleece-hoodie', 40, 79), make('future-design', 2, 45)]
    expect(filterCatalog(items, f, 'nl').map(p => p.slug)).toEqual(['boxy-fleece-hoodie','mose-denim-zip-jacket','new-unlisted-design','future-design'])
    expect(filterCatalog(items, {...f, sort:'price-asc'}, 'nl').map(p => p.base_price)).toEqual([39,45,79,119])
    const unavailable = {...items[2], variants: [{size:'L',color:'Black',stock_quantity:0,is_available:true}]}
    expect(filterCatalog([unavailable, items[0]], f, 'nl')[0].slug).toBe('new-unlisted-design')
    const gift = {...make('gift', 0, 20), is_gift_card:true}
    expect(filterCatalog([gift, unavailable, items[0]], f, 'nl').map(p => p.slug)).toEqual(['new-unlisted-design','boxy-fleece-hoodie','gift'])
  })
})
