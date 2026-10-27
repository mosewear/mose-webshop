import { z } from 'zod'
import { admin } from './client'
import { ORDER_QUERY } from './admin-queries'

const id = z.string().regex(/^gid:\/\/shopify\/[A-Za-z]+\/\d+$/)
const time = z.string().datetime({ offset: true })
const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
const money = z.object({ shopMoney: z.object({ amount: z.string().regex(/^\d+(\.\d+)?$/), currencyCode: z.string().length(3) }) })
const line = z.object({ id, name: z.string(), sku: z.string().nullable(), quantity: z.number().int().nonnegative(),
  currentQuantity: z.number().int().nonnegative(), variant: z.object({ id }).nullable(), originalUnitPriceSet: money, discountedTotalSet: money })
const fulfillmentLine = z.object({ quantity: z.number().int().nonnegative(), lineItem: z.object({ id }) })
const fulfillment = z.object({ id, status: z.string(), createdAt: time, updatedAt: time,
  location: z.object({ id, name: z.string() }).nullable(),
  trackingInfo: z.array(z.object({ company: z.string().nullable(), number: z.string().nullable(), url: z.string().nullable() })),
  fulfillmentLineItems: z.object({ nodes: z.array(fulfillmentLine), pageInfo }) })
const refund = z.object({ id, createdAt: time, totalRefundedSet: money,
  refundLineItems: z.object({ nodes: z.array(fulfillmentLine.extend({ restockType: z.string() })), pageInfo }) })
const fulfillmentOrder = z.object({ id, status: z.string(), requestStatus: z.string(),
  assignedLocation: z.object({ name: z.string(), location: z.object({ id }).nullable() }),
  lineItems: z.object({ nodes: z.array(z.object({ id, remainingQuantity: z.number().int().nonnegative(),
    totalQuantity: z.number().int().nonnegative(), lineItem: z.object({ id }) })), pageInfo }) })
export const orderSchema = z.object({ id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/), name: z.string(), updatedAt: time,
  cancelledAt: time.nullable(), displayFinancialStatus: z.string().nullable(), displayFulfillmentStatus: z.string(),
  currencyCode: z.string().length(3), currentTotalPriceSet: money, totalRefundedSet: money,
  customAttributes: z.array(z.object({ key: z.string(), value: z.string() })),
  lineItems: z.object({ nodes: z.array(line), pageInfo }), fulfillments: z.array(fulfillment), refunds: z.array(refund),
  fulfillmentOrders: z.object({ nodes: z.array(fulfillmentOrder), pageInfo }) })
export type OrderProjection = z.infer<typeof orderSchema>
export type AdminExecutor = <T>(query: string, variables: Record<string, unknown>) => Promise<T>

/** No partial projection is committed. Oversized nested records go to the visible recovery queue. */
export async function fetchOrderProjection(orderId: string, execute: AdminExecutor = admin, deadline = Date.now() + 40_000): Promise<OrderProjection> {
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderId)) throw new Error('INVALID_ORDER_ID')
  let after: string | null = null
  let projected: OrderProjection | undefined
  const seen = new Set<string>()
  for (let page = 0; page < 50; page++) {
    if (Date.now() + 15_000 > deadline) throw new Error('ORDER_READ_TIME_BUDGET')
    const result = await execute<{ order: unknown }>(ORDER_QUERY, { id: orderId, after })
    if (!result.order) throw new Error('ORDER_NOT_ACCESSIBLE')
    const parsed = orderSchema.safeParse(result.order)
    if (!parsed.success) throw new Error('INVALID_ORDER_RESPONSE')
    const order = parsed.data
    if (order.id !== orderId) throw new Error('ORDER_ID_MISMATCH')
    if (order.fulfillments.length >= 100 || order.fulfillmentOrders.pageInfo.hasNextPage ||
      order.fulfillments.some(f => f.fulfillmentLineItems.pageInfo.hasNextPage) ||
      order.refunds.some(r => r.refundLineItems.pageInfo.hasNextPage) ||
      order.fulfillmentOrders.nodes.some(f => f.lineItems.pageInfo.hasNextPage)) throw new Error('ORDER_REQUIRES_EXTENDED_PAGINATION')
    if (projected && projected.updatedAt !== order.updatedAt) throw new Error('ORDER_CHANGED_DURING_READ')
    if (!projected) projected = order
    else projected.lineItems.nodes.push(...order.lineItems.nodes)
    if (!order.lineItems.pageInfo.hasNextPage) {
      if (new Set(projected.lineItems.nodes.map(l => l.id)).size !== projected.lineItems.nodes.length) throw new Error('DUPLICATE_ORDER_LINES')
      projected.lineItems.pageInfo = { hasNextPage: false, endCursor: null }
      // Only our correlation values are retained; customer-authored arbitrary attributes are excluded.
      projected.customAttributes = projected.customAttributes.filter(a => ['mose_source', 'mose_attempt', 'mose_account_proof'].includes(a.key))
      return projected
    }
    const next = order.lineItems.pageInfo.endCursor
    if (!next || seen.has(next)) throw new Error('ORDER_CURSOR_INVALID')
    seen.add(next); after = next
  }
  throw new Error('ORDER_PAGINATION_LIMIT')
}
