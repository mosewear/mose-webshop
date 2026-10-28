import { z } from 'zod'

const cents = z.number().int().min(0).max(100_000_000)
/** Server-produced, cumulative EUR settlement facts, never webhook/client input.
 * A reviewed adapter must establish the eligible spend and actual discount from
 * authoritative Admin payment/refund data before calling the ledger RPC.
 */
export const loyaltySettlementSchema = z.object({
  orderId: z.string().regex(/^gid:\/\/shopify\/Order\/[1-9]\d*$/),
  sourceUpdatedAt: z.string().datetime({ offset: true }),
  eligiblePaidCents: cents,
  eligibleRefundedCents: cents,
  redemptionDiscountCents: cents,
  redemptionRestoredPoints: z.number().int().min(0).max(20_000_000),
}).strict().refine(s => s.eligibleRefundedCents <= s.eligiblePaidCents, 'Refund exceeds paid eligible spend')
export type LoyaltySettlement = z.infer<typeof loyaltySettlementSchema>

export function loyaltySettlementRpcArgs(input: unknown) {
  const s = loyaltySettlementSchema.parse(input)
  return {
    p_order_id: s.orderId,
    p_source_updated_at: s.sourceUpdatedAt,
    p_paid_cents: s.eligiblePaidCents,
    p_refunded_cents: s.eligibleRefundedCents,
    p_discount_cents: s.redemptionDiscountCents,
    p_restored_points: s.redemptionRestoredPoints,
  }
}

/** Use cumulative refunds, so two €0.60 refunds reverse one point together.
 * Never round each delivery independently or subtract refunds twice on replay.
 */
export function settlementPoints(input: unknown) {
  const s = loyaltySettlementSchema.parse(input)
  const earned = Math.floor(s.eligiblePaidCents / 100)
  const reversed = Math.min(earned, Math.floor(s.eligibleRefundedCents / 100))
  return { earned, reversed, net: earned - reversed }
}
