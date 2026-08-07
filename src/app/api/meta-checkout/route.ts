import { NextRequest, NextResponse } from 'next/server'
import {
  parseMetaProductsParam,
  resolveMetaProductsToCartItems,
} from '@/lib/meta-checkout'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Resolve Meta Shop checkout `products=` content ids into cart line items.
 * Used by /[locale]/meta-checkout before redirecting to /checkout.
 *
 * GET /api/meta-checkout?products=UUID:color:2,UUID:1
 */
export async function GET(request: NextRequest) {
  const productsParam =
    request.nextUrl.searchParams.get('products') ||
    request.nextUrl.searchParams.get('product') ||
    ''

  const requested = parseMetaProductsParam(productsParam)
  if (requested.length === 0) {
    return NextResponse.json(
      {
        error: 'Missing or invalid products parameter',
        hint: 'Expected products=CONTENT_ID:QTY,CONTENT_ID:QTY',
      },
      { status: 400 },
    )
  }

  const productIds = Array.from(
    new Set(
      requested
        .map((r) => {
          // Lightweight extract — resolveMetaProductsToCartItems does full parse
          const m = r.contentId.match(
            /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
          )
          return m?.[1]
        })
        .filter((id): id is string => Boolean(id)),
    ),
  )

  if (productIds.length === 0) {
    return NextResponse.json(
      { error: 'No valid product ids in products parameter', items: [], unresolved: requested.map((r) => r.contentId) },
      { status: 400 },
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      slug,
      name,
      base_price,
      sale_price,
      is_gift_card,
      product_images(url, is_primary, color, position, media_type),
      product_variants(
        id, sku, size, color, color_hex,
        stock_quantity, presale_stock_quantity, presale_enabled,
        presale_expected_date, is_available, display_order
      )
    `,
    )
    .in('id', productIds)
    .eq('is_active', true)
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = resolveMetaProductsToCartItems(data || [], requested)

  return NextResponse.json(
    {
      items: result.items,
      unresolved: result.unresolved,
      warnings: result.warnings,
      coupon: request.nextUrl.searchParams.get('coupon') || null,
      cart_origin: request.nextUrl.searchParams.get('cart_origin') || null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    },
  )
}
