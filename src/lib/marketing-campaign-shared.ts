// =====================================================
// Shared types + pure helpers for marketing campaigns.
// Safe to import from BOTH server and client components.
// (No `server-only`, no Next cache APIs, no Supabase.)
// =====================================================

export type MarketingCampaignPopupTrigger =
  | 'immediate'
  | 'timer'
  | 'scroll'
  | 'exit_intent'

export type MarketingCampaignPage =
  | 'home'
  | 'shop'
  | 'product'
  | 'blog'
  | 'about'

export interface MarketingCampaign {
  id: string
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

  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CampaignPromoCodeMeta {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  is_active: boolean
  expires_at: string | null
}

export interface ResolvedCampaign {
  campaign: MarketingCampaign
  promoCode: CampaignPromoCodeMeta | null
}

// Tag used by both the server cache (`unstable_cache`) and admin
// API routes (`revalidateTag`) to invalidate the active-campaign read.
export const ACTIVE_CAMPAIGN_TAG = 'active-marketing-campaign'

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function sanitizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null
  return HEX_COLOR_RE.test(input) ? input : null
}

export function pickLocalized(
  nl: string | null | undefined,
  en: string | null | undefined,
  locale: string
): string | null {
  if (locale === 'en') {
    const trimmed = en?.trim()
    if (trimmed) return trimmed
  }
  return nl?.trim() || null
}

/**
 * Compute a contrasting text color (white or black) for any hex color.
 * Used to pick a readable label color when admin only sets the bg.
 */
export function computeContrastingTextColor(hex: string | null): string {
  const sanitized = sanitizeHexColor(hex)
  if (!sanitized) return '#FFFFFF'
  const r = parseInt(sanitized.slice(1, 3), 16)
  const g = parseInt(sanitized.slice(3, 5), 16)
  const b = parseInt(sanitized.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#000000' : '#FFFFFF'
}

/**
 * Strip a leading locale segment so the locale-aware Link in client
 * components can inject the visitor's current locale. Keeps absolute
 * URLs intact.
 */
export function normalizeCampaignLink(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const stripped = raw.replace(/^\/(nl|en)(?=\/|$)/i, '')
  return stripped.length > 0 ? stripped : '/'
}

/**
 * Append the campaign slug as ?campaign=<slug> to the banner link so a
 * single click both navigates and triggers the auto-apply on the next
 * page. Preserves any existing query string.
 */
export function withCampaignParam(
  href: string | null,
  slug: string,
  enabled: boolean
): string | null {
  if (!href) return null
  if (!enabled) return href
  if (/^https?:\/\//i.test(href)) return href
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('campaign', slug)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export function campaignHasBannerCopy(
  campaign: MarketingCampaign,
  locale: string
): boolean {
  if (!campaign.banner_enabled) return false
  const message = pickLocalized(campaign.banner_message_nl, campaign.banner_message_en, locale)
  return Boolean(message)
}

export function campaignHasPopupCopy(
  campaign: MarketingCampaign,
  locale: string
): boolean {
  if (!campaign.popup_enabled) return false
  const title = pickLocalized(campaign.popup_title_nl, campaign.popup_title_en, locale)
  const body = pickLocalized(campaign.popup_body_nl, campaign.popup_body_en, locale)
  return Boolean(title && body)
}
