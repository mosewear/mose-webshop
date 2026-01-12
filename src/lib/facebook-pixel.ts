/**
 * Facebook Pixel Helper Functions
 * Standard Events Only - No Custom Events
 */

type PixelEvent = 
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Search'

interface PixelParams {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
  search_string?: string
  transaction_id?: string
}

/**
 * Track standard Facebook Pixel event
 */
export function trackPixelEvent(
  event: PixelEvent,
  params?: PixelParams
) {
  if (typeof window === 'undefined' || !window.fbq) {
    console.warn('[FB Pixel] Not initialized')
    return
  }

  try {
    // Prepare parameters
    const eventParams: any = {
      currency: params?.currency || 'EUR',
    }

    // Add all provided parameters
    if (params?.content_ids) eventParams.content_ids = params.content_ids
    if (params?.content_name) eventParams.content_name = params.content_name
    if (params?.content_type) eventParams.content_type = params.content_type
    if (params?.content_category) eventParams.content_category = params.content_category
    if (params?.value) eventParams.value = params.value
    if (params?.num_items) eventParams.num_items = params.num_items
    if (params?.search_string) eventParams.search_string = params.search_string
    if (params?.transaction_id) eventParams.transaction_id = params.transaction_id

    // Track event
    console.log(`[FB Pixel] ${event}`, eventParams)
    window.fbq('track', event, eventParams)
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

