import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Facebook Conversions API (Server-Side Events)
 * 
 * Deze API route ontvangt events van de client en stuurt ze
 * naar Facebook's Conversions API voor server-side tracking.
 * 
 * Voordelen:
 * - Werkt ook als client-side pixel geblokt wordt
 * - Betere event matching
 * - Hogere event quality score
 * - iOS 14+ privacy compliant
 */

const PIXEL_ID = '1447430483627328'
const API_VERSION = 'v18.0'
const FB_API_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

interface FacebookEvent {
  event_name: string
  event_time: number
  event_id?: string
  event_source_url: string
  action_source: 'website'
  user_data: {
    em?: string[]  // email (hashed)
    ph?: string[]  // phone (hashed)
    fn?: string[]  // first name (hashed)
    ln?: string[]  // last name (hashed)
    ct?: string[]  // city (hashed)
    st?: string[]  // state (hashed)
    zp?: string[]  // zip/postal code (hashed)
    country?: string[]  // country code (NOT hashed)
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string  // Facebook click ID cookie
    fbp?: string  // Facebook browser ID cookie
  }
  custom_data?: {
    currency?: string
    value?: number
    content_ids?: string[]
    content_name?: string
    content_type?: string
    content_category?: string
    num_items?: number
    search_string?: string
    transaction_id?: string
  }
}

/**
 * Hash data met SHA256 voor Facebook's enhanced matching
 */
function hashData(data: string): string {
  if (!data) return ''
  // Normalize: lowercase en trim
  const normalized = data.toLowerCase().trim()
  // SHA256 hash
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Normaliseer telefoonnummer (verwijder niet-numerieke karakters)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') || ''
    if (origin && !origin.includes('mosewear.com') && !origin.includes('localhost')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN

    if (!accessToken) {
      console.error('[FB CAPI] No access token configured')
      return NextResponse.json(
        { error: 'Facebook API not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // Destructure event data
    const {
      event_name,
      event_id,
      event_source_url,
      user_data = {},
      custom_data = {},
    } = body

    if (!event_name) {
      return NextResponse.json(
        { error: 'event_name is required' },
        { status: 400 }
      )
    }

    // Build user_data met hashing voor PII
    const hashedUserData: FacebookEvent['user_data'] = {
      client_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                         request.headers.get('x-real-ip') || 
                         undefined,
      client_user_agent: request.headers.get('user-agent') || undefined,
    }

    // Hash PII fields (only if non-empty)
    if (user_data.email && user_data.email.trim()) {
      hashedUserData.em = [hashData(user_data.email)]
    }
    if (user_data.phone && user_data.phone.trim()) {
      const normalized = normalizePhone(user_data.phone)
      if (normalized) { // Only add if not empty after normalization
        hashedUserData.ph = [hashData(normalized)]
      }
    }
    if (user_data.firstName && user_data.firstName.trim()) {
      hashedUserData.fn = [hashData(user_data.firstName)]
    }
    if (user_data.lastName && user_data.lastName.trim()) {
      hashedUserData.ln = [hashData(user_data.lastName)]
    }
    if (user_data.city && user_data.city.trim()) {
      hashedUserData.ct = [hashData(user_data.city)]
    }
    if (user_data.state && user_data.state.trim()) {
      hashedUserData.st = [hashData(user_data.state)]
    }
    if (user_data.zip && user_data.zip.trim()) {
      hashedUserData.zp = [hashData(user_data.zip)]
    }
    if (user_data.country && user_data.country.trim()) {
      // Country code MUST be hashed (lowercase 2-letter code, then hashed)
      const countryCode = user_data.country.toLowerCase().substring(0, 2)
      if (countryCode) {
        hashedUserData.country = [hashData(countryCode)]
      }
    }

    // Facebook cookies (NOT hashed, only if present and non-empty)
    if (user_data.fbc && user_data.fbc.trim()) {
      hashedUserData.fbc = user_data.fbc
    }
    if (user_data.fbp && user_data.fbp.trim()) {
      hashedUserData.fbp = user_data.fbp
    }

    // Build event
    const fbEvent: FacebookEvent = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      event_source_url: event_source_url || 'https://mosewear.com',
      action_source: 'website',
      user_data: hashedUserData,
      custom_data: {
        currency: custom_data.currency || 'EUR',
        ...custom_data,
      },
    }

    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [fbEvent],
        access_token: accessToken,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[FB CAPI] Facebook API error:', result)
      return NextResponse.json(
        { error: 'Facebook API error', details: result },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    })

  } catch (error: any) {
    console.error('[FB CAPI] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

