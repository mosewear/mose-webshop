// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ worker: vi.fn() }))
vi.mock('@/lib/shopify/benefit-worker', () => ({ runBenefitWorker: mock.worker }))
import { GET } from '@/app/api/cron/shopify-benefits/route'
const secret = 'test-secret-at-least-24-characters'
const req = (auth = `Bearer ${secret}`) => new Request('https://mosewear.com/api/cron/shopify-benefits', { headers: { authorization: auth } })
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('SHOPIFY_BENEFIT_SYNC_ENABLED', 'true'); vi.stubEnv('ATOMIC_PROMO_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  mock.worker.mockResolvedValue({ processed: 1, failed: 0, leaseLost: 0 })
})
afterEach(() => vi.unstubAllEnvs())
describe('benefit scheduled route', () => {
  it.each(['', 'false', 'TRUE'])('does no provider/database work while default off (%s)', async flag => {
    vi.stubEnv('SHOPIFY_BENEFIT_SYNC_ENABLED', flag)
    const response = await GET(req(''))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, skipped: true, reason: 'BENEFIT_SYNC_DISABLED' })
    expect(mock.worker).not.toHaveBeenCalled()
  })
  it('requires authorization and deployed shared atomic writers before execution', async () => {
    expect((await GET(req('Bearer wrong'))).status).toBe(401)
    vi.stubEnv('ATOMIC_PROMO_ENABLED', '')
    expect((await GET(req())).status).toBe(503)
    expect(mock.worker).not.toHaveBeenCalled()
  })
  it('reports healthy completion and fails safely for retry/deadletter/storage failures', async () => {
    const response = await GET(req())
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store')
    mock.worker.mockResolvedValue({ processed: 0, failed: 1, leaseLost: 0 })
    expect((await GET(req())).status).toBe(503)
    mock.worker.mockRejectedValue(new Error('private customer code'))
    const failed = await GET(req())
    expect(failed.status).toBe(503); expect(await failed.text()).not.toContain('private')
  })
})
