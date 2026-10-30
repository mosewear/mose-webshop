// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), reconcile: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: mocks.create }))
vi.mock('@/lib/shopify/inventory', () => ({ reconcileInventory: mocks.reconcile }))
import { GET } from '@/app/api/cron/shopify-inventory/route'
const secret = 'inventory-cron-test-secret-at-least-24'
const req = (auth = 'Bearer '+secret) => new Request('https://mose.test/api/cron/shopify-inventory', { headers: { authorization: auth } })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SHOPIFY_SYNC_ENABLED', 'true'); vi.stubEnv('SHOPIFY_INVENTORY_SYNC_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  mocks.create.mockReturnValue({})
  mocks.reconcile.mockResolvedValue({ processed: 0, unknown: 0, failed: 0, leaseLost: 0 })
})
afterEach(() => vi.unstubAllEnvs())
describe('inventory runner', () => {
  it.each(['SHOPIFY_SYNC_ENABLED','SHOPIFY_INVENTORY_SYNC_ENABLED'])('does no work while %s is off', async flag => {
    vi.stubEnv(flag,'')
    const response = await GET(req(''))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, skipped: true, reason: 'INVENTORY_SYNC_DISABLED' })
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it('requires authorization before creating a privileged client', async () => {
    expect((await GET(req('Bearer wrong'))).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('runs at most four location batches with the same deadline', async () => {
    mocks.reconcile.mockResolvedValue({ processed: 50, unknown: 0, failed: 0, leaseLost: 0 })
    const response = await GET(req())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.reconcile).toHaveBeenCalledTimes(4)
    expect(mocks.reconcile.mock.calls[0][2]).toBe(mocks.reconcile.mock.calls[1][2])
  })
  it('reports untracked supplier availability and failures without claiming successful inventory', async () => {
    mocks.reconcile.mockResolvedValueOnce({ processed: 1, unknown: 1, failed: 0, leaseLost: 0 })
    const response = await GET(req())
    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe('INVENTORY_NOT_READY')
    mocks.reconcile.mockRejectedValue(new Error('private provider token'))
    const failed = await GET(req())
    expect(failed.status).toBe(503)
    expect(await failed.text()).not.toContain('private provider')
  })
})

it('stops inventory reconciliation immediately after an empty batch', async () => {
  mocks.reconcile.mockResolvedValueOnce({ processed: 50, unknown: 0, failed: 0, leaseLost: 0 })
  expect((await GET(req())).status).toBe(200)
  expect(mocks.reconcile).toHaveBeenCalledTimes(2)
})
