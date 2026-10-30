import type {
  ProductDisplayRow,
  ProductDisplayVariant,
} from './product-display'
export type CatalogVariant = ProductDisplayVariant & {
  id?: string
  size?: string | null
}
export interface CatalogProduct extends ProductDisplayRow {
  name: string
  name_en?: string | null
  base_price: number
  sale_price: number | null
  category_id: string | null
  display_order: number
  created_at: string
  category?: { name: string; name_en?: string | null; slug: string } | null
  variants?: CatalogVariant[]
  is_gift_card?: boolean
}
export interface CatalogCategory {
  id: string
  name: string
  name_en?: string | null
  slug: string
}
export type CatalogSort =
  | 'featured'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'name'
export type CatalogFilters = {
  category: string
  q: string
  min: number | null
  max: number | null
  sizes: string[]
  colors: string[]
  stock: boolean
  sort: CatalogSort
}
export const emptyCatalogFilters: CatalogFilters = {
  category: 'all',
  q: '',
  min: null,
  max: null,
  sizes: [],
  colors: [],
  stock: false,
  sort: 'featured',
}
const sorts = new Set(['featured', 'newest', 'price-asc', 'price-desc', 'name'])
export function colorKey(value: string) {
  const key = value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
  return (
    (
      {
        zwart: 'black',
        wit: 'white',
        bruin: 'brown',
        groen: 'green',
        blauw: 'blue',
        grijs: 'gray',
        grey: 'gray',
        zilver: 'silver',
        beige: 'beige',
      } as Record<string, string>
    )[key] ?? key
  )
}
export function sizeKey(value: string) {
  const s = value.trim().toUpperCase()
  return /^(ONE\s*SIZE|OS|ONESIZE)$/.test(s)
    ? 'ONE SIZE'
    : s === 'XXL'
      ? '2XL'
      : s === 'XXXL'
        ? '3XL'
        : s
}
const unique = (values: string[]) => [...new Set(values)].slice(0, 20)
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  const amount = (key: string) => {
    const raw = params.get(key)
    if (raw === null || raw.trim() === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 && n <= 100000
      ? Math.round(n * 100) / 100
      : null
  }
  let min = amount('min'),
    max = amount('max')
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  const category = params.get('category')?.trim() || 'all'
  return {
    category: /^[a-z0-9-]{1,80}$/.test(category) ? category : 'all',
    q: (params.get('q') ?? '').trim().slice(0, 100),
    min,
    max,
    sizes: unique(
      params
        .getAll('size')
        .map(sizeKey)
        .filter((s) => s.length > 0 && s.length <= 30),
    ),
    colors: unique(
      params
        .getAll('color')
        .map(colorKey)
        .filter((s) => s.length > 0 && s.length <= 60),
    ),
    stock: params.get('stock') === '1',
    sort: sorts.has(params.get('sort') ?? '')
      ? (params.get('sort') as CatalogSort)
      : 'featured',
  }
}
export function catalogFilterParams(
  filters: CatalogFilters,
  existing = new URLSearchParams(),
) {
  const p = new URLSearchParams(existing)
  for (const key of [
    'category',
    'q',
    'min',
    'max',
    'size',
    'color',
    'stock',
    'sort',
  ])
    p.delete(key)
  if (filters.category !== 'all') p.set('category', filters.category)
  if (filters.q.trim()) p.set('q', filters.q.trim())
  if (filters.min !== null) p.set('min', String(filters.min))
  if (filters.max !== null) p.set('max', String(filters.max))
  for (const size of unique(filters.sizes)) p.append('size', size)
  for (const color of unique(filters.colors)) p.append('color', color)
  if (filters.stock) p.set('stock', '1')
  if (filters.sort !== 'featured') p.set('sort', filters.sort)
  return p
}
export const productPrice = (p: CatalogProduct) => p.sale_price ?? p.base_price
const searchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
export function availableVariant(v: CatalogVariant) {
  return (
    v.is_available === true &&
    ((v.stock_quantity ?? 0) > 0 ||
      (v.presale_enabled === true && (v.presale_stock_quantity ?? 0) > 0))
  )
}
export function matchesCatalogVariant(
  v: CatalogVariant,
  f: CatalogFilters,
  tileColor?: string | null,
) {
  return (
    (!tileColor || colorKey(v.color ?? '') === colorKey(tileColor)) &&
    (!f.sizes.length || f.sizes.includes(sizeKey(v.size ?? ''))) &&
    (!f.colors.length || f.colors.includes(colorKey(v.color ?? ''))) &&
    (!f.stock || availableVariant(v))
  )
}
export function matchesCatalogProduct(
  p: CatalogProduct,
  f: CatalogFilters,
  tileColor?: string | null,
) {
  const price = productPrice(p),
    terms = searchText(f.q).trim().split(/\s+/).filter(Boolean)
  if (f.category !== 'all' && p.category?.slug !== f.category) return false
  const searchable = searchText(
    `${p.name} ${p.name_en ?? ''} ${p.category?.name ?? ''} ${p.category?.name_en ?? ''} ${(p.variants ?? []).map((v) => v.color ?? '').join(' ')}`,
  )
  if (terms.some((term) => !searchable.includes(term))) return false
  if ((f.min !== null && price < f.min) || (f.max !== null && price > f.max))
    return false
  if (!f.sizes.length && !f.colors.length && !f.stock) return true
  if (p.is_gift_card) return !f.sizes.length && !f.colors.length
  return (p.variants ?? []).some((v) => matchesCatalogVariant(v, f, tileColor))
}
export function filterCatalog(
  products: CatalogProduct[],
  f: CatalogFilters,
  locale: string,
) {
  const collator = new Intl.Collator(locale === 'en' ? 'en-GB' : 'nl-NL', {
    numeric: true,
    sensitivity: 'base',
  })
  return products
    .filter((p) => matchesCatalogProduct(p, f))
    .sort((a, b) => {
      let diff = 0
      if (f.sort === 'price-asc') diff = productPrice(a) - productPrice(b)
      else if (f.sort === 'price-desc') diff = productPrice(b) - productPrice(a)
      else if (f.sort === 'name')
        diff = collator.compare(
          locale === 'en' ? a.name_en || a.name : a.name,
          locale === 'en' ? b.name_en || b.name : b.name,
        )
      else if (f.sort === 'newest')
        diff = Date.parse(b.created_at) - Date.parse(a.created_at)
      else
        diff =
          (a.display_order ?? 999) - (b.display_order ?? 999) ||
          Date.parse(b.created_at) - Date.parse(a.created_at)
      return (Number.isFinite(diff) ? diff : 0) || a.id.localeCompare(b.id)
    })
}
export function catalogDimensions(products: CatalogProduct[]) {
  const sizes = new Set<string>(),
    colors = new Map<string, string>()
  for (const p of products)
    for (const v of p.variants ?? []) {
      if (v.size?.trim()) sizes.add(sizeKey(v.size))
      if (v.color?.trim() && !colors.has(colorKey(v.color)))
        colors.set(colorKey(v.color), v.color)
    }
  const order = [
    'XXS',
    'XS',
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    'ONE SIZE',
  ]
  return {
    sizes: [...sizes].sort((a, b) => {
      const ai = order.indexOf(a),
        bi = order.indexOf(b)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b)
    }),
    colors: [...colors].map(([key, label]) => ({ key, label })),
  }
}
