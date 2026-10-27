// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storefront: vi.fn(), getUser: vi.fn(), insertOwner: vi.fn(), state: {} as Record<string, unknown>, mappings: [] as unknown[] }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mock.from, rpc: mock.rpc }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mock.getUser } }) }))
vi.mock('@/lib/shopify/client', () => ({ storefront: mock.storefront }))
import { POST } from '@/app/api/shopify/checkout/route'
import { GET as bootstrap } from '@/app/api/shopify/session/route'
const attemptId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const gid = 'gid://shopify/ProductVariant/123'
const url = 'https://mosewear.myshopify.com/cart/c/secret'
const body = { attemptId, locale: 'nl', country: 'NL', lines: [{ variantId: 'local-123', quantity: 1 }] }
function request(data: unknown = body, session: string | null = 'a'.repeat(64)) {
  return new NextRequest('https://www.mosewear.com/api/shopify/checkout', { method: 'POST', body: JSON.stringify(data),
    headers: { origin: 'https://www.mosewear.com', ...(session ? { cookie: 'mose_shopify_session=' + session } : {}) } })
}
beforeEach(() => {
  for (const [key,value] of Object.entries({ SHOPIFY_CHECKOUT_ENABLED: 'true', SHOPIFY_BENEFITS_VERIFIED: 'true', SHOPIFY_SESSION_SECRET: 'a'.repeat(32),
    SHOPIFY_CUTOVER_AT: '2026-01-01T00:00:00Z', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'test', SHOPIFY_ADMIN_ACCESS_TOKEN: 'test',
    SHOPIFY_DEV_BUYER_IP: '127.0.0.1', VERCEL: '', NEXT_PUBLIC_SITE_URL: 'https://www.mosewear.com' })) vi.stubEnv(key,value)
  mock.state = { app_installed: true, checkout_enabled: true, catalog_verified: true, inventory_verified: true,
    benefits_verified: true, fulfillment_verified: true, market_verified: true, last_reconciled_at: new Date().toISOString(), last_worker_at: new Date().toISOString() }
  mock.mappings = [{ mose_variant_id: 'local-123', shopify_variant_id: gid, fulfillment_owner: 'mose', supplier_model: null,
    supplier_link_verified: false, sample_verified: false, enabled: true, price_eur_cents: 6995 }]
  mock.getUser.mockReset().mockResolvedValue({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null })
  mock.insertOwner.mockReset().mockResolvedValue({ error: null })
  mock.from.mockReset().mockImplementation((table: string) => ({ insert: mock.insertOwner, select: () => table === 'shopify_integration_state'
    ? { eq: () => ({ single: async () => ({ data: mock.state }) }) } : { in: async () => ({ data: mock.mappings }) } }))
  mock.rpc.mockReset().mockImplementation(async (name: string, args: Record<string, unknown>) => name === 'shopify_queue_health' ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] } : name === 'reserve_shopify_checkout'
    ? { data: [{ status: 'creating', request_fingerprint: args.p_fingerprint, cart_id: null, checkout_url: null, lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] } : { data: true })
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
    expect(mock.rpc.mock.calls.map(c => c[0])).toEqual(['shopify_queue_health','reserve_shopify_checkout','finish_shopify_checkout'])
    expect(mock.rpc.mock.calls[1][1].p_snapshot.lines[0]).toMatchObject({ localVariantId: 'local-123', merchandiseId: gid })
    expect(response.headers.get('set-cookie')).toBe(null)
  })
  it('reuses a session-bound ready attempt without creating a second cart', async () => {
    mock.rpc.mockImplementation(async (name: string,args: Record<string,unknown>) => name === 'shopify_queue_health'
      ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] }
      : { data: [{ status: 'ready', request_fingerprint: args.p_fingerprint, checkout_url: url, expires_at: new Date(Date.now()+3600000).toISOString() }] })
    const response = await POST(request())
    expect(response.status).toBe(200); expect(mock.storefront).toHaveBeenCalledTimes(1)
  })
  it('does not return an unpersisted checkout after the database fails', async () => {
    mock.rpc.mockImplementation(async (name: string,args: Record<string,unknown>) => name === 'shopify_queue_health' ? { data: [{ pending_count: 0, oldest_pending_at: null, dead_letter_count: 0 }] } : name === 'reserve_shopify_checkout'
      ? { data: [{ status: 'creating', request_fingerprint: args.p_fingerprint, cart_id: null, checkout_url: null, lease_token: args.p_lease, expires_at: new Date(Date.now()+3600000).toISOString() }] }
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
  it('requires an acknowledged session bootstrap before any cart mutation, even after a lost first response', async () => {
    const first = await bootstrap(new NextRequest('https://www.mosewear.com/api/shopify/session'))
    expect(first.headers.get('set-cookie')).toContain('HttpOnly')
    // Pretend that the response (including Set-Cookie) never reached the browser.
    const withoutAck = await POST(request(body, null))
    expect(withoutAck.status).toBe(409)
    expect((await withoutAck.json()).code).toBe('SESSION_REQUIRED')
    expect(mock.storefront).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled()
    const second = await bootstrap(new NextRequest('https://www.mosewear.com/api/shopify/session'))
    const cookie = second.headers.get('set-cookie')?.match(/mose_shopify_session=([a-f0-9]{64})/)?.[1]
    expect(cookie).toBeTruthy()
    expect((await POST(request(body, cookie!))).status).toBe(200)
  })
  it('blocks enqueue-only health when the worker is stale or the inbox has aged/dead-letter events', async () => {
    mock.state.last_worker_at = '2020-01-01T00:00:00Z'
    expect((await POST(request())).status).toBe(503)
    mock.state.last_worker_at = new Date().toISOString()
    for (const health of [
      { pending_count: 1, oldest_pending_at: '2020-01-01T00:00:00Z', dead_letter_count: 0 },
      { pending_count: 0, oldest_pending_at: null, dead_letter_count: 1 },
      { pending_count: 1, oldest_pending_at: null, dead_letter_count: 0 },
      { pending_count: null, oldest_pending_at: null, dead_letter_count: null },
    ]) {
      mock.rpc.mockResolvedValueOnce({ data: [health] })
      const response = await POST(request())
      expect(response.status).toBe(503)
      expect((await response.json()).code).toBe('ORDER_SYNC_NOT_READY')
    }
    expect(mock.storefront).not.toHaveBeenCalled()
  })

  it('binds authenticated checkout to an opaque proof before creating the cart', async () => {
    const req = request()
    req.cookies.set('sb-test-auth-token', 'session')
    const response = await POST(req)
    expect(response.status).toBe(200)
    const owner = mock.insertOwner.mock.calls[0][0]
    expect(owner).toMatchObject({ attempt_id: attemptId, user_id: '11111111-1111-4111-8111-111111111111' })
    expect(owner.proof).toMatch(/^[a-f0-9]{64}$/)
    expect(mock.storefront.mock.calls[1][1].input.attributes).toContainEqual({ key: 'mose_account_proof', value: owner.proof })
    expect(mock.insertOwner.mock.invocationCallOrder[0]).toBeLessThan(mock.storefront.mock.invocationCallOrder[1])
    expect(JSON.stringify(await response.json())).not.toContain(owner.proof)
  })
  it('keeps anonymous checkout working without an account or ownership row', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mock.getUser).not.toHaveBeenCalled()
    expect(mock.insertOwner).not.toHaveBeenCalled()
    expect(mock.storefront.mock.calls[1][1].input.attributes).toHaveLength(2)
  })
  it('does not downgrade an invalid logged-in session to a guest order', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } })
    const req = request(); req.cookies.set('sb-test-auth-token.0', 'session')
    expect((await POST(req)).status).toBe(401)
    expect(mock.storefront).not.toHaveBeenCalled()
  })
  it('does not create a cart if durable account ownership fails', async () => {
    mock.insertOwner.mockResolvedValue({ error: { message: 'database failed' } })
    const req = request(); req.cookies.set('sb-test-auth-token', 'session')
    expect((await POST(req)).status).toBe(503)
    expect(mock.storefront).toHaveBeenCalledTimes(1) // validation only; no cart mutation
  })
  it('includes verified identity in the attempt fingerprint, preventing cross-account reuse', async () => {
    await POST(request())
    const guestFingerprint = mock.rpc.mock.calls.find(c => c[0] === 'reserve_shopify_checkout')![1].p_fingerprint
    mock.storefront.mockResolvedValueOnce({ nodes: [{ id: gid, availableForSale: true, quantityAvailable: 5, price: { amount: '69.95', currencyCode: 'EUR' } }] })
    const implementation = mock.rpc.getMockImplementation()!
    mock.rpc.mockImplementation(async (name, args) => name === 'reserve_shopify_checkout'
      ? { data: [{ status: 'ready', request_fingerprint: guestFingerprint, checkout_url: url, expires_at: new Date(Date.now()+3600000).toISOString() }] }
      : implementation(name, args))
    const req = request(); req.cookies.set('sb-test-auth-token', 'session')
    expect((await POST(req)).status).toBe(409)
    expect(mock.insertOwner).not.toHaveBeenCalled()
  })

})
