'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface GlobalLookbookSettings {
  id: string
  header_title: string | null
  header_title_en: string | null
  header_subtitle: string | null
  header_subtitle_en: string | null
  ticker_text_nl: string | null
  ticker_text_en: string | null
  final_cta_title: string | null
  final_cta_title_en: string | null
  final_cta_text: string | null
  final_cta_text_en: string | null
  final_cta_button_text: string | null
  final_cta_button_text_en: string | null
  final_cta_button_link: string | null
}

interface GlobalSettingsProps {
  initial: GlobalLookbookSettings
  activeLanguage: 'nl' | 'en'
}

/**
 * Editor for the non-chapter parts of the lookbook page: the page-level
 * header, the default marquee ticker (used whenever a chapter leaves
 * its own ticker blank) and the closing "final CTA" panel.
 *
 * All fields are written back to the existing `lookbook_settings` row;
 * no migration to a new table is needed since these are truly global.
 */
export default function GlobalSettings({ initial, activeLanguage }: GlobalSettingsProps) {
  const [settings, setSettings] = useState<GlobalLookbookSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const supabase = createClient()

  const patch = <K extends keyof GlobalLookbookSettings>(key: K, value: GlobalLookbookSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('lookbook_settings')
        .update({
          header_title: settings.header_title,
          header_title_en: settings.header_title_en,
          header_subtitle: settings.header_subtitle,
          header_subtitle_en: settings.header_subtitle_en,
          ticker_text_nl: settings.ticker_text_nl,
          ticker_text_en: settings.ticker_text_en,
          final_cta_title: settings.final_cta_title,
          final_cta_title_en: settings.final_cta_title_en,
          final_cta_text: settings.final_cta_text,
          final_cta_text_en: settings.final_cta_text_en,
          final_cta_button_text: settings.final_cta_button_text,
          final_cta_button_text_en: settings.final_cta_button_text_en,
          final_cta_button_link: settings.final_cta_button_link,
        })
        .eq('id', settings.id)
      if (error) throw error
      setMessage({ kind: 'ok', text: 'Instellingen opgeslagen' })
    } catch (e) {
      console.error(e)
      setMessage({ kind: 'err', text: 'Opslaan mislukt' })
    } finally {
      setSaving(false)
    }
  }

  // Small helper to reduce boilerplate on bilingual fields
  const BiField = ({
    label,
    nlKey,
    enKey,
    type = 'input',
    placeholder = '',
  }: {
    label: string
    nlKey: keyof GlobalLookbookSettings
    enKey: keyof GlobalLookbookSettings
    type?: 'input' | 'textarea'
    placeholder?: string
  }) => {
    const activeKey = activeLanguage === 'nl' ? nlKey : enKey
    const value = (settings[activeKey] as string | null) ?? ''
    const shared = {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        patch(activeKey, (e.target.value || null) as GlobalLookbookSettings[typeof activeKey]),
      placeholder,
      className:
        'w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none transition-colors',
    }
    return (
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
          {label} {activeLanguage === 'en' ? '(EN — optioneel)' : '(NL)'}
        </label>
        {type === 'textarea' ? (
          <textarea {...shared} rows={3} className={`${shared.className} resize-y`} />
        ) : (
          <input type="text" {...shared} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b-2 border-black">
          Header
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          De titel en ondertitel die helemaal bovenaan de lookbook-pagina staan,
          vóór het eerste chapter.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BiField
            label="Titel"
            nlKey="header_title"
            enKey="header_title_en"
            placeholder="THE LOOKBOOK"
          />
          <BiField
            label="Subtitel"
            nlKey="header_subtitle"
            enKey="header_subtitle_en"
            placeholder="Herfst / winter '25"
          />
        </div>
      </section>

      {/* GLOBAL PRINCIPLES-STRIP */}
      <section>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b-2 border-black">
          Tussentekst tussen chapters
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Statische strip met MOSE-principes die tussen de chapters verschijnt.
          Individuele chapters kunnen deze overschrijven. Gebruik <code>•</code>{' '}
          als scheidingsteken tussen items (max 5 aanbevolen voor leesbaarheid).
        </p>
        <div className="grid grid-cols-1 gap-4">
          <BiField
            label="Tussentekst"
            nlKey="ticker_text_nl"
            enKey="ticker_text_en"
            placeholder="NO FAST FASHION • MADE IN GRONINGEN • PREMIUM ESSENTIALS"
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b-2 border-black">
          Afsluitende CTA
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Het groene CTA-blok onderaan de lookbook-pagina dat bezoekers naar de
          shop of een andere pagina stuurt.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BiField
            label="Titel"
            nlKey="final_cta_title"
            enKey="final_cta_title_en"
            placeholder="KLAAR VOOR MOSE?"
          />
          <BiField
            label="Button tekst"
            nlKey="final_cta_button_text"
            enKey="final_cta_button_text_en"
            placeholder="SHOP DE COLLECTIE"
          />
          <div className="md:col-span-2">
            <BiField
              label="Body"
              nlKey="final_cta_text"
              enKey="final_cta_text_en"
              type="textarea"
              placeholder="Korte oneliner die aansluit op de campagne…"
            />
          </div>
          {activeLanguage === 'nl' && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
                Button link
              </label>
              <input
                type="text"
                value={settings.final_cta_button_link ?? ''}
                onChange={(e) => patch('final_cta_button_link', e.target.value || null)}
                placeholder="/shop"
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gebruik een relatief pad (bv. <code>/shop</code>) — de juiste taal
                wordt automatisch toegevoegd.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t-2 border-black">
        {message ? (
          <div
            className={`text-sm font-bold ${
              message.kind === 'ok' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            Wijzigingen worden pas zichtbaar op de site nadat je op Opslaan drukt.
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider border-2 border-black bg-black text-white px-4 py-2 hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Opslaan
        </button>
      </div>
    </div>
  )
}
