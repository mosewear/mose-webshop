import { NextResponse } from 'next/server'
import {
  getActiveMarketingCampaign,
  pickLocalized,
  sanitizeHexColor,
  computeContrastingTextColor,
  normalizeCampaignLink,
  withCampaignParam,
} from '@/lib/marketing-campaign'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const localeParam = url.searchParams.get('locale')
  const locale = localeParam === 'en' ? 'en' : 'nl'

  const resolved = await getActiveMarketingCampaign()
  if (!resolved) {
    return NextResponse.json({ active: false }, { status: 200 })
  }

  const { campaign, promoCode } = resolved

  const themeColor =
    sanitizeHexColor(campaign.theme_color) ?? '#00A676'
  const textColor =
    sanitizeHexColor(campaign.theme_text_color) ??
    computeContrastingTextColor(themeColor)
  const accentColor =
    sanitizeHexColor(campaign.theme_accent_color) ?? '#000000'
  const accentTextColor = computeContrastingTextColor(accentColor)

  const popup = campaign.popup_enabled
    ? {
        enabled: true,
        title:
          pickLocalized(campaign.popup_title_nl, campaign.popup_title_en, locale) ?? '',
        body:
          pickLocalized(campaign.popup_body_nl, campaign.popup_body_en, locale) ?? '',
        cta:
          pickLocalized(campaign.popup_cta_nl, campaign.popup_cta_en, locale) ?? '',
        imageUrl: campaign.popup_image_url,
        imageAlt:
          pickLocalized(
            campaign.popup_image_alt_nl,
            campaign.popup_image_alt_en,
            locale
          ) ?? '',
        trigger: campaign.popup_trigger,
        delaySeconds: campaign.popup_delay_seconds,
        scrollPct: campaign.popup_scroll_pct,
        showOnPages: campaign.popup_show_on_pages,
      }
    : null

  return NextResponse.json(
    {
      active: true,
      slug: campaign.slug,
      themeColor,
      textColor,
      accentColor,
      accentTextColor,
      ctaHref: campaign.banner_link_url
        ? withCampaignParam(
            normalizeCampaignLink(campaign.banner_link_url),
            campaign.slug,
            campaign.auto_apply_via_url
          )
        : null,
      autoApplyViaUrl: campaign.auto_apply_via_url,
      showCodeInPopup: campaign.show_code_in_popup,
      code: promoCode?.code ?? null,
      codeIsActive: promoCode?.is_active ?? false,
      codeDiscount:
        promoCode != null
          ? {
              type: promoCode.discount_type,
              value: promoCode.discount_value,
            }
          : null,
      popup,
    },
    {
      headers: {
        // 30s edge cache mirrors server unstable_cache window.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  )
}
