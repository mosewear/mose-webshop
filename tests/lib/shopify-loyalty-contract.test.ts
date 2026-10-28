// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loyaltySettlementRpcArgs, settlementPoints } from '@/lib/shopify/loyalty-contract'

const settlement = { orderId: 'gid://shopify/Order/123', sourceUpdatedAt: '2026-10-28T12:00:00Z',
  eligiblePaidCents: 1099, eligibleRefundedCents: 0, redemptionDiscountCents: 500, redemptionRestoredPoints: 0 }
describe('trusted cumulative loyalty settlement contract', () => {
  it('uses integer cents and a stable server RPC contract', () => {
    expect(loyaltySettlementRpcArgs(settlement)).toEqual({ p_order_id: settlement.orderId,
      p_source_updated_at: settlement.sourceUpdatedAt, p_paid_cents: 1099, p_refunded_cents: 0,
      p_discount_cents: 500, p_restored_points: 0 })
  })
  it('accumulates partial refunds before flooring and fully reverses a refund-first settlement', () => {
    expect(settlementPoints({ ...settlement, eligibleRefundedCents: 60 })).toEqual({ earned: 10, reversed: 0, net: 10 })
    expect(settlementPoints({ ...settlement, eligibleRefundedCents: 120 })).toEqual({ earned: 10, reversed: 1, net: 9 })
    expect(settlementPoints({ ...settlement, eligibleRefundedCents: 1099 })).toEqual({ earned: 10, reversed: 10, net: 0 })
  })
  it.each([
    { eligiblePaidCents: 10.5 }, { eligiblePaidCents: '1099' }, { eligiblePaidCents: NaN },
    { eligiblePaidCents: -1 }, { eligiblePaidCents: 100_000_001 }, { eligibleRefundedCents: 1100 },
    { redemptionRestoredPoints: -1 }, { redemptionRestoredPoints: 0.5 },
    { sourceUpdatedAt: 'yesterday' }, { orderId: 'gid://shopify/Refund/123' }, { userId: 'client-supplied' },
  ])('rejects malformed/untrusted extra facts: %j', patch => {
    expect(() => loyaltySettlementRpcArgs({ ...settlement, ...patch })).toThrow()
  })
})
