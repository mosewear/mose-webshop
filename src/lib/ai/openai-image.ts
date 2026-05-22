/**
 * OpenAI Images wrapper for the creative pipeline.
 *
 * Models supported (as of 2026-05): `gpt-image-2`, `gpt-image-2-2026-04-21`,
 * `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`. All accept reference
 * images via multipart `image` fields — exactly what we need for
 * garment-preserving creatives (the product photo is the canonical
 * reference, additional product photos are alternative angles).
 *
 * Endpoint: POST /v1/images/edits
 * Auth: `OPENAI_API_KEY`. Throws a descriptive error if missing.
 *
 * Cost tracking: OpenAI bills images per output token at the model's
 * standard rate. The per-image numbers below are pragmatic flat
 * estimates that match the public docs for "high" quality 1024x1536
 * output; reconcile with your monthly OpenAI invoice when prices shift.
 */

const OPENAI_API_BASE = 'https://api.openai.com/v1'

const OPENAI_IMAGE_COST_USD_PER_IMAGE: Record<string, number> = {
  'gpt-image-2': 0.2,
  'gpt-image-2-2026-04-21': 0.2,
  'chatgpt-image-latest': 0.2,
  'gpt-image-1.5': 0.18,
  'gpt-image-1': 0.167,
  'gpt-image-1-mini': 0.04,
}

export class OpenAIImageError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'OpenAIImageError'
  }
}

function getToken(): string {
  const token = process.env.OPENAI_API_KEY
  if (!token) {
    throw new OpenAIImageError(
      'OPENAI_API_KEY ontbreekt. Voeg deze toe in .env.local / Vercel om OpenAI image-modellen te kunnen gebruiken.',
    )
  }
  return token
}

export interface OpenAIImageReference {
  buffer: Buffer
  contentType: string
  filename: string
}

export interface OpenAIImageGenerateInput {
  model: string
  prompt: string
  /**
   * First entry is the canonical garment reference; the rest are
   * alternate angles / colour-ways. OpenAI composes/edits from the set.
   */
  referenceImages: OpenAIImageReference[]
  /** 1024x1024 (square), 1024x1536 (4:5 portrait), 1536x1024 (landscape). */
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'
  quality?: 'auto' | 'low' | 'medium' | 'high'
  /** Forwarded as the `n` parameter — we typically call with 1 and loop. */
  n?: number
}

export interface OpenAIImageGenerateResult {
  buffer: Buffer
  contentType: string
  cost_usd: number
  model: string
}

/**
 * Generate one image from a prompt + reference photo(s). Returns the
 * decoded binary so the orchestrator can re-encode + QA it like any
 * other provider's output.
 */
export async function generateImageWithOpenAI(
  input: OpenAIImageGenerateInput,
): Promise<OpenAIImageGenerateResult> {
  const token = getToken()
  if (!input.referenceImages.length) {
    throw new OpenAIImageError('Minimaal 1 referentiefoto vereist voor /images/edits.')
  }

  const form = new FormData()
  form.append('model', input.model)
  form.append('prompt', input.prompt)
  form.append('size', input.size ?? '1024x1536')
  form.append('quality', input.quality ?? 'high')
  form.append('n', String(input.n ?? 1))
  // `/v1/images/edits` is strict about field names:
  //   1 image  → singular `image`
  //   N images → array syntax `image[]` (else OpenAI returns 400
  //              "Duplicate parameter: 'image'")
  // Both forms accept the same Blob payload; only the field name
  // differs based on how many references we attach.
  const fieldName = input.referenceImages.length > 1 ? 'image[]' : 'image'
  for (const ref of input.referenceImages) {
    form.append(
      fieldName,
      new Blob([new Uint8Array(ref.buffer)], { type: ref.contentType }),
      ref.filename,
    )
  }

  const res = await fetch(`${OPENAI_API_BASE}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  })

  const text = await res.text()
  let body: Record<string, unknown> = {}
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const err = body.error as { message?: string; code?: string } | undefined
    const detail = err?.message ?? text ?? `HTTP ${res.status}`
    throw new OpenAIImageError(`OpenAI Images ${res.status}: ${detail}`, res.status, body)
  }

  const data = (body.data as Array<{ b64_json?: string; url?: string }> | undefined) ?? []
  const first = data[0]
  if (!first) {
    throw new OpenAIImageError('OpenAI gaf geen image data terug.', 500, body)
  }

  let buffer: Buffer
  let contentType = 'image/png'
  if (first.b64_json) {
    buffer = Buffer.from(first.b64_json, 'base64')
  } else if (first.url) {
    const r = await fetch(first.url)
    if (!r.ok) {
      throw new OpenAIImageError(
        `Kon image URL niet ophalen (${r.status}): ${first.url}`,
        r.status,
      )
    }
    const ab = await r.arrayBuffer()
    buffer = Buffer.from(ab)
    contentType = r.headers.get('content-type') || 'image/png'
  } else {
    throw new OpenAIImageError('Geen b64_json of url in OpenAI response.', 500, body)
  }

  const perImage = OPENAI_IMAGE_COST_USD_PER_IMAGE[input.model] ?? 0
  return {
    buffer,
    contentType,
    cost_usd: Number(((input.n ?? 1) * perImage).toFixed(4)),
    model: input.model,
  }
}

/** Heuristic: any model id starting with gpt-image- or chatgpt-image- is OpenAI. */
export function isOpenAIImageModel(model: string): boolean {
  return /^gpt-image-/i.test(model) || /^chatgpt-image/i.test(model)
}

/** Per-image USD estimate (used by the budget pre-check before a run). */
export function estimateOpenAIImageCostUsd(model: string, variants: number): number {
  const perImage = OPENAI_IMAGE_COST_USD_PER_IMAGE[model] ?? 0.2
  return Number((perImage * variants).toFixed(4))
}

/** Content-type sniffed from a URL extension; falls back to image/jpeg. */
export function contentTypeForImageUrl(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

/** Filename sniffed from a URL; falls back to source.jpg. */
export function filenameForImageUrl(url: string, fallback = 'source.jpg'): string {
  try {
    const u = new URL(url)
    const base = u.pathname.split('/').pop() || fallback
    return base.length > 0 ? base : fallback
  } catch {
    return fallback
  }
}
