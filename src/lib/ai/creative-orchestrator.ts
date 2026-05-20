/**
 * Creative orchestrator — turns a (product, scene) pair into N
 * Meta-ready creative variants via Replicate, runs automatic QA and
 * persists everything to `ai_creative_runs` + `ai_creative_variants`.
 *
 * Lifecycle for one run:
 *   1. Pre-check guards (budget cap, brand guide present, etc.).
 *   2. Insert run row with status='queued', then flip to 'running'.
 *   3. For each variant: build prompt → call Replicate (or mock) →
 *      download the output → re-encode + thumbnail → upload to
 *      Supabase Storage → compute QA scores → insert variant row.
 *   4. Mark run as 'completed' / 'failed' with totals.
 *
 * The "mock" provider is wired in so we can smoke-test the persistence
 * + QA + storage path end-to-end without paying Replicate. When mock
 * is used we copy the product image as the "output" and the SSIM-like
 * score is exactly 1.0 — that's deliberate so the auto-approve logic
 * can be exercised.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { runReplicateModel, extractOutputUrls, ReplicateError } from '@/lib/ai/replicate'
import {
  adPolicyLint,
  downloadToBuffer,
  extractPaletteHex,
  generateThumbnail,
  normaliseInputImage,
  paletteDistance,
  structuralSimilarityScore,
} from '@/lib/ai/image-utils'
import {
  buildVariantPath,
  pickExtFromMime,
  uploadCreativeAsset,
} from '@/lib/ai/storage'
import { getPricingContext, type PricingContext } from '@/lib/ai/pricing-context'

const USD_TO_EUR = 0.92

export interface CreativeRunInput {
  productId: string
  variantId?: string | null
  sceneId: string
  numVariants?: number
  model?: string
  requestedBy?: string | null
  decisionId?: string | null
  provider?: 'replicate' | 'mock'
  /** Optional extra steering text appended to the prompt. */
  extraPromptHint?: string
}

export interface CreativeRunResult {
  runId: string
  status: 'completed' | 'failed' | 'budget_blocked'
  generated: number
  approved: number
  pending: number
  rejected: number
  cost_usd: number
  cost_eur: number
  errors: string[]
}

interface BrandGuide {
  palette: { primary: string; secondary: string; accents: string[]; max_palette_distance: number }
  typography: { primary: string; secondary: string; weight_emphasis: string }
  voice: { tone: string; do: string[]; dont: string[] }
  tagline: string
  guardrails: { ssim_min: number; palette_distance_max: number; ad_policy_blocked_terms: string[] }
}

interface SceneRow {
  id: string
  label: string
  description: string | null
  scene_type: string
  reference_image_url: string
  focal_x: number
  focal_y: number
  palette_hex: string[]
  prompt_hint: string | null
  is_active: boolean
}

interface ProductRow {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
}

interface ProductImageRow {
  id: string
  product_id: string
  variant_id: string | null
  url: string
  media_type: string | null
  position: number | null
  is_primary: boolean | null
}

interface CreativeSettings {
  monthlyCapEur: number
  defaultModel: string
  autoApprove: boolean
}

async function loadCreativeSettings(): Promise<CreativeSettings> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['ai_creative_monthly_cap_eur', 'ai_creative_default_model', 'ai_creative_auto_approve'])
  const map = new Map<string, unknown>()
  for (const row of data ?? []) map.set((row as { key: string }).key, (row as { value: unknown }).value)
  const num = (v: unknown, fallback: number) => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/"/g, ''))
      return Number.isFinite(n) ? n : fallback
    }
    return fallback
  }
  const str = (v: unknown, fallback: string) =>
    typeof v === 'string' ? v.replace(/"/g, '') : fallback
  const bool = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : typeof v === 'string' ? v === 'true' : fallback

  return {
    monthlyCapEur: num(map.get('ai_creative_monthly_cap_eur'), 150),
    defaultModel: str(map.get('ai_creative_default_model'), 'black-forest-labs/flux-kontext-pro'),
    autoApprove: bool(map.get('ai_creative_auto_approve'), true),
  }
}

