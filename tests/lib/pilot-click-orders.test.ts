import { describe, it, expect, vi } from 'vitest'
import { getPilotClickOrders, pilotOrderCandidates, readCompletePilotClicks, type PilotLedger, type PilotOrder, type PilotClick, type PilotOrderSources, type PilotAttributionDependencies } from '@/lib/pilot-click-orders'

vi.mock('@/lib/toestemming', () => ({ postmark: vi.fn(() => { throw new Error('Unexpected real client') }) }))
vi.mock('@/lib/mollie', () => ({ getMollieClient: vi.fn(() => { throw new Error('Unexpected real client') }) }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn(() => { throw new Error('Unexpected real client') }) }))

const CAMPAIGN = 'a24813a0-1db4-4a1c-b79b-880a3be756d2'
const TAG = 'mose-edit-01-hoodie'
const clickTime = Date.parse('2026-11-03T12:00:00.000Z')
const now = Date.parse('2026-11-20T12:00:00.000Z')
const DAY = 86_400_000
const ledger: PilotLedger[] = [{ campagne_id: CAMPAIGN, email: 'buyer@example.test', status: 'verzonden', postmark_id: 'msg-1', verzonden_op: '2026-11-02T18:15:00.000Z' }]
const click: PilotClick = { MessageID: 'msg-1', MessageStream: 'campagnes', Tag: TAG, Recipient: 'BUYER@example.test', ReceivedAt: new Date(clickTime).toISOString(), OriginalLink: `https://mosewear.com/product/hoodie?utm_campaign=${TAG}` }
const order: PilotOrder = { id: 'order-1', email: 'buyer@example.test', payment_status: 'paid', status: 'processing', paid_at: new Date(clickTime + DAY).toISOString(), mollie_payment_id: 'tr_paid1', returns: [] }
const sources = (orders = [order]): PilotOrderSources => ({ orders, campaigns: [], logs: [] })
const paid = (o = order) => ({ id: o.mollie_payment_id, mode: 'live', status: 'paid', amount: { currency: 'EUR', value: '99.95' }, paidAt: o.paid_at, metadata: { orderId: o.id }, amountRefunded: { currency: 'EUR', value: '0.00' } })
function fixture(overrides: Partial<PilotAttributionDependencies> = {}) {
  const deps: PilotAttributionDependencies = {
    readLedger: vi.fn(async () => ledger),
    request: vi.fn(async () => ({ status: 200, data: { TotalCount: 1, Clicks: [click] } })) as PilotAttributionDependencies['request'],
    readSources: vi.fn(async () => sources()),
    readPayment: vi.fn(async () => paid()),
    now: () => now,
    ...overrides,
  }
  return deps
}

