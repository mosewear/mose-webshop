import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  type SlidingWindowEntry,
} from '@/lib/rate-limit-ip'
import { isLikelyBotRequest } from '@/lib/bot-detection'

/**
 * ISO 3166-1 alpha-2 from common CDN / host headers (Vercel, CloudFront, Cloudflare).
 */
function countryFromRequest(request: NextRequest): string | null {
  const raw =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('cloudfront-viewer-country') ||
    ''
  const trimmed = raw.trim()
  if (trimmed.length === 2 && /^[a-zA-Z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  return null
}

// Only events the web app legitimately emits are allowed. Anything else is
// either a bug or someone poking the endpoint and gets rejected before it
// pollutes the Live Event Feed.
const ALLOWED_EVENTS = new Set<string>([
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
  'chat_opened',
  'chat_closed',
])

// Module-level bucket. In-memory is fine here: if a Lambda recycles we just
// reset the counter, which is safe because the DB dedupe + unique index
// already protect the purchase-event integrity separately.
const RATE_LIMIT_BUCKET = new Map<string, SlidingWindowEntry>()
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_PROPERTIES_BYTES = 4 * 1024

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TrackBody = {
  event_name?: string
  event_properties?: Record<string, unknown>
  session_id?: string | null
  user_id?: string | null
  page_url?: string | null
  page_title?: string | null
  referrer?: string | null
  device_type?: string | null
  user_agent?: string | null
  screen_width?: number | null
  screen_height?: number | null
  viewport_width?: number | null
  viewport_height?: number | null
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  if (!checkSlidingWindowRateLimit(RATE_LIMIT_BUCKET, clientIp, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many events' }, { status: 429 })
  }

  let body: TrackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event_name = typeof body.event_name === 'string' ? body.event_name.trim() : ''
  if (!event_name || event_name.length > 120) {
    return NextResponse.json({ error: 'Invalid event_name' }, { status: 400 })
  }
  if (!ALLOWED_EVENTS.has(event_name)) {
    return NextResponse.json({ error: 'Unknown event_name' }, { status: 400 })
  }

  const event_properties = (body.event_properties ?? {}) as Record<string, unknown>
  // Cheap size cap so a misbehaving client can't flood the table with blobs.
  try {
    if (JSON.stringify(event_properties).length > MAX_PROPERTIES_BYTES) {
      return NextResponse.json({ error: 'event_properties too large' }, { status: 413 })
    }
  } catch {
    return NextResponse.json({ error: 'event_properties not serializable' }, { status: 400 })
  }

  const country_code = countryFromRequest(request)

  // Drop bot / crawler / headless-Chromium traffic before it ever touches
  // the events table. We prefer the edge `user-agent` header (ground
  // truth set by the browser / bot itself) and fall back to whatever the
  // client reported in the payload. Purchase events are exempted because
  // they are authoritative against the `orders` table and we'd rather
  // log a weird UA than silently drop a real sale.
  const uaFromHeader = request.headers.get('user-agent')
  const uaFromBody = typeof body.user_agent === 'string' ? body.user_agent : null
  const effectiveUa = uaFromHeader || uaFromBody

  if (
    event_name !== 'purchase' &&
    isLikelyBotRequest({ userAgent: effectiveUa, countryCode: country_code })
  ) {
    // Return 200 OK so the (possibly-real) client doesn't see an error
    // in devtools and doesn't retry. Bots get dropped silently.
    return NextResponse.json({ ok: true, filtered: 'bot' })
  }

  const supabase = createServiceRoleClient()

  // Purchase events get two extra gates:
  //   1. the order_id MUST exist and be `paid` in the orders table (ground
  //      truth — prevents phantom purchases from unpaid/pending orders that
  //      happen to reach the confirmation URL).
  //   2. we dedupe by order_id so refresh / Strict Mode / back-nav cannot
  //      produce a second row even if the client-side guard was bypassed.
  if (event_name === 'purchase') {
    const rawOrderId = event_properties.order_id
    const orderId = typeof rawOrderId === 'string' ? rawOrderId.trim() : ''
    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json(
        { error: 'purchase events require a valid order_id' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) {
      console.error('[api/analytics/track] order lookup failed', orderError)
      return NextResponse.json({ error: 'Order lookup failed' }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 400 })
    }
    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Order is not paid', payment_status: order.payment_status },
        { status: 400 }
      )
    }

    const { count: existingCount, error: dedupeError } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', 'purchase')
      .contains('event_properties', { order_id: orderId })

    if (dedupeError) {
      console.error('[api/analytics/track] dedupe check failed', dedupeError)
      // Fall through — the partial unique index is the defense-in-depth net.
    } else if ((existingCount ?? 0) > 0) {
      return NextResponse.json({ ok: true, deduped: true })
    }
  }

  const { error } = await supabase.from('analytics_events').insert({
    event_name,
    event_properties,
    session_id: body.session_id ?? null,
    user_id: body.user_id ?? null,
    page_url: body.page_url ?? null,
    page_title: body.page_title ?? null,
    referrer: body.referrer ?? null,
    device_type: body.device_type ?? null,
    user_agent: body.user_agent ?? null,
    screen_width: body.screen_width ?? null,
    screen_height: body.screen_height ?? null,
    viewport_width: body.viewport_width ?? null,
    viewport_height: body.viewport_height ?? null,
    country_code,
  })

  if (error) {
    // Unique violation on the partial purchase index → treat as a benign
    // dedupe so the client doesn't see an error.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, deduped: true })
    }
    console.error('[api/analytics/track]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
