/**
 * Brand guide CRUD. Storage = single JSON blob under site_settings.key
 * 'ai_brand_guide'. The shape is enforced server-side so the AI prompts
 * + QA pipeline can rely on it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i

interface BrandPalette {
  primary?: string
  secondary?: string
  accents?: string[]
  max_palette_distance?: number
}

interface BrandTypography {
  primary?: string
  secondary?: string
  weight_emphasis?: string
}

interface BrandVoice {
  tone?: string
  do?: string[]
  dont?: string[]
}

interface BrandGuardrails {
  ssim_min?: number
  palette_distance_max?: number
  ad_policy_blocked_terms?: string[]
}

interface BrandGuide {
  palette?: BrandPalette
  typography?: BrandTypography
  voice?: BrandVoice
  tagline?: string
  guardrails?: BrandGuardrails
}

function sanitizeHex(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  return HEX_RE.test(v.trim()) ? v.trim() : undefined
}

function sanitizeStringArray(v: unknown, max = 20, maxLen = 240): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0 && entry.length <= maxLen)
    .slice(0, max)
}

function sanitizeGuide(input: BrandGuide): BrandGuide {
  const out: BrandGuide = {}
  if (input.palette) {
    const accents = Array.isArray(input.palette.accents)
      ? (input.palette.accents.map(sanitizeHex).filter((v): v is string => !!v).slice(0, 6))
      : []
    out.palette = {
      primary: sanitizeHex(input.palette.primary) ?? '#0E0E0E',
      secondary: sanitizeHex(input.palette.secondary) ?? '#F4EFE6',
      accents,
      max_palette_distance:
        typeof input.palette.max_palette_distance === 'number' && input.palette.max_palette_distance > 0
          ? Math.min(input.palette.max_palette_distance, 120)
          : 35,
    }
  }
  if (input.typography) {
    out.typography = {
      primary: typeof input.typography.primary === 'string' ? input.typography.primary.slice(0, 60) : 'Inter',
      secondary: typeof input.typography.secondary === 'string' ? input.typography.secondary.slice(0, 60) : 'Inter',
      weight_emphasis:
        typeof input.typography.weight_emphasis === 'string'
          ? input.typography.weight_emphasis.slice(0, 20)
          : '600',
    }
  }
  if (input.voice) {
    out.voice = {
      tone: typeof input.voice.tone === 'string' ? input.voice.tone.slice(0, 400) : '',
      do: sanitizeStringArray(input.voice.do),
      dont: sanitizeStringArray(input.voice.dont),
    }
  }
  if (typeof input.tagline === 'string') {
    out.tagline = input.tagline.slice(0, 240)
  }
  if (input.guardrails) {
    const ssim = Number(input.guardrails.ssim_min)
    const palDist = Number(input.guardrails.palette_distance_max)
    out.guardrails = {
      ssim_min: Number.isFinite(ssim) && ssim >= 0 && ssim <= 1 ? Number(ssim.toFixed(4)) : 0.78,
      palette_distance_max:
        Number.isFinite(palDist) && palDist > 0 ? Math.min(palDist, 120) : 35,
      ad_policy_blocked_terms: sanitizeStringArray(input.guardrails.ad_policy_blocked_terms, 50, 80).map(
        (t) => t.toLowerCase(),
      ),
    }
  }
  return out
}

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, updated_at')
    .eq('key', 'ai_brand_guide')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ guide: (data as { value?: BrandGuide } | null)?.value ?? null, updated_at: (data as { updated_at?: string } | null)?.updated_at ?? null })
}

export async function PUT(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: BrandGuide
  try {
    body = (await req.json()) as BrandGuide
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const sanitized = sanitizeGuide(body)
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ value: sanitized as never, updated_at: new Date().toISOString() })
    .eq('key', 'ai_brand_guide')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, guide: sanitized })
}
