/**
 * Decision orchestrator: pulls signals + snapshots, renders the daily
 * audit prompt, runs the AI provider, applies guardrails and persists
 * the full audit trail.
 *
 * In Phase 1 (advisory mode) we never execute the parsed actions — we
 * only log them as `status='skipped'` in `ad_autopilot_actions` with
 * the guardrail outcome that *would* apply. Phase 2 swaps that to
 * `status='executed'` + Meta API calls inside the `executor` module.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { renderDailyAuditPrompt, PROMPT_VERSION } from '@/lib/ai/prompts/v1-daily-audit'
import { runAutopilotDecision } from '@/lib/ai/provider'
import { evaluateAll } from '@/lib/ai/guardrails'
import { executeApprovedActions } from '@/lib/ai/executor'
import { getActiveGeneralPromos } from '@/lib/ai/pricing-context'
import type {
  CampaignSnapshotRow,
  GuardrailConfig,
  OptimizerSignalRow,
} from '@/lib/ai/types'

export interface OrchestratorRunOptions {
  trigger?: 'cron' | 'manual' | 'webhook' | 'backfill'
  provider?: 'openai' | 'mock'
  model?: string
  /**
   * Override the snapshot_date used to filter ad_campaign_snapshots.
   * Defaults to today; useful for backfills.
   */
  snapshotDate?: string
  /** Hard upper bound on signal rows passed to the LLM (default 250). */
  signalLimit?: number
  /** How many days of campaign snapshots to inspect. */
  snapshotDaysBack?: number
}

export interface OrchestratorRunResult {
  decisionId: string
  status: 'completed' | 'failed' | 'killswitch'
  provider: string
  model: string
  costUsd?: number
  parsedActionsCount: number
  executed?: number
  skipped?: number
  blocked?: number
  failed?: number
  duration_ms: number
}

const SETTING_KEYS = [
  'ai_autopilot_enabled',
  'ai_autopilot_mode',
  'ai_autopilot_max_budget_change_pct',
  'ai_autopilot_max_daily_spend_shift_eur',
  'ai_autopilot_account_spend_cap_eur',
  'ai_autopilot_min_margin_pct_floor',
  'ai_autopilot_working_hours',
  'ai_autopilot_revert_window_days',
  'ai_autopilot_provider',
  'ai_autopilot_model',
] as const

interface ProviderSettings {
  provider: 'openai' | 'mock'
  model: string
}

async function loadProviderSettings(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<ProviderSettings> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['ai_autopilot_provider', 'ai_autopilot_model'])
  const map = new Map<string, unknown>()
  for (const row of data ?? []) {
    map.set((row as { key: string }).key, (row as { value: unknown }).value)
  }
  const cleanString = (v: unknown, fallback: string) =>
    typeof v === 'string' ? v.replace(/"/g, '') : fallback
  const providerRaw = cleanString(map.get('ai_autopilot_provider'), 'openai')
  const provider: ProviderSettings['provider'] = providerRaw === 'mock' ? 'mock' : 'openai'
  const model = cleanString(map.get('ai_autopilot_model'), 'gpt-4o-mini') || 'gpt-4o-mini'
  return { provider, model }
}