async function loadBrandGuide(): Promise<BrandGuide> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_brand_guide')
    .maybeSingle()
  const guide = (data as { value?: BrandGuide } | null)?.value
  if (!guide) {
    throw new Error('Brand guide ontbreekt — vul eerst /admin/ai-campaigns/brand-guide in.')
  }
  return guide
}

async function monthToDateUsd(): Promise<number> {
  const supabase = createServiceRoleClient()
  const since = new Date()
  since.setUTCDate(1)
  since.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('ai_creative_runs')
    .select('total_cost_usd')
    .gte('started_at', since.toISOString())
  if (error) return 0
  const rows = (data ?? []) as Array<{ total_cost_usd?: number | string }>
  return rows.reduce((sum, r) => sum + (Number(r.total_cost_usd) || 0), 0)
}

async function loadScene(sceneId: string): Promise<SceneRow> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_creative_scene_library')
    .select('id, label, description, scene_type, reference_image_url, focal_x, focal_y, palette_hex, prompt_hint, is_active')
    .eq('id', sceneId)
    .maybeSingle()
  if (error || !data) throw new Error(`Scene niet gevonden: ${error?.message ?? sceneId}`)
  const row = data as SceneRow
  if (!row.is_active) throw new Error(`Scene "${row.label}" is gearchiveerd.`)
  return row
}

async function loadProduct(
  productId: string,
  variantId: string | null,
): Promise<{ product: ProductRow; primaryImage: ProductImageRow; allImages: ProductImageRow[] }> {
  const supabase = createServiceRoleClient()
  const [productRes, imagesRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, description, category_id')
      .eq('id', productId)
      .maybeSingle(),
    supabase
      .from('product_images')
      .select('id, product_id, variant_id, url, media_type, position, is_primary')
      .eq('product_id', productId)
      .order('position', { ascending: true, nullsFirst: false }),
  ])
  if (productRes.error || !productRes.data) {
    throw new Error(`Product niet gevonden: ${productRes.error?.message ?? productId}`)
  }
  const images = (imagesRes.data ?? []) as ProductImageRow[]
  const nonVideo = images.filter((img) => (img.media_type ?? 'image') !== 'video' && !!img.url)
  if (nonVideo.length === 0) {
    throw new Error(`Product "${(productRes.data as ProductRow).name}" heeft geen foto.`)
  }

  // Prefer images matched to the chosen variant; fall back to product-
  // level images. Primary first, then by position. The first item is the
  // source garment we feed to Replicate; the rest serve as extra prompt
  // context ("here are other angles of the same garment").
  const sortBy = (a: ProductImageRow, b: ProductImageRow): number => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return (a.position ?? 9999) - (b.position ?? 9999)
  }
  const variantMatched = variantId
    ? nonVideo.filter((img) => img.variant_id === variantId).sort(sortBy)
    : []
  const productLevel = nonVideo.filter((img) => !img.variant_id).sort(sortBy)
  const ordered = [...variantMatched, ...productLevel]
  const allImages = ordered.length > 0 ? ordered : nonVideo
  return {
    product: productRes.data as ProductRow,
    primaryImage: allImages[0],
    allImages,
  }
}

