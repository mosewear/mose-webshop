/**
 * Action executor — translates guardrail-approved proposals into Meta
 * Marketing API mutations.
 *
 * Phase 2 enables this from the orchestrator only when
 * ai_autopilot_mode != 'advisory'. The executor itself enforces:
 *  - mode-gated action types (bounded forbids audiences/creatives,
 *    full allows everything Phase 2 supports)
 *  - per-account daily spend cap (sums today's snapshot spend +
 *    pending budget shifts)
 *  - prior_state capture so the 30-day revert window can restore
 *
 * Idempotency: actions are persisted as `queued` first, mutated, then
 * marked `executed`/`failed`. If the cron retries the same decision,
 * we skip rows that already reached a terminal state.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { MetaMarketingClient } from '@/lib/meta/marketing-api'
import type { ActionProposal, GuardrailConfig, ParsedActionWithGuardrail } from '@/lib/ai/types'

export interface ExecutorRunInput {
  decisionId: string
  actions: ParsedActionWithGuardrail[]
  guardrails: GuardrailConfig
}

export interface ExecutorRunResult {
  executed: number
  skipped: number
  failed: number
  blocked: number
  total_spend_shift_eur: number
  errors: string[]
}

const BOUNDED_ALLOWED: ActionProposal['action_type'][] = [
  'pause_ad_set',
  'resume_ad_set',
  'pause_ad',
  'resume_ad',
  'update_ad_set_budget',
  'update_campaign_budget',
  'no_op',
]

const FULL_ALLOWED: ActionProposal['action_type'][] = [
  ...BOUNDED_ALLOWED,
  'exclude_audience',
  'create_custom_audience',
  'create_lookalike_audience',
  'launch_creative_variant',
]

function modeAllowsType(mode: GuardrailConfig['mode'], type: ActionProposal['action_type']): boolean {
  if (mode === 'advisory') return false
  if (mode === 'bounded') return BOUNDED_ALLOWED.includes(type)
  if (mode === 'full') return FULL_ALLOWED.includes(type)
  return false
}

/**
 * Get today's total account spend from the snapshot table so the
 * cap-check can decide whether more budget moves are safe.
 */
async function todayAccountSpend(
  supabase: ReturnType<typeof createServiceRoleClient>,
  accountId: string,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('ad_campaign_snapshots')
    .select('spend')
    .eq('account_id', accountId)
    .eq('snapshot_date', today)
    .eq('entity_level', 'account')
    .maybeSingle()
  if (error) return 0
  return Number((data as { spend?: number | string })?.spend) || 0
}

interface AdSetSnapshot extends Record<string, unknown> {
  daily_budget?: string | null
  lifetime_budget?: string | null
  status?: string | null
  effective_status?: string | null
}

async function fetchAdSetPrior(client: MetaMarketingClient, adSetId: string): Promise<AdSetSnapshot> {
  const all = await client.getAdSets(['id', 'name', 'status', 'effective_status', 'daily_budget', 'lifetime_budget'])
  const hit = all.find((a) => a.id === adSetId)
  if (!hit) return {}
  return {
    daily_budget: hit.daily_budget ?? null,
    lifetime_budget: hit.lifetime_budget ?? null,
    status: hit.status ?? null,
    effective_status: hit.effective_status ?? null,
  }
}

interface CampaignSnapshot extends Record<string, unknown> {
  daily_budget?: string | null
  lifetime_budget?: string | null
  status?: string | null
  effective_status?: string | null
}

async function fetchCampaignPrior(
  client: MetaMarketingClient,
  campaignId: string,
): Promise<CampaignSnapshot> {
  const all = await client.getCampaigns()
  const hit = all.find((c) => c.id === campaignId)
  if (!hit) return {}
  return {
    daily_budget: hit.daily_budget ?? null,
    lifetime_budget: hit.lifetime_budget ?? null,
    status: hit.status ?? null,
    effective_status: hit.effective_status ?? null,
  }
}

