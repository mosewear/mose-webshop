/**
 * POST  — start a new creative run.
 * GET   — list runs (optionally ?product_id=... or ?id=... for detail).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { runCreativeBatch } from '@/lib/ai/creative-orchestrator'

const PAGE_SIZE = 25

interface RunBody {
  product_id?: string
  variant_id?: string | null
  scene_id?: string
  num_variants?: number
  model?: string
  provider?: 'replicate' | 'mock'
  extra_prompt_hint?: string
}

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const supabase = createServiceRoleClient()

  if (id) {
    const [runRes, variantsRes] = await Promise.all([
      supabase.from('ai_creative_runs').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('ai_creative_variants')
        .select('*')
        .eq('run_id', id)
        .order('variant_index', { ascending: true }),
    ])
    if (runRes.error) return NextResponse.json({ error: runRes.error.message }, { status: 500 })
    if (!runRes.data) return NextResponse.json({ error: 'Run niet gevonden' }, { status: 404 })

    const row = runRes.data as { source_product_id: string; scene_id: string }
    const [productRes, sceneRes] = await Promise.all([
      supabase.from('products').select('id, name, slug').eq('id', row.source_product_id).maybeSingle(),
      supabase
        .from('ai_creative_scene_library')
        .select('id, label, scene_type, reference_image_url')
        .eq('id', row.scene_id)
        .maybeSingle(),
    ])
    return NextResponse.json({
      run: runRes.data,
      variants: variantsRes.data ?? [],
      product: productRes.data ?? null,
      scene: sceneRes.data ?? null,
    })
  }

  const productId = url.searchParams.get('product_id')
  const status = url.searchParams.get('status')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))

  let query = supabase
    .from('ai_creative_runs')
    .select(
      'id, decision_id, source_product_id, source_variant_id, scene_id, requested_by, provider, model, status, total_variants, total_cost_usd, error_message, started_at, completed_at',
      { count: 'exact' },
    )
    .order('started_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (productId) query = query.eq('source_product_id', productId)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [], totalCount: count ?? 0, page, pageSize: PAGE_SIZE })
}

export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: RunBody
  try {
    body = (await req.json()) as RunBody
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  if (!body.product_id || !body.scene_id) {
    return NextResponse.json({ error: 'product_id + scene_id verplicht' }, { status: 400 })
  }
  const numVariants = Math.max(1, Math.min(8, Number(body.num_variants ?? 2)))

  try {
    const result = await runCreativeBatch({
      productId: body.product_id,
      variantId: body.variant_id ?? null,
      sceneId: body.scene_id,
      numVariants,
      model: body.model || undefined,
      provider: body.provider || undefined,
      extraPromptHint: body.extra_prompt_hint || undefined,
      requestedBy: adminUser?.id ?? null,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 })
  }
}
