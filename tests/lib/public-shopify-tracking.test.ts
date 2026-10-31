// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { publicShopifyTracking } from '@/lib/shopify/public-tracking'
import type { OrderProjection } from '@/lib/shopify/orders'
const pageInfo = { hasNextPage: false, endCursor: null }
const money = { shopMoney: { amount: '69.95', currencyCode: 'EUR' } }
const time = '2026-10-27T12:00:00Z'
const lineId = 'gid://shopify/LineItem/1'
function fixture(): OrderProjection {
  return { id: 'gid://shopify/Order/1', name: '#1001', createdAt: time, updatedAt: time, cancelledAt: null,
    displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'PARTIALLY_FULFILLED', currencyCode: 'EUR',
    currentTotalPriceSet: money, totalRefundedSet: { shopMoney: { amount: '0', currencyCode: 'EUR' } },
    customAttributes: [{ key: 'mose_account_proof', value: 'secret-proof' }],
    lineItems: { nodes: [{ id: lineId, name: 'Hoodie - Black / L', sku: 'PRIVATE-SKU', quantity: 2, currentQuantity: 2,
      variant: { id: 'gid://shopify/ProductVariant/1' }, originalUnitPriceSet: money, discountedTotalSet: money }], pageInfo },
    fulfillments: [{ id: 'gid://shopify/Fulfillment/1', status: 'SUCCESS', displayStatus: 'IN_TRANSIT', createdAt: time, updatedAt: time, location: null,
      trackingInfo: [{ company: 'DHL', number: 'TRACK', url: 'https://tracking.example/track/123' }],
      fulfillmentLineItems: { nodes: [{ quantity: 1, lineItem: { id: lineId } }], pageInfo } }],
    refunds: [], fulfillmentOrders: { nodes: [], pageInfo }, email: 'customer@example.com',
  }
}
describe('public native order tracking', () => {
  it('requires both exact complete order reference and matching email', () => {
    expect(publicShopifyTracking(fixture(), 'other@example.com', '1001')).toBeNull()
    expect(publicShopifyTracking(fixture(), 'customer@example.com', '100')).toBeNull()
    expect(publicShopifyTracking(fixture(), ' CUSTOMER@example.com ', '#1001')).not.toBeNull()
    expect(publicShopifyTracking({}, 'customer@example.com', '1001')).toBeNull()
  })
  it('returns a minimal safe view of the paid order, with all current lines', () => {
    const view = publicShopifyTracking(fixture(), 'customer@example.com', '1001')!
    expect(view).toMatchObject({ id: '1001', status: 'partially_shipped', total: 69.95, currency: 'EUR', order_items: [{ product_name: 'Hoodie - Black / L', quantity: 2 }] })
    expect(JSON.stringify(view)).not.toMatch(/secret-proof|customer@example|PRIVATE-SKU|gid:/)
  })
  it('only reports delivered when every current item has been shipped and all shipments are delivered', () => {
    const order = fixture()
    order.fulfillments[0].displayStatus = 'DELIVERED'
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('partially_shipped')
    order.fulfillments[0].fulfillmentLineItems.nodes[0].quantity = 2
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('delivered')
    order.fulfillments[0].displayStatus = 'IN_TRANSIT'
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('shipped')
  })
  it('does not infer production or dispatch from payment or failed fulfillment', () => {
    const order = fixture()
    order.fulfillments[0].status = 'CANCELLED'
    expect(publicShopifyTracking(order, order.email!, '1001')).toMatchObject({ status: 'paid', shipments: [] })
    order.displayFinancialStatus = 'PENDING'
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('pending')
    order.displayFinancialStatus = 'REFUNDED'
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('refunded')
    order.cancelledAt = time
    expect(publicShopifyTracking(order, order.email!, '1001')?.status).toBe('cancelled')
  })
  it('strips executable tracking links without hiding the carrier reference', () => {
    const order = fixture()
    order.fulfillments[0].trackingInfo[0].url = 'javascript:alert(1)'
    expect(publicShopifyTracking(order, order.email!, '1001')).toMatchObject({ tracking_code: 'TRACK', tracking_url: null })
  })
})
