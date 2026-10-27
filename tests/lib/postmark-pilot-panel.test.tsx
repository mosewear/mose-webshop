import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PostmarkPilotStats from '@/components/admin/PostmarkPilotStats'
import type { PostmarkCampaignReport } from '@/lib/postmark-campaign-report'

vi.mock('@/lib/toestemming', () => ({ postmark: vi.fn() }))

const common = {
  tag: 'mose-edit-01-hoodie' as const,
  messageStream: 'campagnes' as const,
  checkedAt: '2026-10-26T10:00:00Z',
  scope: 'all-time-exact-tag' as const,
  excludesTestTag: 'mose-edit-01-hoodie-test' as const,
}

describe('Postmark provider panel', () => {
  it('shows link counts without calling them recipients or implying delivered zero', () => {
    const report: PostmarkCampaignReport = {
      ...common, status: 'ok', error: null,
      counts: { sent: 10, bounced: 0, spamComplaints: 0, totalClicks: 20, uniqueLinkClicks: 16, withLinkTracking: 10, delivered: null, uniqueClickRecipients: null },
    }
    const html = renderToStaticMarkup(<PostmarkPilotStats report={report} />)
    expect(html).toContain('Unieke linkklikken')
    expect(html).toContain('geen unieke personen')
    expect(html).toContain('Nog niet afzonderlijk gemeten')
    expect(html).toContain('>–<')
    expect(html).toContain('Linkklikken zijn geen unieke klikkende personen.')
    expect(html).toContain('testmails uitgesloten')
  })

  it('shows provider errors without a fabricated zero-metric panel', () => {
    const html = renderToStaticMarkup(<PostmarkPilotStats report={{ ...common, status: 'unavailable', counts: null, error: 'Provider onbereikbaar' }} />)
    expect(html).toContain('Provider onbereikbaar')
    expect(html).not.toContain('Alle linkklikken')
    expect(renderToStaticMarkup(<PostmarkPilotStats report={undefined} />)).toBe('')
  })
})
