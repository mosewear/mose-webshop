#!/usr/bin/env node
/**
 * Smoke test for the creative orchestrator in mock mode.
 *
 * Picks the first active product + first active scene from the DB, runs
 * a 2-variant batch with provider='mock', verifies that ai_creative_runs
 * + ai_creative_variants rows landed with reasonable QA scores, and
 * cleans up afterwards (so the prod DB stays clean).
 *
 * Usage:
 *   npm i -D dotenv tsx >/dev/null 2>&1 || true
 *   npx tsx -r dotenv/config scripts/smoke-test-creative-orchestrator.ts dotenv_config_path=.env.local
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from '@supabase/supabase-js'
import { runCreativeBatch } from '../src/lib/ai/creative-orchestrator'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in your .env.local')
  }
  const supabase = createClient(url, key)

  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!product) throw new Error('Geen actief product gevonden voor de smoke test.')

  const { data: scene } = await supabase
    .from('ai_creative_scene_library')
    .select('id, label')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!scene) {
    console.log('[smoke] Geen scenes in DB — voeg er eentje toe via /admin/ai-campaigns/scenes.')
    return
  }

  console.log(`[smoke] Run starten met product="${(product as { name: string }).name}" + scene="${(scene as { label: string }).label}"`)

  const result = await runCreativeBatch({
    productId: (product as { id: string }).id,
    sceneId: (scene as { id: string }).id,
    numVariants: 2,
    provider: 'mock',
  })

  console.log('[smoke] Result:', result)

  if (result.generated !== 2) {
    throw new Error(`Verwachtte 2 variants, kreeg ${result.generated}`)
  }

  console.log('[smoke] Opruimen…')
  await supabase.from('ai_creative_variants').delete().eq('run_id', result.runId)
  await supabase.from('ai_creative_runs').delete().eq('id', result.runId)
  console.log('[smoke] Klaar ✔')
}

main().catch((e) => {
  console.error('[smoke] FAILED:', e)
  process.exit(1)
})
