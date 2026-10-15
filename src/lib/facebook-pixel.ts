/**
 * Facebook Pixel Helper Functions
 * Dual Tracking: Client-Side Pixel + Server-Side CAPI
 */

import { magMeten } from '@/lib/meting-uitsluiten'

type PixelEvent = 
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Search'
  | 'CompleteRegistration'
  | 'Lead'
  | 'Subscribe'

/**
 * Per-line item payload Meta uses for accurate revenue & catalog
 * attribution. `id` MUST match the product feed (Pixel matches against
 * Catalogue Sales / DPA on this field).
 */
export interface PixelContentItem {
  id: string
  quantity: number
  item_price?: number
}

interface PixelParams {
  content_ids?: string[]
  contents?: PixelContentItem[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
  search_string?: string
  transaction_id?: string
  predicted_ltv?: number
}

interface UserData {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

/**
 * Generate unique event ID for deduplication
 */
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get Facebook cookies for better tracking
 */
function getFacebookCookies() {
  if (typeof document === 'undefined') return {}
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
  
  return {
    fbc: cookies._fbc || undefined,
    fbp: cookies._fbp || undefined,
  }
}

/**
 * Send event to server-side Conversions API
 */
async function sendToConversionsAPI(
  event: PixelEvent,
  params: PixelParams,
  userData: UserData,
  eventId: string
) {
  try {
    const cookies = getFacebookCookies()
    
    const response = await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_name: event,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: {
          ...userData,
          ...cookies,
        },
        custom_data: params,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error(`[FB CAPI] ❌ Server error for ${event}:`, errorData)
      return
    }
    
    await response.json()
  } catch (error) {
    console.error(`[FB CAPI] ❌ Error sending ${event}:`, error)
  }
}

interface TrackOptions {
  /**
   * Stable event identifier used by Meta to dedupe between client and
   * server CAPI events. For Purchase events we pass the order UUID so
   * the Stripe-webhook server-side CAPI event matches up.
   * Falls back to a random per-call ID when not provided.
   */
  eventId?: string
}

/**
 * Track standard Facebook Pixel event (DUAL: Client + Server)
 */
/**
 * Gebeurtenissen die ALTIJD ook server-side mee moeten.
 *
 * Dit stond eerder op "alleen als er klantgegevens of een transactie-id is".
 * Gevolg: een bezoeker die niet is ingelogd leverde voor AddToCart helemaal
 * geen server-side gebeurtenis op, en dus niets zodra zijn browser de pixel
 * blokkeerde. Juist die gebeurtenissen zijn de belangrijkste voor Meta.
 */
const ALTIJD_OOK_SERVERSIDE = new Set<PixelEvent>([
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
])

export function trackPixelEvent(
  event: PixelEvent,
  params?: PixelParams,
  userData?: UserData,
  options?: TrackOptions
) {
  // Niet meer afbreken als `window.fbq` ontbreekt. Die controle stond hier
  // bovenaan en sloeg daarmee OOK de server-side Conversions API over. Dat is
  // precies verkeerd om: de Conversions API bestaat om door te meten wanneer
  // de pixel geblokkeerd wordt, en hier was hij er juist van afhankelijk. Een
  // bezoeker met een adblocker (in Nederland een flink deel van het verkeer)
  // leverde zo geen enkele gebeurtenis op, langs geen van beide wegen.
  if (typeof window === 'undefined') {
    return
  }

  // Dezelfde poort als onze eigen meting. Die filterde automatiseringsbrowsers
  // al, de pixel niet, en dat is precies waarom Meta meer mandjes telde dan de
  // administratie: elke test leverde Meta een echte AddToCart op. Zie
  // meting-uitsluiten.ts voor de drie uitsluitingen.
  const poort = magMeten()
  if (!poort.mag) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[FB Pixel] ${event} niet verstuurd (${poort.reden})`)
    }
    return
  }

  try {
    // Stable ID when caller supplies one (Purchase: order.id), else random.
    const eventId = options?.eventId || generateEventId()
    
    // Prepare parameters
    const eventParams: any = {
      currency: params?.currency || 'EUR',
    }

    // Add all provided parameters. Use type-aware checks so that legitimate
    // zero-values (e.g. a 100% discounted order) aren't silently dropped.
    if (params?.content_ids?.length) eventParams.content_ids = params.content_ids
    if (params?.contents?.length) eventParams.contents = params.contents
    if (params?.content_name) eventParams.content_name = params.content_name
    if (params?.content_type) eventParams.content_type = params.content_type
    if (params?.content_category) eventParams.content_category = params.content_category
    if (typeof params?.value === 'number') eventParams.value = params.value
    if (typeof params?.num_items === 'number') eventParams.num_items = params.num_items
    if (params?.search_string) eventParams.search_string = params.search_string
    if (params?.transaction_id) eventParams.transaction_id = params.transaction_id
    if (typeof params?.predicted_ltv === 'number') eventParams.predicted_ltv = params.predicted_ltv
    
    // 1. Client-side pixel, als die niet geblokkeerd is.
    //
    // Het event-id hoort in het VIERDE argument. Het stond hier als gewone
    // parameter binnen de custom data (`eventParams.eventID`), waar Meta het
    // als een losse eigenschap behandelt en niet als deduplicatiesleutel.
    // Daardoor zag Meta een client- en een serverversie van dezelfde aankoop
    // als twee losse gebeurtenissen. Nu dedupliceren ze zoals bedoeld, wat ook
    // de voorwaarde is om beide wegen tegelijk te durven gebruiken.
    if (window.fbq) {
      window.fbq('track', event, eventParams, { eventID: eventId })
    }

    // 2. Server-side (Conversions API), onafhankelijk van de pixel hierboven.
    if (ALTIJD_OOK_SERVERSIDE.has(event) || userData || params?.transaction_id) {
      sendToConversionsAPI(event, params || {}, userData || {}, eventId)
    }
  } catch (error) {
    console.error(`[FB Pixel] Error tracking ${event}:`, error)
  }
}

/**
 * Check if pixel is loaded
 */
export function isPixelLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.fbq
}

