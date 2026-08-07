import { NextRequest, NextResponse } from 'next/server'
import {
  parseMetaProductsParam,
  resolveMetaProductsToCartItems,
} from '@/lib/meta-checkout'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Meta Shop checkout URL entrypoint.
 *
 * Paste in Commerce Manager (base URL, no query string):
 *   https://www.mosewear.com/api/meta-checkout
 *
 * Meta appends: ?products=ID:QTY,ID:QTY&coupon=CODE
 *
 * Browser / Meta crawler → 302 to /nl/meta-checkout (seeds Zustand cart → /checkout)
 * JSON clients (Accept: application/json or ?format=json) → cart line items
 */

function wantsJson(request: NextRequest): boolean {
  if (request.nextUrl.searchParams.get('format') === 'json') return true
  const accept = request.headers.get('accept') || ''
  return accept.includes('application/json') && !accept.includes('text/html')
}

async function resolveCart(request: NextRequest) {
  const productsParam =
    request.nextUrl.searchParams.get('products') ||
    request.nextUrl.searchParams.get('product') ||
    ''

  const requested = parseMetaProductsParam(productsParam)
  if (requested.length === 0) {
    return {
      ok: false as const,
      status: 400,
      body: {
        error: 'Missing or invalid products parameter',
        hint: 'Expected products=CONTENT_ID:QTY,CONTENT_ID:QTY',
        items: [] as unknown[],
        unresolved: [] as string[],
      },
    }
  }

  const productIds = Array.from(
    new Set(
      requested
        .map((r) => {
          const m = r.contentId.match(
            /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
          )
          return m?.[1]
        })
        .filter((id): id is string => Boolean(id)),
    ),
  )

  if (productIds.length === 0) {
    return {
      ok: false as const,
      status: 400,
      body: {
        error: 'No valid product ids in products parameter',
        items: [],
        unresolved: requested.map((r) => r.contentId),
      },
    }
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
    return {
      ok: false as const,
      status: 500,
      body: { error: error.message, items: [], unresolved: requested.map((r) => r.contentId) },
    }
  }

  const result = resolveMetaProductsToCartItems(data || [], requested)
  return {
    ok: true as const,
    status: 200,
    body: {
      items: result.items,
      unresolved: result.unresolved,
      warnings: result.warnings,
      coupon: request.nextUrl.searchParams.get('coupon') || null,
      cart_origin: request.nextUrl.searchParams.get('cart_origin') || null,
    },
  }
}

export async function GET(request: NextRequest) {
  // Meta / browsers: hand off to the locale page that seeds the client cart.
  if (!wantsJson(request)) {
    const target = new URL('/nl/meta-checkout', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value)
    })
    return NextResponse.redirect(target, 302)
  }

  const result = await resolveCart(request)
  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
