/**
 * Shop / PDP shared display helpers.
 *
 * Centralizes the "given a product row, derive what to show on a tile"
 * logic so the shop grid, PDP per-color picker, and any future surface
 * (homepage featured, related products, search results) all agree on
 * the same fallback chain.
 *
 * The most important helper here is `expandToShopTiles`, which turns
 * one product row into one or many tile rows for the /shop page based
 * on the per-product `show_color_variants_on_shop` flag. The flag is
 * opt-in: products default to a single tile, exactly like before.
 *
 * Design rules (locked in by tests at the call sites):
 *   * "Color" matching is case-sensitive against the exact strings
 *     stored on `product_variants.color`. The admin/seed pipeline uses
 *     title-case (`Zwart`, `Wit`, `Stone`). The PDP `?color=` reader
 *     resolves case-insensitively to be friendly to email links.
 *   * `getImageForColor` mirrors the PDP fallback chain exactly so a
 *     color-split tile and the PDP it links to always lead with the
 *     same hero image. Never falls back to /placeholder unless the
 *     product has zero images at all.
 *   * Gift cards never split. Products with one (or zero) unique
 *     colors never split, even when the flag is on, because the flag
 *     is meaningless there.
 *   * Stock is aggregated per color. The "show in stock only" filter
 *     in the shop grid applies per-tile when split, so an out-of-stock
 *     color tile disappears while the rest of the product stays.
 */

export interface ProductDisplayImage {
  url: string
  alt_text?: string | null
  is_primary?: boolean | null
  media_type?: 'image' | 'video' | string | null
  color?: string | null
  position?: number | null
}

export interface ProductDisplayVariant {
  color?: string | null
  color_hex?: string | null
  stock_quantity?: number | null
  presale_stock_quantity?: number | null
  presale_enabled?: boolean | null
  presale_expected_date?: string | null
  is_available?: boolean | null
}

export interface ProductDisplayRow {
  id: string
  slug: string
  is_gift_card?: boolean | null
  show_color_variants_on_shop?: boolean | null
  images?: ProductDisplayImage[] | null
  variants?: ProductDisplayVariant[] | null
}

export interface UniqueColor {
  /** Exact color string as stored on product_variants.color (case sensitive). */
  color: string
  /** Hex from the first variant that surfaced this color (for swatches). */
  color_hex: string | null
}

export interface ShopTile<P extends ProductDisplayRow = ProductDisplayRow> {
  /** Stable React key + DOM id; never collides between split + non-split. */
  tileKey: string
  product: P
  /**
   * The color this tile represents, or `null` when the tile is a
   * single-product tile (toggle off, single color, or gift card).
   */
  color: string | null
  color_hex: string | null
}

const PLACEHOLDER = '/placeholder-product.svg'

/**
 * Return the unique colors of a product in the same order they were
 * seen on `product_variants`. We don't sort alphabetically — variant
 * `display_order` is the merchant's curated order and we honour it.
 *
 * `null` / empty / video-only variant.color values are skipped.
 */
export function getUniqueColors(
  variants: readonly ProductDisplayVariant[] | null | undefined,
): UniqueColor[] {
  if (!variants || variants.length === 0) return []
  const seen = new Map<string, UniqueColor>()
  for (const v of variants) {
    const color = (v.color ?? '').trim()
    if (!color) continue
    if (seen.has(color)) continue
    seen.set(color, {
      color,
      color_hex: v.color_hex?.trim() || null,
    })
  }
  return Array.from(seen.values())
}

/**
 * Return the best image URL for a given color, mirroring the PDP's
 * `getImageForColor` fallback chain:
 *
 *   1. Color-tagged image with `is_primary = true`
 *   2. First color-tagged image (lowest `position`)
 *   3. Product-level primary image (any color)
 *   4. First general (color-less) image
 *   5. First image of any kind
 *   6. PLACEHOLDER
 *
 * Videos are always skipped so the shop grid never tries to render a
 * `.mp4` as a static image. When `color` is null/empty this returns
 * the product-level "primary" image, identical to the legacy
 * `getPrimaryImage()` behaviour the shop used before color splits.
 */
export function getImageForColor(
  images: readonly ProductDisplayImage[] | null | undefined,
  color: string | null | undefined,
): string {
  if (!images || images.length === 0) return PLACEHOLDER

  const photos = images.filter((img) => img.media_type !== 'video')
  if (photos.length === 0) return PLACEHOLDER

  const sorted = [...photos].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
  )

  if (color) {
    const colorImages = sorted.filter((img) => img.color === color)
    const colorPrimary = colorImages.find((img) => img.is_primary && img.url)
    if (colorPrimary?.url) return colorPrimary.url
    const colorFirst = colorImages.find((img) => img.url)
    if (colorFirst?.url) return colorFirst.url
  }

  const globalPrimary = sorted.find((img) => img.is_primary && img.url)
  if (globalPrimary?.url) return globalPrimary.url

  const general = sorted.find((img) => !img.color && img.url)
  if (general?.url) return general.url

  const first = sorted.find((img) => img.url)
  return first?.url || PLACEHOLDER
}

