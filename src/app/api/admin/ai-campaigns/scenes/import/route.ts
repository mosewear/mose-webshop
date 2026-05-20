/**
 * Importeer scenes vanuit live storefront content (lookbook + homepage +
 * about) zodat we de échte MOSE beeldtaal direct in de creative pipeline
 * kunnen gebruiken.
 *
 * GET  → preview: lijst kandidaten + status (nieuw / al bestaand).
 * POST → daadwerkelijk importeren; dedup per reference_image_url, geen
 *        bestaande scenes overschrijven.
 *
 * We slaan alleen unieke image URLs op. Voor focal-points hergebruiken
 * we de waardes die op de bron tabel staan (lookbook_chapters /
 * homepage_settings) wanneer beschikbaar; anders 0.5/0.5.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SceneType = 'lifestyle' | 'studio' | 'editorial' | 'flatlay' | 'street'

interface Candidate {
  source: 'lookbook_chapter' | 'lookbook_settings' | 'homepage_settings' | 'about_settings'
  label: string
  description: string | null
  scene_type: SceneType
  reference_image_url: string
  focal_x: number
  focal_y: number
  prompt_hint: string | null
}

interface LookbookChapterRow {
  id: string
  title_nl: string | null
  title_en: string | null
  caption_nl: string | null
  caption_en: string | null
  hero_image_url: string | null
  image_focal_x: number | null
  image_focal_y: number | null
  is_active: boolean | null
}

interface LookbookSettingsRow {
  hero_image_url: string | null
  hero_title: string | null
  section1_image_url: string | null
  section1_title: string | null
  section2_image_url: string | null
  section2_title: string | null
  triple1_image_url: string | null
  triple1_title: string | null
  triple2_image_url: string | null
  triple2_title: string | null
  triple3_image_url: string | null
  triple3_title: string | null
  wide_image_url: string | null
  wide_title: string | null
}

interface HomepageSettingsRow {
  hero_image_url: string | null
  hero_image_url_mobile: string | null
  hero_title_line1: string | null
  hero_title_line2: string | null
  story_image_url: string | null
  story_title_line1: string | null
  story_title_line2: string | null
}

interface AboutSettingsRow {
  hero_image_url: string | null
  hero_image_url_mobile: string | null
  hero_alt_nl: string | null
  hero_alt_en: string | null
  image_focal_x: number | null
  image_focal_y: number | null
}

function clean(s: string | null | undefined): string {
  return (s ?? '').trim()
}

function normaliseFocal(v: number | null | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0.5
  // Some tables store percent (0–100), others fraction (0–1). Detect.
  if (Math.abs(v) > 1.0001) return Math.min(1, Math.max(0, v / 100))
  return Math.min(1, Math.max(0, v))
}

async function buildCandidates(): Promise<Candidate[]> {
  const supabase = createServiceRoleClient()
  const candidates: Candidate[] = []

  // 1. Lookbook chapters — best signal, one row per chapter + title.
  const { data: chapters } = await supabase
    .from('lookbook_chapters')
    .select(
      'id, title_nl, title_en, caption_nl, caption_en, hero_image_url, image_focal_x, image_focal_y, is_active',
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  for (const row of (chapters ?? []) as LookbookChapterRow[]) {
    const url = clean(row.hero_image_url)
    if (!url) continue
    const titleNl = clean(row.title_nl)
    const titleEn = clean(row.title_en)
    const captionNl = clean(row.caption_nl)
    const label = `Lookbook · ${titleNl || titleEn || row.id.slice(0, 8)}`
    candidates.push({
      source: 'lookbook_chapter',
      label,
      description: [titleEn, captionNl].filter(Boolean).join(' — ') || null,
      scene_type: 'editorial',
      reference_image_url: url,
      focal_x: normaliseFocal(row.image_focal_x),
      focal_y: normaliseFocal(row.image_focal_y),
      prompt_hint: captionNl || titleEn || null,
    })
  }

  // 2. Lookbook settings (general lookbook layout backdrops).
  const { data: lookbookSettings } = await supabase
    .from('lookbook_settings')
    .select(
      'hero_image_url, hero_title, section1_image_url, section1_title, section2_image_url, section2_title, triple1_image_url, triple1_title, triple2_image_url, triple2_title, triple3_image_url, triple3_title, wide_image_url, wide_title',
    )
    .limit(1)
    .maybeSingle()
  if (lookbookSettings) {
    const ls = lookbookSettings as LookbookSettingsRow
    const pushIf = (url: string | null, title: string | null, tag: string) => {
      const u = clean(url)
      if (!u) return
      candidates.push({
        source: 'lookbook_settings',
        label: `Lookbook · ${tag}${title ? ` — ${title}` : ''}`,
        description: title || null,
        scene_type: 'editorial',
        reference_image_url: u,
        focal_x: 0.5,
        focal_y: 0.5,
        prompt_hint: null,
      })
    }
    pushIf(ls.hero_image_url, ls.hero_title, 'hero')
    pushIf(ls.section1_image_url, ls.section1_title, 'section1')
    pushIf(ls.section2_image_url, ls.section2_title, 'section2')
    pushIf(ls.triple1_image_url, ls.triple1_title, 'triple1')
    pushIf(ls.triple2_image_url, ls.triple2_title, 'triple2')
    pushIf(ls.triple3_image_url, ls.triple3_title, 'triple3')
    pushIf(ls.wide_image_url, ls.wide_title, 'wide')
  }

  // 3. Homepage settings — hero + story photos.
  const { data: homepage } = await supabase
    .from('homepage_settings')
    .select(
      'hero_image_url, hero_image_url_mobile, hero_title_line1, hero_title_line2, story_image_url, story_title_line1, story_title_line2',
    )
    .limit(1)
    .maybeSingle()
  if (homepage) {
    const hp = homepage as HomepageSettingsRow
    const heroUrl = clean(hp.hero_image_url) || clean(hp.hero_image_url_mobile)
    if (heroUrl) {
      const title = [hp.hero_title_line1, hp.hero_title_line2].filter(Boolean).join(' ')
      candidates.push({
        source: 'homepage_settings',
        label: `Homepage · hero${title ? ` — ${title}` : ''}`,
        description: title || 'Homepage hero',
        scene_type: 'lifestyle',
        reference_image_url: heroUrl,
        focal_x: 0.5,
        focal_y: 0.5,
        prompt_hint: 'Stedelijke streetwear-sfeer, gelijk aan onze homepage hero.',
      })
    }
    const storyUrl = clean(hp.story_image_url)
    if (storyUrl) {
      const title = [hp.story_title_line1, hp.story_title_line2].filter(Boolean).join(' ')
      candidates.push({
        source: 'homepage_settings',
        label: `Homepage · story${title ? ` — ${title}` : ''}`,
        description: title || 'Homepage story foto',
        scene_type: 'lifestyle',
        reference_image_url: storyUrl,
        focal_x: 0.5,
        focal_y: 0.5,
        prompt_hint: 'Brand-story sfeer, intieme stedelijke setting.',
      })
    }
  }

  // 4. About settings — only the hero for now (rest is product copy).
  const { data: aboutRow } = await supabase
    .from('about_settings')
    .select('hero_image_url, hero_image_url_mobile, hero_alt_nl, hero_alt_en, image_focal_x, image_focal_y')
    .limit(1)
    .maybeSingle()
  if (aboutRow) {
    const about = aboutRow as AboutSettingsRow
    const url = clean(about.hero_image_url) || clean(about.hero_image_url_mobile)
    if (url) {
      candidates.push({
        source: 'about_settings',
        label: `About · hero${about.hero_alt_nl ? ` — ${about.hero_alt_nl}` : ''}`,
        description: about.hero_alt_nl || about.hero_alt_en || 'About-pagina hero',
        scene_type: 'editorial',
        reference_image_url: url,
        focal_x: normaliseFocal(about.image_focal_x),
        focal_y: normaliseFocal(about.image_focal_y),
        prompt_hint: 'Persoonlijke MOSE-look, vergelijkbaar met About hero.',
      })
    }
  }

  // Dedup per URL: keep first occurrence (lookbook chapters win).
  const seen = new Set<string>()
  const deduped: Candidate[] = []
  for (const c of candidates) {
    const key = c.reference_image_url
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(c)
  }

  return deduped
}

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  try {
    const candidates = await buildCandidates()
    const supabase = createServiceRoleClient()
    const { data: existing } = await supabase
      .from('ai_creative_scene_library')
      .select('reference_image_url')
    const existingUrls = new Set(
      ((existing ?? []) as Array<{ reference_image_url: string }>).map((r) => r.reference_image_url),
    )
    const annotated = candidates.map((c) => ({
      ...c,
      already_in_library: existingUrls.has(c.reference_image_url),
    }))
    return NextResponse.json({ candidates: annotated })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  try {
    const candidates = await buildCandidates()
    const supabase = createServiceRoleClient()
    const { data: existing } = await supabase
      .from('ai_creative_scene_library')
      .select('reference_image_url, label')
    const existingUrls = new Set(
      ((existing ?? []) as Array<{ reference_image_url: string }>).map((r) => r.reference_image_url),
    )
    const existingLabels = new Set(
      ((existing ?? []) as Array<{ label: string }>).map((r) => r.label),
    )

    const toInsert = candidates
      .filter((c) => !existingUrls.has(c.reference_image_url))
      .map((c) => {
        // Make label unique by suffixing when needed.
        let label = c.label
        let suffix = 2
        while (existingLabels.has(label)) {
          label = `${c.label} (${suffix})`
          suffix++
        }
        existingLabels.add(label)
        return {
          label,
          description: c.description,
          scene_type: c.scene_type,
          reference_image_url: c.reference_image_url,
          focal_x: c.focal_x,
          focal_y: c.focal_y,
          palette_hex: [],
          prompt_hint: c.prompt_hint,
          is_active: true,
        }
      })

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: candidates.length })
    }

    const { error: insertErr, data: inserted } = await supabase
      .from('ai_creative_scene_library')
      .insert(toInsert)
      .select('id')
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      inserted: inserted?.length ?? toInsert.length,
      skipped: candidates.length - toInsert.length,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
