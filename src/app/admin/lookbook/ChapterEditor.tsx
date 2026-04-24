'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import MediaPicker from '@/components/admin/MediaPicker'
import type {
  ChapterMeta,
  ChapterProduct,
  LookbookChapterWithProducts,
  LookbookLayoutVariant,
} from '@/lib/lookbook'
import { LAYOUT_VARIANT_OPTIONS } from '@/lib/lookbook'
import FocalPointPicker from './FocalPointPicker'
import ProductPicker from './ProductPicker'

interface CatalogProduct {
  id: string
  slug: string
  name: string
  base_price: number
  primary_image_url: string | null
  status: string
  is_active: boolean
}

interface ChapterEditorProps {
  chapter: LookbookChapterWithProducts
  catalog: CatalogProduct[]
  onChange: (patch: Partial<LookbookChapterWithProducts>) => void
  onProductsChange: (links: { product_id: string; sort_order: number }[]) => void
  onDelete: () => void
  activeLanguage: 'nl' | 'en'
}

/**
 * Inline editor for a single lookbook chapter. Mounted beneath the
 * chapter's summary row in ChapterList when expanded.
 *
 * Design choices
 *  - Field layout mirrors the public reading order: eyebrow → title →
 *    caption → image → layout → meta → products → ticker → visibility.
 *    When an admin scrolls the form, it follows the visitor experience.
 *  - NL/EN are controlled by the global LanguageTabs toggle at the page
 *    level (activeLanguage prop). Admin never sees NL and EN stacked in
 *    the same column; it's always one language at a time to avoid
 *    cognitive overload.
 *  - All writes go through `onChange` which patches the parent's chapter
 *    state. Debounced persistence and the save button live in the
 *    parent so an entire chapter commits atomically.
 */
