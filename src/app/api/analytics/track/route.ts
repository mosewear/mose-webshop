import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

  const country_code = countryFromRequest(request)

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('analytics_events').insert({
    event_name,
    event_properties: body.event_properties ?? {},
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
    console.error('[api/analytics/track]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
