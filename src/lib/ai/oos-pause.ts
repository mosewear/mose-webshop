/**
 * Out-of-stock guardrail (rule-based, not LLM).
 *
 * Pauses any ACTIVE Meta ad set whose targeted SKU(s) are all OOS.
 * Resumes a previously-paused-by-us ad set the moment any of those SKUs
 * is back in stock.
 *
 * Matching strategy (Phase 1, easily upgraded later):
 *   - We try to match SKUs or product slugs by substring inside the
 *     ad set name. MOSE's marketers already follow a naming convention
 *     that puts the product slug in the name (e.g. "Hoodie Bruin —
 *     Lookalike NL"); this is enough to start.
 *   - If no match can be made we leave the ad set alone. Better to
 *     under-pause than wrongly pause an ad set we don't understand.
 *
 * Logged actions use action_type='pause_oos_ad_set' so the decisions
 * UI can clearly distinguish rule-based safety actions from LLM-driven
 * proposals.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { MetaMarketingClient, type AdSet } from '@/lib/meta/marketing-api'

export interface OosPauseSummary {
  ad_sets_inspected: number
  ad_sets_paused: number
  ad_sets_resumed: number
  ad_sets_unmatched: number
  skipped_no_credentials: boolean
  duration_ms: number
  errors: string[]
}

interface VariantStock {
  variant_id: string
  product_id: string
  sku: string | null
  product_name: string
  product_slug: string
  stock: number
}

async function loadVariantStock(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<VariantStock[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, sku, stock_quantity, products!inner(name, slug, is_active, status)')
    .eq('products.is_active', true)
    .eq('products.status', 'active')
  if (error) throw new Error(`[oos] variant stock load: ${error.message}`)

  type Row = {
    id: string
    product_id: string
    sku: string | null
    stock_quantity: number | null
    products: { name: string; slug: string }
  }
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    variant_id: row.id,
    product_id: row.product_id,
    sku: row.sku,
    product_name: row.products?.name ?? '',
    product_slug: row.products?.slug ?? '',
    stock: Number(row.stock_quantity) || 0,
  }))
}

/**
 * For a given ad set name, find the SKUs / product slugs it likely
 * targets. Returns the matching variant rows. Empty array means "we
 * don't know what this ad set targets, leave it alone".
 */
function findCandidateVariants(adSetName: string, variants: VariantStock[]): VariantStock[] {
  if (!adSetName) return []
  const haystack = adSetName.toLowerCase()
  const matches = new Set<VariantStock>()

  // First pass: SKU substring (more specific, prefer).
  for (const v of variants) {
    if (v.sku && haystack.includes(v.sku.toLowerCase())) {
      matches.add(v)
    }
  }
  if (matches.size > 0) return Array.from(matches)

  // Second pass: product slug (broader).
  for (const v of variants) {
    if (v.product_slug && v.product_slug.length >= 4 && haystack.includes(v.product_slug.toLowerCase())) {
      matches.add(v)
    }
  }
  return Array.from(matches)
}

/**
 * Persist one ad_autopilot_actions row for an OOS rule action.
 */
async function logRuleAction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  params: {
    action_type: 'pause_oos_ad_set' | 'resume_ad_set'
    adSet: AdSet
    matched: VariantStock[]
    guardrail_outcome: 'allowed' | 'blocked' | 'killswitch'
    guardrail_reason?: string
    status: 'executed' | 'failed' | 'skipped'
    error_message?: string
    meta_response?: unknown
  },
) {
  const payload = {
    matched_sku_count: params.matched.length,
    matched_skus: params.matched.map((v) => v.sku).filter(Boolean).slice(0, 50),
    matched_slugs: Array.from(new Set(params.matched.map((v) => v.product_slug).filter(Boolean))),
    rationale: 'OOS rule-based safety: alle gematchte SKUs zijn (of zijn weer) op voorraad.',
  }
  const priorState = {
    status: params.adSet.status,
    effective_status: params.adSet.effective_status,
  }
  await supabase.from('ad_autopilot_actions').insert({
    decision_id: null,
    action_type: params.action_type,
    target_level: 'ad_set',
    target_meta_id: params.adSet.id,
    target_label: params.adSet.name ?? null,
    payload,
    prior_state: priorState,
    guardrail_outcome: params.guardrail_outcome,
    guardrail_reason: params.guardrail_reason ?? null,
    status: params.status,
    meta_api_response: params.meta_response ?? null,
    error_message: params.error_message ?? null,
    executed_at: params.status === 'executed' ? new Date().toISOString() : null,
  })
}

