// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { planEvent, runOrderWorker, safeWorkerError } from '@/lib/shopify/worker'
import { fetchOrderProjection, type AdminExecutor } from '@/lib/shopify/orders'
import { reconcileOrders } from '@/lib/shopify/reconcile'
import { createServiceClient } from '@/lib/supabase/service'

const orderId = 'gid://shopify/Order/123'
const info: { hasNextPage: boolean; endCursor: string | null } = { hasNextPage: false, endCursor: null }
const amount = { shopMoney: { amount: '24.95', currencyCode: 'EUR' } }
function order(lineId = '1') {
  return { id: orderId, name: '#1', updatedAt: '2026-10-27T12:00:00Z', cancelledAt: null,
    displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED', currencyCode: 'EUR',
    currentTotalPriceSet: amount, totalRefundedSet: amount, customAttributes: [{ key: 'customer-note', value: 'private' }],
    lineItems: { nodes: [{ id: `gid://shopify/LineItem/${lineId}`, name: 'Hoodie', sku: null, quantity: 1, currentQuantity: 1,
      variant: { id: 'gid://shopify/ProductVariant/44' }, originalUnitPriceSet: amount, discountedTotalSet: amount }], pageInfo: { ...info } },
    fulfillments: [], refunds: [], fulfillmentOrders: { nodes: [], pageInfo: { ...info } } }
}

describe('authoritative order projection', () => {
  it('collects every line page and removes arbitrary customer attributes', async () => {
    const first = order('1'), second = order('2')
    first.lineItems.pageInfo = { hasNextPage: true, endCursor: 'page-2' } as typeof info
    const execute = vi.fn().mockResolvedValueOnce({ order: first }).mockResolvedValueOnce({ order: second })
    const result = await fetchOrderProjection(orderId, execute as AdminExecutor)
    expect(result.lineItems.nodes.map(l => l.id)).toEqual(['gid://shopify/LineItem/1', 'gid://shopify/LineItem/2'])
    expect(result.customAttributes).toEqual([])
    expect(execute.mock.calls[1][1].after).toBe('page-2')
  })
  it('never commits a changing order or a silently truncated fulfillment', async () => {
    const first = order(), second = order('2')
    first.lineItems.pageInfo = { hasNextPage: true, endCursor: 'next' } as typeof info
    second.updatedAt = '2026-10-27T12:01:00Z'
    const execute = vi.fn().mockResolvedValueOnce({ order: first }).mockResolvedValueOnce({ order: second })
    await expect(fetchOrderProjection(orderId, execute as AdminExecutor)).rejects.toThrow('ORDER_CHANGED_DURING_READ')
    const incomplete = order(); incomplete.fulfillmentOrders.pageInfo.hasNextPage = true
    await expect(fetchOrderProjection(orderId, vi.fn().mockResolvedValue({ order: incomplete }) as AdminExecutor)).rejects.toThrow('EXTENDED_PAGINATION')
  })
  it('rejects missing/inaccessible data instead of recording an empty order', async () => {
    await expect(fetchOrderProjection(orderId, vi.fn().mockResolvedValue({ order: null }) as AdminExecutor)).rejects.toThrow('ORDER_NOT_ACCESSIBLE')
    await expect(fetchOrderProjection(orderId, vi.fn().mockResolvedValue({ order: { id: orderId } }) as AdminExecutor)).rejects.toThrow('INVALID_ORDER_RESPONSE')
  })
})

describe('webhook worker', () => {
  it('resolves refund/fulfillment events to their order, never to the refund ID', () => {
    expect(planEvent({ topic: 'refunds/create', payload: { id: 555, order_id: 123, admin_graphql_api_id: 'gid://shopify/Refund/555' } })).toEqual({ kind: 'order', orderId })
    expect(() => planEvent({ topic: 'orders/paid', payload: { id: Number.MAX_SAFE_INTEGER + 1 } })).toThrow()
    expect(() => planEvent({ topic: 'unknown', payload: {} })).toThrow()
  })
  it('fences completion and records storage failures without acknowledging them', async () => {
    const event = { id: 1, topic: 'orders/paid', payload: { id: 123 }, lease_token: 'lease' }
    const rpc = vi.fn().mockResolvedValueOnce({ data: [event], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'database down' } })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
    const result = await runOrderWorker({ rpc } as unknown as ReturnType<typeof createServiceClient>, vi.fn().mockResolvedValue(order()))
    expect(result).toEqual({ processed: 0, failed: 1, leaseLost: 0 })
    expect(rpc.mock.calls[1][1].p_lease).toBe('lease')
    expect(rpc.mock.calls[2]).toEqual(['fail_shopify_event', { p_id: 1, p_lease: 'lease', p_error: 'PROJECTION_WRITE_FAILED' }])
  })
  it('does not report a stale lease as a successful processed event', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ id: 1, topic: 'app/uninstalled', payload: {}, lease_token: 'stale' }] })
      .mockResolvedValueOnce({ data: false }).mockResolvedValueOnce({ data: [] })
    const result = await runOrderWorker({ rpc } as unknown as ReturnType<typeof createServiceClient>)
    expect(result.processed).toBe(0); expect(result.leaseLost).toBe(1)
  })
  it('does not store provider responses containing personal details as error text', () => {
    expect(safeWorkerError(new Error('customer rick@example.com not found'))).toBe('WORKER_FAILED')
  })
})

describe('reconciliation checkpoint', () => {
  it('queues the page atomically with its cursor and repeats a 10-minute overlap', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ reconcile_watermark: '2026-10-27T10:00:00Z', reconcile_window_end: '2026-10-27T11:00:00Z', reconcile_cursor: null, reconcile_lease_token: 'lease' }] })
      .mockResolvedValueOnce({ data: true })
    const execute = vi.fn().mockResolvedValue({ orders: { nodes: [{ id: orderId, updatedAt: '2026-10-27T10:10:00Z' }], pageInfo: { hasNextPage: true, endCursor: 'next' } } })
    const result = await reconcileOrders({ rpc } as unknown as ReturnType<typeof createServiceClient>, execute as AdminExecutor)
    expect(execute.mock.calls[0][1].query).toContain('09:50:00.000Z')
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_cursor: 'next', p_lease: 'lease' })
    expect(result.complete).toBe(false)
  })
})
