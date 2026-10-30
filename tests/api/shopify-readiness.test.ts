// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), database: vi.fn(), runtime: vi.fn(), promo: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.authorize }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: mocks.database }))
vi.mock('@/lib/shopify/runtime-readiness', () => ({ runtimeReadiness: mocks.runtime }))
vi.mock('@/lib/shopify/promo-parity', () => ({ readPromoParity: mocks.promo }))
import { GET } from '@/app/api/admin/shopify/readiness/route'

describe('private Shopify readiness endpoint', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.promo.mockResolvedValue('unknown'); mocks.runtime.mockResolvedValue([{ key: 'loyaltyRuntime', label: 'Measured loyalty', status: 'missing' }]) })
  it('does not create a privileged database client for unauthorized callers', async () => {
    mocks.authorize.mockResolvedValue({ authorized: false })
    const response = await GET(new Request('https://www.mosewear.com/api/admin/shopify/readiness'))
    expect(response.status).toBe(403)
    expect(mocks.database).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('reports unknown evidence on database failure without exposing internals', async () => {
    mocks.authorize.mockResolvedValue({ authorized: true })
    mocks.database.mockImplementation(() => { throw new Error('private-database-secret') })
    const response = await GET(new Request('https://www.mosewear.com/api/admin/shopify/readiness'))
    const text = await response.text()
    expect(response.status).toBe(200)
    expect(text).not.toContain('private-database-secret')
    const data = JSON.parse(text)
    expect(data.counts).toEqual({ mappings: null, released: null, pendingEvents: null, failedEvents: null })
    expect(data.status).not.toBe('technical_checks_passed')
    expect(data.checks.find((c: { key: string }) => c.key === 'stock').status).toBe('unknown')
  })
  it('stops after the state probe when migrations are missing', async () => {
    mocks.authorize.mockResolvedValue({ authorized: true })
    const from = vi.fn()
    const query = { select: () => query, eq: () => query, abortSignal: () => query, maybeSingle: () => Promise.resolve({ data: null, error: { code: '42P01' } }) }
    from.mockReturnValue(query)
    mocks.database.mockReturnValue({ from, rpc: vi.fn(() => ({ abortSignal: async () => ({ data: [], error: null }) })) })
    const data = await (await GET(new Request('https://www.mosewear.com/api/admin/shopify/readiness'))).json()
    expect(from).toHaveBeenCalledTimes(1)
    expect(data.releaseAudit.catalog.sellableVariants).toBeNull()
  })

  it.each(['verified', 'missing', 'unknown'])('aggregates %s loyalty evidence while retaining catalog blockers', async runtimeStatus => {
    mocks.runtime.mockResolvedValue([{ key: 'loyaltyRuntime', label: 'Measured loyalty', status: runtimeStatus }])
    mocks.authorize.mockResolvedValue({ authorized: true })
    const stamp = new Date().toISOString()
    const responses = [
      { data: { app_installed: true, checkout_enabled: true, catalog_verified: true, inventory_verified: true, benefits_verified: true, fulfillment_verified: true, market_verified: true, last_worker_at: stamp, last_reconciled_at: stamp }, error: null },
      { data: [{ mose_variant_id: 'v1', shopify_variant_id: 'gid://shopify/ProductVariant/1', fulfillment_owner: 'mose', price_eur_cents: 7900, enabled: true }], count: 1, error: null },
      { count: 1, error: null }, { count: 0, error: null }, { count: 0, error: null }, { data: null, error: null },
      { data: [{ id: 'p1', is_active: true, status: 'active', is_gift_card: false, base_price: 79, sale_price: null }], count: 1, error: null },
      { data: ['v1', 'v2'].map(id => ({ id, product_id: 'p1', is_available: true, price_adjustment: 0, presale_enabled: false, presale_stock_quantity: 0 })), count: 2, error: null },
      { data: [], count: 0, error: null }, { data: [], count: 0, error: null },
      { count: 54, error: null }, { count: 0, error: null }, { count: 0, error: null },
    ]
    let index = 0, inFlight = 0, peak = 0
    const from = vi.fn(() => {
      const result = responses[index++]
      const query = {
        select: () => query, eq: () => query, is: () => query, not: () => query, gt: () => query,
        or: () => query, limit: () => query, order: () => query, maybeSingle: () => query, abortSignal: () => query,
        then: (resolve: (value: unknown) => void) => {
          inFlight++; peak = Math.max(peak, inFlight)
          setTimeout(() => { inFlight--; resolve(result) }, 0)
        },
      }
      return query
    })
    mocks.database.mockReturnValue({ from, rpc: vi.fn(() => ({ abortSignal: async () => ({ data: [], error: null }) })) })
    const data = await (await GET(new Request('https://www.mosewear.com/api/admin/shopify/readiness'))).json()
    expect(from).toHaveBeenCalledTimes(14)
    expect(peak).toBeLessThanOrEqual(3)
    expect(data.releaseAudit.catalog).toMatchObject({ sellableVariants: 2, coveredVariants: 1, missingMappings: 1 })
    expect(data.checks.find((check: { key: string }) => check.key === 'loyaltyLedger').status).toBe(runtimeStatus)
    expect(data.status).toBe('blocked')
  })

})