describe('paid-order matching', () => {
  it('uses strict prior click and inclusive 7-day boundary, not order creation time', () => {
    const at = (ms: number) => ({ ...order, paid_at: new Date(ms).toISOString() })
    expect(pilotOrderCandidates(ledger, [click], sources([at(clickTime)]), now)).toHaveLength(0)
    expect(pilotOrderCandidates(ledger, [click], sources([at(clickTime + 1)]), now)).toHaveLength(1)
    expect(pilotOrderCandidates(ledger, [click], sources([at(clickTime + 7 * DAY)]), now)).toHaveLength(1)
    expect(pilotOrderCandidates(ledger, [click], sources([at(clickTime + 7 * DAY + 1)]), now)).toHaveLength(0)
  })
  it('uses latest prior click, ignores clicks after payment, and deduplicates orders/events', () => {
    const later = { ...click, ReceivedAt: new Date(clickTime + 5 * DAY).toISOString() }
    const futureClick = { ...click, ReceivedAt: new Date(clickTime + 10 * DAY).toISOString() }
    const o = { ...order, paid_at: new Date(clickTime + 9 * DAY).toISOString() }
    const result = pilotOrderCandidates(ledger, [click, later, later, futureClick], sources([o, o]), now)
    expect(result).toHaveLength(1)
    expect(result[0].matchedClickAt).toBe(clickTime + 5 * DAY)
  })
  it('excludes refunded/unpaid/canceled orders and any recorded partial return refund', () => {
    for (const change of [{ payment_status: 'refunded' }, { payment_status: 'unpaid' }, { status: 'cancelled' }, { returns: [{ status: 'refunded', refunded_at: null }] }, { returns: [{ status: 'received', refunded_at: '2026-11-06T12:00:00Z' }] }]) {
      expect(pilotOrderCandidates(ledger, [click], sources([{ ...order, ...change }]), now)).toHaveLength(0)
    }
  })
  it('does not count unsubscribe links or links outside the exact campaign/site', () => {
    for (const url of ['https://mosewear.com/unsubscribe?t=abc', `https://mosewear.com/api/newsletter/unsubscribe?utm_campaign=${TAG}`, `https://mosewear.com.evil.test/?utm_campaign=${TAG}`, `https://mosewear.com/?utm_campaign=${TAG}-test`]) {
      expect(pilotOrderCandidates(ledger, [{ ...click, OriginalLink: url }], sources(), now)).toHaveLength(0)
    }
  })
  it('fails unknown for absent/invalid/timezone-ambiguous payment dates and unmapped clicks', async () => {
    for (const paid_at of [null, 'invalid', '2026-11-04T12:00:00']) {
      const deps = fixture({ readSources: async () => sources([{ ...order, paid_at }]) })
      const report = await getPilotClickOrders(1, deps)
      expect(report.status).toBe('unavailable'); expect(report.paidOrders7d).toBeNull()
      expect(deps.readPayment).not.toHaveBeenCalled()
    }
    expect(() => pilotOrderCandidates(ledger, [{ ...click, MessageID: 'unknown' }], sources(), now)).toThrow()
    expect(() => pilotOrderCandidates(ledger, [{ ...click, Recipient: 'someone-else@example.test' }], sources(), now)).toThrow()
    expect(() => pilotOrderCandidates(ledger, [{ ...click, ReceivedAt: 'broken' }], sources(), now)).toThrow()
    expect(() => pilotOrderCandidates(ledger, [click], sources(), NaN)).toThrow()
  })
  it('rejects conflicting duplicate order records rather than counting one refunded copy', () => {
    expect(() => pilotOrderCandidates(ledger, [click], sources([order, { ...order, payment_status: 'refunded' }]), now)).toThrow()
  })
  it('excludes later commercial sends, even when the later pilot click occurs afterwards', () => {
    const src = sources()
    src.campaigns = [{ ...ledger[0], campagne_id: 'other', postmark_id: 'othermsg', verzonden_op: '2026-11-03T10:00:00.000Z' }]
    expect(pilotOrderCandidates(ledger, [click], src, now)).toHaveLength(0)
    src.campaigns[0].verzonden_op = '2026-11-05T10:00:00.000Z'
    expect(pilotOrderCandidates(ledger, [click], src, now)).toHaveLength(1)
  })
  it('uses marketing/abandoned-cart/other-stream logs but not transactional order mail', () => {
    const src = sources()
    const log = { recipient_email: order.email, status: 'sent', sent_at: '2026-11-03T13:00:00.000Z', email_type: 'order_confirmation', template_key: null, metadata: null }
    src.logs = [log]
    expect(pilotOrderCandidates(ledger, [click], src, now)).toHaveLength(1)
    for (const change of [{ email_type: 'marketing' }, { template_key: 'abandoned_cart' }, { metadata: { message_stream: 'other-broadcast' } }]) {
      src.logs = [{ ...log, ...change }]
      expect(pilotOrderCandidates(ledger, [click], src, now)).toHaveLength(0)
    }
  })
})

