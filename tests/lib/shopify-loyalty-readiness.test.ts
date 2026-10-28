import { describe, expect, it } from 'vitest'
import { loyaltyRuntimeReady } from '@/lib/shopify/loyalty-readiness'
const now = Date.parse('2026-10-28T12:00:00Z')
const healthy = { cutover_at: '2026-10-28T10:00:00Z', review_reference: 'reviewed-cutover', last_worker_at: '2026-10-28T11:59:00Z', pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }
describe('loyalty computed readiness', () => {
  it('requires a reviewed cutover and recent successful worker', () => {
    expect(loyaltyRuntimeReady(healthy, now)).toBe(true)
    expect(loyaltyRuntimeReady(null, now)).toBe(false)
  })
  it.each([{ cutover_at: null }, { cutover_at: '2026-10-29T10:00:00Z' }, { review_reference: '' }, { last_worker_at: null }, { last_worker_at: '2026-10-28T11:00:00Z' }, { pending_count: null }, { pending_count: -1 }, { pending_count: 1 }, { dead_letter_count: null }, { dead_letter_count: 1 }])('fails closed for missing/stale state %j', patch => {
    expect(loyaltyRuntimeReady({ ...healthy, ...patch }, now)).toBe(false)
  })
  it('accepts a fresh pending event but blocks a stale queue', () => {
    expect(loyaltyRuntimeReady({ ...healthy, pending_count: 1, oldest_pending_at: '2026-10-28T11:59:00Z' }, now)).toBe(true)
    expect(loyaltyRuntimeReady({ ...healthy, pending_count: 1, oldest_pending_at: '2026-10-28T11:00:00Z' }, now)).toBe(false)
  })
})
