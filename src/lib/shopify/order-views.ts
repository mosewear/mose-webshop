import { orderSchema } from './orders'

export type FulfillmentOwner = 'mose' | 'tapstitch' | 'digital' | null
export type ShopifyOrderView = {
  id: string; name: string; updatedAt: string; syncedAt: string; paymentSource: 'shopify'
  financialStatus: string; fulfillmentStatus: string; cancelled: boolean; currency: string
  total: string; refunded: string
  lines: { id: string; name: string; quantity: number; currentQuantity: number; shippedQuantity: number; owner: FulfillmentOwner }[]
  shipments: { id: string; status: string; displayStatus: string | null; tracking: { company: string | null; number: string | null; url: string | null }[]; lines: { id: string; quantity: number }[] }[]
}
export type OrderRow = { snapshot: unknown; synced_at: string }
export type OwnerRow = { line_id: string; fulfillment_owner: string | null }

export function safeTrackingUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

/** Explicit public DTO: never serialize the raw snapshot, account proof, email or cart tokens. */
export function toShopifyOrderView(row: OrderRow, owners: OwnerRow[], audience: 'admin' | 'account'): ShopifyOrderView {
  const order = orderSchema.parse(row.snapshot)
  const ownerByLine = new Map(owners.map(line => [line.line_id, line.fulfillment_owner]))
  const shipments = order.fulfillments.filter(f => f.status === 'SUCCESS').map(f => ({
    id: f.id, status: f.status, displayStatus: f.displayStatus ?? null,
    tracking: f.trackingInfo.map(t => ({ company: t.company, number: t.number, url: safeTrackingUrl(t.url) })),
    lines: f.fulfillmentLineItems.nodes.map(l => ({ id: l.lineItem.id, quantity: l.quantity })),
  }))
  return {
    id: order.id, name: order.name, updatedAt: order.updatedAt, syncedAt: row.synced_at,
    paymentSource: 'shopify', financialStatus: order.displayFinancialStatus ?? 'UNKNOWN',
    fulfillmentStatus: order.displayFulfillmentStatus, cancelled: order.cancelledAt !== null,
    currency: order.currencyCode, total: order.currentTotalPriceSet.shopMoney.amount, refunded: order.totalRefundedSet.shopMoney.amount,
    lines: order.lineItems.nodes.map(line => {
      const owner = ownerByLine.get(line.id)
      return { id: line.id, name: line.name, quantity: line.quantity, currentQuantity: line.currentQuantity,
        shippedQuantity: shipments.reduce((total, shipment) => total + shipment.lines.filter(l => l.id === line.id).reduce((n, l) => n + l.quantity, 0), 0),
        // Supplier routing is operational data. Customers deal with MOSE for every order.
        owner: audience === 'admin' && (owner === 'mose' || owner === 'tapstitch' || owner === 'digital') ? owner : null,
      }
    }), shipments,
  }
}
