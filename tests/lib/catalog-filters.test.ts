import { describe, it, expect } from 'vitest'
import {
  catalogFilterParams,
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
