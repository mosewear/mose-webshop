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

export async function POST(request: NextRequest) {
  try {
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

    // Hash PII fields
    if (user_data.email) {
      hashedUserData.em = [hashData(user_data.email)]
    }
    if (user_data.phone) {
      const normalized = normalizePhone(user_data.phone)
      hashedUserData.ph = [hashData(normalized)]
    }
    if (user_data.firstName) {
      hashedUserData.fn = [hashData(user_data.firstName)]
    }
    if (user_data.lastName) {
      hashedUserData.ln = [hashData(user_data.lastName)]
    }
    if (user_data.city) {
      hashedUserData.ct = [hashData(user_data.city)]
    }
    if (user_data.state) {
      hashedUserData.st = [hashData(user_data.state)]
    }
    if (user_data.zip) {
      hashedUserData.zp = [hashData(user_data.zip)]
    }
    if (user_data.country) {
      // Country code is NOT hashed
      hashedUserData.country = [user_data.country.toLowerCase()]
    }

    // Facebook cookies (NOT hashed)
    if (user_data.fbc) {
      hashedUserData.fbc = user_data.fbc
    }
    if (user_data.fbp) {
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

    // Send to Facebook
    console.log(`[FB CAPI] Sending event: ${event_name}`, {
      event_id,
      has_email: !!hashedUserData.em,
      has_phone: !!hashedUserData.ph,
      has_name: !!hashedUserData.fn || !!hashedUserData.ln,
      value: custom_data.value,
    })

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

    console.log(`[FB CAPI] ✅ Event sent successfully:`, result)

    return NextResponse.json({
      success: true,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    })

  } catch (error: any) {
    console.error('[FB CAPI] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