export async function runOosPauseRule(): Promise<OosPauseSummary> {
  const started = Date.now()
  const summary: OosPauseSummary = {
    ad_sets_inspected: 0,
    ad_sets_paused: 0,
    ad_sets_resumed: 0,
    ad_sets_unmatched: 0,
    skipped_no_credentials: false,
    duration_ms: 0,
    errors: [],
  }

  let client: MetaMarketingClient
  try {
    client = await MetaMarketingClient.fromDb({ envFallback: true })
  } catch (e) {
    // Missing credentials should NOT be a hard error during the
    // Phase 1 rollout (creds may not exist yet). Mark as skipped.
    summary.skipped_no_credentials = true
    summary.errors.push(`credentials: ${(e as Error).message}`)
    summary.duration_ms = Date.now() - started
    return summary
  }

  const supabase = createServiceRoleClient()
  const variantStock = await loadVariantStock(supabase)
  const variantsBySku = new Map<string, VariantStock>(
    variantStock.filter((v) => v.sku).map((v) => [v.sku as string, v]),
  )

  // 1) Pull all ad sets and try to find OOS pause candidates.
  let adSets: AdSet[] = []
  try {
    adSets = await client.getAdSets()
  } catch (e) {
    summary.errors.push(`ad sets list: ${(e as Error).message}`)
    summary.duration_ms = Date.now() - started
    return summary
  }
  summary.ad_sets_inspected = adSets.length

  // 2) For each ad set that's ACTIVE, check OOS status.
  for (const adSet of adSets) {
    const isActive = (adSet.effective_status || adSet.status) === 'ACTIVE'
    if (!isActive) continue
    const matched = findCandidateVariants(adSet.name ?? '', variantStock)
    if (matched.length === 0) {
      summary.ad_sets_unmatched++
      continue
    }
    const allOos = matched.every((v) => v.stock <= 0)
    if (!allOos) continue

    try {
      const resp = await client.pauseAdSet(adSet.id)
      await logRuleAction(supabase, {
        action_type: 'pause_oos_ad_set',
        adSet,
        matched,
        guardrail_outcome: 'allowed',
        status: 'executed',
        meta_response: resp,
      })
      summary.ad_sets_paused++
    } catch (e) {
      await logRuleAction(supabase, {
        action_type: 'pause_oos_ad_set',
        adSet,
        matched,
        guardrail_outcome: 'allowed',
        status: 'failed',
        error_message: (e as Error).message,
      })
      summary.errors.push(`pause ${adSet.id}: ${(e as Error).message}`)
    }
  }

  // 3) Reverse rule: ad sets we paused for OOS reasons get resumed when
  //    at least one matched SKU is back in stock. We look for the most
  //    recent pause_oos_ad_set action per ad set that hasn't been
  //    reverted yet, and check the SKU(s) it referenced.
  const { data: outstanding, error: outstandingErr } = await supabase
    .from('ad_autopilot_actions')
    .select('id, target_meta_id, target_label, payload, executed_at')
    .eq('action_type', 'pause_oos_ad_set')
    .eq('status', 'executed')
    .is('reverted_at', null)
    .order('executed_at', { ascending: false })
  if (outstandingErr) {
    summary.errors.push(`outstanding pauses: ${outstandingErr.message}`)
  }

  // Dedupe per ad set (only most recent action per target).
  const seen = new Set<string>()
  const adSetMap = new Map<string, AdSet>(adSets.map((a) => [a.id, a]))
  for (const row of (outstanding ?? []) as Array<{
    id: string
    target_meta_id: string
    target_label: string | null
    payload: { matched_skus?: string[] } | null
    executed_at: string | null
  }>) {
    if (seen.has(row.target_meta_id)) continue
    seen.add(row.target_meta_id)
    const adSet = adSetMap.get(row.target_meta_id)
    if (!adSet) continue
    // Already resumed externally?
    if ((adSet.effective_status || adSet.status) === 'ACTIVE') continue
    const skus = (row.payload?.matched_skus ?? []).filter(Boolean)
    if (skus.length === 0) continue
    const anyInStock = skus.some((sku) => (variantsBySku.get(sku)?.stock ?? 0) > 0)
    if (!anyInStock) continue
    try {
      const resp = await client.resumeAdSet(adSet.id)
      const matched = skus
        .map((sku) => variantsBySku.get(sku))
        .filter((v): v is VariantStock => Boolean(v))
      await logRuleAction(supabase, {
        action_type: 'resume_ad_set',
        adSet,
        matched,
        guardrail_outcome: 'allowed',
        guardrail_reason: 'OOS rule reverse: minstens 1 SKU weer op voorraad',
        status: 'executed',
        meta_response: resp,
      })
      // Mark the original pause as reverted.
      await supabase
        .from('ad_autopilot_actions')
        .update({ reverted_at: new Date().toISOString() })
        .eq('id', row.id)
      summary.ad_sets_resumed++
    } catch (e) {
      summary.errors.push(`resume ${adSet.id}: ${(e as Error).message}`)
    }
  }

  summary.duration_ms = Date.now() - started
  return summary
}
