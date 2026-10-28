import type { CartItem } from '@/store/cart'

export type ShopifyCartSnapshot = {
  locale: 'nl' | 'en'
  country: 'NL'
  promoCode?: string
  loyaltyPoints?: number
  lines: { variantId: string; quantity: number }[]
}

export const SHOPIFY_ATTEMPT_STORAGE_KEY = 'mose-shopify-checkout-attempt-v1'
export type CheckoutAttempt = { snapshot: string; attemptId: string; locked?: boolean }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Only IDs and quantities go to the server. Client prices never authorize a sale. */
export function createShopifyCartSnapshot(items: CartItem[], locale: string, benefits: { promoCode?: string; loyaltyPoints?: number } = {}): ShopifyCartSnapshot {
  if (!items.length) throw new Error('INVALID_CART')
  if (items.some(item => item.isGiftCard)) throw new Error('UNSUPPORTED_CART')
  if (locale !== 'nl' && locale !== 'en') throw new Error('UNSUPPORTED_LOCALE')
  const promoCode = benefits.promoCode?.trim().toUpperCase() || undefined
  const loyaltyPoints = benefits.loyaltyPoints === 0 ? undefined : benefits.loyaltyPoints
  if (promoCode && (promoCode.length > 80 || !/^[A-Z0-9_-]+$/.test(promoCode))) throw new Error('INVALID_PROMO')
  if (loyaltyPoints !== undefined && (!Number.isSafeInteger(loyaltyPoints) || loyaltyPoints < 100 || loyaltyPoints > 20_000_000 || loyaltyPoints % 100 !== 0)) throw new Error('INVALID_LOYALTY')
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (!item.variantId || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error('INVALID_CART')
    }
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity)
  }
  if (quantities.size > 30 || [...quantities.values()].some(quantity => quantity > 10)) {
    throw new Error('INVALID_CART')
  }
  return {
    locale,
    country: 'NL',
    ...(promoCode ? { promoCode } : {}),
    ...(loyaltyPoints ? { loyaltyPoints } : {}),
    lines: [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity })),
  }
}

/** Reordering retains the attempt. Once a cart may exist, changed input needs
 * explicit server no-cart proof before a new attempt can be issued. */
export function getCheckoutAttempt(snapshot: ShopifyCartSnapshot, previous: unknown, uuid: () => string): CheckoutAttempt {
  const serialized = JSON.stringify(snapshot)
  if (previous && typeof previous === 'object') {
    const candidate = previous as CheckoutAttempt
    if (candidate.snapshot === serialized && typeof candidate.attemptId === 'string' && UUID.test(candidate.attemptId)) {
      return { snapshot: serialized, attemptId: candidate.attemptId, ...(candidate.locked ? { locked: true } : {}) }
    }
    if (candidate.locked === true && typeof candidate.attemptId === 'string' && UUID.test(candidate.attemptId)) throw new Error('ATTEMPT_REVIEW_REQUIRED')
  }
  const attemptId = uuid()
  if (!UUID.test(attemptId)) throw new Error('INVALID_ATTEMPT')
  return { snapshot: serialized, attemptId }
}

export function checkoutRedirectUrl(value: unknown, verifiedHost?: string): string {
  if (typeof value !== 'string') throw new Error('INVALID_REDIRECT')
  const url = new URL(value)
  const hosts = ['hp5szr-te.myshopify.com', 'mosewear.myshopify.com']
  if (verifiedHost && /^[a-z0-9.-]+$/.test(verifiedHost)) hosts.push(verifiedHost)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.includes(url.hostname)) {
    throw new Error('INVALID_REDIRECT')
  }
  return url.href
}

/** Rotate only when the server proves that no checkout was issued. TTL alone
 * is insufficient: an old checkout may already have been paid. */
export function canRotateCheckoutAttempt(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const result = error as { code?: unknown; retrySafe?: unknown }
  return result.retrySafe === true && typeof result.code === 'string' &&
    ['ATTEMPT_EXPIRED', 'ATTEMPT_FAILED', 'INPUT_CHANGED', 'BENEFIT_UNAVAILABLE'].includes(result.code)
}

/** Existing Mollie payment recovery remains available after the new-cart cutover. */
export function shouldUseLegacyRecovery(recoveryId: string | null, cancelled: string | null, orderId: string | null): boolean {
  return Boolean(recoveryId || (cancelled === 'true' && orderId))
}
