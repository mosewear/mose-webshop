import { createServiceClient } from '@/lib/supabase/service'
import { resolveDateWindow } from '@/lib/admin-order-metrics'

export type FunnelCounts = { sessions: number; viewed: number; added: number; checkout: number; failed: number; paid: number }
export type FunnelRow = FunnelCounts & { id: string; label: string }
export type AdminSalesFunnel = { total: FunnelCounts; campaigns: FunnelRow[]; products: FunnelRow[]; byCampaign: Record<string, FunnelRow[]> }
type EventRow = {
  session_id: string | null
  event_name: string
  page_url: string | null
  event_properties: Record<string, unknown> | null
}
type PaidCheckout = { attemptId: string; products: string[] }
const eventNames = ['page_view', 'product_view', 'add_to_cart', 'checkout_started', 'checkout_handoff_failed']
const stageNames = ['sessions', 'viewed', 'added', 'checkout', 'failed', 'paid'] as const
type Stage = typeof stageNames[number]
type StageSets = Record<Stage, Set<string>>
const stages = (): StageSets => ({ sessions: new Set(), viewed: new Set(), added: new Set(), checkout: new Set(), failed: new Set(), paid: new Set() })
const counts = (sets: StageSets): FunnelCounts => ({
  sessions: sets.sessions.size, viewed: sets.viewed.size, added: sets.added.size,
  checkout: sets.checkout.size, failed: sets.failed.size, paid: sets.paid.size,
})

function campaignFromUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const campaign = parsed.searchParams.get('utm_campaign')?.toLowerCase()
    return campaign && /^[a-z0-9][a-z0-9_.-]{0,95}$/.test(campaign) ? campaign : null
  } catch {
    return null
  }
}

export function buildAdminSalesFunnel(events: EventRow[], paidCheckouts: PaidCheckout[], productNames: Map<string, string>): AdminSalesFunnel {
  const sessions = new Map<string, { campaign: string | null; events: EventRow[] }>()
  for (const event of events) {
    if (!event.session_id) continue
    const session = sessions.get(event.session_id) ?? { campaign: null, events: [] }
    session.campaign ??= campaignFromUrl(event.page_url)
    session.events.push(event)
    sessions.set(event.session_id, session)
  }

  const total = stages()
  const campaigns = new Map<string, StageSets>()
  const products = new Map<string, StageSets>()
  const campaignProducts = new Map<string, Map<string, StageSets>>()
  const paidByAttempt = new Map(paidCheckouts.map(order => [order.attemptId, order.products]))
  const bucket = (map: Map<string, StageSets>, key: string) => {
    const row = map.get(key) ?? stages()
    map.set(key, row)
    return row
  }

  for (const [sessionId, session] of sessions) {
    const campaign = session.campaign
    const campaignBucket = campaign ? bucket(campaigns, campaign) : null
    const campaignProductBuckets = campaign ? campaignProducts.get(campaign) ?? new Map<string, StageSets>() : null
    if (campaign && campaignProductBuckets) campaignProducts.set(campaign, campaignProductBuckets)

    function record(stage: Stage, ids: unknown[] = []) {
      total[stage].add(sessionId)
      campaignBucket?.[stage].add(sessionId)
      for (const id of ids) {
        if (typeof id !== 'string' || !productNames.has(id)) continue
        for (const map of [products, campaignProductBuckets]) {
          if (!map) continue
          const row = bucket(map, id)
          row.sessions.add(sessionId)
          row[stage].add(sessionId)
        }
      }
    }

    record('sessions')
    for (const event of session.events) {
      const props = event.event_properties
      const ids = Array.isArray(props?.product_ids) ? props.product_ids : []
      switch (event.event_name) {
        case 'product_view': record('viewed', [props?.product_id]); break
        case 'add_to_cart': record('added', [props?.product_id]); break
        case 'checkout_handoff_failed': record('failed', ids); break
        case 'checkout_started': {
          record('checkout', ids)
          const paidProducts = typeof props?.shopify_attempt_id === 'string' ? paidByAttempt.get(props.shopify_attempt_id) : undefined
          if (paidProducts) record('paid', paidProducts)
          break
        }
      }
    }
  }

  const rows = (map: Map<string, StageSets>, label: (id: string) => string) => [...map]
    .map(([id, set]) => ({ id, label: label(id), ...counts(set) }))
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label))
  const productLabel = (id: string) => productNames.get(id) ?? id
  return {
    total: counts(total),
    campaigns: rows(campaigns, id => id),
    products: rows(products, productLabel),
    byCampaign: Object.fromEntries([...campaignProducts].map(([id, map]) => [id, rows(map, productLabel)])),
  }
}

export async function readAdminSalesFunnel(days: 7 | 30 | 90, paidCheckouts: PaidCheckout[], productNames: Map<string, string>) {
  const db = createServiceClient()
  const { currentStart } = resolveDateWindow(`${days}d`)
  const events: EventRow[] = []
  const pageSize = 1000
  const limit = 15000
  // The reporting period is fixed while paging. If it exceeds the supported
  // volume, surface an unavailable result instead of publishing partial totals.
  const end = new Date().toISOString()
  for (let offset = 0; offset <= limit; offset += pageSize) {
    const result = await db.from('analytics_events').select('session_id,event_name,page_url,event_properties')
      .in('event_name', eventNames).not('session_id', 'is', null)
      .gte('created_at', currentStart.toISOString()).lte('created_at', end)
      .order('created_at').order('id').range(offset, offset + pageSize - 1)
    if (result.error) throw new Error('FUNNEL_UNAVAILABLE')
    events.push(...result.data)
    if (events.length > limit) throw new Error('FUNNEL_LIMIT')
    if (result.data.length < pageSize) break
  }
  return buildAdminSalesFunnel(events, paidCheckouts, productNames)
}
