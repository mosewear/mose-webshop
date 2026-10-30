import { availableVariant, catalogTiles, emptyCatalogFilters, filterCatalog, type CatalogCategory, type CatalogProduct } from './catalog-filters'
import { getImageForColor } from './product-display'

type PublishedProduct = CatalogProduct & {is_active?: boolean; status?: string | null}
const clothingCategories = new Set(['hoodies', 'sweaters', 't-shirts', 'longsleeves', 'broeken'])
const publishedClothes = (products: PublishedProduct[]) => products.filter(p => !p.is_gift_card && p.is_active !== false && (!p.status || p.status === 'active') && clothingCategories.has(p.category?.slug ?? ''))

/** Curated balance from the live catalogue, never synthetic products or stock. */
export function selectHomepageProducts(products: PublishedProduct[], locale: string, featuredIds: readonly (string | null)[] = []) {
  const clothing = filterCatalog(publishedClothes(products), emptyCatalogFilters, locale)
  const selection: CatalogProduct[] = []
  const add = (product?: CatalogProduct) => {
    if (product && !selection.some(p => p.id === product.id)) selection.push(product)
  }
  const orderable = clothing.filter(p => p.variants?.some(variant => availableVariant(variant)))
  // Retain the merchant's existing three featured models even when newly
  // released POD styles become orderable and move up the default catalogue.
  featuredIds.slice(0,3).forEach(id => add(orderable.find(p => p.id === id)))
  for (const product of orderable) {
    if (selection.length >= 3) break
    add(product)
  }
  const takeCategory = (category: string) => add(clothing.find(p => p.category?.slug === category && !selection.some(selected => selected.id === p.id)))
  takeCategory('hoodies')
  takeCategory('longsleeves')
  // Mix trousers and denim when the live category contains both.
  const pants = clothing.filter(p => p.category?.slug === 'broeken')
  add(pants.find(p => /camo/i.test(`${p.slug} ${p.name}`)))
  add(pants.find(p => /jeans|denim/i.test(`${p.slug} ${p.name}`)))
  takeCategory('broeken')
  for (const product of clothing) {
    if (selection.length >= 8) break
    add(product)
  }
  return selection.slice(0,8)
}

export function homepageCategories(products: PublishedProduct[], categories: CatalogCategory[], locale: string) {
  const clothes = publishedClothes(products)
  return ['hoodies', 'sweaters', 't-shirts', 'broeken'].flatMap(slug => {
    const category = categories.find(c => c.slug === slug)
    const models = clothes.filter(p => p.category?.slug === slug)
    if (!category || !models.length) return []
    // Derive covers from real current product photography, rather than stale
    // independent category assets left over from a previous collection.
    const tiles = catalogTiles(filterCatalog(models, emptyCatalogFilters, locale), emptyCatalogFilters)
    const cover = tiles.find(tile => tile.product.images?.length) ?? tiles[0]
    return [{id: category.id, slug, name: slug === 'broeken' ? (locale === 'en' ? 'Trousers' : 'Broeken') : (locale === 'en' ? category.name_en || category.name : category.name), image_url: getImageForColor(cover.product.images,cover.color)}]
  })
}
