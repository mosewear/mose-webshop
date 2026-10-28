// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
const mock = vi.hoisted(() => ({ create: vi.fn(), reconcile: vi.fn(), worker: vi.fn(), db: {} }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: mock.create }))
vi.mock('@/lib/shopify/reconcile', () => ({ reconcileOrders: mock.reconcile }))
vi.mock('@/lib/shopify/worker', () => ({ runOrderWorker: mock.worker }))
import { GET, maxDuration } from '@/app/api/cron/shopify/route'
const secret = 'test-secret-at-least-24-characters'
const req = (auth = `Bearer ${secret}`) => new Request('https://mosewear.com/api/cron/shopify', { headers: { authorization: auth } })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SHOPIFY_SYNC_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  mock.create.mockReturnValue(mock.db)
  mock.reconcile.mockResolvedValue({ queued: 2, busy: false, complete: true })
  mock.worker.mockResolvedValue({ processed: 2, failed: 0, leaseLost: 0 })
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
describe('production Shopify cron', () => {
  it.each(['', 'false', 'TRUE'])('is a successful no-op while default-off (%s), without database/provider access', async flag => {
    vi.stubEnv('SHOPIFY_SYNC_ENABLED', flag); vi.stubEnv('CRON_SECRET', '')
    const response = await GET(req(''))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, skipped: true, reason: 'SYNC_DISABLED' })
    expect(mock.create).not.toHaveBeenCalled(); expect(mock.reconcile).not.toHaveBeenCalled(); expect(mock.worker).not.toHaveBeenCalled()
  })
  it.each(['', 'Bearer wrong', `Basic ${secret}`])('rejects invalid authorization before all integration access', async token => {
    expect((await GET(req(token))).status).toBe(401)
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('fails closed on missing or too-short configured secrets', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await GET(req())).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 'short')
    expect((await GET(req('Bearer short'))).status).toBe(401)
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('reconciles then drains the existing worker with one shared bounded invocation budget', async () => {
    const now = Date.now()
    const response = await GET(req())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mock.reconcile.mock.invocationCallOrder[0]).toBeLessThan(mock.worker.mock.invocationCallOrder[0])
    const options = mock.reconcile.mock.calls[0][2]
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(options.deadline).toBeGreaterThanOrEqual(now + 89_000)
    expect(options.deadline).toBeLessThanOrEqual(Date.now() + 90_000)
    expect(mock.worker).toHaveBeenCalledWith(mock.db, undefined, options)
    expect(maxDuration).toBeGreaterThan(90)
    expect((await response.json()).ok).toBe(true)
  })
  it('can drain existing events when reconciliation fails, but reports incomplete synchronization', async () => {
    mock.reconcile.mockRejectedValue(new Error('secret token and provider payload'))
    const response = await GET(req())
    expect(response.status).toBe(503)
    expect(mock.worker).toHaveBeenCalledOnce()
    expect(await response.text()).not.toContain('secret')
  })
  it.each([{ processed: 1, failed: 1, leaseLost: 0 }, { processed: 0, failed: 0, leaseLost: 1 }])('does not claim success for failed or lost worker leases', async result => {
    mock.worker.mockResolvedValue(result)
    expect((await GET(req())).status).toBe(503)
  })
  it('reports worker/setup failures safely and allows a concurrent reconciliation lease', async () => {
    mock.reconcile.mockResolvedValue({ queued: 0, busy: true, complete: false })
    expect((await GET(req())).status).toBe(200)
    mock.worker.mockRejectedValue(new Error('private error'))
    expect((await GET(req())).status).toBe(503)
    mock.create.mockImplementation(() => { throw new Error('secret missing') })
    const response = await GET(req())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret')
  })
  it('does not begin worker work when reconciliation consumed its safe time budget', async () => {
    vi.useFakeTimers()
    mock.reconcile.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + 80_000)
      return { queued: 2, busy: false, complete: true }
    })
    expect((await GET(req())).status).toBe(503)
    expect(mock.worker).not.toHaveBeenCalled()
  })
  it('schedules exactly one gated runner every five minutes, preserving existing crons', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
    expect(config.crons.filter((c: { path: string }) => c.path.includes('shopify'))).toEqual([{ path: '/api/cron/shopify', schedule: '*/5 * * * *' }, { path: '/api/cron/shopify-inventory', schedule: '*/5 * * * *' }])
    expect(config.crons.some((c: { path: string }) => c.path === '/api/cron/campagnes')).toBe(true)
    expect(config.regions).toEqual(['dub1'])
  })
})
