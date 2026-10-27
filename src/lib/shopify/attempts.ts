export type CheckoutAttempt = {
  status: 'creating' | 'ready' | 'unknown' | 'failed'
  request_fingerprint: string
  lease_token: string
  expires_at: string
  cart_id: string | null
  checkout_url: string | null
}
type Decision = { kind: 'create' } | { kind: 'reuse'; url: string } |
  { kind: 'reject'; code: 'ATTEMPT_CONFLICT' | 'ATTEMPT_EXPIRED' | 'INPUT_CHANGED' | 'ATTEMPT_PENDING' | 'ATTEMPT_FAILED'; retrySafe: boolean }
/** TTL is not payment evidence. Only a definite no-cart failure allows a replacement attempt. */
export function decideCheckoutAttempt(attempt: CheckoutAttempt | undefined, fingerprint: string, lease: string, now = Date.now()): Decision {
  if (!attempt) return { kind: 'reject', code: 'ATTEMPT_CONFLICT', retrySafe: false }
  const noCartFailure = attempt.status === 'failed' && !attempt.cart_id && !attempt.checkout_url
  const expires = Date.parse(attempt.expires_at)
  if (!Number.isFinite(expires) || expires <= now) return { kind: 'reject', code: 'ATTEMPT_EXPIRED', retrySafe: noCartFailure }
  if (attempt.request_fingerprint !== fingerprint) {
    if (attempt.status === 'creating' || attempt.status === 'unknown') return { kind: 'reject', code: 'ATTEMPT_PENDING', retrySafe: false }
    return { kind: 'reject', code: 'INPUT_CHANGED', retrySafe: noCartFailure }
  }
  if (attempt.status === 'ready' && attempt.checkout_url) return { kind: 'reuse', url: attempt.checkout_url }
  if (noCartFailure) return { kind: 'reject', code: 'ATTEMPT_FAILED', retrySafe: true }
  if (attempt.status === 'creating' && attempt.lease_token === lease) return { kind: 'create' }
  return { kind: 'reject', code: 'ATTEMPT_PENDING', retrySafe: false }
}
