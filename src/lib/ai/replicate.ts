/**
 * Replicate API wrapper used by the creative pipeline.
 *
 * Two surfaces:
 *  - `runReplicateModel` (sync-ish polling helper)
 *  - `ReplicateClient` (typed methods for the specific models we need:
 *    background removal, garment-preserving image edit, palette-aware
 *    re-render).
 *
 * Service-role only. Never import from a Client Component.
 *
 * Auth: `REPLICATE_API_TOKEN`. If missing, every call throws a
 * descriptive error so the admin UI can guide the user to the config
 * page.
 *
 * Cost tracking: Replicate doesn't return a unit price in the response,
 * so we maintain a rough $/sec table per model and multiply by
 * `metrics.predict_time`. This is *advisory* — the canonical cost lives
 * on Replicate's billing dashboard.
 */

const REPLICATE_API_BASE = 'https://api.replicate.com/v1'

// Rough $/second per model — keep in sync with replicate.com/pricing.
// When unknown we fall back to 0 so we never block on missing data.
const MODEL_COST_USD_PER_SECOND: Record<string, number> = {
  'black-forest-labs/flux-kontext-pro': 0.04,
  'black-forest-labs/flux-1.1-pro': 0.04,
  'black-forest-labs/flux-schnell': 0.003,
  'stability-ai/stable-diffusion-3.5-large': 0.035,
  'zsxkib/birefnet-segmentation': 0.0025,
  'lucataco/sdxl-img2img': 0.0023,
}

export class ReplicateError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message)
    this.name = 'ReplicateError'
  }
}

interface CreatePredictionInput {
  /** Either "owner/model" (latest) or an explicit version sha. */
  modelOrVersion: string
  input: Record<string, unknown>
  webhook?: string
  webhookEventsFilter?: Array<'start' | 'output' | 'logs' | 'completed'>
}

interface Prediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: unknown
  error?: string | null
  logs?: string
  metrics?: { predict_time?: number; total_time?: number }
  urls?: { get?: string; cancel?: string }
  created_at?: string
  started_at?: string | null
  completed_at?: string | null
}

function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    throw new ReplicateError(
      'REPLICATE_API_TOKEN ontbreekt. Voeg deze toe in .env.local / Vercel om de creative pipeline te kunnen draaien.',
    )
  }
  return token
}

async function request<T>(path: string, init: RequestInit = {}, retries = 2): Promise<T> {
  const token = getToken()
  const res = await fetch(`${REPLICATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  // 429 + 5xx → bounded retry
  if (!res.ok && (res.status === 429 || (res.status >= 500 && res.status < 600)) && retries > 0) {
    const retryAfter = Number(res.headers.get('retry-after')) || 0
    const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 500 * (3 - retries)
    await new Promise((resolve) => setTimeout(resolve, backoffMs))
    return request<T>(path, init, retries - 1)
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    throw new ReplicateError(`Replicate ${res.status}: ${detail}`, res.status, body)
  }
  return body as T
}

/**
 * Create a prediction and poll until completion. Returns the final
 * Prediction object including outputs and cost metrics.
 *
 * Defaults:
 *  - poll every 1s (Replicate predictions usually finish in 2-20s for
 *    the models we use)
 *  - hard timeout 5 min so an admin UI request never hangs forever.
 */
export async function runReplicateModel(
  args: CreatePredictionInput & { pollIntervalMs?: number; timeoutMs?: number },
): Promise<Prediction & { cost_usd?: number; model_id: string }> {
  const { modelOrVersion, input, webhook, webhookEventsFilter } = args
  const pollIntervalMs = args.pollIntervalMs ?? 1000
  const timeoutMs = args.timeoutMs ?? 5 * 60_000

  // "owner/model" — let Replicate pick the latest version.
  // "version_sha"      — exact pin.
  const isVersion = !modelOrVersion.includes('/')
  const path = isVersion ? '/predictions' : `/models/${modelOrVersion}/predictions`
  const body = isVersion
    ? { version: modelOrVersion, input, webhook, webhook_events_filter: webhookEventsFilter }
    : { input, webhook, webhook_events_filter: webhookEventsFilter }

  const created = await request<Prediction>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const deadline = Date.now() + timeoutMs
  let current = created
  while (current.status === 'starting' || current.status === 'processing') {
    if (Date.now() > deadline) {
      throw new ReplicateError(`Prediction ${current.id} timed out after ${timeoutMs}ms`, 504)
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    const pollPath = current.urls?.get?.replace(REPLICATE_API_BASE, '') ?? `/predictions/${current.id}`
    current = await request<Prediction>(pollPath, { method: 'GET' })
  }

  if (current.status === 'failed' || current.status === 'canceled') {
    throw new ReplicateError(
      `Prediction ${current.id} ${current.status}: ${current.error || 'no error message'}`,
      500,
      current,
    )
  }

  const predictTime = current.metrics?.predict_time ?? 0
  const rate = MODEL_COST_USD_PER_SECOND[modelOrVersion] ?? 0
  return { ...current, cost_usd: Number((predictTime * rate).toFixed(6)), model_id: modelOrVersion }
}

/**
 * Convenience wrapper: extract every output URL from a Replicate
 * prediction. Replicate returns outputs in many shapes (single URL,
 * array of URLs, nested objects) — this normalises to a flat list.
 */
export function extractOutputUrls(output: unknown): string[] {
  if (!output) return []
  if (typeof output === 'string') return [output]
  if (Array.isArray(output)) {
    return output.flatMap((entry) => extractOutputUrls(entry))
  }
  if (typeof output === 'object') {
    const values = Object.values(output as Record<string, unknown>)
    return values.flatMap((v) => extractOutputUrls(v))
  }
  return []
}

/**
 * Higher-level helpers for the specific models we expect to use. Kept
 * separate so prompt-engineering changes can live alongside their model
 * choice without touching the orchestrator.
 */
export const ReplicateModels = {
  /** Garment-preserving image edit (text+image -> image). */
  fluxKontext: 'black-forest-labs/flux-kontext-pro',
  /** High-quality background removal / matting. */
  birefnet: 'zsxkib/birefnet-segmentation',
  /** Faster/cheaper text-to-image baseline. */
  fluxSchnell: 'black-forest-labs/flux-schnell',
} as const

export type ReplicateModelKey = keyof typeof ReplicateModels
