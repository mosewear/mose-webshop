/**
 * Custom Analytics Helper
 * Dual tracking: PostHog (for session recordings & heatmaps) + Supabase (for custom queries)
 */

'use client'

import posthog from '@/lib/posthog-client'
import { magMeten } from '@/lib/meting-uitsluiten'

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  // Priority: PostHog session → sessionStorage → new
  const postHogSessionId = posthog.get_session_id ? posthog.get_session_id() : null
  if (postHogSessionId) {
    sessionStorage.setItem('analytics_session_id', postHogSessionId)
    return postHogSessionId
  }
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Get device info
function getDeviceInfo() {
  if (typeof window === 'undefined') return {}
  
  const ua = navigator.userAgent
  let deviceType = 'desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = 'mobile'
  }
  
  return {
    device_type: deviceType,
    user_agent: ua,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  }
}

interface TrackEventParams {
  event_name: string
  properties?: Record<string, any>
  user_id?: string
}

/**
 * Track custom event (DUAL: PostHog + Supabase)
 */
export async function trackEvent({ event_name, properties = {}, user_id }: TrackEventParams) {
  try {
    // First line of defense: never fire tracking requests from automation
    // browsers (Selenium / Puppeteer / Playwright / headless Chrome) or
    // from obvious bot UAs. The server filters the same traffic again as
    // a safety net, but stopping here also saves the network round-trip.
    //
    // Sinds de Meta-telling naast onze eigen administratie bleek te lopen,
    // gaat dit via dezelfde poort als de pixel. Twee systemen die hetzelfde
    // moeten meten, moeten precies hetzelfde weigeren: automatisering, eigen
    // beheersessies, en alles wat niet op het echte winkeldomein staat.
    if (!magMeten().mag) {
      return
    }

    const sessionId = getSessionId()
    const deviceInfo = getDeviceInfo()
    
    // 1. Track in PostHog (for session recordings & heatmaps)
    if (posthog.__loaded) {
      posthog.capture(event_name, {
        ...properties,
        session_id: sessionId,
        ...deviceInfo,
      })
    }
    
    // 2. Track in Supabase via API (country from edge headers: x-vercel-ip-country, etc.)
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        event_name,
        event_properties: properties,
        session_id: sessionId,
        user_id: user_id || null,
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer || null,
        ...deviceInfo,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[Analytics] Supabase track API error:', res.status, text)
    }
  } catch (error) {
    console.error(`[Analytics] Error tracking ${event_name}:`, error)
  }
}

/**
 * Track product view
 */
export function trackProductView(product: {
  id: string
  name: string
  category: string
  price: number
}) {
  trackEvent({
    event_name: 'product_view',
    properties: {
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      price: product.price,
    },
  })
}

/**
 * Track add to cart
 *
 * Kleur, maat en variant horen hier ook in. Zonder die drie staat er in de
 * meting alleen "MOSE Essential Hoodie, 75 euro" en kun je niet nagaan welke
 * kleur en welke maat de advertenties opleveren, terwijl de advertenties juist
 * rechtstreeks naar een kleur linken. Naar Meta ging die informatie al mee in
 * `content_name`; wij bewaarden hem zelf niet.
 *
 * `variant_id` en `sku` staan erbij zodat een mandje later aan de voorraad te
 * koppelen is: dat is het niveau waarop uitverkocht raken gebeurt.
 */
export function trackAddToCart(product: {
  id: string
  name: string
  category: string
  price: number
  quantity: number
  color?: string | null
  size?: string | null
  variantId?: string | null
  sku?: string | null
  /** Waar de klant hem in de mand legde: productpagina, winkelmand, verlanglijst. */
  source?: 'pdp' | 'cart_upsell' | 'wishlist' | 'giftcard'
  /** Op welke knop gedrukt is: de knop in de pagina of de vaste balk onderin. */
  button?: 'hoofdknop' | 'vaste_balk'
  /** Heeft de bezoeker de maat zelf aangetikt, of stond onze voorselectie er nog? */
  sizeChosenByUser?: boolean
  /** Idem voor de kleur. */
  colorChosenByUser?: boolean
  /** Kwam de kleur uit de link, zoals bij een advertentie die op ?color= landt? */
  colorFromUrl?: boolean
}) {
  trackEvent({
    event_name: 'add_to_cart',
    properties: {
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      price: product.price,
      quantity: product.quantity,
      value: product.price * product.quantity,
      color: product.color || null,
      size: product.size || null,
      variant_id: product.variantId || null,
      sku: product.sku || null,
      source: product.source || 'pdp',
      button: product.button || null,
      size_chosen_by_user: product.sizeChosenByUser ?? null,
      color_chosen_by_user: product.colorChosenByUser ?? null,
      color_from_url: product.colorFromUrl ?? null,
    },
  })
}

/**
 * Track checkout started
 */
export function trackCheckoutStarted(cart: {
  items_count: number
  total_value: number
}) {
  trackEvent({
    event_name: 'checkout_started',
    properties: {
      items_count: cart.items_count,
      value: cart.total_value,
    },
  })
}

/**
 * Track purchase
 *
 * LET OP: `items[].id` MOET de product-UUID zijn, niet de order_items-rij-id.
 * get_product_performance() groepeert views (event_properties->>'product_id')
 * en aankopen (items[].id) op diezelfde ene sleutel. Gaat hier de orderregel-id
 * mee, dan krijgt elke verkoop een sleutel die nooit met de views matcht en
 * splitst het product in de admin in een rij met alle views en een rij met alle
 * omzet. `product_id` gaat expliciet mee zodat de RPC niet hoeft te gokken,
 * `order_item_id` blijft bewaard voor herleidbaarheid.
 */
export function trackPurchase(order: {
  id: string
  total: number
  items_count: number
  items: Array<{
    id: string
    product_id?: string | null
    order_item_id?: string
    name: string
    quantity: number
    price: number
  }>
}) {
  trackEvent({
    event_name: 'purchase',
    properties: {
      order_id: order.id,
      value: order.total,
      items_count: order.items_count,
      items: order.items,
    },
  })
}

/**
 * Identify user (when they log in)
 */
export function identifyUser(user: {
  id: string
  email: string
  name?: string
}) {
  if (posthog.__loaded) {
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    })
  }
}









