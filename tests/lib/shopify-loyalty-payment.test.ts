// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { fetchLoyaltySettlement, paymentToLoyaltySettlement } from '@/lib/shopify/loyalty-payment'
import type { AdminExecutor } from '@/lib/shopify/orders'
const bag = (amount: string) => ({ shopMoney: { amount, currencyCode: 'EUR' }, presentmentMoney: { amount, currencyCode: 'EUR' } })
const expected = { orderId: 'gid://shopify/Order/123', sourceUpdatedAt: '2026-10-28T12:00:00Z' }
const code = 'test-private-random-256bit-code'
const binding = { points: 100, codeHash: createHash('sha256').update(code).digest('hex') }
const fixture = () => ({
  id: expected.orderId, updatedAt: expected.sourceUpdatedAt, currencyCode: 'EUR', presentmentCurrencyCode: 'EUR', test: false,
  displayFinancialStatus: 'PAID', totalPriceSet: bag('10.99'), totalReceivedSet: bag('10.99'), totalRefundedSet: bag('0'), totalOutstandingSet: bag('0'),
  transactionsCount: { count: 1, precision: 'EXACT' },
  transactions: [{ id: 'gid://shopify/OrderTransaction/1', kind: 'SALE', status: 'SUCCESS', test: false, gateway: 'shopify_payments', manualPaymentGateway: false, amountSet: bag('10.99') }],
  discountApplications: { nodes: [{ __typename: 'DiscountCodeApplication', index: 0, code }], pageInfo: { hasNextPage: false } },
  lineItems: { nodes: [{ id: 'gid://shopify/LineItem/1', discountAllocations: [{ allocatedAmountSet: bag('5.00'), discountApplication: { index: 0 } }] }], pageInfo: { hasNextPage: false } },
  shippingLines: { nodes: [], pageInfo: { hasNextPage: false } },
})
describe('authoritative Shopify loyalty payment adapter', () => {
  it('earns from successful original paid total, preserving shipping/tax after discounts', () => {
    expect(paymentToLoyaltySettlement(fixture(), expected)).toEqual({ ...expected, eligiblePaidCents: 1099, eligibleRefundedCents: 0, redemptionDiscountCents: 0, redemptionRestoredPoints: 0 })
  })
  it('verifies the actual private code identity and allocated amount, not arbitrary attributes or total discount', () => {
    expect(paymentToLoyaltySettlement(fixture(), { ...expected, redemption: binding }).redemptionDiscountCents).toBe(500)
    expect(() => paymentToLoyaltySettlement(fixture(), { ...expected, redemption: { ...binding, codeHash: '0'.repeat(64) } })).toThrow('LOYALTY_DISCOUNT_IDENTITY_MISMATCH')
    const wrong = fixture(); wrong.lineItems.nodes[0].discountAllocations[0].allocatedAmountSet = bag('4.99')
    expect(() => paymentToLoyaltySettlement(wrong, { ...expected, redemption: binding })).toThrow('LOYALTY_DISCOUNT_MISMATCH')
  })
  it('sums partial cash refunds and uses cumulative proportional redemption restoration', () => {
    const order = fixture(); order.displayFinancialStatus = 'PARTIALLY_REFUNDED'; order.totalRefundedSet = bag('1.20')
    order.transactions.push({ ...order.transactions[0], id: 'gid://shopify/OrderTransaction/2', kind: 'REFUND', amountSet: bag('0.60') }, { ...order.transactions[0], id: 'gid://shopify/OrderTransaction/3', kind: 'REFUND', amountSet: bag('0.60') })
    order.transactionsCount.count = 3
    expect(paymentToLoyaltySettlement(order, { ...expected, redemption: binding })).toMatchObject({ eligiblePaidCents: 1099, eligibleRefundedCents: 120, redemptionRestoredPoints: 10 })
    order.displayFinancialStatus = 'REFUNDED'; order.totalRefundedSet = bag('10.99'); order.transactions[2].amountSet = bag('10.39')
    expect(paymentToLoyaltySettlement(order, { ...expected, redemption: binding }).redemptionRestoredPoints).toBe(100)
  })
  it('does not double-count an authorization followed by capture or count failed refund attempts', () => {
    const order = fixture(); order.transactions[0].kind = 'CAPTURE'
    order.transactions.push({ ...order.transactions[0], id: 'gid://shopify/OrderTransaction/2', kind: 'AUTHORIZATION' }, { ...order.transactions[0], id: 'gid://shopify/OrderTransaction/3', kind: 'REFUND', status: 'FAILURE' })
    order.transactionsCount.count = 3
    expect(paymentToLoyaltySettlement(order, expected).eligiblePaidCents).toBe(1099)
  })
  it.each<((o: ReturnType<typeof fixture>) => void)>([
    (o: ReturnType<typeof fixture>) => { o.test = true },
    o => { o.transactions[0].test = true },
    o => { o.currencyCode = 'USD' },
    o => { o.presentmentCurrencyCode = 'USD' },
    o => { o.transactions[0].status = 'PENDING' },
    o => { o.transactions[0].manualPaymentGateway = true },
    o => { o.transactionsCount.precision = 'AT_LEAST' },
    o => { o.lineItems.pageInfo.hasNextPage = true },
    o => { o.shippingLines.pageInfo.hasNextPage = true },
    o => { o.discountApplications.pageInfo.hasNextPage = true },
  ])('rejects unsupported/incomplete payment records', mutate => {
    const order = fixture(); mutate(order)
    expect(() => paymentToLoyaltySettlement(order, expected)).toThrow('LOYALTY_PAYMENT_UNSUPPORTED')
  })
  it.each(['gift_card', 'store_credit', 'bogus'])('rejects unsupported tender %s', gateway => {
    const order = fixture(); order.transactions[0].gateway = gateway
    expect(() => paymentToLoyaltySettlement(order, expected)).toThrow('LOYALTY_TENDER_UNSUPPORTED')
  })
  it('rejects stale versions, duplicates, partial responses, fractional cents and inconsistent totals', () => {
    const version = fixture(); version.updatedAt = '2026-10-28T12:01:00Z'
    expect(() => paymentToLoyaltySettlement(version, expected)).toThrow('LOYALTY_PAYMENT_VERSION_MISMATCH')
    const duplicate = fixture(); duplicate.transactions.push(duplicate.transactions[0]); duplicate.transactionsCount.count = 2
    expect(() => paymentToLoyaltySettlement(duplicate, expected)).toThrow('LOYALTY_PAYMENT_INCOMPLETE')
    const incomplete = fixture(); incomplete.transactionsCount.count = 2
    expect(() => paymentToLoyaltySettlement(incomplete, expected)).toThrow('LOYALTY_PAYMENT_INCOMPLETE')
    const fractional = fixture(); fractional.transactions[0].amountSet = bag('10.999')
    expect(() => paymentToLoyaltySettlement(fractional, expected)).toThrow('INVALID_MONEY')
    const mismatch = fixture(); mismatch.totalReceivedSet = bag('9.99')
    expect(() => paymentToLoyaltySettlement(mismatch, expected)).toThrow('LOYALTY_PAYMENT_TOTAL_MISMATCH')
    const currency = fixture(); currency.transactions[0].amountSet.presentmentMoney.amount = '9.99'
    expect(() => paymentToLoyaltySettlement(currency, expected)).toThrow('LOYALTY_PAYMENT_CURRENCY_MISMATCH')
  })
  it('fetches by trusted order ID and validates provider response before returning settlement', async () => {
    const execute = vi.fn().mockResolvedValue({ order: fixture() })
    expect((await fetchLoyaltySettlement(expected, execute as AdminExecutor)).eligiblePaidCents).toBe(1099)
    expect(execute.mock.calls[0][1]).toEqual({ id: expected.orderId })
    execute.mockResolvedValue({ order: null })
    await expect(fetchLoyaltySettlement(expected, execute as AdminExecutor)).rejects.toThrow('LOYALTY_ORDER_NOT_ACCESSIBLE')
  })
})

 it('accepts a fully paid size edit using the current total without earning on historical removed items',()=>{
  const order={...fixture(),totalPriceSet:bag('21.98'),currentTotalPriceSet:bag('10.99')}
  expect(paymentToLoyaltySettlement(order,expected).eligiblePaidCents).toBe(1099)
  expect(()=>paymentToLoyaltySettlement({...order,currentTotalPriceSet:bag('11.00')},expected)).toThrow('LOYALTY_PAYMENT_TOTAL_MISMATCH')
 })
