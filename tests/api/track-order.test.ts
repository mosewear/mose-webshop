// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ create: vi.fn(), projection: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: mocks.create }))
vi.mock('@/lib/shopify/public-tracking', () => ({ publicShopifyTracking: mocks.projection }))
vi.mock('@/lib/rate-limit-ip', () => ({ checkSlidingWindowRateLimit: mocks.rate, getClientIp: () => '127.0.0.1' }))
import { POST } from '@/app/api/track-order/route'
const request = (body: unknown) => new NextRequest('https://mose.test/api/track-order', { method: 'POST', body: JSON.stringify(body) })
const result = { data: [{ snapshot: { name: '#1001' } }], error: null }
let query: Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.resetAllMocks()
  mocks.rate.mockReturnValue(true)
  query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), abortSignal: vi.fn() }
  for (const key of ['select', 'eq', 'limit']) query[key].mockReturnValue(query)
  query.abortSignal.mockResolvedValue(result)
  mocks.create.mockReturnValue({ from: vi.fn().mockReturnValue(query), rpc: vi.fn() })
})
it('only returns the authorized projection for an exact native reference and disables caching', async () => {
  mocks.projection.mockReturnValue({ id: '1001', status: 'paid' })
  const response = await POST(request({ email: 'customer@example.com', orderNumber: '#1001' }))
  expect(response.status).toBe(200)
  expect(query.eq).toHaveBeenCalledWith('order_name', '#1001')
  expect(mocks.projection).toHaveBeenCalledWith({ name: '#1001' }, 'customer@example.com', '#1001')
  expect(await response.json()).toEqual({ order: { id: '1001', status: 'paid' } })
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})
it('never falls back to a legacy UUID for a failed native match', async () => {
  mocks.projection.mockReturnValue(null)
  expect((await POST(request({ email: 'wrong@example.com', orderNumber: '1001' }))).status).toBe(404)
  expect(mocks.create.mock.results[0].value.rpc).not.toHaveBeenCalled()
})
it.each([null, {}, { email: ['wrong'], orderNumber: '1001' }, { email: 'bad', orderNumber: '1001' }, { email: 'customer@example.com', orderNumber: '10' }])('rejects malformed input without privileged database access', async body => {
  expect((await POST(request(body))).status).toBe(400)
  expect(mocks.create).not.toHaveBeenCalled()
})
it('fails safely on a timed-out provider read', async () => {
  query.abortSignal.mockRejectedValue(new Error('secret connection details'))
  const response = await POST(request({ email: 'customer@example.com', orderNumber: '1001' }))
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('secret')
})
it('preserves the authorized legacy reference lookup', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: [{ id: 'legacy-id', status: 'paid' }], error: null })
  const eq = vi.fn().mockResolvedValue({ data: [{ product_name: 'Tee', quantity: 1 }], error: null })
  mocks.create.mockReturnValue({ rpc, from: () => ({ select: () => ({ eq }) }) })
  const response = await POST(request({ email: 'customer@example.com', orderNumber: 'abcd1234' }))
  expect(response.status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('lookup_order_for_tracking', { p_email: 'customer@example.com', p_order_ref: 'abcd1234' })
  expect(mocks.projection).not.toHaveBeenCalled()
})
it('rate limits before privileged database access', async () => {
  mocks.rate.mockReturnValue(false)
  expect((await POST(request({ email: 'customer@example.com', orderNumber: '1001' }))).status).toBe(429)
  expect(mocks.create).not.toHaveBeenCalled()
})
