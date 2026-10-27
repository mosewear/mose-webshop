import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/toestemming', () => ({ postmark: vi.fn() }))
import {
  getPostmarkPilotReport,
  normalizePostmarkCampaignCounts,
  type PostmarkStatsRequester,
} from '@/lib/postmark-campaign-report'

const fixedNow = () => new Date('2026-10-26T10:00:00.000Z')

describe('Postmark pilot report', () => {
  it('uses an exact production tag and stream, excluding tests without fetching recipient data', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, data: { Sent: 75, Bounced: 1, SpamComplaints: 0, TotalClicks: 9, UniqueLinksClicked: 5, WithLinkTracking: 75 } })
    const report = await getPostmarkPilotReport(request as PostmarkStatsRequester, fixedNow)
    expect(request).toHaveBeenCalledTimes(1)
    const [path, init] = request.mock.calls[0]
    const url = new URL(path, 'https://api.postmarkapp.com')
    expect(url.pathname).toBe('/stats/outbound')
    expect([...url.searchParams]).toEqual([['tag', 'mose-edit-01-hoodie'], ['messagestream', 'campagnes']])
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(report).toMatchObject({ status: 'ok', checkedAt: '2026-10-26T10:00:00.000Z', excludesTestTag: 'mose-edit-01-hoodie-test', counts: { sent: 75, bounced: 1, uniqueLinkClicks: 5 } })
  })

  it('does not present sent minus bounced as delivery, or unique links as people', () => {
    const counts = normalizePostmarkCampaignCounts({ Sent: 10, Bounced: 2, UniqueLinksClicked: 16, TotalClicks: 19, WithLinkTracking: 10, Delivered: 8 })
    expect(counts).toMatchObject({ sent: 10, bounced: 2, uniqueLinkClicks: 16, delivered: null, uniqueClickRecipients: null })
  })

  it('preserves valid zero counts while keeping absent fields unknown', () => {
    expect(normalizePostmarkCampaignCounts({ Sent: 0, Bounced: 0, TotalClicks: 0 })).toEqual({
      sent: 0, bounced: 0, spamComplaints: null, totalClicks: 0,
      uniqueLinkClicks: null, withLinkTracking: null, delivered: null, uniqueClickRecipients: null,
    })
  })

  it('does not invent zero clicks when provider fields are malformed', () => {
    const counts = normalizePostmarkCampaignCounts({ Sent: 10, Bounced: -1, TotalClicks: '5', UniqueLinksClicked: 0.5, WithLinkTracking: Number.NaN })
    expect(counts).toMatchObject({ sent: 10, bounced: null, totalClicks: null, uniqueLinkClicks: null, withLinkTracking: null })
    for (const payload of [null, [], {}, { Sent: '10' }, { Sent: -2 }, { Sent: Number.POSITIVE_INFINITY }]) {
      expect(normalizePostmarkCampaignCounts(payload)).toBeNull()
    }
  })

  it('returns unavailable for HTTP failure without exposing the response payload', async () => {
    const request = vi.fn().mockResolvedValue({ status: 401, data: { Sent: 0, Message: 'Sensitive response details' } })
    const report = await getPostmarkPilotReport(request as PostmarkStatsRequester, fixedNow)
    expect(report).toMatchObject({ status: 'unavailable', counts: null })
    expect(report.error).toContain('HTTP 401')
    expect(JSON.stringify(report)).not.toContain('Sensitive')
  })

  it('treats malformed successful responses as unavailable', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, data: { ErrorCode: 401 } })
    const report = await getPostmarkPilotReport(request as PostmarkStatsRequester, fixedNow)
    expect(report).toMatchObject({ status: 'unavailable', counts: null })
  })

  it('keeps transport failures local to the provider panel', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Request URL and secret token'))
    const report = await getPostmarkPilotReport(request as PostmarkStatsRequester, fixedNow)
    expect(report).toMatchObject({ status: 'unavailable', counts: null })
    expect(JSON.stringify(report)).not.toContain('secret')
  })
})
