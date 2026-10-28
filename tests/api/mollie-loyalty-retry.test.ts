import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ fulfill: vi.fn(), get: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/fulfill-paid-order', () => ({ fulfillPaidOrder: mocks.fulfill }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/mollie', () => ({ getMollieClient: () => ({ payments: { get: mocks.get } }),
  asMolliePayment: (p: unknown) => p, fromMollieMethod: () => 'ideal', mapMollieStatusToPaymentStatus: vi.fn() }))
vi.mock('@/lib/fulfill-return-label-payment', () => ({ fulfillReturnLabelPayment: vi.fn() }))
vi.mock('@/lib/gift-card-processing', () => ({ reverseGiftCardsForOrder: vi.fn() }))
vi.mock('@/lib/update-order-status', () => ({ updateOrderStatusForReturn: vi.fn() }))
import { POST } from '@/app/api/mollie-webhook/route'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue({ id: 'tr_synthetic', status: 'paid', method: 'ideal', amount: { value: '79.00', currency: 'EUR' }, metadata: { orderId: 'synthetic-order' } })
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) }
  mocks.from.mockReturnValue(query)
})
const request = () => new NextRequest('https://example.test/api/mollie-webhook', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'id=tr_synthetic' })
describe('late legacy loyalty acknowledgment', () => {
  it('asks provider to retry a failed atomic posting instead of acknowledging it', async () => {
    mocks.fulfill.mockResolvedValue({ ok: false, reason: 'LOYALTY_RETRY_REQUIRED' })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ received: false, error: 'LOYALTY_RETRY_REQUIRED' })
  })
  it('acknowledges a late already-paid replay after atomic rescue succeeds', async () => {
    mocks.fulfill.mockResolvedValue({ ok: true, alreadyPaid: true, orderId: 'synthetic-order' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).alreadyPaid).toBe(true)
    expect(mocks.fulfill).toHaveBeenCalledWith(expect.objectContaining({ molliePaymentId: 'tr_synthetic', orderId: 'synthetic-order' }))
  })
})
