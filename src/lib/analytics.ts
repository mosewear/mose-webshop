/**
 * Custom Analytics Helper
 * Dual tracking: PostHog (for session recordings & heatmaps) + Supabase (for custom queries)
 */

'use client'

import posthog from '@/lib/posthog-client'
import { createClient } from '@/lib/supabase/client'

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
    
    // 2. Track in Supabase (for custom analytics queries)
    const supabase = createClient()
    const { error } = await supabase.from('analytics_events').insert({
      event_name,
      event_properties: properties,
      session_id: sessionId,
      user_id: user_id || null,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || null,
      ...deviceInfo,
    })
    
    if (error) {
      console.error('[Analytics] ❌ Supabase error:', error)
    } else {
      console.log(`[Analytics] ✅ ${event_name}`, properties)
    }
  } catch (error) {
    console.error(`[Analytics] ❌ Error tracking ${event_name}:`, error)
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
 */
export function trackAddToCart(product: {
  id: string
  name: string
  category: string
  price: number
  quantity: number
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
 */
export function trackPurchase(order: {
  id: string
  total: number
  items_count: number
  items: Array<{ id: string; name: string; quantity: number; price: number }>
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









