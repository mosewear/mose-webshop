// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: () => ({ insert: mock.insert }) }) }))
import { POST } from '@/app/api/shopify/webhooks/route'
const secret = 'test-webhook-secret'
function request(signature = true, raw = '{"id":123}') {
  return new NextRequest('https://www.mosewear.com/api/shopify/webhooks', { method: 'POST', body: raw, headers: {
    'x-shopify-shop-domain': 'hp5szr-te.myshopify.com', 'x-shopify-topic': 'orders/paid',
    'x-shopify-webhook-id': 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'x-shopify-hmac-sha256': signature ? createHmac('sha256', secret).update(raw).digest('base64') : 'invalid',
  } })
}
beforeEach(() => { vi.stubEnv('SHOPIFY_APP_CLIENT_SECRET', secret); mock.insert.mockReset() })
afterEach(() => vi.unstubAllEnvs())
describe('durable webhook boundary', () => {
  it('does not access storage for an invalid HMAC', async () => {
    expect((await POST(request(false))).status).toBe(401); expect(mock.insert).not.toHaveBeenCalled()
  })
  it('returns retryable failure when durable storage fails', async () => {
    mock.insert.mockResolvedValue({ error: { code: 'XX000' } })
    expect((await POST(request())).status).toBe(503)
  })
  it('acknowledges duplicate durable delivery, not a second write action', async () => {
    mock.insert.mockResolvedValue({ error: { code: '23505' } })
    expect((await POST(request())).status).toBe(200)
  })
  it('rejects a large streaming payload before insertion', async () => {
    expect((await POST(request(true, 'x'.repeat(2_000_001)))).status).toBe(413)
    expect(mock.insert).not.toHaveBeenCalled()
  })
})
