// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClient, getMollieClient, paymentGet, paymentCreate, query } = vi.hoisted(() => {
  const query = { maybeSingle: vi.fn(), select: vi.fn(), eq: vi.fn(), update: vi.fn(), from: vi.fn() }
  const paymentGet = vi.fn()
  const paymentCreate = vi.fn()
  return { createClient: vi.fn(() => query), getMollieClient: vi.fn(() => ({ payments: { get: paymentGet, create: paymentCreate } })), paymentGet, paymentCreate, query }
})
vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/mollie', () => ({
  asMolliePayment: (value: unknown) => value, getMollieClient,
  formatMollieAmount: (value: number) => value.toFixed(2), getMollieErrorInfo: () => ({ message: 'error', statusCode: 500 }),
  getMollieWebhookUrl: () => 'https://www.mosewear.com/api/mollie-webhook',
  getOrderPaymentRedirectUrl: () => 'https://www.mosewear.com/nl/payment',
  mollieLocale: () => 'nl_NL', toMollieMethod: (value: string) => value,
}))

const order = { total: 75, payment_status: 'pending', shipping_cost: 0, locale: 'nl', email: 'test@example.test', created_at: '2026-11-01T09:00:00Z', status: 'pending' }
function request(extra = {}) {
  return new NextRequest('https://www.mosewear.com/api/create-mollie-payment', { method: 'POST', body: JSON.stringify({ orderId: 'old-order', expectedTotal: 75, ...extra }) })
}

describe('server cutover guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.maybeSingle.mockReset()
    query.from.mockReturnValue(query); query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.update.mockReturnValue(query)
    vi.stubEnv('SHOPIFY_CHECKOUT_ENABLED', 'true')
    vi.stubEnv('SHOPIFY_CUTOVER_AT', '2026-11-03T09:00:00Z')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('blocks old order creation before parsing a forged recovery payload or touching the database', async () => {
    const { POST } = await import('@/app/api/checkout/route')
    const response = await POST(new Request('https://www.mosewear.com/api/checkout?recover=fake', { method: 'POST', body: 'invalid JSON' }))
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('SHOPIFY_CHECKOUT_REQUIRED')
    expect(createClient).not.toHaveBeenCalled()
  })
  it('refuses a newer order even when the client submits an older creation date', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: { ...order, created_at: '2026-11-04T09:00:00Z' }, error: null })
    const { POST } = await import('@/app/api/create-mollie-payment/route')
    const response = await POST(request({ created_at: '2020-01-01T00:00:00Z' }))
    expect(response.status).toBe(409)
    expect(getMollieClient).not.toHaveBeenCalled()
  })
  it('allows a historical order to reuse an open payment without creating another on method change', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: order, error: null }).mockResolvedValueOnce({ data: { mollie_payment_id: 'tr_old' }, error: null })
    paymentGet.mockResolvedValue({ id: 'tr_old', status: 'open', method: 'ideal', getCheckoutUrl: () => 'https://www.mollie.com/checkout/old' })
    const { POST } = await import('@/app/api/create-mollie-payment/route')
    const response = await POST(request({ paymentMethod: 'card' }))
    expect(response.status).toBe(200)
    expect((await response.json()).reused).toBe(true)
    expect(paymentCreate).not.toHaveBeenCalled()
  })
  it('does not create another payment when the old payment cannot be checked', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: order, error: null }).mockResolvedValueOnce({ data: { mollie_payment_id: 'tr_old' }, error: null })
    paymentGet.mockRejectedValue(new Error('timeout'))
    const { POST } = await import('@/app/api/create-mollie-payment/route')
    expect((await POST(request())).status).toBe(503)
    expect(paymentCreate).not.toHaveBeenCalled()
  })
  it('also protects the legacy create-payment-intent alias', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: { ...order, created_at: '2026-11-04T09:00:00Z' }, error: null })
    const { POST } = await import('@/app/api/create-payment-intent/route')
    expect((await POST(request())).status).toBe(409)
    expect(paymentCreate).not.toHaveBeenCalled()
  })
})
