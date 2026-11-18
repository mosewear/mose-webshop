import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isLikelyBotRequest } from '@/lib/bot-detection'
import { sendCapiEvent } from '@/lib/meta/capi'
import { verifyMetaTestTicket } from '@/lib/meta/test-session'
import { readLimitedBody } from '@/lib/shopify/http'
import { checkSlidingWindowRateLimit, getClientIp, type SlidingWindowEntry } from '@/lib/rate-limit-ip'
import { createServiceClient } from '@/lib/supabase/service'
const buckets = new Map<string, SlidingWindowEntry>()
const eventSchema = z.object({
  event_name: z.enum(['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Search', 'CompleteRegistration', 'Lead', 'Subscribe']),
  event_id: z.string().min(1).max(150),
  event_source_url: z.string().url().max(3000),
  user_data: z.object({ email: z.string().max(254).optional(), firstName: z.string().max(100).optional(), lastName: z.string().max(100).optional(), phone: z.string().max(50).optional(), city: z.string().max(100).optional(), state: z.string().max(100).optional(), zip: z.string().max(30).optional(), country: z.string().max(50).optional(), fbc: z.string().regex(/^fb\.\d\.\d{13}\.[A-Za-z0-9_.-]{6,500}$/).optional(), fbp: z.string().regex(/^fb\.\d\.\d{13}\.\d+$/).optional() }).default({}),
  custom_data: z.object({ currency: z.string().regex(/^[A-Z]{3}$/).optional(), value: z.number().finite().nonnegative().max(100000).optional(), content_ids: z.array(z.string().max(200)).max(100).optional(), contents: z.array(z.object({ id: z.string().max(200), quantity: z.number().int().positive().max(100), item_price: z.number().nonnegative().optional() })).max(100).optional(), content_name: z.string().max(500).optional(), content_type: z.string().max(50).optional(), content_category: z.string().max(200).optional(), num_items: z.number().int().nonnegative().optional(), search_string: z.string().max(200).optional(), transaction_id: z.string().max(150).optional(), predicted_ltv: z.number().nonnegative().optional() }).default({}),
})
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
  if (!['https://www.mosewear.com', 'https://mosewear.com'].includes(request.headers.get('origin') || '')) return respond({ ok: true, filtered: 'origin' })
  if (request.cookies.get('mose_meta_consent')?.value !== 'all') return respond({ ok: true, filtered: 'consent' })
  if (!checkSlidingWindowRateLimit(buckets, getClientIp(request), 60, 60_000)) return respond({ error: 'Rate limited' }, 429)
  const testCookie = request.cookies.get('mose_meta_test')?.value
  const test = verifyMetaTestTicket(testCookie)
  if (testCookie && !test) return respond({ error: 'Expired test session' }, 403)
  const userAgent = request.headers.get('user-agent')
  if (!test && isLikelyBotRequest({ userAgent, countryCode: request.headers.get('x-vercel-ip-country') })) return respond({ ok: true, filtered: 'bot' })
  try {
    const event = eventSchema.safeParse(JSON.parse((await readLimitedBody(request, 16000)).toString('utf8')))
    if (!event.success) return respond({ error: 'Invalid event' }, 400)
    const source = new URL(event.data.event_source_url)
    if (!['www.mosewear.com','mosewear.com'].includes(source.hostname) || source.protocol !== 'https:') return respond({ error: 'Invalid source' }, 400)
    // Browser requests cannot invent a paid order. Native Shopify Purchase is server-authoritative.
    if (event.data.event_name === 'Purchase' && !test) {
      const id = event.data.custom_data.transaction_id
      if (!id || event.data.event_id !== id || !/^[0-9a-f-]{36}$/i.test(id)) return respond({ error: 'Paid order required' }, 400)
      const paid = await createServiceClient().from('orders').select('id,total,payment_status').eq('id', id).maybeSingle()
      if (paid.error || paid.data?.payment_status !== 'paid' || Number(paid.data.total) !== event.data.custom_data.value || event.data.custom_data.currency !== 'EUR') return respond({ error: 'Paid order required' }, 400)
    }
    const result = await sendCapiEvent({ ...event.data,
      user_data: { ...event.data.user_data, client_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), client_user_agent: userAgent ?? undefined },
      test_event_code: test?.code,
    })
    if (!result.ok || result.events_received !== 1) {
      console.error('[Meta CAPI] Event rejected', { event: event.data.event_name, status: result.status, trace: result.fbtrace_id })
      return respond({ error: 'Event delivery failed' }, 502)
    }
    console.info('[Meta CAPI] Event accepted', { event: event.data.event_name, event_id: event.data.event_id, test: Boolean(test), trace: result.fbtrace_id })
    return respond({ success: true, events_received: 1, fbtrace_id: result.fbtrace_id, ...(test ? { test: true } : {}) })
  } catch { return respond({ error: 'Invalid event request' }, 400) }
}
