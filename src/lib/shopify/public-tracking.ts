import { orderSchema } from './orders'
import { safeTrackingUrl } from './order-views'

/** An exact email + complete public order number is required. Never return the
 * raw provider snapshot or use a guessed UUID prefix to authorize native orders. */
export function publicShopifyTracking(snapshot: unknown, email: string, reference: string) {
  const parsed = orderSchema.safeParse(snapshot)
  if (!parsed.success) return null
  const order = parsed.data
  if (!order.email || order.email.trim().toLowerCase() !== email.trim().toLowerCase() || order.name !== `#${reference.replace(/^#/, '')}`) return null
  const shipments = order.fulfillments.filter(f => f.status === 'SUCCESS')
  const activeLines = order.lineItems.nodes.filter(line => line.currentQuantity > 0)
  const allShipped = activeLines.length > 0 && activeLines.every(line => shipments.reduce((n, f) => n + f.fulfillmentLineItems.nodes.filter(l => l.lineItem.id === line.id).reduce((q, l) => q + l.quantity, 0), 0) >= line.currentQuantity)
  const delivered = allShipped && shipments.every(f => f.displayStatus === 'DELIVERED')
  const status = order.cancelledAt ? 'cancelled' : order.displayFinancialStatus === 'REFUNDED' ? 'refunded' : delivered ? 'delivered' : allShipped ? 'shipped' : shipments.length ? 'partially_shipped' : ['PAID', 'PARTIALLY_REFUNDED'].includes(order.displayFinancialStatus ?? '') ? 'paid' : 'pending'
  const tracking = shipments.flatMap(f => f.trackingInfo).map(t => ({ carrier: t.company, code: t.number, url: safeTrackingUrl(t.url) }))
  return {
    id: order.name.replace(/^#/, ''), status, created_at: order.createdAt ?? null, updated_at: order.updatedAt,
    total: Number(order.currentTotalPriceSet.shopMoney.amount), currency: order.currencyCode,
    tracking_code: tracking[0]?.code ?? null, tracking_url: tracking[0]?.url ?? null,
    carrier: tracking[0]?.carrier ?? null, estimated_delivery_date: null, shipments: tracking,
    order_items: activeLines.map(line => ({ product_name: line.name, quantity: line.currentQuantity, size: '', color: '' })),
  }
}