function buildPrompt(args: {
  brand: BrandGuide
  scene: SceneRow
  product: ProductRow
  pricing: PricingContext
  referenceImageCount: number
  extra?: string
}): string {
  const { brand, scene, product, pricing, referenceImageCount, extra } = args
  const lines: string[] = []
  lines.push(
    'Generate a photorealistic Meta-ready ad creative starring the exact garment from the provided source image. PRESERVE the garment 1:1 — same fabric texture, cut, colour, embroidery, labels, fit.',
  )
  if (referenceImageCount > 1) {
    lines.push(
      `${referenceImageCount} reference photos of the same garment are available (different angles / colour variants); treat the first as the canonical source and use the others only to disambiguate the silhouette and stitching.`,
    )
  }
  lines.push(`Garment context: ${product.name}.${product.description ? ` ${product.description.slice(0, 240)}` : ''}`)
  lines.push(
    `Scene: ${scene.scene_type} — ${scene.description ?? scene.label}.${scene.prompt_hint ? ` ${scene.prompt_hint}` : ''}`,
  )

  // Pricing & offer context. Influences MOOD, never rendered as text.
  if (pricing.has_active_sale) {
    lines.push(
      `Offer mood: this product is on a limited-time sale (-${pricing.sale_off_pct}%). Lean into a sense of urgency and movement — purposeful walk, alive street, slightly heightened energy. Do NOT render any price, percentage, banner or sticker in the image.`,
    )
  } else if (pricing.has_active_staffel) {
    lines.push(
      `Offer mood: an active multi-buy / "staffel" discount applies. Visually suggest togetherness or repetition — e.g. friends together, two-shot, layered styling — without rendering any text or sale signage in-frame.`,
    )
  } else if (pricing.has_active_promo) {
    lines.push(
      `Offer mood: a general promo code is active. Keep the scene grounded and inviting; the discount will appear only in the ad copy, NOT in the image.`,
    )
  } else {
    lines.push(`Offer mood: standard everyday wear at price ${formatPlain(pricing.effective_price)}. Calm and confident, not promotional.`)
  }

  if (brand.voice?.tone) lines.push(`Brand voice: ${brand.voice.tone}`)
  if (brand.voice?.do?.length) lines.push(`DO: ${brand.voice.do.join(' | ')}`)
  if (brand.voice?.dont?.length) lines.push(`DO NOT: ${brand.voice.dont.join(' | ')}`)
  if (brand.palette) {
    const cols = [
      brand.palette.primary,
      brand.palette.secondary,
      ...(brand.palette.accents || []),
    ]
      .filter(Boolean)
      .join(', ')
    if (cols) lines.push(`Palette: ${cols}. Match this colour mood.`)
  }
  lines.push(
    'STRICT: No text, prices, percentages, logos of other brands, watermarks, UI elements, banners or stickers in the image. One subject. Natural light, subtle film grain. Avoid HDR / oversaturation.',
  )
  if (extra) lines.push(extra)
  return lines.join('\n')
}

function formatPlain(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'n/a'
  return `€${v.toFixed(2)}`
}

interface VariantQa {
  ssim_score: number
  palette_distance: number
  brand_color_pass: boolean
  ad_policy_pass: boolean
  ad_policy_issues: string[]
  qa_notes: string
}

function decideStatus(qa: VariantQa, brand: BrandGuide, autoApprove: boolean): 'approved' | 'pending' | 'rejected' {
  const ssimOk = qa.ssim_score >= brand.guardrails.ssim_min
  const paletteOk = qa.brand_color_pass
  const policyOk = qa.ad_policy_pass

  if (!ssimOk || !paletteOk) return 'pending'
  if (!policyOk) return 'rejected'
  return autoApprove ? 'approved' : 'pending'
}

/**
 * Run a creative batch. Returns the run id + counts. Errors per
 * individual variant are recorded on that variant row; the run only
 * fails when nothing was generated.
 */
