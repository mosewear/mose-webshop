import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
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
      is_active,
      status,
      product_images(url, is_primary),
      product_variants(stock_quantity, presale_stock_quantity, is_available)
    `)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = 'https://www.mosewear.com'
  const itemsXml = (products || [])
    .map((product: any) => {
      const isLikelyImage = (url: string) => !/\.(mp4|mov|webm)$/i.test(url || '')
      const allImages = (product.product_images || [])
        .map((img: any) => img.url)
        .filter((url: string) => Boolean(url) && isLikelyImage(url))

      const primaryImageRaw =
        product.product_images?.find((img: any) => img.is_primary && isLikelyImage(img.url))?.url ||
        allImages[0] ||
        `${baseUrl}/logomose.png`

      const buildImageUrl = (rawUrl: string) => {
        if (!rawUrl) return `${baseUrl}/logomose.png`
        return `${baseUrl}/api/google-image?src=${encodeURIComponent(rawUrl)}`
      }

      const primaryImage = buildImageUrl(primaryImageRaw)
      const additionalImages = allImages
        .filter((url: string) => url !== primaryImageRaw)
        .slice(0, 10)
        .map((url: string) => `<g:additional_image_link>${escapeXml(buildImageUrl(url))}</g:additional_image_link>`)
        .join('\n      ')

      const variants = product.product_variants || []
      const inStock = variants.some(
        (v: any) => v.is_available && ((v.stock_quantity || 0) + (v.presale_stock_quantity || 0) > 0)
      )

      const price = typeof product.sale_price === 'number' ? product.sale_price : product.base_price
      const description = (product.description || product.name || 'MOSE product').slice(0, 5000)

      return `
    <item>
      <g:id>${escapeXml(product.slug || product.id)}</g:id>
      <title>${escapeXml(product.name || 'MOSE product')}</title>
      <description>${escapeXml(description)}</description>
      <link>${baseUrl}/product/${escapeXml(product.slug)}</link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
      ${additionalImages}
      <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${Number(price).toFixed(2)} EUR</g:price>
      <g:brand>MOSE</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`.trim()
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MOSE Product Feed</title>
    <link>${baseUrl}</link>
    <description>Official Google Shopping product feed for MOSE</description>
    ${itemsXml}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
    },
  })
}

