/**
 * Canonical product identifiers for Google Shopping + Meta catalog / pixel.
 *
 * Rules (locked for DPA + Merchant Center):
 *  - `g:id` / Meta `retailer_id` / pixel `content_ids` must match exactly.
 *  - Product UUID is the stable base (never slug).
 *  - Multi-color products emit one feed row per color:
 *      id = `{productUUID}:{colorSlug}`
 *      item_group_id = `{productUUID}`
 *  - Single-color (or color-less) products use the bare product UUID.
 *  - Pixel / CAPI must call `catalogContentId(productId, color)` so
 *    Advantage+ / Catalog Sales can attribute.
 *
 * Note: Meta's checkout URL encodes carts as `products=ID:QTY,...`.
 * IDs that contain `:` are awkward for that format; we parse with
 * lastIndexOf(':') in meta-checkout so `uuid:color:qty` still works
 * with the live catalog. Do not change the feed separator without a
 * coordinated Meta catalog refresh + pixel cutover.
 *
 * Google Merchant Center id limit is 50 chars; UUID (36) + ":" + short
 * Dutch color slugs stay under that.
 */

/** Separator between product UUID and color slug in content ids. */
export const CATALOG_COLOR_SEPARATOR = ':' as const

/** Slugify a variant color for use in catalog content ids. */
export function slugifyCatalogColor(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build the canonical content id used in the shopping feed, pixel, and CAPI.
 * When `color` is empty, returns the product UUID alone.
 */
export function catalogContentId(productId: string, color?: string | null): string {
  const trimmed = (color ?? '').trim()
  if (!trimmed) return productId
  const slug = slugifyCatalogColor(trimmed)
  if (!slug) return productId
  return `${productId}${CATALOG_COLOR_SEPARATOR}${slug}`
}

export interface ParsedCatalogContentId {
  productId: string
  /** Slugified color, or null when the id is a bare product UUID. */
  colorSlug: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Parse a feed / Meta `products=` content id back into product UUID + color.
 * Accepts `uuid:colorSlug` and optional future `uuid__colorSlug`.
 */
export function parseCatalogContentId(contentId: string): ParsedCatalogContentId | null {
  const raw = (contentId || '').trim()
  if (!raw) return null

  if (UUID_RE.test(raw)) {
    return { productId: raw, colorSlug: null }
  }

  // Prefer explicit double-underscore form if present
  const dunder = raw.indexOf('__')
  if (dunder === 36 && UUID_RE.test(raw.slice(0, 36))) {
    const colorSlug = raw.slice(38)
    if (colorSlug) return { productId: raw.slice(0, 36), colorSlug }
  }

  // Standard `uuid:colorSlug` (color slug itself has no colon)
  if (raw.length > 37 && raw[36] === ':' && UUID_RE.test(raw.slice(0, 36))) {
    const colorSlug = raw.slice(37)
    if (colorSlug && !colorSlug.includes(':')) {
      return { productId: raw.slice(0, 36), colorSlug }
    }
  }

  return null
}