describe('complete click coverage', () => {
  it('paginates exact tag/stream and validates the full result count', async () => {
    const request = vi.fn(async (path: string) => {
      const query = new URL(path, 'https://api.postmarkapp.com').searchParams
      expect(query.get('tag')).toBe(TAG); expect(query.get('messagestream')).toBe('campagnes')
      expect(query.get('count')).toBe('500')
      const offset = Number(query.get('offset'))
      return { status: 200, data: { TotalCount: 501, Clicks: Array.from({ length: offset === 0 ? 500 : 1 }, () => click) } }
    }) as unknown as PilotAttributionDependencies['request']
    expect(await readCompletePilotClicks(request)).toHaveLength(501)
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('rejects oversized, incomplete, changing and failed provider results', async () => {
    for (const response of [{ status: 500, data: null }, { status: 200, data: { TotalCount: 5001, Clicks: [] } }, { status: 200, data: { TotalCount: 1, Clicks: [] } }, { status: 200, data: { TotalCount: '1', Clicks: [click] } }]) {
      const report = await getPilotClickOrders(1, fixture({ request: vi.fn(async () => response) as PilotAttributionDependencies['request'] }))
      expect(report.status).toBe('unavailable')
    }
    const request = vi.fn().mockResolvedValueOnce({ status: 200, data: { TotalCount: 2, Clicks: [click] } }).mockResolvedValueOnce({ status: 200, data: { TotalCount: 3, Clicks: [click] } })
    await expect(readCompletePilotClicks(request)).rejects.toThrow()
  })
  it('detects missing retained event coverage and unknown stats without inventing zero', async () => {
    expect((await getPilotClickOrders(2, fixture())).status).toBe('unavailable')
    expect((await getPilotClickOrders(null, fixture())).status).toBe('unavailable')
  })
})

describe('live payment verification', () => {
  it('counts a unique live paid order and exact EUR amount', async () => {
    const report = await getPilotClickOrders(1, fixture())
    expect(report).toMatchObject({ status: 'ok', paidOrders7d: 1, paidRevenue7d: 99.95 })
    expect(report.coverageNote).toContain('automatisch')
    expect(report.coverageNote).toContain('andere kanalen')
  })
  it('excludes test, unpaid, full/partial refund, chargeback, and helper-reported refunds', async () => {
    for (const change of [{ mode: 'test' }, { status: 'canceled' }, { amountRefunded: { currency: 'EUR', value: '10.00' } }, { amountChargedBack: { currency: 'EUR', value: '99.95' } }, { hasRefunds: () => true }]) {
      expect(await getPilotClickOrders(1, fixture({ readPayment: async () => ({ ...paid(), ...change }) }))).toMatchObject({ status: 'ok', paidOrders7d: 0, paidRevenue7d: 0 })
    }
  })
  it('does not attribute a delayed webhook when real payment preceded the click', async () => {
    const report = await getPilotClickOrders(1, fixture({ readPayment: async () => ({ ...paid(), paidAt: new Date(clickTime - 1).toISOString() }) }))
    expect(report.paidOrders7d).toBe(0)
  })
  it('fails unknown for missing mode, unverified linkage, unsupported currency or missing payment', async () => {
    for (const change of [{ mode: undefined }, { metadata: {} }, { id: 'tr_other' }, { amount: { currency: 'USD', value: '99.95' } }, { paidAt: null }]) {
      expect((await getPilotClickOrders(1, fixture({ readPayment: async () => ({ ...paid(), ...change }) }))).status).toBe('unavailable')
    }
    expect((await getPilotClickOrders(1, fixture({ readSources: async () => sources([{ ...order, mollie_payment_id: null }]) }))).status).toBe('unavailable')
  })
  it('caps payment lookups before making any request and sanitizes transport errors', async () => {
    const deps = fixture({ readSources: async () => sources(Array.from({ length: 26 }, (_, i) => ({ ...order, id: `order-${i}` }))) })
    expect((await getPilotClickOrders(1, deps)).status).toBe('unavailable'); expect(deps.readPayment).not.toHaveBeenCalled()
    const report = await getPilotClickOrders(1, fixture({ readPayment: async () => { throw new Error('SECRET_TOKEN') } }))
    expect(report.status).toBe('unavailable'); expect(JSON.stringify(report)).not.toContain('SECRET_TOKEN')
  })
  it('returns real zeros without external requests for empty ledger, and without payment calls for no orders/clicks', async () => {
    const empty = fixture({ readLedger: async () => [] })
    expect(await getPilotClickOrders(0, empty)).toMatchObject({ status: 'ok', paidOrders7d: 0, paidRevenue7d: 0 })
    expect(empty.request).not.toHaveBeenCalled(); expect(empty.readSources).not.toHaveBeenCalled(); expect(empty.readPayment).not.toHaveBeenCalled()
    expect((await getPilotClickOrders(1, empty)).status).toBe('unavailable')
    expect((await getPilotClickOrders(null, empty)).status).toBe('unavailable')
    const noOrders = fixture({ readSources: async () => sources([]) })
    expect((await getPilotClickOrders(1, noOrders)).paidOrders7d).toBe(0); expect(noOrders.readPayment).not.toHaveBeenCalled()
    const noClicks = fixture({ request: vi.fn(async () => ({ status: 200, data: { TotalCount: 0, Clicks: [] } })) as PilotAttributionDependencies['request'] })
    expect((await getPilotClickOrders(0, noClicks)).paidOrders7d).toBe(0); expect(noClicks.readSources).not.toHaveBeenCalled()
  })
})
