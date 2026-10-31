import { createClient } from '@/lib/supabase/client'
import { buildPdpHref, getImageForColor } from '@/lib/product-display'
import { availableVariant, catalogTiles, colorKey, emptyCatalogFilters, productPriceRange, type CatalogProduct } from '@/lib/catalog-filters'

export interface MenuProduct {
  id: string
  slug: string
  href: string
  kleur: string | null
  naam: string
  prijs: number
  vanafPrijs: number | null
  beeld: string | null
}

export const MAX_MENU_PRODUCTEN = 4
const highlights = [
  { slug: 'boxy-fleece-hoodie', color: 'Coffee' },
  { slug: 'mose-tee', color: 'Beige' },
  { slug: 'raglan-longsleeve', color: 'White with Black' },
  { slug: 'vintage-barrel-jeans', color: 'Jeans Blue' },
]
const clothingCategories = new Set(['hoodies', 't-shirts', 'longsleeves', 'sweaters', 'broeken'])
type MenuCandidate = CatalogProduct & { is_active?: boolean; status?: string | null }

/** Four distinct clothing highlights; never let price sorting promote gift cards. */
export function selectMenuProducts(products: MenuCandidate[], locale: string): MenuProduct[] {
  const orderable = products.filter(p => !p.is_gift_card && p.is_active !== false && (!p.status || p.status === 'active')
    && clothingCategories.has(p.category?.slug ?? '') && p.variants?.some(v => availableVariant(v)))
  const selected: MenuCandidate[] = []
  for (const highlight of highlights) {
    const product = orderable.find(p => p.slug === highlight.slug)
    if (product) selected.push(product)
  }
  for (const product of [...orderable].sort((a, b) => a.display_order - b.display_order || a.slug.localeCompare(b.slug))) {
    if (selected.length >= MAX_MENU_PRODUCTEN) break
    if (!selected.some(p => p.id === product.id)) selected.push(product)
  }
  return selected.slice(0, MAX_MENU_PRODUCTEN).map(product => {
    const preferred = highlights.find(h => h.slug === product.slug)?.color
    const preferredVariant = product.variants?.find(v => preferred && colorKey(v.color ?? '') === colorKey(preferred) && availableVariant(v))
    const color = preferredVariant?.color || catalogTiles([product], emptyCatalogFilters)[0].color
    const price = productPriceRange(product, color).min
    const originalPrice = product.base_price + price - (product.sale_price ?? product.base_price)
    return {
      id: product.id, slug: product.slug, href: buildPdpHref(product.slug, color), kleur: null,
      naam: locale === 'en' ? product.name_en || product.name : product.name,
      prijs: price, vanafPrijs: originalPrice > price ? originalPrice : null,
      beeld: getImageForColor(product.images, color),
    }
  })
}

export async function getMenuProducts(locale: string): Promise<MenuProduct[]> {
  const { data, error } = await createClient().from('products')
    .select(`id, slug, name, name_en, base_price, sale_price, category_id, display_order, created_at, is_gift_card,
      category:categories(name, name_en, slug),
      images:product_images(url, is_primary, position, color, media_type),
      variants:product_variants(color, size, price_adjustment, stock_quantity, presale_stock_quantity, presale_enabled, presale_expected_date, is_available, fulfillment_mode, supplier_orderable, supplier_checked_at)`)
    .eq('is_active', true).eq('status', 'active')
    .order('display_order', { ascending: true })
    .abortSignal(AbortSignal.timeout(8000))
  if (error || !data) return []
  return selectMenuProducts(data as unknown as CatalogProduct[], locale)
}

export function formatPrijs(bedrag: number, locale: string): string {
  const centen = Math.round(bedrag * 100) % 100 !== 0
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    minimumFractionDigits: centen ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(bedrag)
}
