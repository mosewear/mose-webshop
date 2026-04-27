import 'server-only'

import {
  sanitizeHexColor,
  type MarketingCampaignPage,
  type MarketingCampaignPopupTrigger,
} from '@/lib/marketing-campaign'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'cart',
  'checkout',
  'order-confirmation',
  'shop',
  'product',
  'blog',
  'about',
  'contact',
  'lookbook',
  'login',
  'register',
  'account',
])

const ALLOWED_PAGES: ReadonlyArray<MarketingCampaignPage> = [
  'home',
  'shop',
  'product',
  'blog',
  'about',
]

const ALLOWED_TRIGGERS: ReadonlyArray<MarketingCampaignPopupTrigger> = [
  'immediate',
  'timer',
  'scroll',
  'exit_intent',
]

export interface CampaignWritablePayload {
  name: string
  slug: string

  is_enabled: boolean
  starts_at: string | null
  ends_at: string | null
  priority: number

  theme_color: string | null
  theme_text_color: string | null
  theme_accent_color: string | null
  override_banner_color: boolean

  banner_enabled: boolean
  banner_message_nl: string | null
  banner_message_en: string | null
  banner_cta_nl: string | null
  banner_cta_en: string | null
  banner_link_url: string | null
  banner_dismissable: boolean

  popup_enabled: boolean
  popup_title_nl: string | null
  popup_title_en: string | null
  popup_body_nl: string | null
  popup_body_en: string | null
  popup_cta_nl: string | null
  popup_cta_en: string | null
  popup_image_url: string | null
  popup_image_alt_nl: string | null
  popup_image_alt_en: string | null
  popup_trigger: MarketingCampaignPopupTrigger
  popup_delay_seconds: number
  popup_scroll_pct: number
  popup_show_on_pages: MarketingCampaignPage[]

  promo_code_id: string | null
  auto_apply_via_url: boolean
  show_code_in_banner: boolean
  show_code_in_popup: boolean
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 1) return true
  if (v === 'false' || v === 0) return false
  return fallback
}

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asInt(v: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof v === 'number'
      ? Math.round(v)
      : typeof v === 'string' && v.trim() !== ''
        ? Math.round(Number(v))
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function asIsoOrNull(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v !== 'string') return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function asPagesArray(v: unknown): MarketingCampaignPage[] {
  if (!Array.isArray(v)) return []
  return Array.from(
    new Set(
      v.filter(
        (p): p is MarketingCampaignPage =>
          typeof p === 'string' && (ALLOWED_PAGES as readonly string[]).includes(p)
      )
    )
  )
}

function asTrigger(v: unknown): MarketingCampaignPopupTrigger {
  if (
    typeof v === 'string' &&
    (ALLOWED_TRIGGERS as readonly string[]).includes(v)
  ) {
    return v as MarketingCampaignPopupTrigger
  }
  return 'timer'
}

function asUuidOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (trimmed.length === 0) return null
  // Loose check — final validation happens at FK level.
  if (!/^[0-9a-fA-F-]{16,}$/.test(trimmed)) return null
  return trimmed
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  payload: CampaignWritablePayload | null
}

export function validateCampaignPayload(input: unknown): ValidationResult {
  const errors: string[] = []
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Body ontbreekt of is ongeldig.'], payload: null }
  }
  const raw = input as Record<string, unknown>

  const name = asTrimmedString(raw.name)
  if (!name) errors.push('Naam is verplicht.')

  let slug = asTrimmedString(raw.slug)?.toLowerCase() ?? null
  if (!slug) {
    errors.push('Slug is verplicht.')
  } else if (!SLUG_RE.test(slug) || slug.length > 80) {
    errors.push(
      'Slug mag alleen kleine letters, cijfers en koppeltekens bevatten (max. 80).'
    )
  } else if (RESERVED_SLUGS.has(slug)) {
    errors.push('Deze slug is gereserveerd, kies een andere.')
  }

  const starts_at = asIsoOrNull(raw.starts_at)
  const ends_at = asIsoOrNull(raw.ends_at)
  if (starts_at && ends_at && new Date(ends_at) <= new Date(starts_at)) {
    errors.push('Einde moet ná de startdatum zijn.')
  }

  const banner_enabled = asBool(raw.banner_enabled, true)
  const banner_message_nl = asTrimmedString(raw.banner_message_nl)
  if (banner_enabled && !banner_message_nl) {
    errors.push('Banner staat aan maar de NL-boodschap ontbreekt.')
  }

  const popup_enabled = asBool(raw.popup_enabled, false)
  const popup_title_nl = asTrimmedString(raw.popup_title_nl)
  const popup_body_nl = asTrimmedString(raw.popup_body_nl)
  if (popup_enabled && (!popup_title_nl || !popup_body_nl)) {
    errors.push('Popup staat aan maar NL-titel of NL-tekst ontbreekt.')
  }

  if (errors.length > 0) {
    return { ok: false, errors, payload: null }
  }

  const payload: CampaignWritablePayload = {
    name: name!,
    slug: slug!,

    is_enabled: asBool(raw.is_enabled, false),
    starts_at,
    ends_at,
    priority: asInt(raw.priority, 0, -100, 1000),

    theme_color: sanitizeHexColor(asTrimmedString(raw.theme_color)),
    theme_text_color: sanitizeHexColor(asTrimmedString(raw.theme_text_color)),
    theme_accent_color: sanitizeHexColor(asTrimmedString(raw.theme_accent_color)),
    override_banner_color: asBool(raw.override_banner_color, true),

    banner_enabled,
    banner_message_nl,
    banner_message_en: asTrimmedString(raw.banner_message_en),
    banner_cta_nl: asTrimmedString(raw.banner_cta_nl),
    banner_cta_en: asTrimmedString(raw.banner_cta_en),
    banner_link_url: asTrimmedString(raw.banner_link_url),
    banner_dismissable: asBool(raw.banner_dismissable, false),

    popup_enabled,
    popup_title_nl,
    popup_title_en: asTrimmedString(raw.popup_title_en),
    popup_body_nl,
    popup_body_en: asTrimmedString(raw.popup_body_en),
    popup_cta_nl: asTrimmedString(raw.popup_cta_nl),
    popup_cta_en: asTrimmedString(raw.popup_cta_en),
    popup_image_url: asTrimmedString(raw.popup_image_url),
    popup_image_alt_nl: asTrimmedString(raw.popup_image_alt_nl),
    popup_image_alt_en: asTrimmedString(raw.popup_image_alt_en),
    popup_trigger: asTrigger(raw.popup_trigger),
    popup_delay_seconds: asInt(raw.popup_delay_seconds, 5, 0, 600),
    popup_scroll_pct: asInt(raw.popup_scroll_pct, 30, 0, 100),
    popup_show_on_pages: (() => {
      const pages = asPagesArray(raw.popup_show_on_pages)
      return pages.length > 0 ? pages : ['home', 'shop', 'product']
    })(),

    promo_code_id: asUuidOrNull(raw.promo_code_id),
    auto_apply_via_url: asBool(raw.auto_apply_via_url, true),
    show_code_in_banner: asBool(raw.show_code_in_banner, true),
    show_code_in_popup: asBool(raw.show_code_in_popup, true),
  }

  return { ok: true, errors: [], payload }
}
