// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decideCheckoutAttempt, type CheckoutAttempt } from '@/lib/shopify/attempts'
const now = Date.now()
const attempt: CheckoutAttempt = { status: 'ready', request_fingerprint: 'basket', lease_token: 'old',
  expires_at: new Date(now+60_000).toISOString(), cart_id: 'cart', checkout_url: 'https://mosewear.myshopify.com/checkout' }
describe('checkout attempt recovery boundary', () => {
  it('never considers expired ready, creating or unknown attempts safe to replace', () => {
    for (const status of ['ready','creating','unknown'] as const) {
      expect(decideCheckoutAttempt({ ...attempt, status, expires_at: new Date(now-1000).toISOString() }, 'basket','new',now))
        .toEqual({ kind: 'reject', code: 'ATTEMPT_EXPIRED', retrySafe: false })
    }
  })
  it('allows safe expiry recovery only after definite no-cart failure', () => {
    expect(decideCheckoutAttempt({ ...attempt, status: 'failed', cart_id: null, checkout_url: null,
      expires_at: new Date(now-1000).toISOString() }, 'basket','new',now))
      .toEqual({ kind: 'reject', code: 'ATTEMPT_EXPIRED', retrySafe: true })
  })
  it('distinguishes changed input while preserving uncertain mutations', () => {
    expect(decideCheckoutAttempt(attempt,'different','new',now)).toEqual({ kind: 'reject', code: 'INPUT_CHANGED', retrySafe: false })
    expect(decideCheckoutAttempt({ ...attempt, status: 'unknown' },'different','new',now)).toEqual({ kind: 'reject', code: 'ATTEMPT_PENDING', retrySafe: false })
  })
  it('only lets the newly reserved lease create a cart', () => {
    const creating = { ...attempt, status: 'creating' as const, cart_id: null, checkout_url: null }
    expect(decideCheckoutAttempt(creating,'basket','old',now)).toEqual({ kind: 'create' })
    expect(decideCheckoutAttempt(creating,'basket','new',now)).toEqual({ kind: 'reject', code: 'ATTEMPT_PENDING', retrySafe: false })
  })
})
