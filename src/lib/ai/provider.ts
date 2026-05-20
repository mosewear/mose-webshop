/**
 * AI provider abstraction.
 *
 * Thin wrapper over the Vercel AI SDK so the autopilot can swap models
 * without touching the orchestrator. Defaults to OpenAI GPT-4o-mini for
 * cost-efficiency on the daily audit; bump to gpt-4o when long-context
 * monthly reviews land in Phase 4.
 *
 * Cost tracking: we capture promptTokens/completionTokens from the SDK
 * response and translate to USD using `MODEL_COSTS_USD_PER_1K` so the
 * decisions log can show how much each run cost.
 */

import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { AutopilotDecisionSchema, type AutopilotDecision } from '@/lib/ai/types'

export interface ProviderOptions {
  provider?: 'openai' | 'mock'
  model?: string
  temperature?: number
  maxRetries?: number
  abortSignal?: AbortSignal
}

export interface ProviderRunInput {
  systemPrompt: string
  userMessage: string
  options?: ProviderOptions
}

export interface ProviderRunResult {
  decision: AutopilotDecision
  rawResponse: unknown
  provider: 'openai' | 'mock'
  model: string
  costInputTokens?: number
  costOutputTokens?: number
  costUsd?: number
}

/**
 * Pricing as of 2026-05 (Meta API and OpenAI both refresh quarterly;
 * keep this updated when bumping model versions). Numbers are USD per
 * 1k tokens. If a new model lands without an entry, costUsd is left
 * undefined and the orchestrator persists a null cost rather than a
 * misleading number.
 */
const MODEL_COSTS_USD_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
}

const DEFAULT_MODEL = 'gpt-4o-mini'

function computeCostUsd(model: string, promptTokens?: number, completionTokens?: number): number | undefined {
  const pricing = MODEL_COSTS_USD_PER_1K[model]
  if (!pricing) return undefined
  const input = (promptTokens ?? 0) * (pricing.input / 1000)
  const output = (completionTokens ?? 0) * (pricing.output / 1000)
  return Number((input + output).toFixed(6))
}

/**
 * Run a decision through the LLM. Validates against the Zod schema in
 * `types.ts` — anything off-schema throws here, caught upstream by the
 * orchestrator and persisted as `status='failed'`.
 */
export async function runAutopilotDecision(input: ProviderRunInput): Promise<ProviderRunResult> {
  const provider = input.options?.provider ?? 'openai'
  const model = input.options?.model ?? DEFAULT_MODEL
  const temperature = input.options?.temperature ?? 0.2
  const maxRetries = input.options?.maxRetries ?? 2

  if (provider === 'mock') {
    return runMockProvider(input.systemPrompt, input.userMessage, model)
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('[AI] OPENAI_API_KEY env var is required for provider=openai')
  }

  const generation = await generateObject({
    model: openai(model),
    schema: AutopilotDecisionSchema,
    system: input.systemPrompt,
    prompt: input.userMessage,
    temperature,
    maxRetries,
    abortSignal: input.options?.abortSignal,
  })

  const decision = generation.object
  const promptTokens =
    typeof generation.usage?.promptTokens === 'number' ? generation.usage.promptTokens : undefined
  const completionTokens =
    typeof generation.usage?.completionTokens === 'number' ? generation.usage.completionTokens : undefined

  return {
    decision,
    rawResponse: {
      finishReason: generation.finishReason,
      usage: generation.usage,
      response: generation.response,
      warnings: generation.warnings,
    },
    provider,
    model,
    costInputTokens: promptTokens,
    costOutputTokens: completionTokens,
    costUsd: computeCostUsd(model, promptTokens, completionTokens),
  }
}

/**
 * Deterministic fixture provider for tests / Phase 1 dry-runs without
 * burning real API tokens. Returns a single `no_op` proposal so the
 * pipeline can be exercised end-to-end.
 */
function runMockProvider(
  _systemPrompt: string,
  _userMessage: string,
  model: string,
): ProviderRunResult {
  const decision: AutopilotDecision = {
    summary: 'Mock provider — er zijn geen Meta-snapshots beschikbaar en er is geen autonome actie nodig.',
    risk_level: 'low',
    actions: [
      {
        action_type: 'no_op',
        target: { level: 'account', meta_id: 'n/a' },
        payload: { rationale: 'Mock provider gebruikt voor pipeline-test. Geen autonome ingreep.' },
      },
    ],
    followups: ['Schakel een echte AI-provider in (OPENAI_API_KEY) om productieve voorstellen te krijgen.'],
  }
  return {
    decision,
    rawResponse: { source: 'mock' },
    provider: 'mock',
    model,
    costInputTokens: 0,
    costOutputTokens: 0,
    costUsd: 0,
  }
}
