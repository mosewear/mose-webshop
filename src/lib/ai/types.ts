/**
 * Shared types and Zod schemas for the AI Campaign Autopilot.
 *
 * All LLM output is validated against these schemas via `generateObject`
 * — anything that doesn't match the schema is rejected at parse time so
 * we never persist a malformed proposal. The same schemas are reused by
 * the orchestrator (input contract) and the admin UI (decision viewer).
 */
import { z } from 'zod'

// -----------------------------------------------------------------------
// Action proposals
// -----------------------------------------------------------------------

/** Every action type the autopilot may propose. */
export const ActionTypeSchema = z.enum([
  'pause_ad_set',
  'resume_ad_set',
  'pause_ad',
  'resume_ad',
  'update_ad_set_budget',
  'update_campaign_budget',
  'exclude_audience',
  'create_custom_audience',
  'create_lookalike_audience',
  'launch_creative_variant',
  'no_op',
])

/**
 * Budget change is expressed as a relative ratio (-0.5 ... +0.5) so the
 * autopilot reasons about percentage moves, and the executor clamps the
 * absolute euros against the configured account spend cap. Storing the
 * ratio (instead of an absolute amount) also gives the LLM clearer
 * guardrails per the system prompt.
 */
const BudgetChangePayloadSchema = z.object({
  budget_change_ratio: z.number().min(-0.5).max(0.5),
  rationale: z.string().min(10).max(500),
})

const StatusChangePayloadSchema = z.object({
  rationale: z.string().min(10).max(500),
})

const AudiencePayloadSchema = z.object({
  audience_name: z.string().min(1).max(200),
  source: z.enum(['orders_30d', 'orders_90d', 'high_ltv', 'returners_high', 'custom_query']),
  rationale: z.string().min(10).max(500),
})

const CreativeVariantPayloadSchema = z.object({
  scene_key: z.string().min(1).max(200),
  product_slug: z.string().min(1).max(200),
  copy_angle: z.enum(['benefit', 'social_proof', 'scarcity', 'lifestyle', 'value']),
  rationale: z.string().min(10).max(500),
})

const NoOpPayloadSchema = z.object({
  rationale: z.string().min(10).max(500),
})

const ActionTargetSchema = z.object({
  level: z.enum(['account', 'campaign', 'ad_set', 'ad', 'audience', 'creative']),
  meta_id: z.string().min(1).max(64),
  label: z.string().max(200).optional(),
})

export const ActionProposalSchema = z.discriminatedUnion('action_type', [
  z.object({
    action_type: z.literal('pause_ad_set'),
    target: ActionTargetSchema,
    payload: StatusChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('resume_ad_set'),
    target: ActionTargetSchema,
    payload: StatusChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('pause_ad'),
    target: ActionTargetSchema,
    payload: StatusChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('resume_ad'),
    target: ActionTargetSchema,
    payload: StatusChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('update_ad_set_budget'),
    target: ActionTargetSchema,
    payload: BudgetChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('update_campaign_budget'),
    target: ActionTargetSchema,
    payload: BudgetChangePayloadSchema,
  }),
  z.object({
    action_type: z.literal('exclude_audience'),
    target: ActionTargetSchema,
    payload: AudiencePayloadSchema,
  }),
  z.object({
    action_type: z.literal('create_custom_audience'),
    target: ActionTargetSchema,
    payload: AudiencePayloadSchema,
  }),
  z.object({
    action_type: z.literal('create_lookalike_audience'),
    target: ActionTargetSchema,
    payload: AudiencePayloadSchema,
  }),
  z.object({
    action_type: z.literal('launch_creative_variant'),
    target: ActionTargetSchema,
    payload: CreativeVariantPayloadSchema,
  }),
  z.object({
    action_type: z.literal('no_op'),
    target: ActionTargetSchema,
    payload: NoOpPayloadSchema,
  }),
])

export type ActionProposal = z.infer<typeof ActionProposalSchema>

/**
 * Top-level shape we ask the LLM to produce. Keep this small — the
 * model gets paid per token, and overly chatty fields tank both cost
 * and reliability.
 */
