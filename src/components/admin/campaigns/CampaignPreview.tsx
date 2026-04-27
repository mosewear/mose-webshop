'use client'

import { useMemo } from 'react'
import {
  computeContrastingTextColor,
  sanitizeHexColor,
} from '@/lib/marketing-campaign-shared'
import type { CampaignFormState } from './CampaignFormTypes'

interface CampaignPreviewProps {
  state: CampaignFormState
  promoCode: string | null
  promoDiscountLabel: string | null
  language: 'nl' | 'en'
  onLanguageChange: (l: 'nl' | 'en') => void
}

function pick(state: CampaignFormState, language: 'nl' | 'en', field: 'banner_message' | 'banner_cta' | 'popup_title' | 'popup_body' | 'popup_cta'): string {
  const lookup = state as unknown as Record<string, string | null>
  const nlVal = lookup[`${field}_nl`]
  const enVal = lookup[`${field}_en`]
  if (language === 'en') {
    const e = enVal?.trim()
    if (e) return e
  }
  return nlVal?.trim() || ''
}

function renderInlineBold(text: string): React.ReactNode {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

export default function CampaignPreview({
  state,
  promoCode,
  promoDiscountLabel,
  language,
  onLanguageChange,
}: CampaignPreviewProps) {
  const themeColor = sanitizeHexColor(state.theme_color) ?? '#00A676'
  const textColor =
    sanitizeHexColor(state.theme_text_color) ??
    computeContrastingTextColor(themeColor)
  const accentColor =
    sanitizeHexColor(state.theme_accent_color) ?? '#000000'

  const bannerText = pick(state, language, 'banner_message')
  const bannerCta = pick(state, language, 'banner_cta')
  const popupTitle = pick(state, language, 'popup_title')
  const popupBody = pick(state, language, 'popup_body')
  const popupCta = pick(state, language, 'popup_cta')

  const showCodeChip = state.show_code_in_banner && promoCode
  const showPopupCode = state.show_code_in_popup && promoCode

  const popupAlt = useMemo(() => {
    return language === 'en'
      ? state.popup_image_alt_en?.trim() || state.popup_image_alt_nl?.trim() || 'Campaign image'
      : state.popup_image_alt_nl?.trim() || 'Campagne afbeelding'
  }, [
    language,
    state.popup_image_alt_en,
    state.popup_image_alt_nl,
  ])

  return (
    <div className="border-2 border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b-2 border-gray-200 bg-gray-50">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Live preview
        </span>
        <div className="inline-flex border border-gray-300">
          <button
            type="button"
            onClick={() => onLanguageChange('nl')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
              language === 'nl' ? 'bg-black text-white' : 'bg-white text-gray-600'
            }`}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
              language === 'en' ? 'bg-black text-white' : 'bg-white text-gray-600'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Banner mock */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Banner
          </p>
          {state.banner_enabled && bannerText ? (
            <div
              className="px-4 py-2.5 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: themeColor, color: textColor }}
            >
              <span className="truncate">{bannerText}</span>
              {bannerCta ? (
                <span className="hidden sm:inline whitespace-nowrap">
                  {bannerCta} <span aria-hidden>→</span>
                </span>
              ) : null}
              {showCodeChip ? (
                <span
                  className="hidden md:inline-flex items-center px-2 py-0.5 border-2 font-bold tracking-widest text-[10px]"
                  style={{ borderColor: textColor }}
                >
                  CODE: {promoCode}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-3 border-2 border-dashed border-gray-300 text-xs text-gray-400 italic text-center">
              {state.banner_enabled
                ? language === 'en'
                  ? 'Banner enabled but message empty.'
                  : 'Banner staat aan maar boodschap is leeg.'
                : language === 'en'
                  ? 'Banner disabled for this campaign.'
                  : 'Banner staat uit voor deze campagne.'}
            </div>
          )}
        </div>

        {/* Popup mock */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Popup
          </p>
          {state.popup_enabled && popupTitle && popupBody ? (
            <div className="border-4 border-black bg-white relative">
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: themeColor }}
                aria-hidden
              />
              {state.popup_image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={state.popup_image_url}
                  alt={popupAlt}
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div
                  className="w-full aspect-[4/3] flex items-center justify-center"
                  style={{ backgroundColor: themeColor, color: textColor }}
                >
                  <span className="text-3xl font-display tracking-tight">
                    {popupTitle}
                  </span>
                </div>
              )}
              <div className="p-4 space-y-3">
                <h3 className="font-display text-xl leading-tight">
                  {popupTitle}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {renderInlineBold(popupBody)}
                </p>
                {showPopupCode ? (
                  <div
                    className="border-4 border-black px-3 py-2 flex items-center justify-between gap-3 text-sm font-bold uppercase tracking-widest"
                    style={{ backgroundColor: themeColor, color: textColor }}
                  >
                    <span className="text-[10px] tracking-[0.25em]">
                      {language === 'en' ? 'Code' : 'Code'}
                    </span>
                    <span className="text-base tracking-[0.2em] truncate">
                      {promoCode}
                    </span>
                    {promoDiscountLabel ? (
                      <span className="text-[10px] tracking-wider">
                        {promoDiscountLabel}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {popupCta ? (
                  <button
                    type="button"
                    className="w-full py-2.5 font-bold uppercase tracking-wider text-sm transition-colors"
                    style={{ backgroundColor: accentColor, color: computeContrastingTextColor(accentColor) }}
                    disabled
                  >
                    {popupCta}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 border-2 border-dashed border-gray-300 text-xs text-gray-400 italic text-center">
              {state.popup_enabled
                ? language === 'en'
                  ? 'Popup enabled but title/body empty.'
                  : 'Popup staat aan maar titel/tekst is leeg.'
                : language === 'en'
                  ? 'Popup disabled for this campaign.'
                  : 'Popup staat uit voor deze campagne.'}
            </div>
          )}
        </div>

        {/* Status block */}
        <div className="border-2 border-gray-200 px-3 py-2 text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-gray-700">
            Status
          </p>
          <p className="text-gray-600">
            {state.is_enabled ? '🟢' : '⚪'} {state.is_enabled ? 'Master toggle: aan' : 'Master toggle: uit'}
          </p>
          <p className="text-gray-600">
            {state.starts_at
              ? `🗓️ Start: ${new Date(state.starts_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`
              : '🗓️ Start: direct bij activeren'}
          </p>
          <p className="text-gray-600">
            {state.ends_at
              ? `⏱️ Einde: ${new Date(state.ends_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`
              : '⏱️ Einde: oneindig (handmatig stoppen)'}
          </p>
          {state.priority !== 0 ? (
            <p className="text-gray-600">⭐ Prioriteit: {state.priority}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
