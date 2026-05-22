'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Palette,
  Save,
  RotateCcw,
  Plus,
  X,
  Type,
  Mic,
  Quote,
  Sparkles,
} from 'lucide-react'
import { useAutoDismiss } from '@/app/admin/ai-campaigns/_lib/use-auto-dismiss'

interface BrandPalette {
  primary: string
  secondary: string
  accents: string[]
  max_palette_distance: number
}

interface BrandTypography {
  primary: string
  secondary: string
  weight_emphasis: string
}

interface BrandVoice {
  tone: string
  do: string[]
  dont: string[]
}

interface BrandGuardrails {
  ssim_min: number
  palette_distance_max: number
  ad_policy_blocked_terms: string[]
}

interface BrandGuide {
  palette: BrandPalette
  typography: BrandTypography
  voice: BrandVoice
  tagline: string
  guardrails: BrandGuardrails
}

const DEFAULT_GUIDE: BrandGuide = {
  palette: {
    primary: '#0E0E0E',
    secondary: '#F4EFE6',
    accents: ['#7A5A3A', '#D7C5A8'],
    max_palette_distance: 35,
  },
  typography: { primary: 'Inter', secondary: 'Inter', weight_emphasis: '600' },
  voice: {
    tone: '',
    do: [],
    dont: [],
  },
  tagline: '',
  guardrails: {
    ssim_min: 0.78,
    palette_distance_max: 35,
    ad_policy_blocked_terms: [],
  },
}

const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i

