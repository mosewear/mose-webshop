import { NextResponse } from 'next/server'
import { catalogContentId } from '@/lib/catalog-ids'
import {
  getColorStock,
  getImageForColor,
  getUniqueColors,
  type ProductDisplayImage,
  type ProductDisplayVariant,
} from '@/lib/product-display'

type FeedVariant = ProductDisplayVariant & { size?: string | null }
import { createServiceRoleClient } from '@/lib/supabase/server'

const BASE_URL = 'https://www.mosewear.com'
const DEFAULT_LOCALE = 'nl'

/**
 * Cutover note (2026-08):
 * Previous feed used slug as <g:id>. Pixel / CAPI already sent product UUIDs.
 * This feed now uses UUID-based catalog ids so Meta DPA / Advantage+ can match.
 * Google Merchant Center will treat id changes as new products (history resets).
 * Refetch the feed after deploy; remove stale slug-based offers if needed.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isLikelyImage(url: string) {
  return !/\.(mp4|mov|webm)$/i.test(url || '')
}

function buildImageUrl(rawUrl: string) {
  if (!rawUrl) return `${BASE_URL}/logomose.png`
  if (rawUrl.startsWith('/')) return `${BASE_URL}${rawUrl}`
  return `${BASE_URL}/api/google-image?src=${encodeURIComponent(rawUrl)}`
}

function formatPrice(amount: number) {
  return `${Number(amount).toFixed(2)} EUR`
}

function googleProductCategory(slug: string | null | undefined): string {
  if (slug?.includes('horloge') || slug?.includes('watch')) {
    return 'Apparel & Accessories > Jewelry > Watches'
  }
  if (slug?.includes('hoodie') || slug?.includes('sweater')) {
    return 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets'
  }
  if (slug?.includes('tee') || slug?.includes('t-shirt')) {
    return 'Apparel & Accessories > Clothing > Shirts & Tops'
  }
  return 'Apparel & Accessories > Clothing'
}

type FeedProduct = {
  id: string
  slug: string
  name: string | null
  description: string | null
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
  product_variants:
    | Array<{
        stock_quantity: number | null
        presale_stock_quantity: number | null
        presale_enabled: boolean | null
        is_available: boolean | null
        color: string | null
        color_hex: string | null
        size: string | null
      }>
    | null
}

function buildItemXml(args: {
  contentId: string
  itemGroupId: string
  title: string
  description: string
  link: string
  primaryImage: string
  additionalImages: string[]
  inStock: boolean
  basePrice: number
  salePrice: number | null
  color: string | null
  sizes: string[]
  productSlug: string
}): string {
  const {
    contentId,
    itemGroupId,
    title,
    description,
    link,
    primaryImage,
    additionalImages,
    inStock,
    basePrice,
    salePrice,
    color,
    sizes,
    productSlug,
  } = args

  const onSale =
    typeof salePrice === 'number' && Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice

  const additionalXml = additionalImages
    .slice(0, 10)
    .map((url) => `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`)
    .join('\n      ')

  const sizeXml =
    sizes.length > 0
      ? `<g:size>${escapeXml(sizes.join('/'))}</g:size>`
      : ''

  const colorXml = color ? `<g:color>${escapeXml(color)}</g:color>` : ''

  return `
    <item>
      <g:id>${escapeXml(contentId)}</g:id>
      <g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
      ${additionalXml}
      <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${formatPrice(basePrice)}</g:price>
      ${onSale ? `<g:sale_price>${formatPrice(salePrice)}</g:sale_price>` : ''}
      <g:brand>MOSE</g:brand>
      <g:mpn>${escapeXml(productSlug)}</g:mpn>
      <g:identifier_exists>false</g:identifier_exists>
      <g:google_product_category>${escapeXml(googleProductCategory(productSlug))}</g:google_product_category>
      ${colorXml}
      ${sizeXml}
    </item>`.trim()
}

export async function GET() {
  const supabase = createServiceRoleClient()

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      description,
      base_price,
      sale_price,
      is_gift_card,
      product_images(url, is_primary, color, position, media_type),
      product_variants(stock_quantity, presale_stock_quantity, presale_enabled, is_available, color, color_hex, size)
    `)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const itemsXml = ((products || []) as FeedProduct[])
    .filter((product) => !product.is_gift_card)
    .flatMap((product) => {
      const images = (product.product_images || []).filter((img) =>
        Boolean(img.url) && isLikelyImage(img.url),
      ) as ProductDisplayImage[]

      const variants = (product.product_variants || []) as FeedVariant[]
      const colors = getUniqueColors(variants)
      const basePrice = Number(product.base_price)
      const salePriceRaw =
        product.sale_price === null || product.sale_price === undefined
          ? null
          : Number(product.sale_price)
      const salePrice =
        salePriceRaw !== null && Number.isFinite(salePriceRaw) ? salePriceRaw : null
      const description = (product.description || product.name || 'MOSE product').slice(0, 5000)
      const productName = product.name || 'MOSE product'

      // One feed row per color. g:id = UUID:colorSlug when color exists
      // (matches pixel/CAPI via catalogContentId). Bare UUID only when
      // the product has no color variants at all.
      const colorRows: Array<string | null> =
        colors.length > 0 ? colors.map((c) => c.color) : [null]

      return colorRows.map((color) => {
        const contentId = catalogContentId(product.id, color)
        const stock = getColorStock(variants, color)
        const availableVariants = variants.filter((v) => {
          if (color && (v.color ?? '') !== color) return false
          return v.is_available !== false
        })
        const sizes = Array.from(
          new Set(
            availableVariants
              .map((v) => (v.size ?? '').trim())
              .filter(Boolean),
          ),
        )

        const primaryRaw = getImageForColor(images, color)
        const primaryImage =
          !primaryRaw || primaryRaw === '/placeholder-product.svg'
            ? `${BASE_URL}/logomose.png`
            : buildImageUrl(primaryRaw)

        const additionalImages = images
          .map((img) => img.url)
          .filter((url): url is string => Boolean(url) && url !== primaryRaw)
          .map((url) => buildImageUrl(url))

        const title = color ? `${productName} - ${color}` : productName

        const link = color
          ? `${BASE_URL}/${DEFAULT_LOCALE}/product/${encodeURIComponent(product.slug)}?color=${encodeURIComponent(color)}`
          : `${BASE_URL}/${DEFAULT_LOCALE}/product/${encodeURIComponent(product.slug)}`

        return buildItemXml({
          contentId,
          itemGroupId: product.id,
          title,
          description,
          link,
          primaryImage,
          additionalImages,
          inStock: stock.in_stock,
          basePrice: Number.isFinite(basePrice) ? basePrice : 0,
          salePrice,
          color,
          sizes,
          productSlug: product.slug,
        })
      })
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MOSE Product Feed</title>
    <link>${BASE_URL}</link>
    <description>Official Google Shopping + Meta catalog product feed for MOSE. Content ids are product UUIDs (with :colorSlug for multi-color items) and match pixel/CAPI content_ids.</description>
    ${itemsXml}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
      // Hint for edge bot-management: this path is a public merchant feed.
      'X-Robots-Tag': 'all',
    },
  })
}