export async function runCreativeBatch(input: CreativeRunInput): Promise<CreativeRunResult> {
  const supabase = createServiceRoleClient()
  const numVariants = Math.max(1, Math.min(8, input.numVariants ?? 2))
  const provider: 'replicate' | 'mock' = input.provider ?? (process.env.REPLICATE_API_TOKEN ? 'replicate' : 'mock')

  const [settings, brand, scene, productCtx, pricing] = await Promise.all([
    loadCreativeSettings(),
    loadBrandGuide(),
    loadScene(input.sceneId),
    loadProduct(input.productId, input.variantId ?? null),
    getPricingContext(input.productId),
  ])
  const model = input.model || settings.defaultModel
  const { product, primaryImage: productImage, allImages } = productCtx
  // Cap reference photos to keep prompts compact and Replicate happy.
  // Most Flux Kontext checkpoints only honour 1 ref image; a few accept
  // 2–4 via input_image_2 / input_image_3 etc. We pass extras through
  // explicitly below and rely on the model to ignore unknown keys.
  const referenceImages = allImages.slice(0, 4)

  // Budget pre-check (only counts against actual Replicate runs).
  const mtdUsd = provider === 'replicate' ? await monthToDateUsd() : 0
  const mtdEur = mtdUsd * USD_TO_EUR
  if (provider === 'replicate' && mtdEur >= settings.monthlyCapEur) {
    throw new Error(
      `Maandbudget bereikt (€${mtdEur.toFixed(2)} / €${settings.monthlyCapEur}). Verhoog de cap of wacht tot volgende maand.`,
    )
  }

  // Insert the run row in 'queued' state so failures are still auditable.
  const { data: runInsert, error: runErr } = await supabase
    .from('ai_creative_runs')
    .insert({
      decision_id: input.decisionId ?? null,
      source_product_id: input.productId,
      source_variant_id: input.variantId ?? null,
      scene_id: input.sceneId,
      requested_by: input.requestedBy ?? null,
      provider,
      model,
      params: {
        num_variants: numVariants,
        extra_prompt_hint: input.extraPromptHint ?? null,
        reference_image_count: referenceImages.length,
        pricing: {
          base_price: pricing.base_price,
          sale_price: pricing.sale_price,
          effective_price: pricing.effective_price,
          has_active_sale: pricing.has_active_sale,
          sale_off_pct: pricing.sale_off_pct,
          has_active_staffel: pricing.has_active_staffel,
          staffel_tier_count: pricing.staffel_tiers.length,
          has_active_promo: pricing.has_active_promo,
          promo_codes: pricing.active_promo_codes.map((p) => p.code),
        },
      },
      status: 'queued',
    })
    .select('id')
    .single()
  if (runErr || !runInsert) throw new Error(`Insert run failed: ${runErr?.message ?? 'unknown'}`)
  const runId = (runInsert as { id: string }).id

  const result: CreativeRunResult = {
    runId,
    status: 'completed',
    generated: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    cost_usd: 0,
    cost_eur: 0,
    errors: [],
  }

  await supabase.from('ai_creative_runs').update({ status: 'running' }).eq('id', runId)

  // Preload the source garment buffer once — we re-use it for QA.
  let sourceBuffer: Buffer
  try {
    sourceBuffer = await downloadToBuffer(productImage.url)
  } catch (e) {
    await supabase
      .from('ai_creative_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: (e as Error).message,
      })
      .eq('id', runId)
    result.status = 'failed'
    result.errors.push((e as Error).message)
    return result
  }

  const prompt = buildPrompt({
    brand,
    scene,
    product,
    pricing,
    referenceImageCount: referenceImages.length,
    extra: input.extraPromptHint,
  })
  const policy = adPolicyLint(prompt, brand.guardrails.ad_policy_blocked_terms || [])

  for (let i = 0; i < numVariants; i++) {
    try {
      let outputBuffer: Buffer
      let contentType = 'image/jpeg'
      let costUsd = 0

      if (provider === 'mock') {
        // Mock = re-encode the source garment as the "output". SSIM
        // will be ~1 which lets the rest of the pipeline run through
        // the happy path so we can test auto-approve + storage + UI.
        const normalised = await normaliseInputImage(sourceBuffer)
        outputBuffer = normalised.buffer
        contentType = normalised.contentType
        costUsd = 0
      } else {
        // Forward up to 3 secondary photos as input_image_2 / input_image_3 / ...
        // Flux Kontext models silently ignore unknown keys, so this is
        // safe even on checkpoints that only accept a single ref image.
        const secondaryRefs: Record<string, string> = {}
        referenceImages.slice(1).forEach((img, idx) => {
          secondaryRefs[`input_image_${idx + 2}`] = img.url
        })
        const prediction = await runReplicateModel({
          modelOrVersion: model,
          input: {
            input_image: productImage.url,
            ...secondaryRefs,
            prompt,
            aspect_ratio: '4:5',
            output_format: 'jpg',
            safety_tolerance: 2,
            // Many Flux variants accept a seed; vary so we get diverse
            // candidates from the same prompt.
            seed: Math.floor(Math.random() * 2_000_000_000) + i,
          },
        })
        const urls = extractOutputUrls(prediction.output)
        if (urls.length === 0) {
          throw new Error('Replicate gaf geen output URL terug.')
        }
        outputBuffer = await downloadToBuffer(urls[0])
        contentType = 'image/jpeg'
        costUsd = prediction.cost_usd ?? 0
      }

      // Re-encode to consistent JPEG before storage so downstream
      // consumers (Meta upload, lightbox) hit a predictable format.
      const normalised = await normaliseInputImage(outputBuffer, 1920, 88)
      const thumbnail = await generateThumbnail(normalised.buffer, 512, scene.focal_x, scene.focal_y)

      const ext = pickExtFromMime(contentType, 'jpg')
      const outputPath = buildVariantPath(runId, i, ext)
      const thumbPath = buildVariantPath(runId, i, 'jpg').replace(/\.[a-z0-9]+$/i, '-thumb.jpg')

      const [outputUpload, thumbUpload] = await Promise.all([
        uploadCreativeAsset(outputPath, normalised.buffer, { contentType }),
        uploadCreativeAsset(thumbPath, thumbnail, { contentType: 'image/jpeg' }),
      ])

      // QA scoring
      const [ssimScore, palette] = await Promise.all([
        structuralSimilarityScore(sourceBuffer, normalised.buffer),
        extractPaletteHex(normalised.buffer, 5),
      ])
      const brandPalette = [
        brand.palette.primary,
        brand.palette.secondary,
        ...(brand.palette.accents || []),
      ].filter(Boolean)
      const dist = paletteDistance(palette, brandPalette)
      const colourPass = Number.isFinite(dist) && dist <= brand.guardrails.palette_distance_max

      const qa: VariantQa = {
        ssim_score: ssimScore,
        palette_distance: Number.isFinite(dist) ? dist : 999,
        brand_color_pass: colourPass,
        ad_policy_pass: policy.pass,
        ad_policy_issues: policy.issues,
        qa_notes: `palette: ${palette.join(', ')}`,
      }
      const status = decideStatus(qa, brand, settings.autoApprove)

      await supabase.from('ai_creative_variants').insert({
        run_id: runId,
        variant_index: i,
        output_url: outputUpload.publicUrl,
        thumbnail_url: thumbUpload.publicUrl,
        ssim_score: qa.ssim_score,
        palette_distance: qa.palette_distance > 999 ? 999 : qa.palette_distance,
        brand_color_pass: qa.brand_color_pass,
        ad_policy_pass: qa.ad_policy_pass,
        ad_policy_issues: qa.ad_policy_issues,
        qa_notes: qa.qa_notes,
        status,
      })

      result.generated++
      result.cost_usd += costUsd
      if (status === 'approved') result.approved++
      else if (status === 'rejected') result.rejected++
      else result.pending++
    } catch (e) {
      const message = e instanceof ReplicateError ? `${e.message} (status ${e.status ?? '?'})` : (e as Error).message
      result.errors.push(`variant ${i}: ${message}`)
    }
  }

  result.cost_eur = Number((result.cost_usd * USD_TO_EUR).toFixed(4))

  await supabase
    .from('ai_creative_runs')
    .update({
      status: result.generated > 0 ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      total_variants: result.generated,
      total_cost_usd: Number(result.cost_usd.toFixed(4)),
      error_message: result.errors.length > 0 ? result.errors.slice(0, 5).join(' | ').slice(0, 4000) : null,
    })
    .eq('id', runId)

  // Bump scene usage_count for the library UI. The +1 is non-critical so
  // a read-then-write race is acceptable here.
  if (result.generated > 0) {
    const { data: usageRow } = await supabase
      .from('ai_creative_scene_library')
      .select('usage_count')
      .eq('id', input.sceneId)
      .maybeSingle()
    const next = Number((usageRow as { usage_count?: number } | null)?.usage_count ?? 0) + 1
    await supabase.from('ai_creative_scene_library').update({ usage_count: next }).eq('id', input.sceneId)
  }

  if (result.generated === 0) result.status = 'failed'
  return result
}