export default function ChapterEditor({
  chapter,
  catalog,
  onChange,
  onProductsChange,
  onDelete,
  activeLanguage,
}: ChapterEditorProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const title = activeLanguage === 'nl' ? chapter.title_nl : chapter.title_en ?? ''
  const caption =
    activeLanguage === 'nl' ? chapter.caption_nl ?? '' : chapter.caption_en ?? ''
  const eyebrow =
    activeLanguage === 'nl' ? chapter.eyebrow_nl ?? '' : chapter.eyebrow_en ?? ''
  const ticker =
    activeLanguage === 'nl'
      ? chapter.ticker_text_nl ?? ''
      : chapter.ticker_text_en ?? ''

  const setLocalized = (field: 'title' | 'caption' | 'eyebrow' | 'ticker_text', value: string) => {
    const key = activeLanguage === 'nl' ? `${field}_nl` : `${field}_en`
    onChange({ [key]: value || null } as Partial<LookbookChapterWithProducts>)
  }

  const addMetaRow = () => {
    if (chapter.meta.length >= 3) return
    const next: ChapterMeta[] = [
      ...chapter.meta,
      { label_nl: '', label_en: '', value_nl: '', value_en: '' },
    ]
    onChange({ meta: next })
  }

  const updateMetaRow = (index: number, patch: Partial<ChapterMeta>) => {
    const next = chapter.meta.map((m, i) => (i === index ? { ...m, ...patch } : m))
    onChange({ meta: next })
  }

  const removeMetaRow = (index: number) => {
    onChange({ meta: chapter.meta.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6 p-4 md:p-6 border-t-2 border-black bg-gray-50">
      {/* EYEBROW + TITLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
            Eyebrow {activeLanguage === 'en' ? '(EN)' : '(NL)'}
          </label>
          <input
            type="text"
            value={eyebrow}
            onChange={(e) => setLocalized('eyebrow', e.target.value)}
            placeholder={
              activeLanguage === 'nl'
                ? 'bv. CHAPTER 01 · AUTUMN'
                : 'e.g. CHAPTER 01 · AUTUMN'
            }
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">
            Kleine tekst boven de titel. Leeg = geen eyebrow.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
            Titel {activeLanguage === 'en' ? '(EN — optioneel)' : '(NL — verplicht)'}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              const key = activeLanguage === 'nl' ? 'title_nl' : 'title_en'
              onChange({ [key]: activeLanguage === 'nl' ? e.target.value : e.target.value || null } as Partial<LookbookChapterWithProducts>)
            }}
            placeholder={activeLanguage === 'nl' ? 'URBAN ESSENTIALS' : 'URBAN ESSENTIALS'}
            className="w-full px-3 py-2 text-lg font-bold border-2 border-gray-300 focus:border-black focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* CAPTION */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
          Caption {activeLanguage === 'en' ? '(EN — optioneel)' : '(NL)'}
        </label>
        <textarea
          value={caption}
          onChange={(e) => setLocalized('caption', e.target.value)}
          rows={3}
          placeholder={
            activeLanguage === 'nl'
              ? 'Verhaal-tekst die naast/onder het beeld staat…'
              : 'Story text shown next to/below the image…'
          }
          className="w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none resize-y"
        />
      </div>

      {/* IMAGE + FOCAL POINT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider">
            Hero afbeelding
          </label>
          <MediaPicker
            mode="single"
            currentImageUrl={chapter.hero_image_url}
            onImageSelected={(url) => onChange({ hero_image_url: url })}
            accept="images"
            folder="lookbook/chapters"
            bucket="images"
            buttonText="Selecteer afbeelding"
          />
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
              Layout
            </label>
            <select
              value={chapter.layout_variant}
              onChange={(e) =>
                onChange({
                  layout_variant: e.target.value as LookbookLayoutVariant,
                })
              }
              className="w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none bg-white"
            >
              {LAYOUT_VARIANT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelNl}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {
                LAYOUT_VARIANT_OPTIONS.find(
                  (o) => o.value === chapter.layout_variant,
                )?.descriptionNl
              }
            </p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
            Focuspunt
          </label>
          <FocalPointPicker
            imageUrl={chapter.hero_image_url}
            focalX={chapter.image_focal_x}
            focalY={chapter.image_focal_y}
            onChange={(x, y) =>
              onChange({ image_focal_x: x, image_focal_y: y })
            }
          />
        </div>
      </div>

      {/* META ROWS (THE PIECE only) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider">
              Editorial meta
            </label>
            <p className="text-xs text-gray-500">
              Getoond bij THE PIECE (1 product). Max 3 regels. Leeg = niet tonen.
            </p>
          </div>
          <button
            type="button"
            onClick={addMetaRow}
            disabled={chapter.meta.length >= 3}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider border-2 border-black px-2 py-1 hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={12} />
            Regel
          </button>
        </div>
        {chapter.meta.length === 0 ? (
          <div className="text-xs text-gray-500 border-2 border-dashed border-gray-300 p-3">
            Nog geen meta. Bijvoorbeeld: <code>MATERIAL</code> →{' '}
            <code>100% biologisch katoen</code>
          </div>
        ) : (
          <ul className="space-y-2">
            {chapter.meta.map((row, index) => (
              <li
                key={index}
                className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 p-2 bg-white border-2 border-black"
              >
                <input
                  type="text"
                  value={activeLanguage === 'nl' ? row.label_nl : row.label_en}
                  onChange={(e) =>
                    updateMetaRow(index, {
                      [activeLanguage === 'nl' ? 'label_nl' : 'label_en']:
                        e.target.value,
                    })
                  }
                  placeholder={activeLanguage === 'nl' ? 'MATERIAAL' : 'MATERIAL'}
                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider border border-gray-300 focus:border-black focus:outline-none"
                />
                <input
                  type="text"
                  value={activeLanguage === 'nl' ? row.value_nl : row.value_en}
                  onChange={(e) =>
                    updateMetaRow(index, {
                      [activeLanguage === 'nl' ? 'value_nl' : 'value_en']:
                        e.target.value,
                    })
                  }
                  placeholder={
                    activeLanguage === 'nl'
                      ? '100% biologisch katoen'
                      : '100% organic cotton'
                  }
                  className="px-2 py-1 text-sm border border-gray-300 focus:border-black focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeMetaRow(index)}
                  className="p-1 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors justify-self-end"
                  aria-label="Verwijderen"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PRODUCTS */}
      <div>
        <label className="block text-xs font-bold mb-2 uppercase tracking-wider">
          Producten in dit chapter
        </label>
        <ProductPicker
          selected={chapter.products}
          catalog={catalog}
          onChange={onProductsChange}
        />
      </div>

      {/* PRINCIPLES-STRIP OVERRIDE */}
      <div>
        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider">
          Tussentekst {activeLanguage === 'en' ? '(EN — optioneel)' : '(NL — optioneel)'}
        </label>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setLocalized('ticker_text', e.target.value)}
          placeholder="Leeg = de globale tussentekst gebruiken"
          className="w-full px-3 py-2 text-sm border-2 border-gray-300 focus:border-black focus:outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Statische strip onder dit chapter met MOSE-principes. Gebruik <code>•</code> als scheidingsteken tussen items.
        </p>
      </div>

      {/* DELETE */}
      <div className="flex items-center justify-between pt-4 border-t-2 border-black">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={chapter.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="w-4 h-4 accent-black"
          />
          Chapter zichtbaar op de publieke lookbook
        </label>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Zeker weten?
            </span>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-bold uppercase tracking-wider bg-red-500 text-white border-2 border-red-500 px-3 py-1 hover:bg-red-600 transition-colors"
            >
              Ja, verwijder
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-xs font-bold uppercase tracking-wider border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
            >
              Annuleer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider border-2 border-red-500 text-red-500 px-3 py-1 hover:bg-red-500 hover:text-white transition-colors"
          >
            <Trash2 size={12} />
            Chapter verwijderen
          </button>
        )}
      </div>
    </div>
  )
}