export const AutopilotDecisionSchema = z.object({
  summary: z
    .string()
    .min(20)
    .max(1200)
    .describe('Korte samenvatting van de huidige situatie en de redenatie. Max 5 zinnen.'),
  risk_level: z
    .enum(['low', 'medium', 'high'])
    .describe('Geschat risiconiveau van de gezamenlijke voorgestelde acties.'),
  actions: z
    .array(ActionProposalSchema)
    .max(20)
    .describe('Voorgestelde acties met onderbouwing. Geef geen acties die in strijd zijn met de guardrails.'),
  followups: z
    .array(z.string().min(5).max(280))
    .max(10)
    .default([])
    .describe('Lijst van vervolgvragen of data die de autopilot ontbeert om volgende keer beter te besluiten.'),
})

export type AutopilotDecision = z.infer<typeof AutopilotDecisionSchema>

// -----------------------------------------------------------------------
// Orchestrator input (signals from DB → LLM)
// -----------------------------------------------------------------------

export interface OptimizerSignalRow {
  variant_id: string
  product_id: string
  sku: string | null
  size: string | null
  color: string | null
  current_stock: number | null
  variant_available: boolean | null
  product_name: string
  product_slug: string
  category_id: string | null
  category_name: string | null
  base_price: number | string
  sale_price: number | string | null
  product_active: boolean | null
  effective_price: number | string | null
  has_active_sale: boolean | null
  sale_off_pct: number | string | null
  has_active_staffel: boolean | null
  staffel_tier_count: number | string | null
  deepest_min_quantity: number | string | null
  staffel_max_pct_off: number | string | null
  staffel_max_fixed_off: number | string | null
  units_sold_7d: number | string
  gross_revenue_7d: number | string
  orders_7d: number | string
  units_sold_30d: number | string
  gross_revenue_30d: number | string
  orders_30d: number | string
  units_sold_lifetime: number | string
  gross_revenue_lifetime: number | string
  returned_units_30d: number | string
  refund_value_30d: number | string
  returned_units_lifetime: number | string
  refund_value_lifetime: number | string
  return_rate_30d: number | string | null
  pending_back_in_stock_signups: number | string
  total_back_in_stock_signups: number | string
  cost_price: number | string | null
  shipping_cost_avg: number | string | null
  transaction_fee_pct: number | string | null
  vat_rate: number | string | null
  has_variant_econ: boolean | null
  has_product_econ: boolean | null
  contribution_margin_per_unit: number | string | null
  contribution_margin_30d: number | string | null
}

export interface CampaignSnapshotRow {
  snapshot_date: string
  entity_level: 'account' | 'campaign' | 'ad_set' | 'ad'
  meta_entity_id: string
  campaign_id: string | null
  ad_set_id: string | null
  ad_id: string | null
  name: string | null
  objective: string | null
  status: string | null
  spend: number | string
  impressions: number | string
  clicks: number | string
  link_clicks: number | string
  attributed_purchases: number | string
  attributed_revenue: number | string
  attributed_add_to_cart: number | string
  attributed_initiate_checkout: number | string
  ctr: number | string | null
  cpm: number | string | null
  cpc: number | string | null
  frequency: number | string | null
}

export interface GuardrailConfig {
  enabled: boolean
  mode: 'advisory' | 'bounded' | 'full'
  maxBudgetChangePct: number
  maxDailySpendShiftEur: number
  accountSpendCapEur: number
  minMarginPctFloor: number
  workingHoursStart: number
  workingHoursEnd: number
  workingHoursTz: string
  revertWindowDays: number
}

// -----------------------------------------------------------------------
// Decision audit metadata
// -----------------------------------------------------------------------

export interface DecisionAuditMeta {
  provider: 'openai' | 'mock'
  model: string
  promptVersion: string
  promptHash: string
  costInputTokens?: number
  costOutputTokens?: number
  costUsd?: number
}

export interface ParsedActionWithGuardrail {
  action: ActionProposal
  guardrail_outcome: 'allowed' | 'blocked' | 'killswitch' | 'manual_override'
  guardrail_reason?: string
}
