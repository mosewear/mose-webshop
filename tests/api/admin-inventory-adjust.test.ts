// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.auth }))
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidate }))
import { POST } from '@/app/api/admin/inventory/adjust/route'
const variantId = 'f1f0e991-f7c8-45f3-b2fe-99092a7a3d6e'
const key = '4216e142-166c-4550-8680-ef16b3c21aac'
function request(changes = {}, operation: string | null = key) {
 return new NextRequest('https://mose.test/api/admin/inventory/adjust', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(operation ? { 'Idempotency-Key': operation } : {}) }, body: JSON.stringify({ variantId, field: 'regular', delta: 1, expectedStock: 0, ...changes }) })
}
beforeEach(() => {
 vi.clearAllMocks(); vi.stubEnv('LEGACY_INVENTORY_ATOMIC_ENABLED', 'true')
 mocks.auth.mockResolvedValue({ authorized: true, supabase: { rpc: mocks.rpc, from: mocks.from } })
 mocks.rpc.mockResolvedValue({ data: { new_stock: 1, shopify_pending: true }, error: null })
})
afterEach(() => vi.unstubAllEnvs())
describe('audited inventory adjustment endpoint', () => {
 it('requires an admin and does not mutate while unauthorized', async () => {
  mocks.auth.mockResolvedValue({ authorized: false, supabase: null })
  expect((await POST(request())).status).toBe(401)
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it.each([{ delta: 1.5 }, { delta: '1' }, { delta: 0 }, { delta: -1 }, { delta: 2147483648 }, { expectedStock: -1 }, { variantId: 'wrong' }])('rejects invalid stock intent %j without changing anything', async changes => {
  expect((await POST(request(changes))).status).toBe(400)
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('rejects an action without a stable operation ID', async () => {
  expect((await POST(request({}, null))).status).toBe(400)
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
 it('uses the atomic audited command with the observed count and invalidates the shop', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ ok: true, result: { new_stock: 1, shopify_pending: true } })
  expect(mocks.rpc).toHaveBeenCalledWith('apply_inventory_command', { p_operation: key, p_kind: 'adjust', p_payload: expect.objectContaining({ variantId, delta: 1, expectedStock: 0 }) })
  expect(mocks.revalidate).toHaveBeenCalledWith('public-catalog', { expire: 0 })
 })
 it('reports a concurrent edit with the current count for deliberate review', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'STOCK_CHANGED_RELOAD_REQUIRED' } })
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { stock_quantity: 2 } }) }
  mocks.from.mockReturnValue(query)
  const response = await POST(request())
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({ currentStock: 2 })
  expect(mocks.revalidate).not.toHaveBeenCalled()
 })
 it('explains unsupported presale and does not leak unexpected database failures', async () => {
  mocks.rpc.mockResolvedValueOnce({ error: { message: 'OWNED_PRESALE_WRITE_FORBIDDEN' } })
  const presale = await POST(request({ field: 'presale' }))
  expect(presale.status).toBe(409)
  expect(await presale.text()).toContain('gewone voorraad')
  mocks.rpc.mockResolvedValueOnce({ error: { message: 'secret database diagnostic' } })
  const failed = await POST(request())
  expect(failed.status).toBe(503)
  expect(await failed.text()).not.toContain('secret')
 })
})
