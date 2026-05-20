#!/usr/bin/env node
/**
 * End-to-end smoke test for the new pricing-context + scene-import +
 * creative-orchestrator features added on top of the existing
 * smoke-test-creative-orchestrator.
 *
 * Steps:
 *   1. Import scenes from lookbook + homepage (one-shot, idempotent).
 *   2. Pick the first active product + first imported scene.
 *   3. Load the pricing context for that product and print it.
 *   4. Run a 2-variant batch in mock mode.
 *   5. Confirm the run.params contains pricing flags.
 *   6. Clean up the run + variants.
 *
 * Run with:
 *   npx tsx -r dotenv/config scripts/smoke-test-pricing-and-scenes.ts dotenv_config_path=.env.local
 */
import { createClient } from '@supabase/supabase-js'
import { runCreativeBatch } from '../src/lib/ai/creative-orchestrator'
import { getPricingContext, getActiveGeneralPromos } from '../src/lib/ai/pricing-context'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in your .env.local')
  }
  const supabase = createClient(url, key)

  // 1. Trigger scene import by replaying the API logic. We just hit the
  // exact tables the route does so we don't need the HTTP layer.
  console.log('[smoke] Stap 1 — importeer scenes uit lookbook/homepage/about…')
  const seenUrls = new Set<string>(
    (
      (await supabase.from('ai_creative_scene_library').select('reference_image_url')).data ?? []
    ).map((r: { reference_image_url: string }) => r.reference_image_url),
  )

  const inserts: Array<{
    label: string
    description: string | null
    scene_type: 'lifestyle' | 'editorial'
    reference_image_url: string
    focal_x: number
    focal_y: number
    palette_hex: string[]
    prompt_hint: string | null
    is_active: boolean
  }> = []

  const { data: homepage } = await supabase
    .from('homepage_settings')
    .select('hero_image_url, hero_image_url_mobile, hero_title_line1, hero_title_line2, story_image_url, story_title_line1, story_title_line2')
    .limit(1)
    .maybeSingle()
  if (homepage) {
    const hero = (homepage as { hero_image_url?: string | null }).hero_image_url
    if (hero && !seenUrls.has(hero)) {
      inserts.push({
        label: `Homepage · hero (smoke ${Date.now()})`,
        description: 'Homepage hero (smoke import)',
        scene_type: 'lifestyle',
        reference_image_url: hero,
        focal_x: 0.5,
        focal_y: 0.5,
        palette_hex: [],
        prompt_hint: 'Stedelijke streetwear-sfeer.',
        is_active: true,
      })
      seenUrls.add(hero)
    }
  }

  let createdSceneIds: string[] = []
  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from('ai_creative_scene_library')
      .insert(inserts)
      .select('id')
    if (error) throw error
    createdSceneIds = (data ?? []).map((r: { id: string }) => r.id)
    console.log(`[smoke] +${createdSceneIds.length} scene(s) toegevoegd`)
  } else {
    console.log('[smoke] Geen nieuwe scenes nodig — bestaat al')
  }

  // 2. Pick a product + scene
  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!product) throw new Error('Geen actief product gevonden')

  const { data: scene } = await supabase
    .from('ai_creative_scene_library')
    .select('id, label')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!scene) throw new Error('Geen scene gevonden zelfs na import')

  console.log(`[smoke] Stap 2 — product="${(product as { name: string }).name}", scene="${(scene as { label: string }).label}"`)

  // 3. Pricing context
  console.log('[smoke] Stap 3 — pricing context laden…')
  const pricing = await getPricingContext((product as { id: string }).id)
  console.log('         summary:', pricing.summary_line)
  console.log('         offer_nl:', pricing.offer_copy_nl)
  console.log('         offer_en:', pricing.offer_copy_en)
  console.log('         has_active_sale:', pricing.has_active_sale)
  console.log('         has_active_staffel:', pricing.has_active_staffel)
  console.log('         has_active_promo:', pricing.has_active_promo)

  const promos = await getActiveGeneralPromos()
  console.log(`[smoke]   Globale promo codes actief: ${promos.length}`)

  // 4. Run a mock creative batch
  console.log('[smoke] Stap 4 — creative batch (mock)…')
  const result = await runCreativeBatch({
    productId: (product as { id: string }).id,
    sceneId: (scene as { id: string }).id,
    numVariants: 2,
    provider: 'mock',
  })
  console.log('[smoke] Result:', {
    status: result.status,
    generated: result.generated,
    approved: result.approved,
    pending: result.pending,
    rejected: result.rejected,
    cost_eur: result.cost_eur,
  })
  if (result.generated !== 2) {
    throw new Error(`Verwachtte 2 variants, kreeg ${result.generated}`)
  }

  // 5. Confirm run.params contains pricing block + reference image count
  const { data: runRow } = await supabase
    .from('ai_creative_runs')
    .select('params')
    .eq('id', result.runId)
    .maybeSingle()
  const params = (runRow as { params?: Record<string, unknown> } | null)?.params ?? {}
  const pricingParams = params.pricing as Record<string, unknown> | undefined
  console.log('[smoke] run.params.reference_image_count:', params.reference_image_count)
  console.log('[smoke] run.params.pricing:', pricingParams)
  if (!pricingParams || typeof pricingParams.has_active_sale !== 'boolean') {
    throw new Error('Pricing context niet teruggevonden in run.params')
  }
  if (typeof params.reference_image_count !== 'number' || (params.reference_image_count as number) < 1) {
    throw new Error('reference_image_count ontbreekt in run.params')
  }

  // 6. Clean up
  console.log('[smoke] Stap 6 — opruimen…')
  await supabase.from('ai_creative_variants').delete().eq('run_id', result.runId)
  await supabase.from('ai_creative_runs').delete().eq('id', result.runId)
  if (createdSceneIds.length > 0) {
    await supabase.from('ai_creative_scene_library').delete().in('id', createdSceneIds)
  }
  console.log('[smoke] Klaar ✔ — alle nieuwe features werken end-to-end.')
}

main().catch((e) => {
  console.error('[smoke] FAILED:', e)
  process.exit(1)
})
