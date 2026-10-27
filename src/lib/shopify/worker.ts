import { createServiceClient } from '@/lib/supabase/service'
import { ShopifyUnavailable } from './client'
import { fetchOrderProjection } from './orders'

export type InboxEvent = { id: number; topic: string; payload: Record<string, unknown>; lease_token: string }
export type EventPlan = { kind: 'order'; orderId: string } | { kind: 'product'; productId: string } | { kind: 'uninstall' }
function numericId(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)) return value
  throw new Error('INVALID_EVENT_RESOURCE')
}
export function planEvent(event: Pick<InboxEvent, 'topic' | 'payload'>): EventPlan {
  if (event.topic === 'app/uninstalled') return { kind: 'uninstall' }
  if (['products/update', 'products/delete'].includes(event.topic)) {
    return { kind: 'product', productId: `gid://shopify/Product/${numericId(event.payload.id)}` }
  }
  if (event.topic.startsWith('orders/') || event.topic === 'reconcile/order') {
    const gid = event.payload.admin_graphql_api_id
    if (typeof gid === 'string' && /^gid:\/\/shopify\/Order\/[1-9]\d*$/.test(gid)) return { kind: 'order', orderId: gid }
    return { kind: 'order', orderId: `gid://shopify/Order/${numericId(event.payload.id)}` }
  }
  if (event.topic === 'refunds/create' || ['fulfillments/create', 'fulfillments/update'].includes(event.topic)) {
    return { kind: 'order', orderId: `gid://shopify/Order/${numericId(event.payload.order_id)}` }
  }
  throw new Error('UNSUPPORTED_EVENT')
}

export function safeWorkerError(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  return /^[A-Z][A-Z0-9_]{1,79}$/.test(code) ? code : 'WORKER_FAILED'
}

/** This worker only mirrors orders. No stock, payment, email, supplier or label side effects. */
export async function runOrderWorker(db = createServiceClient(), fetchOrder = fetchOrderProjection) {
  const result = { processed: 0, failed: 0, leaseLost: 0 }
  const deadline = Date.now() + 50_000
  for (let count = 0; count < 5 && Date.now() + 16_000 < deadline; count++) {
    const claimed = await db.rpc('claim_shopify_events', { batch_size: 1 })
    if (claimed.error) throw new Error('QUEUE_UNAVAILABLE')
    const event = claimed.data?.[0] as InboxEvent | undefined
    if (!event) break
    try {
      const plan = planEvent(event)
      const projection = plan.kind === 'order' ? await fetchOrder(plan.orderId, undefined, deadline) : null
      const saved = await db.rpc('complete_shopify_event', { p_id: event.id, p_lease: event.lease_token,
        p_projection: projection, p_product_id: plan.kind === 'product' ? plan.productId : null, p_uninstalled: plan.kind === 'uninstall' })
      if (saved.error) throw new Error('PROJECTION_WRITE_FAILED')
      if (saved.data !== true) result.leaseLost++
      else result.processed++
    } catch (error) {
      const code = safeWorkerError(error)
      if (error instanceof ShopifyUnavailable && error.code === 'SHOPIFY_ACCESS_DENIED') {
        const closed = await db.from('shopify_integration_state').update({ checkout_enabled: false, last_error: code }).eq('id', 1)
        if (closed.error) throw new Error('FAIL_CLOSED_WRITE_FAILED')
      }
      const failure = await db.rpc('fail_shopify_event', { p_id: event.id, p_lease: event.lease_token, p_error: code })
      if (failure.error) throw new Error('QUEUE_FAILURE_WRITE_FAILED')
      if (failure.data !== true) result.leaseLost++
      else result.failed++
    }
  }
  return result
}
