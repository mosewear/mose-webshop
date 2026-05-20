/**
 * Pulls Meta Marketing API insights and persists them to
 * `ad_campaign_snapshots`. Runs hourly via /api/cron/meta-snapshots.
 *
 * We snapshot four levels per run:
 *  - account (one row)
 *  - per active campaign
 *  - per active ad_set
 *  - per active ad
 *
 * Each level uses today's date as `snapshot_date`. Re-running within
 * the same day overwrites today's row via the unique
 * (meta_entity_id, snapshot_date) index — we do this with a delete +
 * insert because Postgres `ON CONFLICT` won't trigger on a partial
 * index combination across all levels. Single-day overwrite is fine:
 * the model needs at most last_14d trends from this table.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  MetaMarketingClient,
  type InsightRow,
} from '@/lib/meta/marketing-api'

interface IngestSummary {
  account_rows: number
  campaign_rows: number
  ad_set_rows: number
  ad_rows: number
  date: string
  account_id: string
  duration_ms: number
  errors: string[]
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function sumActions(actions: InsightRow['actions'], type: string): number {
  if (!actions) return 0
  let total = 0
  for (const a of actions) {
    if (a.action_type === type) total += Number(a.value) || 0
  }
  return total
}

function sumActionValues(values: InsightRow['action_values'], type: string): number {
  if (!values) return 0
  let total = 0
  for (const v of values) {
    if (v.action_type === type) total += Number(v.value) || 0
  }
  return total
}

interface SnapshotRowInput {
  snapshot_date: string
  account_id: string
  entity_level: 'account' | 'campaign' | 'ad_set' | 'ad'
  meta_entity_id: string
  campaign_id: string | null
  ad_set_id: string | null
  ad_id: string | null
  name: string | null
  objective: string | null
  status: string | null
  spend: number
  impressions: number
  clicks: number
  link_clicks: number
  attributed_purchases: number
  attributed_revenue: number
  attributed_add_to_cart: number
  attributed_initiate_checkout: number
  ctr: number | null
  cpm: number | null
  cpc: number | null
  frequency: number | null
  raw_payload: unknown
}

function mapInsightToSnapshot(opts: {
  insight: InsightRow
  level: 'account' | 'campaign' | 'ad_set' | 'ad'
  accountId: string
  entityId: string
  campaignId?: string | null
  adSetId?: string | null
  adId?: string | null
  name?: string | null
  status?: string | null
  objective?: string | null
}): SnapshotRowInput {
  const purchases = sumActions(opts.insight.actions, 'purchase') || sumActions(opts.insight.actions, 'omni_purchase')
  const revenue = sumActionValues(opts.insight.action_values, 'purchase') || sumActionValues(opts.insight.action_values, 'omni_purchase')
  const addToCart = sumActions(opts.insight.actions, 'add_to_cart')
  const initiateCheckout = sumActions(opts.insight.actions, 'initiate_checkout')

  return {
    snapshot_date: todayDate(),
    account_id: opts.accountId,
    entity_level: opts.level,
    meta_entity_id: opts.entityId,
    campaign_id: opts.campaignId ?? null,
    ad_set_id: opts.adSetId ?? null,
    ad_id: opts.adId ?? null,
    name: opts.name ?? null,
    objective: opts.objective ?? null,
    status: opts.status ?? null,
    spend: Number(opts.insight.spend) || 0,
    impressions: Number(opts.insight.impressions) || 0,
    clicks: Number(opts.insight.clicks) || 0,
    link_clicks: Number(opts.insight.inline_link_clicks) || 0,
    attributed_purchases: purchases,
    attributed_revenue: revenue,
    attributed_add_to_cart: addToCart,
    attributed_initiate_checkout: initiateCheckout,
    ctr: opts.insight.ctr !== undefined && opts.insight.ctr !== null ? Number(opts.insight.ctr) : null,
    cpm: opts.insight.cpm !== undefined && opts.insight.cpm !== null ? Number(opts.insight.cpm) : null,
    cpc: opts.insight.cpc !== undefined && opts.insight.cpc !== null ? Number(opts.insight.cpc) : null,
    frequency: opts.insight.frequency !== undefined && opts.insight.frequency !== null ? Number(opts.insight.frequency) : null,
    raw_payload: opts.insight,
  }
}

export async function ingestMetaSnapshots(): Promise<IngestSummary> {
  const started = Date.now()
  const summary: IngestSummary = {
    account_rows: 0,
    campaign_rows: 0,
    ad_set_rows: 0,
    ad_rows: 0,
    date: todayDate(),
    account_id: '',
    duration_ms: 0,
    errors: [],
  }

  const client = await MetaMarketingClient.fromDb({ envFallback: true })
  const accountId = client.adAccountId
  summary.account_id = accountId
  const supabase = createServiceRoleClient()

  // 1. Account-level insight (yesterday + today)
  let accountInsight: InsightRow | undefined
  try {
    const rows = await client.getInsights({ level: 'account', datePreset: 'today' })
    accountInsight = rows[0]
  } catch (e) {
    summary.errors.push(`account insights: ${(e as Error).message}`)
  }

  if (accountInsight) {
    const row = mapInsightToSnapshot({
      insight: accountInsight,
      level: 'account',
      accountId,
      entityId: accountId,
    })
    const ok = await upsertSnapshot(supabase, row, summary)
    if (ok) summary.account_rows++
  }

  // 2. Campaigns
  let campaigns: Awaited<ReturnType<MetaMarketingClient['getCampaigns']>> = []
  try {
    campaigns = await client.getCampaigns()
  } catch (e) {
    summary.errors.push(`campaigns list: ${(e as Error).message}`)
  }
  const campaignMap = new Map(campaigns.map((c) => [c.id, c]))

  let campaignInsights: InsightRow[] = []
  try {
    campaignInsights = await client.getInsights({ level: 'campaign', datePreset: 'today' })
  } catch (e) {
    summary.errors.push(`campaign insights: ${(e as Error).message}`)
  }
  for (const insight of campaignInsights) {
    if (!insight.campaign_id) continue
    const meta = campaignMap.get(insight.campaign_id)
    const row = mapInsightToSnapshot({
      insight,
      level: 'campaign',
      accountId,
      entityId: insight.campaign_id,
      campaignId: insight.campaign_id,
      name: insight.campaign_name ?? meta?.name ?? null,
      status: meta?.effective_status ?? meta?.status ?? null,
      objective: meta?.objective ?? null,
    })
    const ok = await upsertSnapshot(supabase, row, summary)
    if (ok) summary.campaign_rows++
  }

  // 3. Ad sets
  let adSets: Awaited<ReturnType<MetaMarketingClient['getAdSets']>> = []
  try {
    adSets = await client.getAdSets()
  } catch (e) {
    summary.errors.push(`ad sets list: ${(e as Error).message}`)
  }
  const adSetMap = new Map(adSets.map((a) => [a.id, a]))

  let adSetInsights: InsightRow[] = []
  try {
    adSetInsights = await client.getInsights({ level: 'adset', datePreset: 'today' })
  } catch (e) {
    summary.errors.push(`ad set insights: ${(e as Error).message}`)
  }
  for (const insight of adSetInsights) {
    if (!insight.adset_id) continue
    const meta = adSetMap.get(insight.adset_id)
    const row = mapInsightToSnapshot({
      insight,
      level: 'ad_set',
      accountId,
      entityId: insight.adset_id,
      campaignId: insight.campaign_id ?? meta?.campaign_id ?? null,
      adSetId: insight.adset_id,
      name: insight.adset_name ?? meta?.name ?? null,
      status: meta?.effective_status ?? meta?.status ?? null,
    })
    const ok = await upsertSnapshot(supabase, row, summary)
    if (ok) summary.ad_set_rows++
  }

  // 4. Ads
  let ads: Awaited<ReturnType<MetaMarketingClient['getAds']>> = []
  try {
    ads = await client.getAds()
  } catch (e) {
    summary.errors.push(`ads list: ${(e as Error).message}`)
  }
  const adMap = new Map(ads.map((a) => [a.id, a]))

  let adInsights: InsightRow[] = []
  try {
    adInsights = await client.getInsights({ level: 'ad', datePreset: 'today' })
  } catch (e) {
    summary.errors.push(`ad insights: ${(e as Error).message}`)
  }
  for (const insight of adInsights) {
    if (!insight.ad_id) continue
    const meta = adMap.get(insight.ad_id)
    const row = mapInsightToSnapshot({
      insight,
      level: 'ad',
      accountId,
      entityId: insight.ad_id,
      campaignId: insight.campaign_id ?? meta?.campaign_id ?? null,
      adSetId: insight.adset_id ?? meta?.adset_id ?? null,
      adId: insight.ad_id,
      name: insight.ad_name ?? meta?.name ?? null,
      status: meta?.effective_status ?? meta?.status ?? null,
    })
    const ok = await upsertSnapshot(supabase, row, summary)
    if (ok) summary.ad_rows++
  }

  summary.duration_ms = Date.now() - started
  return summary
}

/**
 * Upsert one snapshot row. The unique index is
 * (meta_entity_id, snapshot_date) so we delete the existing row for
 * that pair (if any) and insert fresh. Done via two queries instead of
 * ON CONFLICT because raw_payload is JSONB and PostgREST can't easily
 * express the upsert with a select-list mismatch.
 */
async function upsertSnapshot(
  supabase: ReturnType<typeof createServiceRoleClient>,
  row: SnapshotRowInput,
  summary: IngestSummary,
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from('ad_campaign_snapshots')
    .delete()
    .eq('meta_entity_id', row.meta_entity_id)
    .eq('snapshot_date', row.snapshot_date)
  if (deleteError) {
    summary.errors.push(`delete ${row.meta_entity_id}: ${deleteError.message}`)
    return false
  }
  const { error: insertError } = await supabase.from('ad_campaign_snapshots').insert(row)
  if (insertError) {
    summary.errors.push(`insert ${row.meta_entity_id}: ${insertError.message}`)
    return false
  }
  return true
}
