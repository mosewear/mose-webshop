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
 * Google Merchant Center id limit is 50 chars; UUID (36) + ":" + short
 * Dutch color slugs stay under that.
 */

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
  return `${productId}:${slug}`
}