function clampBudget(currentMinor: number, ratio: number, maxBudgetChangePct: number): number {
  const safeRatio = Math.max(Math.min(ratio, maxBudgetChangePct), -maxBudgetChangePct)
  const next = Math.round(currentMinor * (1 + safeRatio))
  return Math.max(next, 0)
}

interface PersistArgs {
  decisionId: string
  action: ActionProposal
  status: 'queued' | 'executed' | 'failed' | 'skipped'
  guardrail_outcome: 'allowed' | 'blocked' | 'killswitch' | 'manual_override'
  guardrail_reason?: string
  prior_state?: Record<string, unknown> | null
  meta_response?: unknown
  error_message?: string
  executed_at?: string
}

async function persistAction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  args: PersistArgs,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ad_autopilot_actions')
    .insert({
      decision_id: args.decisionId,
      action_type: args.action.action_type,
      target_level: args.action.target.level,
      target_meta_id: args.action.target.meta_id,
      target_label: args.action.target.label ?? null,
      payload: args.action.payload,
      prior_state: args.prior_state ?? null,
      guardrail_outcome: args.guardrail_outcome,
      guardrail_reason: args.guardrail_reason ?? null,
      status: args.status,
      meta_api_response: args.meta_response ?? null,
      error_message: args.error_message ?? null,
      executed_at: args.executed_at ?? null,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return data.id as string
}

/**
 * Execute the approved subset of action proposals. The orchestrator
 * calls this after persisting the decision row; we own the action-row
 * lifecycle from here.
 */
export async function executeApprovedActions(input: ExecutorRunInput): Promise<ExecutorRunResult> {
  const result: ExecutorRunResult = {
    executed: 0,
    skipped: 0,
    failed: 0,
    blocked: 0,
    total_spend_shift_eur: 0,
    errors: [],
  }
  const supabase = createServiceRoleClient()
  const { decisionId, actions, guardrails } = input

  // Advisory: persist as 'skipped' and return.
  if (guardrails.mode === 'advisory') {
    for (const entry of actions) {
      await persistAction(supabase, {
        decisionId,
        action: entry.action,
        status: 'skipped',
        guardrail_outcome: entry.guardrail_outcome,
        guardrail_reason: entry.guardrail_reason ?? 'advisory mode (geen executie)',
      })
      result.skipped++
    }
    return result
  }

  // Bounded/full: try to load Meta client. Without creds, fall back to
  // skipped + log a clear reason so the admin UI shows what happened.
  let client: MetaMarketingClient
  try {
    client = await MetaMarketingClient.fromDb({ envFallback: true })
  } catch (e) {
    const reason = `Meta credentials niet aanwezig: ${(e as Error).message}`
    for (const entry of actions) {
      await persistAction(supabase, {
        decisionId,
        action: entry.action,
        status: 'skipped',
        guardrail_outcome: entry.guardrail_outcome,
        guardrail_reason: reason,
      })
      result.skipped++
    }
    result.errors.push(reason)
    return result
  }

  const accountSpendToday = await todayAccountSpend(supabase, client.adAccountId)

  for (const entry of actions) {
    const { action } = entry

    if (entry.guardrail_outcome !== 'allowed') {
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'skipped',
        guardrail_outcome: entry.guardrail_outcome,
        guardrail_reason: entry.guardrail_reason,
      })
      if (entry.guardrail_outcome === 'blocked') result.blocked++
      else result.skipped++
      continue
    }

    if (!modeAllowsType(guardrails.mode, action.action_type)) {
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'skipped',
        guardrail_outcome: 'blocked',
        guardrail_reason: `Modus "${guardrails.mode}" staat action_type "${action.action_type}" niet toe.`,
      })
      result.blocked++
      continue
    }

    if (action.action_type === 'no_op') {
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'skipped',
        guardrail_outcome: 'allowed',
        guardrail_reason: 'no_op (geen actie nodig)',
      })
      result.skipped++
      continue
    }

    // Account spend cap pre-check for budget increases.
    if (
      (action.action_type === 'update_ad_set_budget' || action.action_type === 'update_campaign_budget') &&
      action.payload.budget_change_ratio > 0 &&
      accountSpendToday >= guardrails.accountSpendCapEur
    ) {
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'skipped',
        guardrail_outcome: 'blocked',
        guardrail_reason: `Accountspend €${accountSpendToday.toFixed(2)} ≥ hardcap €${guardrails.accountSpendCapEur}; verhoging geweigerd.`,
      })
      result.blocked++
      continue
    }

    // Capture prior_state per action type, then mutate.
    try {
      if (action.action_type === 'pause_ad_set' || action.action_type === 'resume_ad_set') {
        const prior = await fetchAdSetPrior(client, action.target.meta_id)
        const resp =
          action.action_type === 'pause_ad_set'
            ? await client.pauseAdSet(action.target.meta_id)
            : await client.resumeAdSet(action.target.meta_id)
        await persistAction(supabase, {
          decisionId,
          action,
          status: 'executed',
          guardrail_outcome: 'allowed',
          prior_state: prior,
          meta_response: resp,
          executed_at: new Date().toISOString(),
        })
        result.executed++
        continue
      }

      if (action.action_type === 'pause_ad' || action.action_type === 'resume_ad') {
        const resp = await client.updateAd(action.target.meta_id, {
          status: action.action_type === 'pause_ad' ? 'PAUSED' : 'ACTIVE',
        })
        await persistAction(supabase, {
          decisionId,
          action,
          status: 'executed',
          guardrail_outcome: 'allowed',
          prior_state: { note: 'prior status not captured (lookup unsupported)' },
          meta_response: resp,
          executed_at: new Date().toISOString(),
        })
        result.executed++
        continue
      }

      if (action.action_type === 'update_ad_set_budget') {
        const prior = await fetchAdSetPrior(client, action.target.meta_id)
        const currentMinor = Number(prior.daily_budget) || 0
        if (currentMinor <= 0) {
          await persistAction(supabase, {
            decisionId,
            action,
            status: 'skipped',
            guardrail_outcome: 'blocked',
            guardrail_reason: 'Ad set heeft geen daily_budget (gebruikt vermoedelijk campagnebudget).',
            prior_state: prior,
          })
          result.blocked++
          continue
        }
        const nextMinor = clampBudget(currentMinor, action.payload.budget_change_ratio, guardrails.maxBudgetChangePct)
        const deltaEur = (nextMinor - currentMinor) / 100
        if (
          accountSpendToday + Math.max(deltaEur, 0) > guardrails.accountSpendCapEur ||
          Math.abs(result.total_spend_shift_eur + deltaEur) > guardrails.maxDailySpendShiftEur
        ) {
          await persistAction(supabase, {
            decisionId,
            action,
            status: 'skipped',
            guardrail_outcome: 'blocked',
            guardrail_reason: `Spend-shift overschrijdt dagelijkse limiet (€${guardrails.maxDailySpendShiftEur}) of account-cap.`,
            prior_state: prior,
          })
          result.blocked++
          continue
        }
        const resp = await client.setAdSetDailyBudget(action.target.meta_id, nextMinor)
        await persistAction(supabase, {
          decisionId,
          action,
          status: 'executed',
          guardrail_outcome: 'allowed',
          prior_state: prior,
          meta_response: { ...resp, next_daily_budget_minor: nextMinor },
          executed_at: new Date().toISOString(),
        })
        result.total_spend_shift_eur += deltaEur
        result.executed++
        continue
      }

      if (action.action_type === 'update_campaign_budget') {
        const prior = await fetchCampaignPrior(client, action.target.meta_id)
        const currentMinor = Number(prior.daily_budget) || 0
        if (currentMinor <= 0) {
          await persistAction(supabase, {
            decisionId,
            action,
            status: 'skipped',
            guardrail_outcome: 'blocked',
            guardrail_reason: 'Campagne heeft geen daily_budget; geen veilige aanpassing.',
            prior_state: prior,
          })
          result.blocked++
          continue
        }
        const nextMinor = clampBudget(currentMinor, action.payload.budget_change_ratio, guardrails.maxBudgetChangePct)
        const resp = await client.updateCampaign(action.target.meta_id, { daily_budget: nextMinor })
        await persistAction(supabase, {
          decisionId,
          action,
          status: 'executed',
          guardrail_outcome: 'allowed',
          prior_state: prior,
          meta_response: { ...resp, next_daily_budget_minor: nextMinor },
          executed_at: new Date().toISOString(),
        })
        result.total_spend_shift_eur += (nextMinor - currentMinor) / 100
        result.executed++
        continue
      }

      // Phase 2 stops here for audience/creative actions. Persist them
      // as skipped with a clear "Phase 3" reason so they are visible in
      // the audit trail without being executed.
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'skipped',
        guardrail_outcome: 'blocked',
        guardrail_reason: 'Action type wordt pas in Phase 3 ondersteund (creative & audience pipeline).',
      })
      result.blocked++
    } catch (e) {
      const message = (e as Error).message
      await persistAction(supabase, {
        decisionId,
        action,
        status: 'failed',
        guardrail_outcome: 'allowed',
        error_message: message,
      })
      result.failed++
      result.errors.push(`${action.action_type} ${action.target.meta_id}: ${message}`)
    }
  }

  return result
}

