'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ImageIcon,
  ExternalLink,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Heart,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LanguageTabs from '@/components/admin/LanguageTabs'
import MediaPicker from '@/components/admin/MediaPicker'
import FocalPointPicker from '@/components/admin/FocalPointPicker'

/**
 * /admin/about — single-form editor for the public /over-mose page.
 *
 * Mirrors the conventions of /admin/homepage and /admin/lookbook:
 *   • Loads the singleton row from `about_settings`
 *   • LanguageTabs split NL (source of truth) and EN (optional, falls
 *     back to NL when blank)
 *   • MediaPicker wraps existing media library / upload flow
 *   • FocalPointPicker re-uses the shared admin component
 *   • Save persists everything in one update + triggers
 *     /api/revalidate-about so the public ISR cache flips immediately
 *
 * UX niceties
 *   • Dirty-state tracking → "Save" disabled when nothing changed
 *   • Cmd/Ctrl+S keyboard shortcut for save
 *   • aria-live save bar status with green/red pill backgrounds
 *   • Character counter for alt-text (a11y best practice <125 chars)
 */

interface AboutRow {
  id: string
  hero_image_url: string | null
  hero_image_url_mobile: string | null
  image_focal_x: number
  image_focal_y: number
  hero_alt_nl: string | null
  hero_alt_en: string | null
  hero_title_nl: string
  hero_title_en: string | null
  hero_subtitle_nl: string
  hero_subtitle_en: string | null
  story_title_nl: string
  story_title_en: string | null
  story_paragraph1_nl: string
  story_paragraph1_en: string | null
  story_paragraph2_nl: string
  story_paragraph2_en: string | null
  local_title_nl: string
  local_title_en: string | null
  local_text_nl: string
  local_text_en: string | null
  values_title_nl: string
  values_title_en: string | null
  value_quality_title_nl: string
  value_quality_title_en: string | null
  value_quality_text_nl: string
  value_quality_text_en: string | null
  value_local_made_title_nl: string
  value_local_made_title_en: string | null
  value_local_made_text_nl: string
  value_local_made_text_en: string | null
  value_fair_pricing_title_nl: string
  value_fair_pricing_title_en: string | null
  value_fair_pricing_text_nl: string
  value_fair_pricing_text_en: string | null
  value_no_hassle_title_nl: string
  value_no_hassle_title_en: string | null
  value_no_hassle_text_nl: string
  value_no_hassle_text_en: string | null
  why_title_nl: string
  why_title_en: string | null
  why_sustainable_title_nl: string
  why_sustainable_title_en: string | null
  why_sustainable_text_nl: string
  why_sustainable_text_en: string | null
  why_stylish_title_nl: string
  why_stylish_title_en: string | null
  why_stylish_text_nl: string
  why_stylish_text_en: string | null
  why_local_title_nl: string
  why_local_title_en: string | null
  why_local_text_nl: string
  why_local_text_en: string | null
  cta_text_nl: string
  cta_text_en: string | null
}

type LangKey = 'nl' | 'en'

interface FieldGroup {
  /** Database column for NL value */
  nl: keyof AboutRow
  /** Database column for EN value */
  en: keyof AboutRow
  /** Visible label in admin UI */
  label: string
  /** Multi-line vs single-line */
  multiline?: boolean
  /** Optional placeholder for NL */
  placeholderNl?: string
  /** Optional placeholder for EN */
  placeholderEn?: string
  /** Optional helper text */
  hint?: string
  /** Optional max length — shows character counter when set */
  maxLength?: number
}

