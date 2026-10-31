import { publicShopifyTracking } from '@/lib/shopify/public-tracking'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  type SlidingWindowEntry,
} from '@/lib/rate-limit-ip'

/** Exact email + native order number; legacy references retain their existing RPC. */

const TRACK_ORDER_WINDOW_MS = 10 * 60 * 1000
const TRACK_ORDER_MAX_PER_WINDOW = 45

const trackOrderRateLimitMap = new Map<string, SlidingWindowEntry>()

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (
    !checkSlidingWindowRateLimit(
      trackOrderRateLimitMap,
      ip,
      TRACK_ORDER_MAX_PER_WINDOW,
      TRACK_ORDER_WINDOW_MS
    )
  ) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '600' } }
    )
  }

  let body: { email?: string; orderNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^#?[a-zA-Z0-9-]{4,64}$/.test(orderNumber)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    if (/^#?\d{4,20}$/.test(orderNumber)) {
      const { data, error: nativeError } = await service.from('shopify_order_snapshots')
        .select('snapshot').eq('order_name', `#${orderNumber.replace(/^#/, '')}`)
        .limit(2).abortSignal(AbortSignal.timeout(8000))
      if (nativeError) return NextResponse.json({ error: 'Lookup unavailable' }, { status: 503, headers })
      const authorized = (data ?? []).map(row => publicShopifyTracking(row.snapshot, email, orderNumber)).filter(Boolean)
      if (authorized.length === 1) return NextResponse.json({ order: authorized[0] }, { headers })
      // Numeric Shopify references never fall back to a short legacy UUID prefix.
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers })
    }
    const { data: found, error } = await service.rpc('lookup_order_for_tracking', {
      p_email: email,
      p_order_ref: orderNumber,
    })

    if (error) {
      console.error('lookup_order_for_tracking', error)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 503, headers })
    }

    const order = (found as unknown[] | null)?.[0] as Record<string, unknown> | undefined
    if (!order?.id) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers })
    }

    const { data: order_items, error: itemsError } = await service
      .from('order_items')
      .select('product_name, quantity, size, color')
      .eq('order_id', order.id as string)

    if (itemsError) {
      return NextResponse.json({ error: 'Lookup unavailable' }, { status: 503, headers })
    }

    return NextResponse.json({
      order: {
        ...order,
        order_items: order_items ?? [],
      },
    }, { headers })
  } catch {
    return NextResponse.json({ error: 'Lookup unavailable' }, { status: 503, headers })
  }
}
