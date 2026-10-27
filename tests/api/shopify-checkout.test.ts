// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storefront: vi.fn(), state: {} as Record<string, unknown>, mappings: [] as unknown[] }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mock.from, rpc: mock.rpc }) }))
vi.mock('@/lib/shopify/client', () => ({ storefront: mock.storefront }))
import { POST } from '@/app/api/shopify/checkout/route'
const attemptId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const gid = 'gid://shopify/ProductVariant/123'
const url = 'https://mosewear.myshopify.com/cart/c/secret'
const body = { attemptId, locale: 'nl', country: 'NL', lines: [{ variantId: 'local-123', quantity: 1 }] }
function request(data: unknown = body) {
  return new NextRequest('https://www.mosewear.com/api/shopify/checkout', { method: 'POST', body: JSON.stringify(data),
    headers: { origin: 'https://www.mosewear.com', cookie: 'mose_shopify_session=' + 'a'.repeat(64) } })
}
beforeEach(() => {
  for (const [key,value] of Object.entries({ SHOPIFY_CHECKOUT_ENABLED: 'true', SHOPIFY_BENEFITS_VERIFIED: 'true', SHOPIFY_SESSION_SECRET: 'a'.repeat(32),
    SHOPIFY_CUTOVER_AT: '2026-01-01T00:00:00Z', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'test', SHOPIFY_ADMIN_ACCESS_TOKEN: 'test',
    SHOPIFY_DEV_BUYER_IP: '127.0.0.1', VERCEL: '', NEXT_PUBLIC_SITE_URL: 'https://www.mosewear.com' })) vi.stubEnv(key,value)
  mock.state = { app_installed: true, checkout_enabled: true, catalog_verified: true, inventory_verified: true,
    benefits_verified: true, fulfillment_verified: true, market_verified: true, last_reconciled_at: new Date().toISOString() }
  mock.mappings = [{ mose_variant_id: 'local-123', shopify_variant_id: gid, fulfillment_owner: 'mose', supplier_model: null,
    supplier_link_verified: false, sample_verified: false, enabled: true, price_eur_cents: 6995 }]
  mock.from.mockReset().mockImplementation((table: string) => ({ select: () => table === 'shopify_integration_state'
    ? { eq: () => ({ single: async () => ({ data: mock.state }) }) } : { in: async () => ({ data: mock.mappings }) } }))
  mock.rpc.mockReset().mockImplementation(async (name: string, args: Record<string, unknown>) => name === 'reserve_shopify_checkout'
    ? { data: [{ status: 'creating', lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] } : { data: true })
  mock.storefront.mockReset().mockResolvedValueOnce({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: 5, price: { amount: '69.95', currencyCode: 'EUR' } }] })
    .mockResolvedValueOnce({ cartCreate: { cart: { id: 'private-cart-id', checkoutUrl: url, totalQuantity: 1,
      cost: { subtotalAmount: { amount: '69.95', currencyCode: 'EUR' } }, lines: { nodes: [{ quantity: 1, merchandise: { id: gid } }] } }, userErrors: [], warnings: [] } })
})
afterEach(() => vi.unstubAllEnvs())
describe('unified checkout boundary', () => {
  it('defaults closed before external access', async () => {
    vi.stubEnv('SHOPIFY_CHECKOUT_ENABLED', '')
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled()
  })
  it('rejects client prices and stale synchronization', async () => {
    expect((await POST(request({ ...body, price: 0.01 }))).status).toBe(400)
    mock.state.last_reconciled_at = '2020-01-01T00:00:00Z'
    expect((await POST(request())).status).toBe(503)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('stores the checkout before exposing its URL and never exposes the cart secret', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ checkoutUrl: url, attemptId })
    expect(mock.rpc.mock.calls.map(c => c[0])).toEqual(['reserve_shopify_checkout','finish_shopify_checkout'])
    expect(mock.rpc.mock.calls[0][1].p_snapshot.lines[0]).toMatchObject({ localVariantId: 'local-123', merchandiseId: gid })
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })
  it('reuses a session-bound ready attempt without creating a second cart', async () => {
    mock.rpc.mockResolvedValueOnce({ data: [{ status: 'ready', checkout_url: url, expires_at: new Date(Date.now()+3600000).toISOString() }] })
    const response = await POST(request())
    expect(response.status).toBe(200); expect(mock.storefront).toHaveBeenCalledTimes(1)
  })
  it('does not return an unpersisted checkout after the database fails', async () => {
    mock.rpc.mockImplementation(async (name: string,args: Record<string,unknown>) => name === 'reserve_shopify_checkout'
      ? { data: [{ status: 'creating', lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] }
      : { data: null, error: { message: 'storage failed' } })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('checkoutUrl')
    expect(mock.rpc.mock.calls.at(-1)?.[1].p_status).toBe('unknown')
  })
  it('does not create a cart if any local variant lacks a reviewed mapping', async () => {
    mock.mappings = []
    expect((await POST(request())).status).toBe(409)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
})