async function loadGuardrailConfig(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<GuardrailConfig> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS as unknown as string[])
  if (error) throw new Error(`[orchestrator] guardrail load: ${error.message}`)

  const map = new Map<string, unknown>()
  for (const row of data ?? []) {
    map.set((row as { key: string }).key, (row as { value: unknown }).value)
  }

  const parseBool = (v: unknown, fallback = false): boolean =>
    typeof v === 'boolean' ? v : typeof v === 'string' ? v === 'true' : fallback
  const parseNum = (v: unknown, fallback: number): number => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/"/g, ''))
      return Number.isFinite(n) ? n : fallback
    }
    return fallback
  }
  const parseStr = (v: unknown, fallback: string): string =>
    typeof v === 'string' ? v.replace(/"/g, '') : fallback

  const workingHours = (map.get('ai_autopilot_working_hours') as
    | { start_hour?: number; end_hour?: number; timezone?: string }
    | undefined) ?? {}

  const modeRaw = parseStr(map.get('ai_autopilot_mode'), 'advisory')
  const mode = ['advisory', 'bounded', 'full'].includes(modeRaw)
    ? (modeRaw as GuardrailConfig['mode'])
    : 'advisory'

  return {
    enabled: parseBool(map.get('ai_autopilot_enabled'), false),
    mode,
    maxBudgetChangePct: parseNum(map.get('ai_autopilot_max_budget_change_pct'), 0.1),
    maxDailySpendShiftEur: parseNum(map.get('ai_autopilot_max_daily_spend_shift_eur'), 50),
    accountSpendCapEur: parseNum(map.get('ai_autopilot_account_spend_cap_eur'), 500),
    minMarginPctFloor: parseNum(map.get('ai_autopilot_min_margin_pct_floor'), 0.15),
    workingHoursStart: typeof workingHours.start_hour === 'number' ? workingHours.start_hour : 7,
    workingHoursEnd: typeof workingHours.end_hour === 'number' ? workingHours.end_hour : 22,
    workingHoursTz: workingHours.timezone || 'Europe/Amsterdam',
    revertWindowDays: parseNum(map.get('ai_autopilot_revert_window_days'), 30),
  }
}

async function loadSignals(
  supabase: ReturnType<typeof createServiceRoleClient>,
  limit: number,
): Promise<OptimizerSignalRow[]> {
  const { data, error } = await supabase
    .from('v_ad_optimizer_signals')
    .select('*')
    .order('gross_revenue_30d', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`[orchestrator] signals load: ${error.message}`)
  return (data ?? []) as OptimizerSignalRow[]
}

async function loadRecentSnapshots(
  supabase: ReturnType<typeof createServiceRoleClient>,
  daysBack: number,
): Promise<CampaignSnapshotRow[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - daysBack)
  const sinceIso = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('ad_campaign_snapshots')
    .select(
      'snapshot_date, entity_level, meta_entity_id, campaign_id, ad_set_id, ad_id, name, objective, status, spend, impressions, clicks, link_clicks, attributed_purchases, attributed_revenue, attributed_add_to_cart, attributed_initiate_checkout, ctr, cpm, cpc, frequency',
    )
    .gte('snapshot_date', sinceIso)
    .order('snapshot_date', { ascending: false })
    .limit(2000)
  if (error) throw new Error(`[orchestrator] snapshots load: ${error.message}`)
  return (data ?? []) as CampaignSnapshotRow[]
}

