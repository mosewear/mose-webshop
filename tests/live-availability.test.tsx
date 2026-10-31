import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { availableVariant } from '@/lib/variant-availability'
import { useLiveAvailability } from '@/hooks/useLiveAvailability'
const mock = vi.hoisted(() => ({ read: vi.fn(), signals: [] as AbortSignal[] }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => ({ select: () => ({ in: (_: string, ids: string[]) => ({ abortSignal: (signal: AbortSignal) => { mock.signals.push(signal); return mock.read(ids) } }) }) }) }) }))
const now = new Date('2026-10-31T01:00:00Z')
const stale = [{ id: 'p1', name: 'Hoodie', images: [{ url: '/real-photo.webp' }], variants: [{ id: 'v1', size: 'L', color: 'Black', fulfillment_mode: 'made_to_order' as const, is_available: true, stock_quantity: 0, supplier_orderable: true, supplier_checked_at: '2026-10-30T01:00:00Z' }] }]
const fresh = () => ({ ...stale[0].variants[0], product_id: 'p1', supplier_checked_at: new Date().toISOString() })
const settle = () => act(async () => { await Promise.resolve() })
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); mock.read.mockReset(); mock.signals.length = 0
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  mock.read.mockResolvedValue({ data: [fresh()], error: null })
})
afterEach(() => vi.useRealTimers())
it('repairs stale cached POD cards with real current availability without changing product assets or physical stock', async () => {
  const { result } = renderHook(() => useLiveAvailability(stale))
  expect(availableVariant(result.current[0].variants[0])).toBe(false)
  await settle()
  expect(availableVariant(result.current[0].variants[0])).toBe(true)
  expect(result.current[0].variants[0]).toMatchObject({ size: 'L', color: 'Black', stock_quantity: 0 })
  expect(result.current[0].images).toBe(stale[0].images)
  expect(mock.read).toHaveBeenCalledWith(['p1'])
})
it('refreshes a returning tab and local stock changes without changing the chosen variant', async () => {
  const products = [{ id: 'p1', product_variants: [{ id: 'v1', size: 'L', is_available: true, stock_quantity: 3 }] }]
  mock.read.mockResolvedValue({ data: [{ id: 'v1', product_id: 'p1', is_available: true, stock_quantity: 3 }], error: null })
  const { result } = renderHook(() => useLiveAvailability(products)); await settle()
  mock.read.mockResolvedValue({ data: [{ id: 'v1', product_id: 'p1', is_available: true, stock_quantity: 0 }], error: null })
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  expect(result.current[0].product_variants[0]).toMatchObject({ id: 'v1', size: 'L', stock_quantity: 0 })
  expect(availableVariant(result.current[0].product_variants[0])).toBe(false)
})
it('does not poll hidden tabs, resumes on visibility and cleans up timers and requests', async () => {
  const { unmount } = renderHook(() => useLiveAvailability(stale)); await settle()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => { vi.advanceTimersByTime(120_000) })
  expect(mock.read).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(mock.read).toHaveBeenCalledTimes(2)
  unmount(); expect(mock.signals.at(-1)?.aborted).toBe(true)
  await act(async () => { vi.advanceTimersByTime(120_000); window.dispatchEvent(new Event('focus')) })
  expect(mock.read).toHaveBeenCalledTimes(2)
})
it('keeps the original supplier timestamp on errors, so old evidence expires safely', async () => {
  const { result } = renderHook(() => useLiveAvailability(stale)); await settle()
  mock.read.mockRejectedValue(new Error('offline'))
  await act(async () => { vi.advanceTimersByTime(960_000) })
  expect(availableVariant(result.current[0].variants[0])).toBe(false)
  expect(result.current[0].variants[0].supplier_checked_at).toBe(now.toISOString())
})
it('a removed public variant is no longer orderable after a successful response', async () => {
  mock.read.mockResolvedValue({ data: [], error: null })
  const { result } = renderHook(() => useLiveAvailability(stale)); await settle()
  expect(result.current[0].variants[0].is_available).toBe(false)
})
it('ignores an old in-flight response after the product set changes', async () => {
  let finish: (value: unknown) => void = () => {}
  mock.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const { result, rerender } = renderHook(({ products }) => useLiveAvailability(products), { initialProps: { products: stale } })
  const other = [{ ...stale[0], id: 'p2', variants: [{ ...stale[0].variants[0], id: 'v2' }] }]
  mock.read.mockResolvedValue({ data: [{ ...fresh(), id: 'v2', product_id: 'p2' }], error: null })
  rerender({ products: other }); await settle()
  await act(async () => { finish({ data: [fresh()], error: null }) })
  expect(result.current[0].id).toBe('p2')
  expect(availableVariant(result.current[0].variants[0])).toBe(true)
})
