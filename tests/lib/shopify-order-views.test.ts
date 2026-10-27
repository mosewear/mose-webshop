// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { safeTrackingUrl, toShopifyOrderView } from '@/lib/shopify/order-views'
const pageInfo = { hasNextPage: false, endCursor: null }
const money = { shopMoney: { amount: '69.95', currencyCode: 'EUR' } }
const time = '2026-10-27T12:00:00Z'
const lineId = 'gid://shopify/LineItem/1'
function fixture() {
  return { id: 'gid://shopify/Order/1', name: '#1001', updatedAt: time, cancelledAt: null,
    displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'PARTIALLY_FULFILLED', currencyCode: 'EUR',
    currentTotalPriceSet: money, totalRefundedSet: { shopMoney: { amount: '0', currencyCode: 'EUR' } },
    customAttributes: [{ key: 'mose_account_proof', value: 'secret-proof' }],
    lineItems: { nodes: [{ id: lineId, name: 'Hoodie', sku: null, quantity: 2, currentQuantity: 2,
      variant: { id: 'gid://shopify/ProductVariant/1' }, originalUnitPriceSet: money, discountedTotalSet: money }], pageInfo },
    fulfillments: [{ id: 'gid://shopify/Fulfillment/1', status: 'SUCCESS', createdAt: time, updatedAt: time, location: null,
      trackingInfo: [{ company: 'DHL', number: 'TRACK', url: 'https://tracking.example/track/123' }],
      fulfillmentLineItems: { nodes: [{ quantity: 1, lineItem: { id: lineId } }], pageInfo } }],
    refunds: [], fulfillmentOrders: { nodes: [], pageInfo }, email: 'private@example.com', cartToken: 'private-cart',
  }
}
describe('safe Shopify order views', () => {
  it('exposes only the public order projection and hides supplier routing from customers', () => {
    const view = toShopifyOrderView({ snapshot: fixture(), synced_at: time }, [{ line_id: lineId, fulfillment_owner: 'tapstitch' }], 'account')
    expect(JSON.stringify(view)).not.toMatch(/secret-proof|private@example|private-cart|tapstitch/)
    expect(view.paymentSource).toBe('shopify')
    expect(view.lines[0]).toMatchObject({ quantity: 2, shippedQuantity: 1, owner: null })
    expect(view.shipments[0].lines).toEqual([{ id: lineId, quantity: 1 }])
  })
  it('shows supplier routing to admins and never counts failed/cancelled fulfillment as shipped', () => {
    const order = fixture()
    order.fulfillments.push({ ...order.fulfillments[0], id: 'gid://shopify/Fulfillment/2', status: 'CANCELLED' })
    const view = toShopifyOrderView({ snapshot: order, synced_at: time }, [{ line_id: lineId, fulfillment_owner: 'tapstitch' }], 'admin')
    expect(view.lines[0]).toMatchObject({ owner: 'tapstitch', shippedQuantity: 1 })
    expect(view.shipments).toHaveLength(1)
  })
  it('makes missing routing explicit instead of assigning Tapstitch items to MOSE', () => {
    expect(toShopifyOrderView({ snapshot: fixture(), synced_at: time }, [], 'admin').lines[0].owner).toBe(null)
  })
  it('removes executable and credential-bearing tracking URLs', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,unsafe', 'http://tracking.example', 'https://user:pass@tracking.example', 'not-a-url']) {
      expect(safeTrackingUrl(value)).toBe(null)
    }
    expect(safeTrackingUrl('https://tracking.example/123')).toBe('https://tracking.example/123')
  })
  it('does not replace malformed authoritative snapshots with misleading empty orders', () => {
    expect(() => toShopifyOrderView({ snapshot: {}, synced_at: time }, [], 'account')).toThrow()
  })
})
