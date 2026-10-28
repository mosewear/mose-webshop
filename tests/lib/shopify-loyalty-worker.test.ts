// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runLoyaltyWorker } from '@/lib/shopify/loyalty-worker'
import { ShopifyUnavailable } from '@/lib/shopify/client'
import type { createServiceClient } from '@/lib/supabase/service'
const job = { order_id: 'gid://shopify/Order/123', source_updated_at: '2026-10-28T12:00:00Z', lease_token: 'lease' }
const settlement = { orderId: job.order_id, sourceUpdatedAt: job.source_updated_at, eligiblePaidCents: 1099, eligibleRefundedCents: 0, redemptionDiscountCents: 0, redemptionRestoredPoints: 0 }
function database(reserved = false, binding = false) {
  let claimed = false
  const rpc = vi.fn(async (name: string) => {
    if (name === 'legacy_loyalty_writer_health') return { data: [{ generation: 1 }] }
    if (name === 'shopify_loyalty_health') return { data: [{ cutover_at: '2026-01-01T00:00:00Z', review_reference: 'reviewed-cutover' }] }
    if (name === 'claim_shopify_loyalty') { if (claimed) return { data: [] }; claimed = true; return { data: [job] } }
    return { data: true }
  })
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
  const from = vi.fn((table: string) => ({ update, select: () => ({ eq: () => ({
    single: async () => ({ data: { attempt_id: 'attempt' } }),
    maybeSingle: async () => ({ data: table === 'shopify_loyalty_reservations' ? reserved ? { points: 100, status: 'reserved' } : null : binding ? { code_hash: 'a'.repeat(64) } : null }),
  }) }) }))
  return { rpc, from, update, db: { rpc, from } as unknown as ReturnType<typeof createServiceClient> }
}
beforeEach(() => { vi.stubEnv('SHOPIFY_LOYALTY_SYNC_ENABLED', 'true'); vi.stubEnv('LOYALTY_ATOMIC_ENABLED', 'true') })
afterEach(() => { vi.unstubAllEnvs() })
describe('durable loyalty settlement worker', () => {
  it('requires explicit runtime and shared legacy-writer gates', async () => {
    const { db, rpc } = database()
    vi.stubEnv('LOYALTY_ATOMIC_ENABLED', '')
    await expect(runLoyaltyWorker(db)).rejects.toThrow('LOYALTY_WORKER_DISABLED')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('does not start work after the invocation budget expired', async () => {
    const { db, rpc } = database()
    await expect(runLoyaltyWorker(db, undefined, { deadline: Date.now() - 1 })).rejects.toThrow('SYNC_TIME_BUDGET')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects a missing compatibility generation or cutover before claiming work', async () => {
    const { db, rpc } = database()
    rpc.mockResolvedValueOnce({ data: [] })
    await expect(runLoyaltyWorker(db)).rejects.toThrow('LOYALTY_ATOMIC_WRITERS_UNAVAILABLE')
    expect(rpc.mock.calls).toHaveLength(1)
    const second = database(); second.rpc.mockResolvedValueOnce({ data: [{ generation: 1 }] }).mockResolvedValueOnce({ data: [] })
    await expect(runLoyaltyWorker(second.db)).rejects.toThrow('LOYALTY_CUTOVER_NOT_VERIFIED')
  })
  it('reads authoritative settlement and commits it with the current fenced lease', async () => {
    const { db, rpc } = database()
    const fetch = vi.fn().mockResolvedValue(settlement)
    expect(await runLoyaltyWorker(db, fetch)).toEqual({ processed: 1, failed: 0, leaseLost: 0 })
    expect(fetch).toHaveBeenCalledExactlyOnceWith({ orderId: job.order_id, sourceUpdatedAt: job.source_updated_at, redemption: undefined })
    expect(rpc).toHaveBeenCalledWith('complete_shopify_loyalty', { p_order: job.order_id, p_lease: job.lease_token, p_version: settlement.sourceUpdatedAt, p_paid: 1099, p_refunded: 0, p_discount: 0, p_restored: 0 })
    expect(rpc).toHaveBeenCalledWith('heartbeat_shopify_loyalty')
  })
  it('never consumes a reserved redemption without a private provider-code binding', async () => {
    const { db, rpc } = database(true)
    const fetch = vi.fn()
    expect(await runLoyaltyWorker(db, fetch)).toEqual({ processed: 0, failed: 1, leaseLost: 0 })
    expect(fetch).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('fail_shopify_loyalty', { p_order: job.order_id, p_lease: job.lease_token, p_error: 'LOYALTY_DISCOUNT_BINDING_UNAVAILABLE' })
  })
  it('passes only the bound code hash and reserved amount to the payment verifier', async () => {
    const { db } = database(true, true)
    const fetch = vi.fn().mockResolvedValue({ ...settlement, redemptionDiscountCents: 500 })
    expect((await runLoyaltyWorker(db, fetch)).processed).toBe(1)
    expect(fetch.mock.calls[0][0].redemption).toEqual({ points: 100, codeHash: 'a'.repeat(64) })
  })
  it('closes checkout on lost Admin order access and retains the retryable job', async () => {
    const { db, rpc, update } = database()
    const fetch = vi.fn().mockRejectedValue(new ShopifyUnavailable('SHOPIFY_ACCESS_DENIED'))
    expect((await runLoyaltyWorker(db, fetch)).failed).toBe(1)
    expect(update).toHaveBeenCalledWith({ checkout_enabled: false, last_error: 'SHOPIFY_ACCESS_DENIED' })
    expect(rpc).toHaveBeenCalledWith('fail_shopify_loyalty', expect.objectContaining({ p_error: 'SHOPIFY_ACCESS_DENIED' }))
  })
  it('sanitizes provider failures rather than persisting discount/customer data', async () => {
    const { db, rpc } = database()
    await runLoyaltyWorker(db, vi.fn().mockRejectedValue(new Error('private code/customer/payment data')))
    expect(rpc).toHaveBeenCalledWith('fail_shopify_loyalty', expect.objectContaining({ p_error: 'WORKER_FAILED' }))
  })
  it('reports a lost lease without claiming success or refreshing healthy heartbeat', async () => {
    const { db, rpc } = database()
    const original = rpc.getMockImplementation()!
    rpc.mockImplementation(async name => name === 'complete_shopify_loyalty' ? { data: false } : original(name))
    expect(await runLoyaltyWorker(db, vi.fn().mockResolvedValue(settlement))).toEqual({ processed: 0, failed: 0, leaseLost: 1 })
    expect(rpc).not.toHaveBeenCalledWith('heartbeat_shopify_loyalty')
  })
})
