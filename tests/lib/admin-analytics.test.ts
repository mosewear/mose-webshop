// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ overview: vi.fn(), rows: vi.fn() }))
vi.mock('@/lib/admin-order-overview', () => ({ readAdminOrderOverview: mocks.overview, readAllAdminRows: mocks.rows }))
vi.mock('@/lib/shopify/client', () => ({ admin: vi.fn() }))
import { buildAdminAnalytics, readAdminAnalytics } from '@/lib/admin-analytics'
import { computePeriodStats, resolveDateWindow } from '@/lib/admin-order-metrics'
const now = new Date('2026-10-29T22:00:00Z')
const order = (extra = {}) => ({ id: '1', source: 'shopify', status: 'processing', payment_status: 'paid', total: 658, revenue: 0.01, checkout_started_at: null, created_at: '2026-10-29T21:00:00Z', email: 'customer@example.com', ...extra })
const pageInfo = { hasNextPage: false, endCursor: null }
const money = { shopMoney: { amount: '0.01', currencyCode: 'EUR' } }
const item = (id: string, currentQuantity: number) => ({ id: `gid://shopify/LineItem/${id}`, name: 'Hoodie L', sku: null, quantity: 1, currentQuantity, variant: { id: 'gid://shopify/ProductVariant/1' }, originalUnitPriceSet: money, discountedTotalSet: money })
beforeEach(() => vi.clearAllMocks())
describe('combined order analytics', () => {
  it('uses captured net order values instead of retail or historical edited totals', () => {
    const data = buildAdminAnalytics([order(), order({ id: '2', revenue: 0.02, source: 'legacy' })], [], 7, now)
    expect(data.stats).toMatchObject({ totalOrders: 2, paidOrdersCount: 2, totalRevenue: 0.03 })
    expect(data.revenueHistory.reduce((sum, d) => sum + Math.round(d.revenue * 100), 0)).toBe(3)
  })
  it('never subtracts a Shopify refund twice', () => {
    const data = buildAdminAnalytics([order({ payment_status: 'partially_refunded', total: 70, revenue: 50 })], [], 30, now)
    expect(data.stats.totalRevenue).toBe(50)
    expect(data.paymentMethods[0].revenue).toBe(50)
  })
  it('ignores unpaid, out-of-window and future order revenue', () => {
    const data = buildAdminAnalytics([order(), order({ id: '2', payment_status: 'pending', revenue: 100 }), order({ id: '3', created_at: '2026-09-01T00:00:00Z' }), order({ id: '4', created_at: '2026-11-01T00:00:00Z' })], [], 7, now)
    expect(data.stats).toMatchObject({ totalOrders: 2, paidOrdersCount: 1, totalRevenue: 0.01, conversionRate: 50 })
  })
  it('detects a later completed checkout across period boundaries', () => {
    const pending = order({ source: 'legacy', payment_status: 'pending', checkout_started_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z' })
    expect(computePeriodStats([pending], [pending, order()], now.getTime()).abandonedCarts).toBe(0)
    expect(computePeriodStats([pending], [pending], now.getTime()).abandonedCarts).toBe(1)
  })
  it('uses Amsterdam midnight across the 25-hour daylight-saving day', () => {
    const window = resolveDateWindow('today', new Date('2026-10-26T12:00:00Z'))
    expect(window.currentStart.toISOString()).toBe('2026-10-25T23:00:00.000Z')
    expect(window.prevStart.toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })
  it('counts only active edited Shopify sizes and combines variants by the verified product mapping', async () => {
    const snapshot = { id: 'gid://shopify/Order/1', name: '#1001', updatedAt: '2026-10-29T21:00:00Z', cancelledAt: null, displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED', currencyCode: 'EUR', currentTotalPriceSet: money, totalRefundedSet: money, customAttributes: [], lineItems: { nodes: [item('1', 0), item('2', 1)], pageInfo }, fulfillments: [], refunds: [], fulfillmentOrders: { nodes: [], pageInfo } }
    mocks.overview.mockResolvedValue([order({ id: snapshot.id, created_at: new Date().toISOString() })])
    mocks.rows.mockImplementation(async (table: string) => ({ order_items: [], shopify_order_snapshots: [{ snapshot }], shopify_variant_mappings: [{ shopify_variant_id: 'gid://shopify/ProductVariant/1', mose_product_id: 'hoodie' }], products: [{ id: 'hoodie', name: 'MOSE Hoodie' }], returns: [] })[table as 'products'])
    const data = await readAdminAnalytics(7)
    expect(data.topProducts).toEqual([{ product_id: 'hoodie', product_name: 'MOSE Hoodie', total_quantity: 1 }])
    expect(data.stats.totalRevenue).toBe(0.01)
  })
})
