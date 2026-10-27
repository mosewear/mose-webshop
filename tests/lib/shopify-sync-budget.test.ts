// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { runOrderWorker } from '@/lib/shopify/worker'
import { reconcileOrders } from '@/lib/shopify/reconcile'
import { boundedSyncQuery } from '@/lib/shopify/sync-deadline'
import { createServiceClient } from '@/lib/supabase/service'

type Db = ReturnType<typeof createServiceClient>
function query<T>(data: T) {
  const promise = Promise.resolve({ data, error: null })
  return Object.assign(promise, { abortSignal: vi.fn(() => promise) })
}
describe('bounded Shopify synchronization', () => {
  it('propagates a signal to PostgREST instead of racing an uncancelled write', async () => {
    const result = query(true)
    const signal = new AbortController().signal
    expect(await boundedSyncQuery(result, signal)).toEqual({ data: true, error: null })
    expect(result.abortSignal).toHaveBeenCalledWith(signal)
  })
  it('does not claim work or refresh heartbeats after the invocation is aborted', async () => {
    const controller = new AbortController(); controller.abort()
    const rpc = vi.fn(), from = vi.fn()
    const db = { rpc, from } as unknown as Db
    await expect(runOrderWorker(db, undefined, { signal: controller.signal })).rejects.toThrow('SYNC_TIME_BUDGET')
    await expect(reconcileOrders(db, undefined, { signal: controller.signal })).rejects.toThrow('SYNC_TIME_BUDGET')
    expect(rpc).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled()
  })
  it('does not start a worker whose remaining time cannot fit a provider request', async () => {
    const rpc = vi.fn()
    await expect(runOrderWorker({ rpc } as unknown as Db, undefined, { deadline: Date.now() + 10_000 })).rejects.toThrow('SYNC_TIME_BUDGET')
    expect(rpc).not.toHaveBeenCalled()
  })
  it('leaves an interrupted event leased for fenced recovery and performs no late acknowledgment', async () => {
    const controller = new AbortController()
    const claimed = query([{ id: 1, topic: 'orders/paid', payload: { id: 123 }, lease_token: 'lease' }])
    const rpc = vi.fn(() => claimed), from = vi.fn()
    const fetchOrder = vi.fn(async () => { controller.abort(); throw new Error('provider interrupted') })
    await expect(runOrderWorker({ rpc, from } as unknown as Db, fetchOrder, { signal: controller.signal })).rejects.toThrow('SYNC_TIME_BUDGET')
    expect(claimed.abortSignal).toHaveBeenCalledWith(controller.signal)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalled()
  })
  it('does not checkpoint an interrupted reconciliation as successful', async () => {
    const controller = new AbortController()
    const claimed = query([{ reconcile_watermark: '2026-10-27T10:00:00Z', reconcile_window_end: '2026-10-27T11:00:00Z', reconcile_cursor: null, reconcile_lease_token: 'lease' }])
    const rpc = vi.fn(() => claimed)
    const execute = vi.fn(async () => { controller.abort(); throw new Error('interrupted') })
    await expect(reconcileOrders({ rpc } as unknown as Db, execute, { signal: controller.signal })).rejects.toThrow('SYNC_TIME_BUDGET')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(claimed.abortSignal).toHaveBeenCalledWith(controller.signal)
  })
  it('bounds the empty worker heartbeat with the same signal', async () => {
    const signal = new AbortController().signal
    const claimed = query([]), heartbeat = query(null)
    const eq = vi.fn(() => heartbeat)
    const db = { rpc: vi.fn(() => claimed), from: () => ({ update: () => ({ eq }) }) } as unknown as Db
    expect(await runOrderWorker(db, undefined, { signal })).toEqual({ processed: 0, failed: 0, leaseLost: 0 })
    expect(heartbeat.abortSignal).toHaveBeenCalledWith(signal)
  })
})
