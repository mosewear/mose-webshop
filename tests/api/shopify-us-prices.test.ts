// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ from: vi.fn(), storefront: vi.fn(), mappings: [] as unknown[] }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mock.from }) }))
vi.mock('@/lib/shopify/client', () => ({ storefront: mock.storefront }))
import { POST, GET } from '@/app/api/shopify/us-market-prices/route'
const gid = 'gid://shopify/ProductVariant/123'
function request() {
  return new NextRequest('https://www.mosewear.com/api/shopify/us-market-prices', {
    method: 'POST', headers: { origin: 'https://www.mosewear.com', 'x-vercel-forwarded-for': '203.0.113.1' },
    body: JSON.stringify({ country: 'US', variantIds: ['local-123'] }),
  })
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MOSE_US_MARKET_ENABLED', 'true')
  vi.stubEnv('VERCEL', '1')
  mock.mappings = [{ mose_variant_id: 'local-123', shopify_variant_id: gid, fulfillment_owner: 'tapstitch',
    supplier_model: 'MB0001-C001-V2', supplier_link_verified: true, sample_verified: false,
    owner_release_authorized_at: '2026-01-01T00:00:00Z', owner_release_reference: 'Owner approved selling before samples',
    enabled: true, price_eur_cents: 7900 }]
  mock.from.mockReset().mockReturnValue({ select: () => ({ in: async () => ({ data: mock.mappings, error: null }) }) })
  mock.storefront.mockReset().mockResolvedValue({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: null, price: { amount: '91.0', currencyCode: 'USD' } }] })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
describe('US storefront price quote', () => {
  it('serves read-only USD quotes through GET without an Origin header', async () => {
    const response = await GET(new NextRequest('https://www.mosewear.com/api/shopify/us-market-prices?country=US&variantId=local-123', { headers: { 'x-vercel-forwarded-for': '203.0.113.1' } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ currency: 'USD', lines: [{ variantId: 'local-123', unitAmount: '91.00' }] })
  })
  it('rejects oversized or missing GET variants before accessing Shopify', async () => {
    const response = await GET(new NextRequest('https://www.mosewear.com/api/shopify/us-market-prices?country=US'))
    expect(response.status).toBe(400)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('returns Shopify USD for a released made-to-order variant', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ country: 'US', currency: 'USD', lines: [{ variantId: 'local-123', unitAmount: '91.00' }] })
    expect(mock.storefront.mock.calls[0][1]).toMatchObject({ country: 'US', ids: [gid] })
  })
  it('does not convert a returned EUR price into dollars', async () => {
    mock.storefront.mockResolvedValue({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: null, price: { amount: '79.0', currencyCode: 'EUR' } }] })
    expect((await POST(request())).status).toBe(503)
  })
  it('does not quote an unreleased supplier variant', async () => {
    mock.mappings = []
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('does not disclose provider errors or buyer IPs in logs', async () => {
    mock.storefront.mockRejectedValue(new Error('provider payload with private details'))
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'US_MARKET_PRICE_UNAVAILABLE' })
    expect(console.error).toHaveBeenCalledWith('[MOSE_US_PRICE]', 'UNEXPECTED_PRICE_ERROR')
  })
})