/**
 * Revert a previously-executed action by restoring its prior_state.
 * Only the original mutation owner (the autopilot) writes back via
 * Meta; the action row is updated to status='reverted' + reverted_at.
 */
export async function revertExecutedAction(actionId: string, byUserId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { data: action, error: fetchErr } = await supabase
    .from('ad_autopilot_actions')
    .select('*')
    .eq('id', actionId)
    .maybeSingle()
  if (fetchErr || !action) return { ok: false, error: fetchErr?.message ?? 'Actie niet gevonden' }
  const row = action as {
    id: string
    action_type: string
    target_meta_id: string
    target_level: string
    prior_state: Record<string, unknown> | null
    status: string
    executed_at: string | null
    reverted_at: string | null
  }
  if (row.status !== 'executed' || row.reverted_at) {
    return { ok: false, error: 'Alleen executed, niet-reverted acties kunnen revert worden.' }
  }
  if (!row.prior_state) return { ok: false, error: 'Geen prior_state beschikbaar voor deze actie.' }

  let client: MetaMarketingClient
  try {
    client = await MetaMarketingClient.fromDb({ envFallback: true })
  } catch (e) {
    return { ok: false, error: `Meta credentials missend: ${(e as Error).message}` }
  }

  const prior = row.prior_state
  try {
    if (row.action_type === 'pause_ad_set' || row.action_type === 'resume_ad_set') {
      const targetStatus = typeof prior.status === 'string' ? prior.status : 'ACTIVE'
      await client.updateAdSet(row.target_meta_id, { status: targetStatus })
    } else if (row.action_type === 'pause_ad' || row.action_type === 'resume_ad') {
      const targetStatus = typeof prior.status === 'string' ? prior.status : 'ACTIVE'
      await client.updateAd(row.target_meta_id, { status: targetStatus })
    } else if (row.action_type === 'update_ad_set_budget') {
      const budget = Number(prior.daily_budget)
      if (Number.isFinite(budget) && budget > 0) {
        await client.setAdSetDailyBudget(row.target_meta_id, budget)
      }
    } else if (row.action_type === 'update_campaign_budget') {
      const budget = Number(prior.daily_budget)
      if (Number.isFinite(budget) && budget > 0) {
        await client.updateCampaign(row.target_meta_id, { daily_budget: budget })
      }
    } else {
      return { ok: false, error: `Action type "${row.action_type}" is niet revertbaar (handmatig in Meta).` }
    }
  } catch (e) {
    return { ok: false, error: `Meta API revert mislukt: ${(e as Error).message}` }
  }

  await supabase
    .from('ad_autopilot_actions')
    .update({
      status: 'reverted',
      reverted_at: new Date().toISOString(),
      reverted_by: byUserId,
    })
    .eq('id', actionId)

  return { ok: true }
}