export default function BrandGuidePage() {
  const [draft, setDraft] = useState<BrandGuide>(DEFAULT_GUIDE)
  const [initial, setInitial] = useState<BrandGuide>(DEFAULT_GUIDE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useAutoDismiss(message, setMessage)
  useAutoDismiss(error, setError, 10_000)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/ai-campaigns/brand-guide')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Laden mislukt')
      const incoming = data.guide ?? DEFAULT_GUIDE
      const merged: BrandGuide = {
        palette: { ...DEFAULT_GUIDE.palette, ...(incoming.palette ?? {}) },
        typography: { ...DEFAULT_GUIDE.typography, ...(incoming.typography ?? {}) },
        voice: { ...DEFAULT_GUIDE.voice, ...(incoming.voice ?? {}) },
        tagline: incoming.tagline ?? '',
        guardrails: { ...DEFAULT_GUIDE.guardrails, ...(incoming.guardrails ?? {}) },
      }
      setDraft(merged)
      setInitial(merged)
      setUpdatedAt(data.updated_at ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial])

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      setMessage(null)
      const invalidHex = [draft.palette.primary, draft.palette.secondary, ...draft.palette.accents].find(
        (h) => !HEX_RE.test(h),
      )
      if (invalidHex) throw new Error(`Ongeldige hex-kleur: ${invalidHex}`)

      const res = await fetch('/api/admin/ai-campaigns/brand-guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
      setInitial(data.guide || draft)
      setMessage('Brand guide opgeslagen.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-sm text-gray-500">Brand guide laden…</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link
        href="/admin/ai-campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Terug naar Campagne AI
      </Link>

      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Brand guide
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Centrale visuele identiteit voor de AI creative pipeline. Wordt geinjecteerd in elke
            prompt en is de baseline voor de palette &amp; ad-policy QA checks.
          </p>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Laatst bijgewerkt {new Date(updatedAt).toLocaleString('nl-NL')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={() => setDraft(initial)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4" /> Herstel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm flex gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{message}</div>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Palette className="w-5 h-5" /> Palet
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorField
            label="Primaire kleur"
            value={draft.palette.primary}
            onChange={(v) => setDraft({ ...draft, palette: { ...draft.palette, primary: v } })}
          />
          <ColorField
            label="Secundaire kleur"
            value={draft.palette.secondary}
            onChange={(v) => setDraft({ ...draft, palette: { ...draft.palette, secondary: v } })}
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Accent kleuren</label>
          <div className="flex flex-wrap gap-2">
            {draft.palette.accents.map((hex, i) => (
              <div
                key={`${hex}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white"
              >
                <input
                  type="color"
                  value={HEX_RE.test(hex) ? hex : '#cccccc'}
                  onChange={(e) => {
                    const next = [...draft.palette.accents]
                    next[i] = e.target.value
                    setDraft({ ...draft, palette: { ...draft.palette, accents: next } })
                  }}
                  className="w-6 h-6 border border-gray-200 rounded"
                />
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => {
                    const next = [...draft.palette.accents]
                    next[i] = e.target.value
                    setDraft({ ...draft, palette: { ...draft.palette, accents: next } })
                  }}
                  className="w-24 text-xs font-mono px-1 py-0.5 border border-gray-200 rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = draft.palette.accents.filter((_, idx) => idx !== i)
                    setDraft({ ...draft, palette: { ...draft.palette, accents: next } })
                  }}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Verwijder accent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {draft.palette.accents.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    palette: { ...draft.palette, accents: [...draft.palette.accents, '#888888'] },
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-dashed border-gray-300 hover:border-black hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" /> Accent toevoegen
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <NumberField
            label="Max palette-afstand (deltaE)"
            value={draft.palette.max_palette_distance}
            onChange={(v) =>
              setDraft({ ...draft, palette: { ...draft.palette, max_palette_distance: v } })
            }
            step={1}
            min={0}
            max={120}
            hint="Variants met grotere afstand tot het brand palet vallen door de QA."
          />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Type className="w-5 h-5" /> Typografie
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <TextField
            label="Primair font"
            value={draft.typography.primary}
            onChange={(v) => setDraft({ ...draft, typography: { ...draft.typography, primary: v } })}
          />
          <TextField
            label="Secundair font"
            value={draft.typography.secondary}
            onChange={(v) => setDraft({ ...draft, typography: { ...draft.typography, secondary: v } })}
          />
          <TextField
            label="Weight-emphasis"
            value={draft.typography.weight_emphasis}
            onChange={(v) =>
              setDraft({ ...draft, typography: { ...draft.typography, weight_emphasis: v } })
            }
          />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Mic className="w-5 h-5" /> Voice
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
            <textarea
              value={draft.voice.tone}
              onChange={(e) => setDraft({ ...draft, voice: { ...draft.voice, tone: e.target.value } })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Beschrijf in 1-3 zinnen hoe MOSE communiceert."
            />
          </div>
          <ListEditor
            label="Wel doen"
            tone="positive"
            items={draft.voice.do}
            onChange={(items) => setDraft({ ...draft, voice: { ...draft.voice, do: items } })}
          />
          <ListEditor
            label="Niet doen"
            tone="negative"
            items={draft.voice.dont}
            onChange={(items) => setDraft({ ...draft, voice: { ...draft.voice, dont: items } })}
          />
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Quote className="w-5 h-5" /> Tagline
        </h2>
        <TextField
          label="Tagline (komt in alt text + primary text fallback)"
          value={draft.tagline}
          onChange={(v) => setDraft({ ...draft, tagline: v })}
        />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-10 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">QA &amp; ad policy drempels</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField
            label="Min. SSIM (garment match)"
            value={draft.guardrails.ssim_min}
            onChange={(v) => setDraft({ ...draft, guardrails: { ...draft.guardrails, ssim_min: v } })}
            step={0.01}
            min={0}
            max={1}
            hint="Variants onder deze score worden automatisch geweigerd."
          />
          <NumberField
            label="Max. palette-afstand"
            value={draft.guardrails.palette_distance_max}
            onChange={(v) =>
              setDraft({
                ...draft,
                guardrails: { ...draft.guardrails, palette_distance_max: v },
              })
            }
            step={1}
            min={0}
            max={120}
          />
        </div>
        <div className="mt-4">
          <ListEditor
            label="Geblokkeerde marketingclaims"
            tone="negative"
            items={draft.guardrails.ad_policy_blocked_terms}
            onChange={(items) =>
              setDraft({
                ...draft,
                guardrails: { ...draft.guardrails, ad_policy_blocked_terms: items },
              })
            }
            placeholder="bv. free shipping"
          />
        </div>
      </section>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : '#cccccc'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 border border-gray-200 rounded"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 text-sm font-mono px-2 py-1.5 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  tone,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (next: string[]) => void
  tone: 'positive' | 'negative'
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    onChange([...items, draft.trim()])
    setDraft('')
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <ul className="space-y-1.5 mb-2">
        {items.length === 0 && (
          <li className="text-xs text-gray-400 italic">Nog niets toegevoegd.</li>
        )}
        {items.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className={`flex items-start gap-2 text-sm rounded-md px-2 py-1.5 ${
              tone === 'positive' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
            }`}
          >
            <span className="flex-1 break-words">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-current opacity-50 hover:opacity-100"
              aria-label="Verwijder"
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder ?? 'Toevoegen…'}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Voeg toe
        </button>
      </div>
    </div>
  )
}
