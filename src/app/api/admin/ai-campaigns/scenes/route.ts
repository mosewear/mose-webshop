/**
 * Scene library API.
 *
 * GET    — list scenes (optionally filter by ?include_archived=1).
 * POST   — multipart/form-data upload: label, description, scene_type,
 *          focal_x, focal_y, prompt_hint, palette_hex (JSON array),
 *          file. Writes the image to storage under
 *          ai-creatives/scenes/<slug>-<ts>.<ext> and inserts an
 *          ai_creative_scene_library row.
 * PATCH  — body: { id, ...patch } — toggle is_active, edit metadata.
 * DELETE — ?id=...  — hard-delete the row + best-effort storage cleanup.
 *
 * Service-role only via requireAdmin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  buildScenePath,
  pickExtFromMime,
  removeCreativeAsset,
  uploadCreativeAsset,
} from '@/lib/ai/storage'

interface ScenePatch {
  label?: string
  description?: string | null
  scene_type?: 'lifestyle' | 'studio' | 'editorial' | 'flatlay' | 'street'
  focal_x?: number
  focal_y?: number
  palette_hex?: string[]
  prompt_hint?: string | null
  is_active?: boolean
}

const SCENE_TYPES = new Set(['lifestyle', 'studio', 'editorial', 'flatlay', 'street'])

function validateFocal(n: unknown): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null
  if (n < 0 || n > 1) return null
  return Number(n.toFixed(3))
}

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const url = new URL(req.url)
  const includeArchived = url.searchParams.get('include_archived') === '1'

  const supabase = createServiceRoleClient()
  let query = supabase
    .from('ai_creative_scene_library')
    .select('*')
    .order('created_at', { ascending: false })
  if (!includeArchived) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scenes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'multipart/form-data verwacht' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'file ontbreekt' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Bestand mag maximaal 20 MB zijn' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Alleen afbeeldingen toegestaan' }, { status: 400 })
  }

  const label = String(form.get('label') || '').trim()
  if (!label) return NextResponse.json({ error: 'label verplicht' }, { status: 400 })
  const sceneType = String(form.get('scene_type') || 'lifestyle')
  if (!SCENE_TYPES.has(sceneType)) {
    return NextResponse.json({ error: `Ongeldig scene_type "${sceneType}"` }, { status: 400 })
  }
  const description = (form.get('description') as string) || null
  const promptHint = (form.get('prompt_hint') as string) || null
  const focalX = validateFocal(Number(form.get('focal_x') ?? 0.5)) ?? 0.5
  const focalY = validateFocal(Number(form.get('focal_y') ?? 0.5)) ?? 0.5

  let paletteHex: string[] = []
  const paletteRaw = form.get('palette_hex')
  if (typeof paletteRaw === 'string' && paletteRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(paletteRaw)
      if (Array.isArray(parsed)) {
        paletteHex = parsed
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter((v) => /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(v))
          .slice(0, 8)
      }
    } catch {
      return NextResponse.json({ error: 'palette_hex moet een geldige JSON array zijn' }, { status: 400 })
    }
  }

  const ext = pickExtFromMime(file.type, 'jpg')
  const path = buildScenePath(label, ext)
  const arrayBuf = await file.arrayBuffer()

  let publicUrl: string
  try {
    const upload = await uploadCreativeAsset(path, arrayBuf, { contentType: file.type })
    publicUrl = upload.publicUrl
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_creative_scene_library')
    .insert({
      label,
      description,
      scene_type: sceneType,
      reference_image_url: publicUrl,
      focal_x: focalX,
      focal_y: focalY,
      palette_hex: paletteHex,
      prompt_hint: promptHint,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    // Best-effort cleanup so we don't orphan storage objects.
    await removeCreativeAsset(path).catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ scene: data })
}

export async function PATCH(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: { id?: string } & ScenePatch
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.label === 'string') patch.label = body.label.trim()
  if (body.description !== undefined) patch.description = body.description
  if (body.scene_type && SCENE_TYPES.has(body.scene_type)) patch.scene_type = body.scene_type
  if (typeof body.focal_x === 'number') {
    const v = validateFocal(body.focal_x)
    if (v !== null) patch.focal_x = v
  }
  if (typeof body.focal_y === 'number') {
    const v = validateFocal(body.focal_y)
    if (v !== null) patch.focal_y = v
  }
  if (Array.isArray(body.palette_hex)) {
    patch.palette_hex = body.palette_hex
      .filter((v) => typeof v === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(v))
      .slice(0, 8)
  }
  if (body.prompt_hint !== undefined) patch.prompt_hint = body.prompt_hint
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Niets te updaten' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_creative_scene_library')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scene: data })
}

export async function DELETE(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('ai_creative_scene_library')
    .select('reference_image_url, bg_removed_url')
    .eq('id', id)
    .maybeSingle()
  const row = existing as { reference_image_url?: string | null; bg_removed_url?: string | null } | null

  const { error } = await supabase.from('ai_creative_scene_library').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort: remove storage objects (path is the part after `/images/`).
  const cleanup = async (publicUrl?: string | null) => {
    if (!publicUrl) return
    const marker = '/storage/v1/object/public/images/'
    const idx = publicUrl.indexOf(marker)
    if (idx < 0) return
    const path = publicUrl.slice(idx + marker.length)
    try {
      await removeCreativeAsset(path)
    } catch {
      // Swallow — the DB delete already succeeded.
    }
  }
  await cleanup(row?.reference_image_url)
  await cleanup(row?.bg_removed_url)

  return NextResponse.json({ ok: true })
}
