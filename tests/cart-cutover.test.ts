import { afterEach, describe, expect, it, vi } from 'vitest'
import { legacyPaymentDecision } from '@/lib/checkout-cutover'

const cutoff = '2026-11-03T10:00:00+01:00'
const historical = { created_at: '2026-11-03T08:59:59Z', payment_status: 'pending', status: 'pending' }

describe('Shopify cutover and legacy recovery', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('allows pre-cutover orders, not orders at or after the cutover (timezone aware)', () => {
    expect(legacyPaymentDecision(historical, true, cutoff)).toBe('allow')
    expect(legacyPaymentDecision({ ...historical, created_at: '2026-11-03T09:00:00Z' }, true, cutoff)).toBe('not_historical')
    expect(legacyPaymentDecision({ ...historical, created_at: '2026-11-04T08:00:00Z' }, true, cutoff)).toBe('not_historical')
  })
  it('fails closed when timestamp configuration or order dates are missing', () => {
    expect(legacyPaymentDecision(historical, true, '')).toBe('cutover_not_configured')
    expect(legacyPaymentDecision(historical, true, '2026-11-03')).toBe('cutover_not_configured')
    expect(legacyPaymentDecision({ ...historical, created_at: null }, true, cutoff)).toBe('not_historical')
  })
  it('never reopens paid, refunded or cancelled historical orders', () => {
    for (const payment_status of ['paid', 'refunded', 'unknown']) {
      expect(legacyPaymentDecision({ ...historical, payment_status }, true, cutoff)).toBe('not_payable')
    }
    expect(legacyPaymentDecision({ ...historical, status: 'cancelled' }, true, cutoff)).toBe('not_payable')
    expect(legacyPaymentDecision({ ...historical, payment_status: 'failed' }, true, cutoff)).toBe('allow')
  })
  it('does not change historical behavior before activation', () => {
    expect(legacyPaymentDecision(historical, false, undefined)).toBe('allow')
  })
})