export default function AboutAdminPage() {
  const [row, setRow] = useState<AboutRow | null>(null)
  const initialRow = useRef<AboutRow | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<LangKey>('nl')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Load the singleton row.
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      try {
        const { data, error: e } = await supabase
          .from('about_settings')
          .select('*')
          .limit(1)
          .single()
        if (e) throw e
        setRow(data as AboutRow)
        initialRow.current = data as AboutRow
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const isDirty = useMemo(() => {
    if (!row || !initialRow.current) return false
    return JSON.stringify(row) !== JSON.stringify(initialRow.current)
  }, [row])

  const update = <K extends keyof AboutRow>(key: K, value: AboutRow[K]) => {
    setRow((r) => (r ? { ...r, [key]: value } : r))
  }

  const handleSave = async () => {
    if (!row || saving) return
    setSaving(true)
    setMessage(null)
    setError(null)

    const supabase = createClient()
    try {
      const { id, ...rest } = row
      const { error: e } = await supabase
        .from('about_settings')
        .update(rest)
        .eq('id', id)
      if (e) throw e

      // Trigger ISR revalidation so the public page flips immediately.
      try {
        await fetch('/api/revalidate-about', { method: 'POST' })
      } catch (revErr) {
        console.warn('Revalidate /over-mose failed (non-fatal):', revErr)
      }

      initialRow.current = row // baseline reset → resets dirty-state
      setMessage('Opgeslagen — de Over MOSE pagina is meteen bijgewerkt.')
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  // Cmd/Ctrl+S = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (isDirty) void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleSave is stable enough — re-binding on every change is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, row])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (error && !row) {
    return (
      <div className="max-w-3xl mx-auto border-2 border-red-500 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-bold mb-1">Kon de about-data niet laden.</p>
        <p>{error}</p>
      </div>
    )
  }

  if (!row) return null

  const heroFields: FieldGroup[] = [
    {
      nl: 'hero_title_nl',
      en: 'hero_title_en',
      label: 'Hero titel',
      placeholderNl: 'OVER MOSE',
      placeholderEn: 'ABOUT MOSE',
      maxLength: 50,
    },
    {
      nl: 'hero_subtitle_nl',
      en: 'hero_subtitle_en',
      label: 'Hero subtitel',
      placeholderNl: 'Geen poespas. Wel karakter.',
      placeholderEn: 'No nonsense. Pure character.',
      maxLength: 80,
    },
    {
      nl: 'hero_alt_nl',
      en: 'hero_alt_en',
      label: 'Alt-tekst hero afbeelding',
      hint: 'Korte omschrijving voor screenreaders en SEO. Beschrijf wat er op de foto staat.',
      maxLength: 125,
    },
  ]

  const storyFields: FieldGroup[] = [
    {
      nl: 'story_title_nl',
      en: 'story_title_en',
      label: 'Verhaal — titel',
      placeholderNl: 'ONS VERHAAL',
      placeholderEn: 'OUR STORY',
      maxLength: 60,
    },
    {
      nl: 'story_paragraph1_nl',
      en: 'story_paragraph1_en',
      label: 'Verhaal — alinea 1',
      multiline: true,
    },
    {
      nl: 'story_paragraph2_nl',
      en: 'story_paragraph2_en',
      label: 'Verhaal — alinea 2',
      multiline: true,
    },
    {
      nl: 'local_title_nl',
      en: 'local_title_en',
      label: 'Lokaal blok — titel',
      placeholderNl: 'LOKAAL GEMAAKT IN GRONINGEN',
      placeholderEn: 'LOCALLY MADE IN GRONINGEN',
      maxLength: 60,
    },
    {
      nl: 'local_text_nl',
      en: 'local_text_en',
      label: 'Lokaal blok — tekst',
      multiline: true,
    },
  ]

  // Values: 4 cards, each with title + text, rendered in pairs.
  const valueCards: { title: string; nlTitle: keyof AboutRow; enTitle: keyof AboutRow; nlText: keyof AboutRow; enText: keyof AboutRow; hint?: string }[] = [
    {
      title: 'Card 1 — Premium kwaliteit',
      nlTitle: 'value_quality_title_nl',
      enTitle: 'value_quality_title_en',
      nlText: 'value_quality_text_nl',
      enText: 'value_quality_text_en',
    },
    {
      title: 'Card 2 — Lokaal gemaakt',
      nlTitle: 'value_local_made_title_nl',
      enTitle: 'value_local_made_title_en',
      nlText: 'value_local_made_text_nl',
      enText: 'value_local_made_text_en',
    },
    {
      title: 'Card 3 — Eerlijke prijzen',
      nlTitle: 'value_fair_pricing_title_nl',
      enTitle: 'value_fair_pricing_title_en',
      nlText: 'value_fair_pricing_text_nl',
      enText: 'value_fair_pricing_text_en',
    },
    {
      title: 'Card 4 — Geen gedoe',
      nlTitle: 'value_no_hassle_title_nl',
      enTitle: 'value_no_hassle_title_en',
      nlText: 'value_no_hassle_text_nl',
      enText: 'value_no_hassle_text_en',
      hint: 'Tip: gebruik {days} en {threshold} — die worden automatisch vervangen door de retourtermijn en gratis-verzending-grens uit Instellingen.',
    },
  ]

  const whyBullets: { title: string; nlTitle: keyof AboutRow; enTitle: keyof AboutRow; nlText: keyof AboutRow; enText: keyof AboutRow }[] = [
    {
      title: 'Bullet 1 — Duurzaam',
      nlTitle: 'why_sustainable_title_nl',
      enTitle: 'why_sustainable_title_en',
      nlText: 'why_sustainable_text_nl',
      enText: 'why_sustainable_text_en',
    },
    {
      title: 'Bullet 2 — Stijlvol',
      nlTitle: 'why_stylish_title_nl',
      enTitle: 'why_stylish_title_en',
      nlText: 'why_stylish_text_nl',
      enText: 'why_stylish_text_en',
    },
    {
      title: 'Bullet 3 — Lokaal',
      nlTitle: 'why_local_title_nl',
      enTitle: 'why_local_title_en',
      nlText: 'why_local_text_nl',
      enText: 'why_local_text_en',
    },
  ]

  const renderField = (field: FieldGroup) => {
    const key = activeLanguage === 'nl' ? field.nl : field.en
    const value = (row[key] ?? '') as string
    const placeholder =
      activeLanguage === 'nl' ? field.placeholderNl : field.placeholderEn

    const counter =
      field.maxLength != null
        ? `${value.length}/${field.maxLength}`
        : null
    const overLimit = field.maxLength != null && value.length > field.maxLength

    return (
      <div key={String(field.nl)}>
        <label className="block text-xs md:text-sm font-bold mb-1.5">
          {field.label}{' '}
          <span className="text-gray-500 font-normal">
            {activeLanguage === 'nl' ? '(NL)' : '(EN — optioneel)'}
          </span>
        </label>
        {field.multiline ? (
          <textarea
            value={value}
            onChange={(e) => update(key, e.target.value as never)}
            placeholder={placeholder}
            rows={4}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors resize-y"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => update(key, e.target.value as never)}
            placeholder={placeholder}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
          />
        )}
        <div className="flex items-start justify-between gap-3 mt-1">
          {field.hint ? (
            <p className="text-xs text-gray-500 flex-1">{field.hint}</p>
          ) : (
            <span />
          )}
          {counter && (
            <span
              className={`text-xs font-mono shrink-0 ${
                overLimit ? 'text-red-600 font-bold' : 'text-gray-400'
              }`}
            >
              {counter}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Over MOSE</h1>
          <p className="text-sm md:text-base text-gray-600">
            Beheer de hero-afbeelding, het verhaal, de waarden en de CTA van de
            <span className="font-mono"> /over-mose</span> pagina.
          </p>
        </div>
        <a
          href="/over-mose"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider border-2 border-black bg-white px-3 py-2 hover:bg-black hover:text-white transition-colors"
        >
          <ExternalLink size={14} />
          Bekijk pagina
        </a>
      </div>

      {/* Language toggle */}
      <div className="bg-white border-2 border-black p-4 md:p-6 mb-6">
        <LanguageTabs
          activeLanguage={activeLanguage}
          onLanguageChange={setActiveLanguage}
        />
        <p className="text-sm text-gray-600 -mt-2">
          {activeLanguage === 'nl'
            ? 'Nederlands is de basis. Vul Engels in voor /en/over-mose; lege Engelse velden vallen automatisch terug op het Nederlands.'
            : 'Engels is optioneel. Lege velden worden op /en/over-mose vervangen door de Nederlandse tekst.'}
        </p>
      </div>

      {/* Section: Hero image + focal point */}
      <section className="bg-white border-2 border-black mb-6">
        <header className="border-b-2 border-black px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          <ImageIcon size={18} />
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
            Hero afbeelding
          </h2>
        </header>
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs md:text-sm font-bold mb-1.5">
                Desktop afbeelding{' '}
                <span className="text-gray-500 font-normal">(landscape)</span>
              </label>
              <MediaPicker
                mode="single"
                currentImageUrl={row.hero_image_url || ''}
                onImageSelected={(url) => update('hero_image_url', url)}
                accept="images"
                folder="about"
                bucket="images"
                buttonText="Selecteer desktop hero"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: liggende foto, ongeveer 2400×1600.
              </p>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold mb-1.5">
                Mobiele afbeelding{' '}
                <span className="text-gray-500 font-normal">(portrait)</span>
              </label>
              <MediaPicker
                mode="single"
                currentImageUrl={row.hero_image_url_mobile || ''}
                onImageSelected={(url) => update('hero_image_url_mobile', url)}
                accept="images"
                folder="about"
                bucket="images"
                buttonText="Selecteer mobiele hero"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optioneel — laat leeg om de desktop foto ook op mobiel te
                tonen. Tip: portrait 1200×1600.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold mb-1.5">
              Focuspunt
            </label>
            <FocalPointPicker
              imageUrl={row.hero_image_url || ''}
              focalX={row.image_focal_x}
              focalY={row.image_focal_y}
              onChange={(x, y) => {
                update('image_focal_x', x as never)
                update('image_focal_y', y as never)
              }}
              alt="Over MOSE hero focuspunt"
              aspectRatio="3/2"
            />
            <p className="text-xs text-gray-500 mt-2">
              Klik of sleep om te kiezen waar de hero op moet uitsnijden — handig
              wanneer een gezicht of object dichterbij de rand staat. Wordt
              gebruikt op zowel desktop als mobiel.
            </p>
          </div>

          {/* Hero copy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-gray-100">
            {heroFields.map(renderField)}
          </div>
        </div>
      </section>

      {/* Section: Story + Local */}
      <section className="bg-white border-2 border-black mb-6">
        <header className="border-b-2 border-black px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          <BookOpen size={18} />
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
            Verhaal & Lokaal blok
          </h2>
        </header>
        <div className="p-4 md:p-6 space-y-4">
          {storyFields.map(renderField)}
        </div>
      </section>

      {/* Section: Values */}
      <section className="bg-white border-2 border-black mb-6">
        <header className="border-b-2 border-black px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          <Heart size={18} />
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
            Waarden
          </h2>
        </header>
        <div className="p-4 md:p-6 space-y-6">
          {/* Section title */}
          {renderField({
            nl: 'values_title_nl',
            en: 'values_title_en',
            label: 'Sectietitel',
            placeholderNl: 'ONZE WAARDEN',
            placeholderEn: 'OUR VALUES',
            maxLength: 60,
          })}

          {/* 4 value cards in a 2x2 grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t-2 border-gray-100">
            {valueCards.map((c) => (
              <div
                key={c.title}
                className="border-2 border-gray-200 bg-gray-50 p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {c.title}
                </p>
                {renderField({
                  nl: c.nlTitle,
                  en: c.enTitle,
                  label: 'Titel',
                  maxLength: 40,
                })}
                {renderField({
                  nl: c.nlText,
                  en: c.enText,
                  label: 'Tekst',
                  multiline: true,
                  hint: c.hint,
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section: Why + CTA */}
      <section className="bg-white border-2 border-black mb-6">
        <header className="border-b-2 border-black px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          <Sparkles size={18} />
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
            Waarom MOSE & CTA
          </h2>
        </header>
        <div className="p-4 md:p-6 space-y-6">
          {/* Section title */}
          {renderField({
            nl: 'why_title_nl',
            en: 'why_title_en',
            label: 'Sectietitel',
            placeholderNl: 'WAAROM MOSE?',
            placeholderEn: 'WHY MOSE?',
            maxLength: 60,
          })}

          {/* 3 bullets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t-2 border-gray-100">
            {whyBullets.map((b) => (
              <div
                key={b.title}
                className="border-2 border-gray-200 bg-gray-50 p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {b.title}
                </p>
                {renderField({
                  nl: b.nlTitle,
                  en: b.enTitle,
                  label: 'Titel',
                  maxLength: 40,
                })}
                {renderField({
                  nl: b.nlText,
                  en: b.enText,
                  label: 'Tekst',
                  multiline: true,
                })}
              </div>
            ))}
          </div>

          {/* CTA button text */}
          <div className="pt-4 border-t-2 border-gray-100">
            {renderField({
              nl: 'cta_text_nl',
              en: 'cta_text_en',
              label: 'CTA-knop tekst',
              placeholderNl: 'Ontdek de collectie',
              placeholderEn: 'Discover the collection',
              maxLength: 40,
            })}
          </div>
        </div>
      </section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div
            className="text-sm flex-1 min-w-0"
            role="status"
            aria-live="polite"
          >
            {message ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border-2 border-green-600 text-green-800 font-medium">
                <CheckCircle2 size={16} />
                {message}
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border-2 border-red-600 text-red-800 font-medium">
                <AlertCircle size={16} />
                {error}
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Niet-opgeslagen wijzigingen
              </span>
            ) : (
              <span className="text-gray-500">
                Wijzigingen verschijnen meteen op{' '}
                <span className="font-mono">/over-mose</span> na opslaan.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            title={isDirty ? 'Opslaan (⌘/Ctrl + S)' : 'Geen wijzigingen om op te slaan'}
            className="inline-flex items-center gap-2 bg-brand-primary text-white font-bold uppercase tracking-wider px-5 md:px-6 py-2.5 md:py-3 hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-2 border-black"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Opslaan…
              </>
            ) : (
              <>
                <Save size={16} />
                Opslaan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
