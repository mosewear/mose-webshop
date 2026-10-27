import { describe, expect, it } from 'vitest'
import { summarizeReadiness, type IntegrationState } from '@/lib/shopify-readiness'

const now = new Date('2026-10-27T14:00:00Z')
const env = { storefront: true, admin: true, session: true, webhook: true, checkout: true, benefits: true, frontend: true, cutover: true, sync: true }
const state: IntegrationState = { app_installed: true, checkout_enabled: true, catalog_verified: true, inventory_verified: true, benefits_verified: true, fulfillment_verified: true, market_verified: true, last_worker_at: now.toISOString(), last_reconciled_at: now.toISOString() }
const counts = { mappings: 27, released: 27, pendingEvents: 0, failedEvents: 0 }

describe('Shopify readiness evidence', () => {
  it('does not turn unavailable database evidence into zero or approval', () => {
    const result = summarizeReadiness(null, { mappings: null, released: null, pendingEvents: null, failedEvents: null }, env, now)
    expect(result.status).toBe('unknown')
    expect(result.counts.failedEvents).toBeNull()
    expect(result.checks.find(c => c.key === 'stock')?.status).toBe('unknown')
  })
  it('blocks stale, future-dated or malformed reconciliation even if switches are on', () => {
    for (const stamp of ['2026-10-27T13:44:59Z', '2026-10-27T14:00:01Z', 'invalid']) {
      expect(summarizeReadiness({ ...state, last_reconciled_at: stamp }, counts, env, now).status).toBe('blocked')
    }
  })
  it('never substitutes technical readiness for the full production signoff', () => {
    expect(summarizeReadiness(state, counts, env, now).status).toBe('technical_checks_passed')
    expect(summarizeReadiness(state, { ...counts, failedEvents: 1 }, env, now).status).toBe('blocked')
    expect(summarizeReadiness(state, counts, { ...env, frontend: false }, now).status).toBe('blocked')
  })
  it('does not confuse a recent scan with a healthy worker or known queue', () => {
    expect(summarizeReadiness({ ...state, last_worker_at: null }, counts, env, now).status).toBe('blocked')
    expect(summarizeReadiness(state, { ...counts, pendingEvents: null }, env, now).status).toBe('unknown')
    expect(summarizeReadiness(state, { ...counts, mappings: null }, env, now).status).toBe('unknown')
    expect(summarizeReadiness(state, { ...counts, pendingEvents: 30 }, env, now).status).toBe('unknown')
    expect(summarizeReadiness(state, { ...counts, pendingEvents: 30 }, env, now, '2026-10-27T13:00:00Z').status).toBe('blocked')
    expect(summarizeReadiness(state, { ...counts, pendingEvents: 1 }, env, now, '2026-10-27T13:59:00Z').status).toBe('technical_checks_passed')
  })
})
