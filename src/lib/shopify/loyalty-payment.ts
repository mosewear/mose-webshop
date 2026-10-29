import { createHash } from 'node:crypto'
import { z } from 'zod'
import { admin } from './client'
import { LOYALTY_PAYMENT_QUERY } from './loyalty-query'
import { moneyToCents } from './policy'
import { loyaltySettlementSchema, type LoyaltySettlement } from './loyalty-contract'
import type { AdminExecutor } from './orders'

const money = z.object({ amount: z.string(), currencyCode: z.literal('EUR') })
const moneyBag = z.object({ shopMoney: money, presentmentMoney: money })
const allocation = z.object({ allocatedAmountSet: moneyBag, discountApplication: z.object({ index: z.number().int().nonnegative() }) })
const allocations = z.object({ nodes: z.array(z.object({ id: z.string(), discountAllocations: z.array(allocation) })), pageInfo: z.object({ hasNextPage: z.literal(false) }) })
const paymentSchema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Order\/[1-9]\d*$/), updatedAt: z.string().datetime({ offset: true }),
  currencyCode: z.literal('EUR'), presentmentCurrencyCode: z.literal('EUR'), test: z.literal(false),
  displayFinancialStatus: z.enum(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']),
  currentTotalPriceSet: moneyBag.optional(), totalPriceSet: moneyBag, totalReceivedSet: moneyBag, totalRefundedSet: moneyBag, totalOutstandingSet: moneyBag,
  transactionsCount: z.object({ count: z.number().int().nonnegative().max(100), precision: z.literal('EXACT') }),
  transactions: z.array(z.object({
    id: z.string().regex(/^gid:\/\/shopify\/OrderTransaction\/[1-9]\d*$/),
    kind: z.enum(['SALE', 'CAPTURE', 'REFUND', 'AUTHORIZATION', 'VOID']),
    status: z.enum(['SUCCESS', 'FAILURE', 'ERROR']), test: z.literal(false),
    gateway: z.string().min(1), manualPaymentGateway: z.literal(false), amountSet: moneyBag,
  })).max(100),
  discountApplications: z.object({ nodes: z.array(z.object({ __typename: z.string(), index: z.number().int().nonnegative(), code: z.string().optional() })), pageInfo: z.object({ hasNextPage: z.literal(false) }) }),
  lineItems: allocations, shippingLines: allocations,
})

export type RedemptionBinding = { codeHash: string; points: number }
function cents(bag: z.infer<typeof moneyBag>) {
  const value = moneyToCents(bag.shopMoney.amount)
  if (value !== moneyToCents(bag.presentmentMoney.amount)) throw new Error('LOYALTY_PAYMENT_CURRENCY_MISMATCH')
  return value
}

/** Match legacy earning on the final paid total including shipping/tax, after
 * discounts. Reject unsupported tender instead of changing point eligibility.
 * Successful captures/refunds must agree with independent Admin order totals.
 */
export function paymentToLoyaltySettlement(input: unknown, expected: { orderId: string; sourceUpdatedAt: string; redemption?: RedemptionBinding }): LoyaltySettlement {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) throw new Error('LOYALTY_PAYMENT_UNSUPPORTED')
  const order = parsed.data
  if (order.id !== expected.orderId || Date.parse(order.updatedAt) !== Date.parse(expected.sourceUpdatedAt)) throw new Error('LOYALTY_PAYMENT_VERSION_MISMATCH')
  if (order.transactionsCount.count !== order.transactions.length || new Set(order.transactions.map(t => t.id)).size !== order.transactions.length) throw new Error('LOYALTY_PAYMENT_INCOMPLETE')
  if (order.transactions.some(t => /gift.?card|store.?credit|bogus/i.test(t.gateway))) throw new Error('LOYALTY_TENDER_UNSUPPORTED')
  const paid = order.transactions.filter(t => t.status === 'SUCCESS' && ['SALE', 'CAPTURE'].includes(t.kind)).reduce((n, t) => n + cents(t.amountSet), 0)
  const refunded = order.transactions.filter(t => t.status === 'SUCCESS' && t.kind === 'REFUND').reduce((n, t) => n + cents(t.amountSet), 0)
  // Inspect even failed/authorization amounts for malformed currency/precision.
  order.transactions.forEach(t => cents(t.amountSet))
  // A completed order edit can retain the historical original total while the
  // current total is fully paid. Never use this exception for refunds or debts.
  const editedFullyPaid = order.displayFinancialStatus === 'PAID' && refunded === 0 &&
    order.currentTotalPriceSet !== undefined && paid === cents(order.currentTotalPriceSet)
  if (paid !== cents(order.totalReceivedSet) || (paid !== cents(order.totalPriceSet) && !editedFullyPaid) || refunded !== cents(order.totalRefundedSet) || cents(order.totalOutstandingSet) !== 0 || refunded > paid) throw new Error('LOYALTY_PAYMENT_TOTAL_MISMATCH')
  if ((order.displayFinancialStatus === 'PAID' && refunded !== 0) || (order.displayFinancialStatus === 'REFUNDED' && refunded !== paid)) throw new Error('LOYALTY_REFUND_STATUS_MISMATCH')

  let discount = 0
  let restored = 0
  if (expected.redemption) {
    const binding = expected.redemption
    if (!/^[a-f0-9]{64}$/.test(binding.codeHash) || !Number.isSafeInteger(binding.points) || binding.points < 100 || binding.points % 100 !== 0) throw new Error('LOYALTY_DISCOUNT_BINDING_INVALID')
    const matches = order.discountApplications.nodes.filter(a => a.__typename === 'DiscountCodeApplication' && a.code && createHash('sha256').update(a.code).digest('hex') === binding.codeHash)
    if (matches.length !== 1 || new Set(order.discountApplications.nodes.map(a => a.index)).size !== order.discountApplications.nodes.length) throw new Error('LOYALTY_DISCOUNT_IDENTITY_MISMATCH')
    const index = matches[0].index
    discount = [...order.lineItems.nodes, ...order.shippingLines.nodes].flatMap(l => l.discountAllocations)
      .filter(a => a.discountApplication.index === index).reduce((n, a) => n + cents(a.allocatedAmountSet), 0)
    if (discount !== binding.points / 100 * 500) throw new Error('LOYALTY_DISCOUNT_MISMATCH')
    if (paid === 0) throw new Error('LOYALTY_ZERO_SPEND_REDEMPTION_UNSUPPORTED')
    restored = Math.floor(binding.points * refunded / paid)
  }
  return loyaltySettlementSchema.parse({ orderId: order.id, sourceUpdatedAt: order.updatedAt,
    eligiblePaidCents: paid, eligibleRefundedCents: refunded, redemptionDiscountCents: discount, redemptionRestoredPoints: restored })
}

export async function fetchLoyaltySettlement(expected: Parameters<typeof paymentToLoyaltySettlement>[1], execute: AdminExecutor = admin) {
  const response = await execute<{ order: unknown }>(LOYALTY_PAYMENT_QUERY, { id: expected.orderId })
  if (!response.order) throw new Error('LOYALTY_ORDER_NOT_ACCESSIBLE')
  return paymentToLoyaltySettlement(response.order, expected)
}
