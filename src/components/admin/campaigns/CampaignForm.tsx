'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import MediaPicker from '@/components/admin/MediaPicker'
import {
  computeContrastingTextColor,
  type CampaignPromoCodeMeta,
  type MarketingCampaignPage,
  type MarketingCampaignPopupTrigger,
} from '@/lib/marketing-campaign-shared'
import type { CampaignWritablePayload } from '@/lib/marketing-campaign-validation'
import {
  CAMPAIGN_PRESETS,
  type CampaignPresetKey,
} from './campaign-presets'
import CampaignPreview from './CampaignPreview'
import QuickPromoCodeModal from './QuickPromoCodeModal'
import type { CampaignFormState } from './CampaignFormTypes'

interface CampaignFormProps {
  mode: 'create' | 'edit'
  campaignId?: string
  initial?: Partial<CampaignWritablePayload> & {
    id?: string
    promo_code?: CampaignPromoCodeMeta | null
  }
}

const ALL_PAGES: { key: MarketingCampaignPage; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'shop', label: 'Shop' },
  { key: 'product', label: 'Productpagina' },
  { key: 'blog', label: 'Blog' },
  { key: 'about', label: 'Over MOSE' },
]

const TRIGGERS: { key: MarketingCampaignPopupTrigger; label: string }[] = [
  { key: 'timer', label: 'Timer' },
  { key: 'scroll', label: 'Scroll' },
  { key: 'exit_intent', label: 'Exit-intent' },
  { key: 'immediate', label: 'Direct' },
]

const SWATCH_PALETTE = [
  '#00A676',
  '#FF6700',
  '#000000',
  '#C8102E',
  '#1B5E20',
  '#E94B7B',
  '#F4A8C7',
  '#F4A700',
  '#1F4E8C',
  '#FFFFFF',
]

