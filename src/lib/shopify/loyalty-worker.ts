import { createServiceClient } from '@/lib/supabase/service'
import { ShopifyUnavailable } from './client'
import { fetchLoyaltySettlement } from './loyalty-payment'
import { boundedSyncQuery, assertSyncBudget } from './sync-deadline'
import { safeWorkerError } from './worker'

type Job = { order_id: string; source_updated_at: string; lease_token: string }
type Options = { signal?: AbortSignal; deadline?: number }

/** No cart, discount, payment or supplier mutation; authoritative reads only.
 * Settlement and queue acknowledgement share a fenced SQL transaction.
 */
export async function runLoyaltyWorker(db: ReturnType<typeof createServiceClient> | undefined = undefined, fetchSettlement = fetchLoyaltySettlement, options: Options = {}) {
  if (process.env.SHOPIFY_LOYALTY_SYNC_ENABLED !== 'true' || process.env.LOYALTY_ATOMIC_ENABLED !== 'true') throw new Error('LOYALTY_WORKER_DISABLED')
  assertSyncBudget(options.signal, options.deadline)
  db ??= createServiceClient()
  const compatibility = await boundedSyncQuery(db.rpc('legacy_loyalty_writer_health'), options.signal)
  if (compatibility.error || compatibility.data?.[0]?.generation !== 1) throw new Error('LOYALTY_ATOMIC_WRITERS_UNAVAILABLE')
  const health = await boundedSyncQuery(db.rpc('shopify_loyalty_health'), options.signal)
  const cutoff = Date.parse(health.data?.[0]?.cutover_at ?? '')
  if (health.error || !Number.isFinite(cutoff) || cutoff > Date.now() || !health.data?.[0]?.review_reference) throw new Error('LOYALTY_CUTOVER_NOT_VERIFIED')
  const result = { processed: 0, failed: 0, leaseLost: 0 }
  const deadline = Math.min(Date.now() + 50_000, options.deadline ?? Infinity)
  for (let count = 0; count < 5 && Date.now() + 16_000 < deadline; count++) {
    assertSyncBudget(options.signal, deadline)
    const claimed = await boundedSyncQuery(db.rpc('claim_shopify_loyalty'), options.signal)
    if (claimed.error) throw new Error('LOYALTY_QUEUE_UNAVAILABLE')
    const job = claimed.data?.[0] as Job | undefined
    if (!job) break
    try {
      const ownerQuery = db.from('shopify_order_accounts').select('attempt_id').eq('order_id', job.order_id)
      const owner = await (options.signal ? ownerQuery.abortSignal(options.signal) : ownerQuery).single()
      if (owner.error || !owner.data?.attempt_id) throw new Error('LOYALTY_ORDER_OWNER_UNVERIFIED')
      const reservationQuery = db.from('shopify_loyalty_reservations').select('points,status').eq('attempt_id', owner.data.attempt_id)
      const reservation = await (options.signal ? reservationQuery.abortSignal(options.signal) : reservationQuery).maybeSingle()
      if (reservation.error) throw new Error('LOYALTY_RESERVATION_UNAVAILABLE')
      let redemption: { points: number; codeHash: string } | undefined
      if (reservation.data) {
        if (!['reserved', 'consumed'].includes(reservation.data.status)) throw new Error('LOYALTY_RESERVATION_RELEASED')
        const bindingQuery = db.from('shopify_loyalty_discount_bindings').select('code_hash').eq('attempt_id', owner.data.attempt_id)
        const binding = await (options.signal ? bindingQuery.abortSignal(options.signal) : bindingQuery).maybeSingle()
        if (binding.error || !binding.data?.code_hash) throw new Error('LOYALTY_DISCOUNT_BINDING_UNAVAILABLE')
        redemption = { points: reservation.data.points, codeHash: binding.data.code_hash }
      }
      assertSyncBudget(options.signal, deadline - 15_000)
      const settlement = await fetchSettlement({ orderId: job.order_id, sourceUpdatedAt: job.source_updated_at, redemption })
      assertSyncBudget(options.signal, deadline)
      const saved = await boundedSyncQuery(db.rpc('complete_shopify_loyalty', {
        p_order: job.order_id, p_lease: job.lease_token, p_version: settlement.sourceUpdatedAt,
        p_paid: settlement.eligiblePaidCents, p_refunded: settlement.eligibleRefundedCents,
        p_discount: settlement.redemptionDiscountCents, p_restored: settlement.redemptionRestoredPoints,
      }), options.signal)
      if (saved.error) throw new Error('LOYALTY_SETTLEMENT_WRITE_FAILED')
      if (saved.data !== true) result.leaseLost++
      else result.processed++
    } catch (error) {
      assertSyncBudget(options.signal, deadline)
      const code = safeWorkerError(error)
      if (error instanceof ShopifyUnavailable && error.code === 'SHOPIFY_ACCESS_DENIED') {
        const closed = await boundedSyncQuery(db.from('shopify_integration_state').update({ checkout_enabled: false, last_error: code }).eq('id', 1), options.signal)
        if (closed.error) throw new Error('LOYALTY_FAIL_CLOSED_WRITE_FAILED')
      }
      const failed = await boundedSyncQuery(db.rpc('fail_shopify_loyalty', { p_order: job.order_id, p_lease: job.lease_token, p_error: code }), options.signal)
      if (failed.error) throw new Error('LOYALTY_QUEUE_FAILURE_WRITE_FAILED')
      if (failed.data !== true) result.leaseLost++
      else result.failed++
    }
  }
  if (result.failed === 0 && result.leaseLost === 0) {
    const heartbeat = await boundedSyncQuery(db.rpc('heartbeat_shopify_loyalty'), options.signal)
    if (heartbeat.error) throw new Error('LOYALTY_HEARTBEAT_FAILED')
  }
  return result
}