export interface ColorStock {
  /** Sum of regular stock across all size variants of this color. */
  stock_quantity: number
  /** Sum of presale stock when at least one variant has presale enabled. */
  presale_stock_quantity: number
  /** True when any size of this color has presale_enabled + presale stock. */
  has_presale: boolean
  /** First non-null `presale_expected_date` seen on this color, if any. */
  presale_expected_date: string | null
  /** Effective in-stock: regular stock > 0 OR active presale with stock. */
  in_stock: boolean
}

/**
 * Aggregate stock for a specific color across all of its size variants.
 *
 * Pass `null` to aggregate across the entire product (useful for the
 * single-tile path or for the homepage). When aggregated across
 * everything, `presale_expected_date` returns the first one we see —
 * the shop grid only uses it for the "binnenkort terug op X"-badge
 * which doesn't need ordering precision.
 */
export function getColorStock(
  variants: readonly ProductDisplayVariant[] | null | undefined,
  color: string | null,
): ColorStock {
  const empty: ColorStock = {
    stock_quantity: 0,
    presale_stock_quantity: 0,
    has_presale: false,
    presale_expected_date: null,
    in_stock: false,
  }
  if (!variants || variants.length === 0) return empty

  const filtered = color
    ? variants.filter((v) => (v.color ?? '') === color)
    : variants

  if (filtered.length === 0) return empty

  let stock = 0
  let presaleStock = 0
  let hasPresale = false
  let expected: string | null = null

  for (const v of filtered) {
    stock += v.stock_quantity ?? 0
    if (v.presale_enabled) {
      const ps = v.presale_stock_quantity ?? 0
      presaleStock += ps
      if (ps > 0 && (v.stock_quantity ?? 0) === 0) {
        hasPresale = true
      }
      if (!expected && v.presale_expected_date) {
        expected = v.presale_expected_date
      }
    }
  }

  return {
    stock_quantity: stock,
    presale_stock_quantity: presaleStock,
    has_presale: hasPresale,
    presale_expected_date: expected,
    in_stock: stock > 0 || (hasPresale && presaleStock > 0),
  }
}

/**
 * Expand a list of product rows into shop tiles. Products with the
 * `show_color_variants_on_shop` flag enabled AND 2+ unique colors
 * become one tile per color; everyone else stays a single tile.
 *
 * The relative order of products is preserved. For a split product
 * the color tiles appear contiguously, in the order their variants
 * were inserted (= the merchant's curated variant display order).
 *
 * This is a pure mapping over the input list — no DB calls, no
 * `useMemo`-unsafe side effects — so call sites are free to wrap it
 * in their own memoization keyed on the input.
 */
export function expandToShopTiles<P extends ProductDisplayRow>(
  products: readonly P[],
): ShopTile<P>[] {
  const tiles: ShopTile<P>[] = []
  for (const product of products) {
    if (!product.show_color_variants_on_shop || product.is_gift_card) {
      tiles.push({
        tileKey: product.id,
        product,
        color: null,
        color_hex: null,
      })
      continue
    }
    const colors = getUniqueColors(product.variants)
    if (colors.length <= 1) {
      tiles.push({
        tileKey: product.id,
        product,
        color: null,
        color_hex: null,
      })
      continue
    }
    for (const { color, color_hex } of colors) {
      tiles.push({
        tileKey: `${product.id}:${color}`,
        product,
        color,
        color_hex,
      })
    }
  }
  return tiles
}

/**
 * Build the canonical PDP URL for a tile. When the tile is split per
 * color, `?color=<exact-string>` is appended so the PDP opens with
 * that color preselected. Locale prefixing is handled upstream by
 * `LocaleLink` / next-intl.
 */
export function buildPdpHref(slug: string, color: string | null): string {
  if (!color) return `/product/${slug}`
  return `/product/${slug}?color=${encodeURIComponent(color)}`
}

// Keys are lowercase NL canonical color names; values are the
// localized uppercase labels we surface on shop cards + PDP. The PDP
// keeps its own copy of this map for now (legacy) — both must stay in
// sync; if you add a color here, mirror it in
// `ProductPageClient#getTranslatedColor`.
const COLOR_LABEL_MAP: Record<string, { nl: string; en: string }> = {
  zwart: { nl: 'ZWART', en: 'BLACK' },
  wit: { nl: 'WIT', en: 'WHITE' },
  grijs: { nl: 'GRIJS', en: 'GREY' },
  blauw: { nl: 'BLAUW', en: 'BLUE' },
  rood: { nl: 'ROOD', en: 'RED' },
  groen: { nl: 'GROEN', en: 'GREEN' },
  geel: { nl: 'GEEL', en: 'YELLOW' },
  bruin: { nl: 'BRUIN', en: 'BROWN' },
  beige: { nl: 'BEIGE', en: 'BEIGE' },
  roze: { nl: 'ROZE', en: 'PINK' },
  paars: { nl: 'PAARS', en: 'PURPLE' },
  oranje: { nl: 'ORANJE', en: 'ORANGE' },
  stone: { nl: 'STONE', en: 'STONE' },
}

/**
 * Locale-aware uppercase color label for shop cards / chips.
 * Unknown colors fall back to a plain `toUpperCase()` so any new
 * color the admin invents still renders without a code change.
 */
export function formatColorLabel(color: string, locale: string): string {
  const entry = COLOR_LABEL_MAP[color.toLowerCase()]
  if (entry) return locale === 'en' ? entry.en : entry.nl
  return color.toUpperCase()
}
