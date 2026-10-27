import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PostmarkPilotStats from '@/components/admin/PostmarkPilotStats'
import type { PostmarkCampaignReport } from '@/lib/postmark-campaign-report'

const report: PostmarkCampaignReport = {
  tag: 'mose-edit-01-hoodie', messageStream: 'campagnes', checkedAt: '2026-11-04T13:00:00Z',
  scope: 'all-time-exact-tag', excludesTestTag: 'mose-edit-01-hoodie-test', status: 'ok', error: null,
  counts: { sent: 17, bounced: 0, spamComplaints: 0, totalClicks: 9, uniqueLinkClicks: 5, withLinkTracking: 17, delivered: null, uniqueClickRecipients: null },
  clickOrders: { status: 'ok', paidOrders7d: 1, paidRevenue7d: 99.95, error: null,
    coverageNote: 'Klikken kunnen automatisch zijn; andere kanalen kunnen de aankoop hebben beïnvloed. Geen bewijs van extra omzet.' },
}
describe('pilot paid-order panel', () => {
  it('labels measured paid orders/money and warns that clicks are not human or causal proof', () => {
    const html = renderToStaticMarkup(<PostmarkPilotStats report={report} />)
    expect(html).toContain('Betaalde orders na klik, 7 dagen')
    expect(html).toContain('Betaald bedrag na klik, 7 dagen')
    expect(html).toContain('99,95')
    expect(html).toContain('automatisch')
    expect(html).toContain('andere kanalen')
    expect(html).toContain('Geen bewijs van extra omzet')
    expect(html).not.toContain('geen unieke klikkende ontvangers of ordertoeschrijving')
  })
  it('shows missing attribution as unknown, never zero or unavailable causality as certainty', () => {
    const html = renderToStaticMarkup(<PostmarkPilotStats report={{ ...report, clickOrders: {
      status: 'unavailable', paidOrders7d: null, paidRevenue7d: null, error: 'Onvolledige bron', coverageNote: 'Kan automatische klikken bevatten.',
    } }} />)
    expect(html).toContain('Onvolledige bron')
    expect(html).toContain('onbekend, niet nul')
    expect(html).toContain('>–<')
  })
})
