/**
 * Guardrail evaluation: given the current site_settings config + a list
 * of proposed actions, decide which actions are allowed to execute.
 *
 * In Phase 1 (advisory mode) NOTHING actually executes — every action
 * is classified and the outcome is persisted to ad_autopilot_actions
 * with status='skipped'. Phase 2 will use the same outcomes but flip
 * `status='executed'` for the allowed subset.
 */

import type { ActionProposal, GuardrailConfig, ParsedActionWithGuardrail } from '@/lib/ai/types'

export function isWithinWorkingHours(config: GuardrailConfig, now = new Date()): boolean {
  try {
    // Compute the current hour in the configured timezone using
    // Intl.DateTimeFormat. Falls back to UTC on lookup failure.
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: config.workingHoursTz,
      hour: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const hourPart = parts.find((p) => p.type === 'hour')
    const hour = hourPart ? Number(hourPart.value) : now.getUTCHours()
    return hour >= config.workingHoursStart && hour < config.workingHoursEnd
  } catch {
    return now.getUTCHours() >= config.workingHoursStart && now.getUTCHours() < config.workingHoursEnd
  }
}

/**
 * Evaluate a single action against the guardrails. Returns the outcome
 * + a human-readable reason that the admin UI surfaces. Mode-specific
 * behaviour:
 *  - advisory: every action is "allowed" but the executor skips it
 *    based on the mode flag (this function doesn't know about the
 *    executor; that's the caller's job).
 *  - bounded: full guardrail enforcement.
 *  - full: same as bounded for Phase 1 (only Phase 4 loosens further).
 */
export function evaluateAction(
  action: ActionProposal,
  config: GuardrailConfig,
  now = new Date(),
): ParsedActionWithGuardrail {
  if (!config.enabled) {
    return { action, guardrail_outcome: 'killswitch', guardrail_reason: 'Killswitch staat aan (ai_autopilot_enabled=false).' }
  }

  if (!isWithinWorkingHours(config, now) && config.mode !== 'advisory') {
    return {
      action,
      guardrail_outcome: 'blocked',
      guardrail_reason: `Buiten werkuren (${String(config.workingHoursStart).padStart(2, '0')}:00-${String(config.workingHoursEnd).padStart(2, '0')}:00 ${config.workingHoursTz}).`,
    }
  }

  if (action.action_type === 'update_ad_set_budget' || action.action_type === 'update_campaign_budget') {
    const ratio = action.payload.budget_change_ratio
    if (Math.abs(ratio) > config.maxBudgetChangePct + 1e-6) {
      return {
        action,
        guardrail_outcome: 'blocked',
        guardrail_reason: `Voorgestelde wijziging (${(ratio * 100).toFixed(1)}%) overschrijdt max ±${(config.maxBudgetChangePct * 100).toFixed(0)}%.`,
      }
    }
  }

  // For Phase 1, everything else just passes. Per-account daily spend
  // shift and marge-floor are enforced inside the executor (Phase 2)
  // when we know the actual currency amounts.
  return { action, guardrail_outcome: 'allowed' }
}

export function evaluateAll(
  actions: ActionProposal[],
  config: GuardrailConfig,
  now = new Date(),
): ParsedActionWithGuardrail[] {
  return actions.map((a) => evaluateAction(a, config, now))
}