function emptyState(): CampaignFormState {
  return {
    name: '',
    slug: '',

    is_enabled: false,
    starts_at: null,
    ends_at: null,
    priority: 0,

    theme_color: '#00A676',
    theme_text_color: '#FFFFFF',
    theme_accent_color: '#000000',
    override_banner_color: true,

    banner_enabled: true,
    banner_message_nl: '',
    banner_message_en: '',
    banner_cta_nl: '',
    banner_cta_en: '',
    banner_link_url: '/shop',
    banner_dismissable: false,

    popup_enabled: false,
    popup_title_nl: '',
    popup_title_en: '',
    popup_body_nl: '',
    popup_body_en: '',
    popup_cta_nl: '',
    popup_cta_en: '',
    popup_image_url: null,
    popup_image_alt_nl: '',
    popup_image_alt_en: '',
    popup_trigger: 'timer',
    popup_delay_seconds: 5,
    popup_scroll_pct: 30,
    popup_show_on_pages: ['home', 'shop', 'product'],

    promo_code_id: null,
    auto_apply_via_url: true,
    show_code_in_banner: true,
    show_code_in_popup: true,
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Convert to "YYYY-MM-DDTHH:mm" in Europe/Amsterdam.
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function fromLocalInput(local: string): string | null {
  if (!local) return null
  // Treat the input as Europe/Amsterdam-local. The Date constructor
  // interprets a bare ISO-without-timezone as the visitor's locale, but
  // admins always operate in NL time, so we anchor to Europe/Amsterdam
  // by appending the correct offset for that wall-clock moment.
  const offsetMinutes = getAmsterdamOffsetMinutes(local)
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  const iso = `${local}:00${sign}${hh}:${mm}`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function getAmsterdamOffsetMinutes(localValue: string): number {
  // Probe the offset Europe/Amsterdam has on the given wall-clock moment
  // (handles DST transitions).
  const d = new Date(`${localValue}:00Z`)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    timeZoneName: 'shortOffset',
  })
  const parts = fmt.formatToParts(d)
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = /GMT([+-]\d+)(?::(\d+))?/.exec(tz)
  if (!m) return 60
  const hours = Number(m[1])
  const mins = Number(m[2] ?? '0')
  return hours * 60 + (hours >= 0 ? mins : -mins)
}

export default function CampaignForm({
  mode,
  campaignId,
  initial,
}: CampaignFormProps) {
  const router = useRouter()
  const [state, setState] = useState<CampaignFormState>(() => {
    const base = emptyState()
    if (initial) {
      return { ...base, ...initial } as CampaignFormState
    }
    return base
  })
  const [promoCode, setPromoCode] = useState<CampaignPromoCodeMeta | null>(
    initial?.promo_code ?? null
  )
  const [allPromoCodes, setAllPromoCodes] = useState<CampaignPromoCodeMeta[]>([])
  const [previewLanguage, setPreviewLanguage] = useState<'nl' | 'en'>('nl')
  const [showPreviewMobile, setShowPreviewMobile] = useState(false)
  const [showQuickPromo, setShowQuickPromo] = useState(false)
  const [activeBannerLang, setActiveBannerLang] = useState<'nl' | 'en'>('nl')
  const [activePopupLang, setActivePopupLang] = useState<'nl' | 'en'>('nl')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const slugTouchedRef = useRef(mode === 'edit')

  useEffect(() => {
    let cancelled = false
    async function loadPromoCodes() {
      try {
        const res = await fetch('/api/admin/promo-codes')
        const json = await res.json()
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setAllPromoCodes(
            json.data.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              code: c.code as string,
              discount_type: c.discount_type as 'percentage' | 'fixed',
              discount_value: Number(c.discount_value),
              is_active: Boolean(c.is_active),
              expires_at: (c.expires_at as string | null) ?? null,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load promo codes', err)
      }
    }
    loadPromoCodes()
    return () => {
      cancelled = true
    }
  }, [])

  const promoDiscountLabel = useMemo(() => {
    if (!promoCode) return null
    if (promoCode.discount_type === 'percentage') {
      return `${promoCode.discount_value}% korting`
    }
    return `€${promoCode.discount_value.toFixed(2)} korting`
  }, [promoCode])

  const promoStatus = useMemo(() => {
    if (!promoCode) return null
    const isExpired =
      promoCode.expires_at != null &&
      new Date(promoCode.expires_at).getTime() <= Date.now()
    if (!promoCode.is_active) {
      return { tone: 'red' as const, label: 'Code is uitgeschakeld' }
    }
    if (isExpired) {
      return { tone: 'red' as const, label: 'Code is verlopen' }
    }
    if (
      promoCode.expires_at != null &&
      state.ends_at != null &&
      new Date(promoCode.expires_at).getTime() < new Date(state.ends_at).getTime()
    ) {
      return {
        tone: 'amber' as const,
        label: 'Code verloopt vóór einde van de campagne',
      }
    }
    return { tone: 'green' as const, label: 'Code is actief en geldig' }
  }, [promoCode, state.ends_at])

  function update<K extends keyof CampaignFormState>(
    key: K,
    value: CampaignFormState[K]
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(value: string) {
    update('name', value)
    if (!slugTouchedRef.current) {
      update('slug', slugify(value))
    }
  }

  function applyPreset(presetKey: CampaignPresetKey) {
    const preset = CAMPAIGN_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    const year = new Date().getFullYear()
    const newName = `${preset.defaults.namePrefix} ${year}`
    const newSlug = `${preset.defaults.slugBase}-${year}`
    setState((prev) => ({
      ...prev,
      name: prev.name || newName,
      slug: prev.slug || newSlug,
      theme_color: preset.defaults.theme_color,
      theme_text_color: preset.defaults.theme_text_color,
      theme_accent_color: preset.defaults.theme_accent_color,
      banner_enabled: true,
      banner_message_nl: preset.defaults.banner_message_nl,
      banner_message_en: preset.defaults.banner_message_en,
      banner_cta_nl: preset.defaults.banner_cta_nl,
      banner_cta_en: preset.defaults.banner_cta_en,
      banner_link_url: preset.defaults.banner_link_url,
      popup_enabled: true,
      popup_title_nl: preset.defaults.popup_title_nl,
      popup_title_en: preset.defaults.popup_title_en,
      popup_body_nl: preset.defaults.popup_body_nl,
      popup_body_en: preset.defaults.popup_body_en,
      popup_cta_nl: preset.defaults.popup_cta_nl,
      popup_cta_en: preset.defaults.popup_cta_en,
    }))
    toast.success(`Preset "${preset.label}" toegepast`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!state.name.trim()) {
      setError('Naam is verplicht.')
      return
    }
    if (!state.slug.trim()) {
      setError('Slug is verplicht.')
      return
    }
    if (state.banner_enabled && !state.banner_message_nl?.trim()) {
      setError('Banner staat aan maar de NL-boodschap ontbreekt.')
      return
    }
    if (
      state.popup_enabled &&
      (!state.popup_title_nl?.trim() || !state.popup_body_nl?.trim())
    ) {
      setError('Popup staat aan maar NL-titel of NL-tekst ontbreekt.')
      return
    }
    if (state.starts_at && state.ends_at) {
      if (new Date(state.ends_at).getTime() <= new Date(state.starts_at).getTime()) {
        setError('Einde moet ná de start liggen.')
        return
      }
    }

    setSubmitting(true)
    try {
      const url =
        mode === 'edit'
          ? `/api/admin/campaigns/${campaignId}`
          : '/api/admin/campaigns'
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      const json = (await res.json()) as { success: boolean; error?: string; data?: { id: string } }
      if (!res.ok || !json.success) {
        setError(json.error || 'Opslaan mislukt')
        toast.error(json.error || 'Opslaan mislukt')
        return
      }
      toast.success(
        mode === 'edit' ? 'Campagne bijgewerkt' : 'Campagne aangemaakt'
      )
      if (mode === 'create' && json.data?.id) {
        router.push(`/admin/campaigns/${json.data.id}/edit`)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setError('Onverwachte fout bij opslaan.')
      toast.error('Onverwachte fout bij opslaan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* LEFT: form columns */}
        <div className="space-y-6 min-w-0">
          {error ? (
            <div className="bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 font-semibold">
              {error}
            </div>
          ) : null}

          {/* Section 1 — Basis */}
          <section className="bg-white border-2 border-gray-200 p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Basis</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Naam, slug, status en het venster waarin de campagne live is.
                </p>
              </div>
              <div className="hidden md:block">
                <PresetMenu onSelect={applyPreset} />
              </div>
            </div>

            <div className="md:hidden">
              <PresetMenu onSelect={applyPreset} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Naam *">
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Koningsdag 2026"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  required
                />
              </Field>
              <Field
                label="Slug *"
                hint="Gebruikt in ?campaign=<slug> URL. Alleen kleine letters, cijfers en koppeltekens."
              >
                <input
                  type="text"
                  value={state.slug}
                  onChange={(e) => {
                    slugTouchedRef.current = true
                    update('slug', slugify(e.target.value))
                  }}
                  placeholder="koningsdag-2026"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  required
                />
              </Field>
            </div>

            <div>
              <p className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Status
              </p>
              <div className="inline-flex border-2 border-black">
                <button
                  type="button"
                  onClick={() => update('is_enabled', false)}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                    !state.is_enabled
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Concept
                </button>
                <button
                  type="button"
                  onClick={() => update('is_enabled', true)}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors border-l-2 border-black ${
                    state.is_enabled
                      ? 'bg-brand-primary text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Actief
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Een campagne is pas zichtbaar voor bezoekers als deze <strong>actief</strong> staat én binnen het tijdsvenster valt.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Start"
                hint="Tijd in Nederlandse tijd (Europe/Amsterdam). Leeg = direct na activeren."
              >
                <input
                  type="datetime-local"
                  value={toLocalInput(state.starts_at)}
                  onChange={(e) => update('starts_at', fromLocalInput(e.target.value))}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                />
              </Field>
              <Field
                label="Einde"
                hint="Leeg = handmatig stoppen door master toggle uit te zetten."
              >
                <input
                  type="datetime-local"
                  value={toLocalInput(state.ends_at)}
                  onChange={(e) => update('ends_at', fromLocalInput(e.target.value))}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                />
              </Field>
            </div>

            <Field
              label="Prioriteit"
              hint="Hoger getal wint als meerdere campagnes overlappen. Default 0."
            >
              <input
                type="number"
                value={state.priority}
                onChange={(e) => update('priority', Number(e.target.value) || 0)}
                className="w-32 px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
              />
            </Field>
          </section>

          {/* Section 2 — Theme */}
          <section className="bg-white border-2 border-gray-200 p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl">Look &amp; feel</h2>
              <p className="text-sm text-gray-600 mt-1">
                Themakleuren voor banner en popup-accent. Productpagina's en knoppen blijven MOSE-groen.
              </p>
            </div>

            <ColorRow
              label="Themakleur (banner / popup-accent)"
              value={state.theme_color}
              onChange={(v) => update('theme_color', v)}
              autoTextOnEmpty={(c) => update('theme_text_color', computeContrastingTextColor(c))}
            />
            <ColorRow
              label="Tekstkleur op themakleur"
              value={state.theme_text_color}
              onChange={(v) => update('theme_text_color', v)}
            />
            <ColorRow
              label="Accentkleur (popup-CTA)"
              value={state.theme_accent_color}
              onChange={(v) => update('theme_accent_color', v)}
            />

            <ToggleRow
              label="Banner-kleur overschrijven met themakleur"
              hint="Als uit: banner blijft MOSE-groen, alleen popup gebruikt thema."
              checked={state.override_banner_color}
              onChange={(v) => update('override_banner_color', v)}
            />
          </section>

          {/* Section 3 — Banner */}
          <section className="bg-white border-2 border-gray-200 p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Banner</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Eén korte boodschap bovenaan de site tijdens de campagne.
                </p>
              </div>
              <ToggleSwitch
                checked={state.banner_enabled}
                onChange={(v) => update('banner_enabled', v)}
                ariaLabel="Banner aan/uit"
              />
            </div>

            {state.banner_enabled ? (
              <div className="space-y-4">
                <MiniLangTabs
                  active={activeBannerLang}
                  onChange={setActiveBannerLang}
                />
                {activeBannerLang === 'nl' ? (
                  <>
                    <Field label="Boodschap NL *">
                      <input
                        type="text"
                        value={state.banner_message_nl ?? ''}
                        onChange={(e) => update('banner_message_nl', e.target.value)}
                        maxLength={140}
                        placeholder="👑 KONINGSDAG: 15% KORTING MET CODE KINGSDAY15"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="CTA-tekst NL">
                      <input
                        type="text"
                        value={state.banner_cta_nl ?? ''}
                        onChange={(e) => update('banner_cta_nl', e.target.value)}
                        maxLength={40}
                        placeholder="Shop nu"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Boodschap EN">
                      <input
                        type="text"
                        value={state.banner_message_en ?? ''}
                        onChange={(e) => update('banner_message_en', e.target.value)}
                        maxLength={140}
                        placeholder="👑 KING'S DAY: 15% OFF WITH CODE KINGSDAY15"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="CTA-tekst EN">
                      <input
                        type="text"
                        value={state.banner_cta_en ?? ''}
                        onChange={(e) => update('banner_cta_en', e.target.value)}
                        maxLength={40}
                        placeholder="Shop now"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                  </>
                )}

                <Field
                  label="Link"
                  hint='Zonder /nl of /en. Voorbeeld: "/shop" of "/product/mose-tee"'
                >
                  <input
                    type="text"
                    value={state.banner_link_url ?? ''}
                    onChange={(e) => update('banner_link_url', e.target.value)}
                    placeholder="/shop"
                    className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </Field>

                <ToggleRow
                  label="Bezoeker mag banner sluiten"
                  hint="Standaard uit voor campagnes — campagne is kort, banner moet zichtbaar blijven."
                  checked={state.banner_dismissable}
                  onChange={(v) => update('banner_dismissable', v)}
                />
              </div>
            ) : null}
          </section>

          {/* Section 4 — Popup */}
          <section className="bg-white border-2 border-gray-200 p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Popup</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Optionele feestelijke pop-up. Onderdrukt nieuwsbrief- en survey-popups tijdens deze campagne.
                </p>
              </div>
              <ToggleSwitch
                checked={state.popup_enabled}
                onChange={(v) => update('popup_enabled', v)}
                ariaLabel="Popup aan/uit"
              />
            </div>

            {state.popup_enabled ? (
              <div className="space-y-5">
                <MiniLangTabs
                  active={activePopupLang}
                  onChange={setActivePopupLang}
                />

                {activePopupLang === 'nl' ? (
                  <>
                    <Field label="Titel NL *">
                      <input
                        type="text"
                        value={state.popup_title_nl ?? ''}
                        onChange={(e) => update('popup_title_nl', e.target.value)}
                        maxLength={80}
                        placeholder="Hoera, Koningsdag!"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Tekst NL *" hint="Gebruik **dik** voor accent.">
                      <textarea
                        value={state.popup_body_nl ?? ''}
                        onChange={(e) => update('popup_body_nl', e.target.value)}
                        maxLength={400}
                        rows={3}
                        placeholder="Vier mee met **15% korting** op alle MOSE-stukken vandaag."
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none resize-none"
                      />
                    </Field>
                    <Field label="CTA-tekst NL">
                      <input
                        type="text"
                        value={state.popup_cta_nl ?? ''}
                        onChange={(e) => update('popup_cta_nl', e.target.value)}
                        maxLength={40}
                        placeholder="Shop met 15% korting"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Alt-tekst afbeelding NL">
                      <input
                        type="text"
                        value={state.popup_image_alt_nl ?? ''}
                        onChange={(e) => update('popup_image_alt_nl', e.target.value)}
                        maxLength={120}
                        placeholder="Koningsdag met MOSE"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Titel EN">
                      <input
                        type="text"
                        value={state.popup_title_en ?? ''}
                        onChange={(e) => update('popup_title_en', e.target.value)}
                        maxLength={80}
                        placeholder="Happy King's Day!"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Tekst EN">
                      <textarea
                        value={state.popup_body_en ?? ''}
                        onChange={(e) => update('popup_body_en', e.target.value)}
                        maxLength={400}
                        rows={3}
                        placeholder="Celebrate with us — **15% off** today only."
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none resize-none"
                      />
                    </Field>
                    <Field label="CTA-tekst EN">
                      <input
                        type="text"
                        value={state.popup_cta_en ?? ''}
                        onChange={(e) => update('popup_cta_en', e.target.value)}
                        maxLength={40}
                        placeholder="Shop with 15% off"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                    <Field label="Alt-tekst afbeelding EN">
                      <input
                        type="text"
                        value={state.popup_image_alt_en ?? ''}
                        onChange={(e) => update('popup_image_alt_en', e.target.value)}
                        maxLength={120}
                        placeholder="King's Day at MOSE"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                    </Field>
                  </>
                )}

                <Field label="Hero-afbeelding (optioneel)">
                  <div className="flex items-center gap-3">
                    {state.popup_image_url ? (
                      <div className="relative w-24 h-24 border-2 border-gray-300 overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={state.popup_image_url}
                          alt="popup"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <MediaPicker
                        currentImageUrl={state.popup_image_url ?? undefined}
                        onImageSelected={(url) => update('popup_image_url', url)}
                        accept="images"
                        buttonText={state.popup_image_url ? 'Wijzigen' : 'Kies afbeelding'}
                        buttonClassName="px-4 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800"
                      />
                      {state.popup_image_url ? (
                        <button
                          type="button"
                          onClick={() => update('popup_image_url', null)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Verwijderen
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Field>

                <Field label="Trigger" hint="Wanneer de popup verschijnt.">
                  <div className="flex flex-wrap gap-2">
                    {TRIGGERS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => update('popup_trigger', t.key)}
                        className={`px-3 py-2 text-sm font-bold uppercase tracking-wider border-2 transition-colors ${
                          state.popup_trigger === t.key
                            ? 'bg-brand-primary border-brand-primary text-white'
                            : 'bg-white border-black text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {state.popup_trigger === 'timer' ? (
                  <Field label="Vertraging (seconden)">
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={state.popup_delay_seconds}
                      onChange={(e) =>
                        update('popup_delay_seconds', Number(e.target.value) || 0)
                      }
                      className="w-32 px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                    />
                  </Field>
                ) : null}

                {state.popup_trigger === 'scroll' ? (
                  <Field label="Bij scroll-percentage">
                    <div className="relative w-32">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={state.popup_scroll_pct}
                        onChange={(e) =>
                          update('popup_scroll_pct', Number(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2.5 pr-9 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                        %
                      </span>
                    </div>
                  </Field>
                ) : null}

                <Field label="Toon op pagina's">
                  <div className="flex flex-wrap gap-2">
                    {ALL_PAGES.map((p) => {
                      const checked = state.popup_show_on_pages.includes(p.key)
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            const next = checked
                              ? state.popup_show_on_pages.filter((x) => x !== p.key)
                              : [...state.popup_show_on_pages, p.key]
                            update('popup_show_on_pages', next)
                          }}
                          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                            checked
                              ? 'bg-brand-primary border-brand-primary text-white'
                              : 'bg-white border-black text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </div>
            ) : null}
          </section>

          {/* Section 5 — Promo code */}
          <section className="bg-white border-2 border-gray-200 p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl">Kortingscode</h2>
              <p className="text-sm text-gray-600 mt-1">
                Optioneel. Linkt naar een bestaande code in <code className="bg-gray-100 px-1 py-0.5 text-xs">promo_codes</code> of maak er hier direct een aan.
              </p>
            </div>

            <Field label="Gekoppelde code">
              <div className="flex gap-2 items-stretch">
                <select
                  value={state.promo_code_id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    update('promo_code_id', id)
                    setPromoCode(allPromoCodes.find((c) => c.id === id) ?? null)
                  }}
                  className="flex-1 min-w-0 px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none bg-white"
                >
                  <option value="">— Geen code —</option>
                  {allPromoCodes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.discount_type === 'percentage'
                        ? `${c.discount_value}%`
                        : `€${c.discount_value.toFixed(2)}`}
                      ){!c.is_active ? ' — uitgeschakeld' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowQuickPromo(true)}
                  className="px-4 py-2.5 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800 flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nieuw
                </button>
              </div>
            </Field>

            {promoStatus ? (
              <div
                className={`px-3 py-2 text-sm font-semibold border-2 ${
                  promoStatus.tone === 'green'
                    ? 'bg-green-50 border-green-400 text-green-800'
                    : promoStatus.tone === 'amber'
                      ? 'bg-amber-50 border-amber-400 text-amber-800'
                      : 'bg-red-50 border-red-400 text-red-800'
                }`}
              >
                {promoStatus.tone === 'green' ? '🟢' : promoStatus.tone === 'amber' ? '🟡' : '🔴'}{' '}
                {promoStatus.label}
              </div>
            ) : null}

            {promoCode ? (
              <div className="grid grid-cols-1 gap-3">
                <ToggleRow
                  label="Auto-apply via ?campaign= URL"
                  hint="Bezoeker komt binnen via een campagne-link en de code wordt direct toegepast."
                  checked={state.auto_apply_via_url}
                  onChange={(v) => update('auto_apply_via_url', v)}
                />
                <ToggleRow
                  label="Toon code in banner"
                  checked={state.show_code_in_banner}
                  onChange={(v) => update('show_code_in_banner', v)}
                />
                <ToggleRow
                  label="Toon code prominent in popup"
                  checked={state.show_code_in_popup}
                  onChange={(v) => update('show_code_in_popup', v)}
                />
              </div>
            ) : null}
          </section>

          {/* Footer actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-8 pt-6 border-t-2 border-gray-200">
            <Link
              href="/admin/campaigns"
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold uppercase tracking-wider text-sm text-center transition-colors"
            >
              Annuleren
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Opslaan...'
                : mode === 'edit'
                  ? 'Wijzigingen opslaan'
                  : 'Campagne aanmaken'}
            </button>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="lg:hidden mb-3">
            <button
              type="button"
              onClick={() => setShowPreviewMobile((v) => !v)}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-800"
            >
              {showPreviewMobile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreviewMobile ? 'Preview verbergen' : 'Preview tonen'}
            </button>
          </div>
          <div className={showPreviewMobile ? 'block' : 'hidden lg:block'}>
            <CampaignPreview
              state={state}
              promoCode={promoCode?.code ?? null}
              promoDiscountLabel={promoDiscountLabel}
              language={previewLanguage}
              onLanguageChange={setPreviewLanguage}
            />
          </div>
        </aside>
      </div>

      <QuickPromoCodeModal
        open={showQuickPromo}
        defaultCode={
          state.slug
            ? state.slug.replace(/-/g, '').slice(0, 12).toUpperCase()
            : undefined
        }
        onClose={() => setShowQuickPromo(false)}
        onCreated={(c) => {
          setAllPromoCodes((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
          setPromoCode(c)
          update('promo_code_id', c.id)
          setShowQuickPromo(false)
        }}
      />
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-[11px] text-gray-500 mt-1">{hint}</span>
      ) : null}
    </label>
  )
}

function MiniLangTabs({
  active,
  onChange,
}: {
  active: 'nl' | 'en'
  onChange: (l: 'nl' | 'en') => void
}) {
  return (
    <div className="inline-flex border border-gray-300">
      <button
        type="button"
        onClick={() => onChange('nl')}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
          active === 'nl' ? 'bg-black text-white' : 'bg-white text-gray-600'
        }`}
      >
        🇳🇱 NL
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
          active === 'en' ? 'bg-black text-white' : 'bg-white text-gray-600'
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer select-none">
      <span className="flex-1">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {hint ? (
          <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
        ) : null}
      </span>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        ariaLabel={label}
      />
    </label>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 border-2 transition-colors flex-shrink-0 ${
        checked ? 'bg-brand-primary border-brand-primary' : 'bg-gray-200 border-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function ColorRow({
  label,
  value,
  onChange,
  autoTextOnEmpty,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  autoTextOnEmpty?: (v: string) => void
}) {
  const safe = value ?? '#000000'
  return (
    <div className="space-y-2">
      <p className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="color"
          value={safe}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase())
            autoTextOnEmpty?.(e.target.value)
          }}
          className="w-12 h-12 border-2 border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="#FFFFFF"
          className="w-28 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm uppercase"
        />
        <div className="flex flex-wrap gap-1.5">
          {SWATCH_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c)
                autoTextOnEmpty?.(c)
              }}
              className={`w-7 h-7 border-2 ${value === c ? 'border-black ring-2 ring-brand-primary' : 'border-gray-300'} transition-all`}
              style={{ backgroundColor: c }}
              aria-label={`Kies ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PresetMenu({ onSelect }: { onSelect: (k: CampaignPresetKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2.5 border-2 border-black hover:bg-black hover:text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Snelle start
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border-2 border-black shadow-lg w-64 max-h-80 overflow-auto">
          {CAMPAIGN_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                onSelect(preset.key)
                setOpen(false)
              }}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 border-b last:border-b-0 border-gray-200"
            >
              <span className="text-lg">{preset.emoji}</span>
              <span className="font-semibold">{preset.label}</span>
              <span
                className="ml-auto w-4 h-4 border border-gray-300"
                style={{ backgroundColor: preset.defaults.theme_color }}
                aria-hidden
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
