/**
 * Facebook Pixel Helper Functions
 * Dual Tracking: Client-Side Pixel + Server-Side CAPI
 */

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

/**
 * Track standard Facebook Pixel event (DUAL: Client + Server)
 */
export function trackPixelEvent(
  event: PixelEvent,
  params?: PixelParams,
  userData?: UserData
) {
  if (typeof window === 'undefined' || !window.fbq) {
    return
  }

  try {
    // Generate unique event ID for deduplication
    const eventId = generateEventId()
    
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
    
    // Add event_id for deduplication
    eventParams.eventID = eventId

    window.fbq('track', event, eventParams)
    
    // 2. Track server-side (Conversions API) - async, don't wait
    if (userData || params?.transaction_id) {
      // Only send to CAPI for important events with user data
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

