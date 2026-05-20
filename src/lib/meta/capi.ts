/**
 * Meta Conversions API (CAPI) — server-side event helper.
 *
 * Two entry points share the same hashing + payload code:
 *  1. `sendCapiEvent()` — generic, called from the client-proxied
 *     `/api/facebook-capi` route (browser dual-tracking).
 *  2. `sendServerPurchaseEvent()` — fired from the Stripe webhook after
 *     a successful payment so we never lose a Purchase when the buyer
 *     closes the tab before the order-confirmation page mounts.
 *
 * Deduplication: events created from both sides MUST share an
 * `event_id`. We use the Supabase order UUID as event_id for Purchase
 * events; Meta dedupes at the events layer when name + id + time match.
 */

import crypto from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1447430483627328'
const API_VERSION = 'v22.0'
const FB_API_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

export interface CapiUserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  external_id?: string
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string
  fbp?: string
}

export interface CapiCustomData {
  currency?: string
  value?: number
  content_ids?: string[]
  contents?: Array<{ id: string; quantity: number; item_price?: number }>
  content_name?: string
  content_type?: string
  content_category?: string
  num_items?: number
  search_string?: string
  transaction_id?: string
  predicted_ltv?: number
  order_id?: string
}

export interface CapiEventInput {
  event_name: string
  event_id?: string
  event_time?: number
  event_source_url?: string
  user_data?: CapiUserData
  custom_data?: CapiCustomData
  test_event_code?: string
}

export interface CapiSendResult {
  ok: boolean
  status: number
  events_received?: number
  fbtrace_id?: string
  error?: unknown
}

function sha256(input: string): string {
  if (!input) return ''
  return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex')
}

function normalisePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function hashIfPresent(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return sha256(trimmed)
}

/**
 * Build the `user_data` object Meta expects, hashing all PII fields
 * server-side. Pass-through for already-hashed cookies (fbp/fbc) and
 * IP / user agent which Meta wants in cleartext.
 */
export function buildUserData(input: CapiUserData = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  if (input.client_ip_address) out.client_ip_address = input.client_ip_address
  if (input.client_user_agent) out.client_user_agent = input.client_user_agent
  if (input.fbc) out.fbc = input.fbc
  if (input.fbp) out.fbp = input.fbp

  const em = hashIfPresent(input.email)
  if (em) out.em = [em]
  if (input.phone) {
    const normalised = normalisePhone(input.phone)
    if (normalised) out.ph = [sha256(normalised)]
  }
  const fn = hashIfPresent(input.firstName)
  if (fn) out.fn = [fn]
  const ln = hashIfPresent(input.lastName)
  if (ln) out.ln = [ln]
  const ct = hashIfPresent(input.city)
  if (ct) out.ct = [ct]
  const st = hashIfPresent(input.state)
  if (st) out.st = [st]
  const zp = hashIfPresent(input.zip)
  if (zp) out.zp = [zp]

  if (input.country) {
    const code = input.country.trim().toLowerCase().slice(0, 2)
    if (code) out.country = [sha256(code)]
  }
  // external_id stable identifier (e.g. user_id or hashed email) for AEM.
  const ext = hashIfPresent(input.external_id)
  if (ext) out.external_id = [ext]

  return out
}

/**
 * Send a single event to Meta's Conversions API. Returns a structured
 * result instead of throwing so callers (webhooks, internal jobs) can
 * decide whether a CAPI failure should block their flow (usually: no).
 */
export async function sendCapiEvent(input: CapiEventInput): Promise<CapiSendResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  if (!accessToken) {
    return { ok: false, status: 0, error: 'FACEBOOK_ACCESS_TOKEN not configured' }
  }

  const event = {
    event_name: input.event_name,
    event_time: input.event_time ?? Math.floor(Date.now() / 1000),
    event_id: input.event_id,
    event_source_url: input.event_source_url || 'https://www.mosewear.com',
    action_source: 'website' as const,
    user_data: buildUserData(input.user_data),
    custom_data: {
      currency: input.custom_data?.currency || 'EUR',
      ...input.custom_data,
    },
  }

  try {
    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        access_token: accessToken,
        ...(input.test_event_code ? { test_event_code: input.test_event_code } : {}),
      }),
    })

    const body = (await response.json().catch(() => ({}))) as {
      events_received?: number
      fbtrace_id?: string
      error?: unknown
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        events_received: body.events_received,
        fbtrace_id: body.fbtrace_id,
        error: body.error ?? body,
      }
    }

    return {
      ok: true,
      status: response.status,
      events_received: body.events_received,
      fbtrace_id: body.fbtrace_id,
    }
  } catch (error) {
    return { ok: false, status: 0, error }
  }
}

export interface ServerPurchaseInput {
  orderId: string
  value: number
  currency?: string
  email: string
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  userId?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  contents?: Array<{ id: string; quantity: number; item_price?: number }>
  contentIds?: string[]
  numItems?: number
  eventTime?: number
  testEventCode?: string
}

/**
 * Convenience wrapper for the canonical server-side Purchase event.
 * `event_id` is pinned to the order UUID so client-side and webhook
 * events dedupe at Meta. Returns a structured CapiSendResult; never
 * throws so callers can keep webhook flows resilient.
 */
export async function sendServerPurchaseEvent(input: ServerPurchaseInput): Promise<CapiSendResult> {
  return sendCapiEvent({
    event_name: 'Purchase',
    event_id: input.orderId,
    event_time: input.eventTime,
    event_source_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com'}/order-confirmation?order=${input.orderId}`,
    user_data: {
      email: input.email,
      phone: input.phone ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      city: input.city ?? undefined,
      zip: input.zip ?? undefined,
      country: input.country ?? undefined,
      external_id: input.userId ?? input.email,
      client_ip_address: input.clientIpAddress ?? undefined,
      client_user_agent: input.clientUserAgent ?? undefined,
    },
    custom_data: {
      currency: input.currency || 'EUR',
      value: input.value,
      content_ids: input.contentIds,
      contents: input.contents,
      content_type: 'product',
      num_items: input.numItems,
      transaction_id: input.orderId,
      order_id: input.orderId,
    },
    test_event_code: input.testEventCode,
  })
}
