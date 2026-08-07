/**
 * Meta Shop "checkout on website" handoff helpers.
 *
 * Meta redirects buyers to the merchant checkout URL with:
 *   ?products=CONTENT_ID:QTY,CONTENT_ID:QTY&coupon=CODE&cart_origin=instagram
 *
 * Our catalog content ids are `uuid:colorSlug`. Meta's products param
 * uses the last `:` for quantity, so we parse with lastIndexOf(':').
 * Docs: https://developers.facebook.com/docs/commerce-platform/setup-checkout-url
 */

import {
  parseCatalogContentId,
  slugifyCatalogColor,
} from '@/lib/catalog-ids'
import type { CartItem } from '@/store/cart'

export interface MetaProductQuantity {
  contentId: string
  quantity: number
}

/**
 * Parse Meta's `products` query param.
 * Uses lastIndexOf(':') so content ids never contain a colon.
 */
export function parseMetaProductsParam(raw: string | null | undefined): MetaProductQuantity[] {
  if (!raw) return []
  const decoded = decodeURIComponent(raw).trim()
  if (!decoded) return []

  const out: MetaProductQuantity[] = []
  for (const entry of decoded.split(',')) {
    const part = entry.trim()
    if (!part) continue
    const sep = part.lastIndexOf(':')
    if (sep <= 0) continue
    const contentId = part.slice(0, sep).trim()
    const qtyRaw = part.slice(sep + 1).trim()
    const quantity = Number.parseInt(qtyRaw, 10)
    if (!contentId || !Number.isFinite(quantity) || quantity < 1) continue
    out.push({ contentId, quantity: Math.min(quantity, 99) })
  }
  return out
}

type ResolveVariant = {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  color_hex: string | null
  stock_quantity: number | null
  presale_stock_quantity: number | null
  presale_enabled: boolean | null
  presale_expected_date: string | null
  is_available: boolean | null
  display_order: number | null
}

type ResolveProduct = {
  id: string
  slug: string
  name: string | null
  base_price: number | string
  sale_price: number | string | null
  is_gift_card: boolean | null
  product_images:
    | Array<{
        url: string
        is_primary: boolean | null
        color: string | null
        position: number | null
        media_type: string | null
      }>
    | null
  product_variants: ResolveVariant[] | null
}

function effectiveStock(v: ResolveVariant): number {
  if (v.presale_enabled) return Math.max(0, v.presale_stock_quantity ?? 0)
  return Math.max(0, v.stock_quantity ?? 0)
}

function pickVariant(variants: ResolveVariant[], colorSlug: string | null): ResolveVariant | null {
  const available = variants.filter((v) => v.is_available !== false)
  const pool = colorSlug
    ? available.filter((v) => slugifyCatalogColor(v.color || '') === colorSlug)
    : available

  if (pool.length === 0) return null

  const withStock = pool.filter((v) => effectiveStock(v) > 0)
  const candidates = withStock.length > 0 ? withStock : pool

  const sizeRank = (size: string | null) => {
    const s = (size || '').toUpperCase()
    if (s === 'M') return 0
    if (s === 'L') return 1
    if (s === 'S') return 2
    if (s === 'XL') return 3
    return 10
  }

  return [...candidates].sort((a, b) => {
    const stockDiff = effectiveStock(b) - effectiveStock(a)
    if (stockDiff !== 0) return stockDiff
    const sizeDiff = sizeRank(a.size) - sizeRank(b.size)
    if (sizeDiff !== 0) return sizeDiff
    return (a.display_order ?? 0) - (b.display_order ?? 0)
  })[0]
}

function pickImage(
  images: NonNullable<ResolveProduct['product_images']>,
  color: string | null,
): string {
  const stills = images.filter((img) => img.url && !/\.(mp4|mov|webm)$/i.test(img.url))
  if (stills.length === 0) return '/logomose.png'
  if (color) {
    const colorMatch = stills.find(
      (img) => (img.color || '').toLowerCase() === color.toLowerCase(),
    )
    if (colorMatch?.url) return colorMatch.url
  }
  const primary = stills.find((img) => img.is_primary)
  if (primary?.url) return primary.url
  return stills[0].url
}

function unitPrice(product: ResolveProduct): number {
  const base = Number(product.base_price)
  const sale =
    product.sale_price === null || product.sale_price === undefined
      ? null
      : Number(product.sale_price)
  if (sale !== null && Number.isFinite(sale) && sale > 0 && sale < base) return sale
  return Number.isFinite(base) ? base : 0
}

export interface MetaCheckoutResolveResult {
  items: CartItem[]
  unresolved: string[]
  warnings: string[]
}

/**
 * Map Meta content ids + quantities onto storefront CartItems.
 * Color-level catalog rows pick the best in-stock size (prefer M).
 */
export function resolveMetaProductsToCartItems(
  products: ResolveProduct[],
  requested: MetaProductQuantity[],
): MetaCheckoutResolveResult {
  const byId = new Map(products.map((p) => [p.id, p]))
  const items: CartItem[] = []
  const unresolved: string[] = []
  const warnings: string[] = []

  for (const req of requested) {
    const parsed = parseCatalogContentId(req.contentId)
    if (!parsed) {
      unresolved.push(req.contentId)
      continue
    }

    const product = byId.get(parsed.productId)
    if (!product || product.is_gift_card) {
      unresolved.push(req.contentId)
      continue
    }

    const variants = product.product_variants || []
    const variant = pickVariant(variants, parsed.colorSlug)
    if (!variant) {
      unresolved.push(req.contentId)
      continue
    }

    const stock = effectiveStock(variant)
    if (stock < 1 && !variant.presale_enabled) {
      unresolved.push(req.contentId)
      continue
    }

    const qty = Math.min(req.quantity, Math.max(stock, 1))
    if (qty < req.quantity) {
      warnings.push(`${req.contentId}: requested ${req.quantity}, capped to ${qty}`)
    }

    const color = variant.color || ''
    items.push({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name || 'MOSE product',
      size: variant.size || '',
      color,
      colorHex: variant.color_hex || '#000000',
      quantity: qty,
      price: unitPrice(product),
      image: pickImage(product.product_images || [], color || null),
      stock,
      sku: variant.sku || '',
      isPresale: Boolean(variant.presale_enabled),
      presaleExpectedDate: variant.presale_expected_date || undefined,
      presaleStock: variant.presale_stock_quantity ?? undefined,
    })
  }

  return { items, unresolved, warnings }
}
