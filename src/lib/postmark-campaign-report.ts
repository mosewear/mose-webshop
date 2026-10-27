import { postmark } from '@/lib/toestemming'
import { getPilotClickOrders, type PilotClickOrders } from './pilot-click-orders'

export const MOSE_EDIT_PILOT_TAG = 'mose-edit-01-hoodie'
export const MOSE_EDIT_PILOT_TEST_TAG = `${MOSE_EDIT_PILOT_TAG}-test`
export const MOSE_CAMPAIGN_STREAM = 'campagnes'

export interface PostmarkCampaignCounts {
  sent: number
  bounced: number | null
  spamComplaints: number | null
  totalClicks: number | null
  /** Unique links per recipient and message; NOT unique clicking people. */
  uniqueLinkClicks: number | null
  withLinkTracking: number | null
  /** Not exposed by /stats/outbound. Never substitute Sent - Bounced. */
  delivered: null
  /** Not exposed by /stats/outbound. Never substitute UniqueLinksClicked. */
  uniqueClickRecipients: null
}

export type PostmarkCampaignReport = {
  tag: typeof MOSE_EDIT_PILOT_TAG
  messageStream: typeof MOSE_CAMPAIGN_STREAM
  checkedAt: string
  scope: 'all-time-exact-tag'
  excludesTestTag: typeof MOSE_EDIT_PILOT_TEST_TAG
  clickOrders?: PilotClickOrders
} & (
  | { status: 'ok'; counts: PostmarkCampaignCounts; error: null }
  | { status: 'unavailable'; counts: null; error: string }
)

export interface PostmarkStatsRequester {
  <T>(path: string, init?: RequestInit): Promise<{ status: number; data: T | null }>
}

/** Use this server-side wrapper for the pilot dashboard; no sending or data mutation. */
export async function getPostmarkPilotReportWithOrders(): Promise<PostmarkCampaignReport> {
  const report = await getPostmarkPilotReport()
  const clickOrders = await getPilotClickOrders(report.counts?.uniqueLinkClicks ?? null)
  return { ...report, clickOrders }
}

/** Provider counts are non-negative JSON integers. Missing data is unknown, not zero. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function normalizePostmarkCampaignCounts(payload: unknown): PostmarkCampaignCounts | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const data = payload as Record<string, unknown>
  const sent = count(data.Sent)
  if (sent === null) return null
  return {
    sent,
    bounced: count(data.Bounced),
    spamComplaints: count(data.SpamComplaints),
    totalClicks: count(data.TotalClicks),
    uniqueLinkClicks: count(data.UniqueLinksClicked),
    withLinkTracking: count(data.WithLinkTracking),
    delivered: null,
    uniqueClickRecipients: null,
  }
}

/**
 * Narrow, read-only reporting for the reviewed pilot. Keep the tag exact:
 * tests use `mose-edit-01-hoodie-test` and must never enter these totals.
 * No date window: this is a unique campaign tag and Postmark date windows
 * use a different timezone from the admin. This is NOT click-to-order attribution.
 *
 * Source: https://postmarkapp.com/developer/api/stats-api
 */
export async function getPostmarkPilotReport(
  request: PostmarkStatsRequester = postmark,
  now: () => Date = () => new Date(),
): Promise<PostmarkCampaignReport> {
  const context = {
    tag: MOSE_EDIT_PILOT_TAG,
    messageStream: MOSE_CAMPAIGN_STREAM,
    checkedAt: now().toISOString(),
    scope: 'all-time-exact-tag' as const,
    excludesTestTag: MOSE_EDIT_PILOT_TEST_TAG,
  } as const
  const unavailable = (error: string): PostmarkCampaignReport => ({ ...context, status: 'unavailable', counts: null, error })
  const query = new URLSearchParams({ tag: MOSE_EDIT_PILOT_TAG, messagestream: MOSE_CAMPAIGN_STREAM })
  try {
    const response = await request<unknown>(`/stats/outbound?${query}`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (response.status !== 200) return unavailable(`Postmark-campagnecijfers niet beschikbaar (HTTP ${response.status}).`)
    const counts = normalizePostmarkCampaignCounts(response.data)
    if (!counts) return unavailable('Postmark gaf geen geldige campagnecijfers terug.')
    return { ...context, status: 'ok', counts, error: null }
  } catch {
    // Never expose raw errors/body text: these may contain request details.
    return unavailable('Postmark-campagnecijfers tijdelijk niet beschikbaar. Probeer opnieuw.')
  }
}
