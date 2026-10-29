import { readAdminOrderOverview, readAllAdminRows } from '@/lib/admin-order-overview'
import { computePeriodStats, moneyCents, resolveDateWindow, type OrderMetricRow } from '@/lib/admin-order-metrics'
import { orderSchema } from '@/lib/shopify/orders'

type OverviewOrder = OrderMetricRow & { id: string; payment_method?: string | null }
export interface AnalyticsProductLine { order_id: string; product_id: string; product_name: string; quantity: number }
const paidStatuses = new Set(['paid', 'partially_paid', 'partially_refunded', 'refunded'])
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/** Order cohorts use the same rolling windows and net received values as the dashboard. */
export function buildAdminAnalytics(orders: OverviewOrder[], lines: AnalyticsProductLine[], days: 7 | 30 | 90, now = new Date()) {
  const { currentStart } = resolveDateWindow(`${days}d`, now)
  const cohort = orders.filter(o => new Date(o.created_at) >= currentStart && new Date(o.created_at) <= now)
  const metrics = computePeriodStats(cohort, orders, now.getTime())
  const paid = cohort.filter(o => paidStatuses.has(o.payment_status))
  const activePaidIds = new Set(paid.filter(o => o.payment_status !== 'refunded' && o.status !== 'cancelled').map(o => o.id))
  const methods = new Map<string, { count: number; cents: number }>()
  const daily = new Map<string, number>()
  for (const order of paid) {
    const cents = moneyCents(order.revenue ?? order.total)
    const method = order.payment_method || (order.source === 'shopify' ? 'Shopify' : 'unknown')
    const bucket = methods.get(method) ?? { count: 0, cents: 0 }
    bucket.count++; bucket.cents += cents; methods.set(method, bucket)
    const key = dayKey(new Date(order.created_at))
    daily.set(key, (daily.get(key) ?? 0) + cents)
  }
  const products = new Map<string, { product_id: string; product_name: string; total_quantity: number }>()
  for (const line of lines) {
    if (!activePaidIds.has(line.order_id)) continue
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) throw new Error('INVALID_ANALYTICS_QUANTITY')
    if (!line.quantity) continue
    const product = products.get(line.product_id) ?? { product_id: line.product_id, product_name: line.product_name, total_quantity: 0 }
    product.total_quantity += line.quantity; products.set(line.product_id, product)
  }
  const history: { date: string; revenue: number }[] = []
  // Iterate date keys at UTC noon to avoid skipping/repeating days during Amsterdam DST changes.
  const first = new Date(dayKey(currentStart) + 'T12:00:00Z')
  const last = dayKey(now)
  for (let date = first; date.toISOString().slice(0, 10) <= last; date = new Date(date.getTime() + 86400000)) {
    const key = date.toISOString().slice(0, 10)
    history.push({ date: date.toLocaleDateString('nl-NL', { timeZone: 'UTC', day: 'numeric', month: 'short' }), revenue: (daily.get(key) ?? 0) / 100 })
  }
  return {
    stats: { totalOrders: metrics.totalOrders, paidOrdersCount: metrics.paidOrders, pendingPaymentsCount: metrics.pendingPayments,
      abandonedCartsCount: metrics.abandonedCarts, failedPaymentsCount: cohort.filter(o => ['failed', 'voided'].includes(o.payment_status)).length,
      totalRevenue: metrics.totalRevenue, avgOrderValue: metrics.avgOrderValue, conversionRate: metrics.conversionRate },
    paymentMethods: [...methods].map(([method, value]) => ({ method, count: value.count, revenue: value.cents / 100 })).sort((a, b) => b.revenue - a.revenue || a.method.localeCompare(b.method)),
    topProducts: [...products.values()].sort((a, b) => b.total_quantity - a.total_quantity || a.product_id.localeCompare(b.product_id)).slice(0, 5),
    revenueHistory: history,
  }
}

export async function readAdminAnalytics(days: 7 | 30 | 90, readOverview: () => Promise<OverviewOrder[]> = readAdminOrderOverview) {
  const [orders, legacyLines, snapshots, mappings, productRows, returns] = await Promise.all([
    readOverview(),
    readAllAdminRows('order_items', 'id,order_id,product_id,product_name,quantity', 'id'),
    readAllAdminRows('shopify_order_snapshots', 'shopify_order_id,snapshot', 'shopify_order_id'),
    readAllAdminRows('shopify_variant_mappings', 'mose_variant_id,mose_product_id,shopify_variant_id', 'mose_variant_id'),
    readAllAdminRows('products', 'id,name', 'id'),
    readAllAdminRows('returns', 'id,order_id,status,return_items', 'id'),
  ])
  const names = new Map(productRows.map(p => [p.id, p.name]))
  const productIds = new Map(mappings.map(m => [m.shopify_variant_id, m.mose_product_id]))
  const returned = new Map<string, number>()
  for (const record of returns) {
    if (!['return_received', 'refund_processing', 'refunded', 'refund_completed'].includes(record.status)) continue
    if (!Array.isArray(record.return_items)) throw new Error('INVALID_RETURN_ITEMS')
    for (const item of record.return_items) {
      if (typeof item.order_item_id !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 0) throw new Error('INVALID_RETURN_QUANTITY')
      const key = record.order_id + ':' + item.order_item_id
      returned.set(key, (returned.get(key) ?? 0) + item.quantity)
    }
  }
  const lines: AnalyticsProductLine[] = legacyLines.map(line => {
    const quantity = Number(line.quantity) - (returned.get(line.order_id + ':' + line.id) ?? 0)
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('INVALID_CURRENT_QUANTITY')
    return { order_id: line.order_id, product_id: line.product_id || 'legacy-name:' + line.product_name,
      product_name: names.get(line.product_id) || line.product_name, quantity }
  })
  for (const row of snapshots) {
    const order = orderSchema.parse(row.snapshot)
    for (const line of order.lineItems.nodes) {
      // currentQuantity excludes removed M lines after an M→L edit and refunded units.
      if (!line.currentQuantity) continue
      const productId = productIds.get(line.variant?.id) || 'shopify-line:' + line.id
      lines.push({ order_id: order.id, product_id: productId, product_name: names.get(productId) || line.name, quantity: line.currentQuantity })
    }
  }
  // Keep all customer details in the server reader; this endpoint returns only aggregates.
  return buildAdminAnalytics(orders, lines, days)
}
