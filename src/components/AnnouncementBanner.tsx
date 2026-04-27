import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { createAnonClient } from '@/lib/supabase/server'
import {
  campaignHasBannerCopy,
  computeContrastingTextColor,
  getActiveMarketingCampaign,
  normalizeCampaignLink,
  pickLocalized,
  sanitizeHexColor,
  withCampaignParam,
} from '@/lib/marketing-campaign'
import AnnouncementBannerClient from './AnnouncementBannerClient'
import CampaignBannerClient from './CampaignBannerClient'

interface ClientConfig {
  enabled: boolean
  rotation_interval: number
  dismissable: boolean
  dismiss_cookie_days: number
}

interface ClientMessage {
  id: string
  text: string
  link_url: string | null
  cta_text: string | null
  icon: string | null
  sort_order: number
}

async function loadBannerData(locale: string): Promise<{
  enabled: boolean
  config: ClientConfig | null
  messages: ClientMessage[]
}> {
  const supabase = createAnonClient()
  const empty = { enabled: false, config: null, messages: [] as ClientMessage[] }

  try {
    const { data: configData } = await supabase
      .from('announcement_banner')
      .select('*')
      .single()

    if (!configData || !configData.enabled) return empty

    const { data: messagesData } = await supabase
      .from('announcement_messages')
      .select('id, text, text_en, link_url, cta_text, cta_text_en, icon, sort_order')
      .eq('banner_id', configData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!messagesData || messagesData.length === 0) return empty

    const isEnglish = locale === 'en'
    return {
      enabled: true,
      config: {
        enabled: configData.enabled,
        rotation_interval: configData.rotation_interval,
        dismissable: configData.dismissable,
        dismiss_cookie_days: configData.dismiss_cookie_days,
      },
      messages: messagesData.map((msg) => ({
        id: msg.id,
        text: isEnglish ? (msg.text_en?.trim() || msg.text) : msg.text,
        link_url: normalizeBannerLink(msg.link_url),
        cta_text: isEnglish ? (msg.cta_text_en?.trim() || msg.cta_text) : msg.cta_text,
        icon: msg.icon,
        sort_order: msg.sort_order,
      })),
    }
  } catch (error) {
    console.error('Error fetching announcement banner:', error)
    return empty
  }
}

export default async function AnnouncementBanner() {
  const locale = await getLocale()

  // Campaign override takes precedence whenever a campaign is active and
  // explicitly opted in to a banner. This intentionally overrides the
  // global enabled-flag of the regular banner — campaigns are deliberate
  // marketing moments.
  const resolved = await getActiveMarketingCampaign()
  if (resolved && campaignHasBannerCopy(resolved.campaign, locale)) {
    const { campaign, promoCode } = resolved
    const t = await getTranslations({ locale, namespace: 'announcementBanner' })

    const themeColor =
      (campaign.override_banner_color
        ? sanitizeHexColor(campaign.theme_color)
        : null) ?? '#00A676'
    const textColor =
      sanitizeHexColor(campaign.theme_text_color) ??
      computeContrastingTextColor(themeColor)

    const message =
      pickLocalized(campaign.banner_message_nl, campaign.banner_message_en, locale) ?? ''
    const ctaText = pickLocalized(campaign.banner_cta_nl, campaign.banner_cta_en, locale)
    const baseHref = normalizeCampaignLink(campaign.banner_link_url)
    const href =
      baseHref && campaign.auto_apply_via_url
        ? withCampaignParam(baseHref, campaign.slug, true)
        : baseHref

    const showCode =
      campaign.show_code_in_banner && Boolean(promoCode?.code) && Boolean(promoCode?.is_active)

    return (
      <CampaignBannerClient
        slug={campaign.slug}
        message={message}
        ctaText={ctaText}
        href={href}
        code={showCode ? (promoCode?.code ?? null) : null}
        themeColor={themeColor}
        textColor={textColor}
        dismissable={campaign.banner_dismissable}
        showCode={showCode}
        closeLabel={t('dismiss')}
      />
    )
  }

  const { enabled, config, messages } = await loadBannerData(locale)
  return (
    <AnnouncementBannerClient enabled={enabled} config={config} messages={messages} />
  )
}

function normalizeBannerLink(raw: string | null): string | null {
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw)) return raw
  return raw.replace(/^\/(nl|en)(?=\/|$)/i, '') || '/'
}