export async function runAutopilotDailyDecision(
  options: OrchestratorRunOptions = {},
): Promise<OrchestratorRunResult> {
  const started = Date.now()
  const supabase = createServiceRoleClient()
  const trigger = options.trigger ?? 'cron'

  // 1) Pre-flight: load guardrails so we can short-circuit on killswitch.
  const [guardrails, providerSettings] = await Promise.all([
    loadGuardrailConfig(supabase),
    loadProviderSettings(supabase),
  ])

  const provider = options.provider ?? providerSettings.provider
  const model = options.model ?? providerSettings.model

  // 2) Insert the decisions row in `running` state so we can correlate
  //    any failure with a persisted ID even if the LLM crashes.
  const { data: decisionInsert, error: insertError } = await supabase
    .from('ad_autopilot_decisions')
    .insert({
      trigger,
      provider,
      model,
      prompt_version: PROMPT_VERSION,
      prompt_hash: 'pending',
      snapshot_date: options.snapshotDate ?? new Date().toISOString().slice(0, 10),
      input_summary: {},
      llm_raw_response: null,
      parsed_actions: [],
      proposal_count: 0,
      status: 'running',
    })
    .select('id')
    .single()
  if (insertError || !decisionInsert) {
    throw new Error(`[orchestrator] decision insert: ${insertError?.message ?? 'unknown'}`)
  }
  const decisionId = decisionInsert.id as string

  try {
    if (!guardrails.enabled && guardrails.mode !== 'advisory') {
      // Killswitch path: still log a decision row so the UI can show why.
      await supabase
        .from('ad_autopilot_decisions')
        .update({
          status: 'killswitch',
          run_completed_at: new Date().toISOString(),
          input_summary: { reason: 'killswitch' },
        })
        .eq('id', decisionId)
      return {
        decisionId,
        status: 'killswitch',
        provider,
        model,
        parsedActionsCount: 0,
        duration_ms: Date.now() - started,
      }
    }

    const [signals, snapshots, promos] = await Promise.all([
      loadSignals(supabase, options.signalLimit ?? 250),
      loadRecentSnapshots(supabase, options.snapshotDaysBack ?? 14),
      getActiveGeneralPromos(),
    ])

    const prompt = renderDailyAuditPrompt({ guardrails, signals, snapshots, promos })

    const inputSummary = {
      signal_count: signals.length,
      snapshot_count: snapshots.length,
      oos_count: signals.filter((s) => (Number(s.current_stock) || 0) <= 0).length,
      missing_econ_count: signals.filter((s) => !s.has_variant_econ && !s.has_product_econ).length,
      working_hours: `${guardrails.workingHoursStart}-${guardrails.workingHoursEnd}`,
      mode: guardrails.mode,
      sale_count: signals.filter((s) => s.has_active_sale === true).length,
      staffel_count: signals.filter((s) => s.has_active_staffel === true).length,
      active_promo_count: promos.length,
    }

    // Persist prompt hash + input summary before the LLM call so even a
    // crashed run leaves a useful breadcrumb.
    await supabase
      .from('ad_autopilot_decisions')
      .update({ prompt_hash: prompt.promptHash, input_summary: inputSummary })
      .eq('id', decisionId)

    const result = await runAutopilotDecision({
      systemPrompt: prompt.systemPrompt,
      userMessage: prompt.userMessage,
      options: { provider, model },
    })

    const evaluated = evaluateAll(result.decision.actions, guardrails)

    // Persist parsed decision.
    await supabase
      .from('ad_autopilot_decisions')
      .update({
        status: 'completed',
        run_completed_at: new Date().toISOString(),
        llm_raw_response: result.rawResponse,
        parsed_actions: result.decision.actions,
        proposal_count: result.decision.actions.length,
        cost_input_tokens: result.costInputTokens ?? null,
        cost_output_tokens: result.costOutputTokens ?? null,
        cost_usd: result.costUsd ?? null,
      })
      .eq('id', decisionId)

    // Hand the evaluated proposals to the executor, which decides per
    // action whether to skip (advisory mode) or actually call the Meta
    // API (bounded/full). Action-row persistence lives entirely inside
    // the executor so the lifecycle (queued → executed/failed/skipped)
    // is owned in one place.
    const execResult = await executeApprovedActions({
      decisionId,
      actions: evaluated,
      guardrails,
    })

    if (execResult.errors.length > 0) {
      await supabase
        .from('ad_autopilot_decisions')
        .update({ error_message: execResult.errors.slice(0, 5).join(' | ').slice(0, 4000) })
        .eq('id', decisionId)
    }

    return {
      decisionId,
      status: 'completed',
      provider: result.provider,
      model: result.model,
      costUsd: result.costUsd,
      parsedActionsCount: evaluated.length,
      executed: execResult.executed,
      skipped: execResult.skipped,
      blocked: execResult.blocked,
      failed: execResult.failed,
      duration_ms: Date.now() - started,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    await supabase
      .from('ad_autopilot_decisions')
      .update({
        status: 'failed',
        run_completed_at: new Date().toISOString(),
        error_message: message.slice(0, 4000),
      })
      .eq('id', decisionId)
    throw err
  }
}
