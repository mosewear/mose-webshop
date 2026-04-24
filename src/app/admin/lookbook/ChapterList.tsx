'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Save,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type {
  ChapterProduct,
  LookbookChapterWithProducts,
} from '@/lib/lookbook'
import {
  resolveShopModuleVariant,
  shopModuleVariantLabel,
} from '@/lib/lookbook'
import ChapterEditor from './ChapterEditor'

interface CatalogProduct {
  id: string
  slug: string
  name: string
  base_price: number
  primary_image_url: string | null
  status: string
  is_active: boolean
}

interface ChapterListProps {
  initialChapters: LookbookChapterWithProducts[]
  catalog: CatalogProduct[]
  activeLanguage: 'nl' | 'en'
}

/**
 * Manages the entire chapter list on the client.
 *
 *  - Local state is the source of truth while editing; each chapter has
 *    its own `dirty` flag so we only PATCH the chapters that actually
 *    changed when the user hits "Save".
 *  - Ordering (up/down buttons) persists immediately — reordering is a
 *    cheap single-column update and users expect instant feedback.
 *  - Product links are written to lookbook_chapter_products on every
 *    ProductPicker change (delete-then-insert) because the set is tiny
 *    and partial writes would be hard to reconcile visually.
 */
export default function ChapterList({
  initialChapters,
  catalog,
  activeLanguage,
}: ChapterListProps) {
  const supabase = useMemo(() => createClient(), [])

  const [chapters, setChapters] = useState<LookbookChapterWithProducts[]>(initialChapters)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const patchChapter = (id: string, patch: Partial<LookbookChapterWithProducts>) => {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    setDirtyIds((prev) => new Set([...prev, id]))
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reorder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= chapters.length) return
    const next = [...chapters]
    ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
    // Re-number sort_order in increments of 10 so future inserts are cheap
    const renumbered = next.map((c, idx) => ({ ...c, sort_order: (idx + 1) * 10 }))
    setChapters(renumbered)
    setBusy(true)
    try {
      for (const c of renumbered) {
        await supabase.from('lookbook_chapters').update({ sort_order: c.sort_order }).eq('id', c.id)
      }
      setMessage({ kind: 'ok', text: 'Volgorde opgeslagen' })
    } catch (e) {
      setMessage({ kind: 'err', text: 'Kon volgorde niet opslaan' })
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const saveChapter = async (id: string) => {
    const chapter = chapters.find((c) => c.id === id)
    if (!chapter) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('lookbook_chapters')
        .update({
          eyebrow_nl: chapter.eyebrow_nl,
          eyebrow_en: chapter.eyebrow_en,
          title_nl: chapter.title_nl,
          title_en: chapter.title_en,
          caption_nl: chapter.caption_nl,
          caption_en: chapter.caption_en,
          hero_image_url: chapter.hero_image_url,
          image_focal_x: chapter.image_focal_x,
          image_focal_y: chapter.image_focal_y,
          layout_variant: chapter.layout_variant,
          ticker_text_nl: chapter.ticker_text_nl,
          ticker_text_en: chapter.ticker_text_en,
          meta: chapter.meta,
          is_active: chapter.is_active,
        })
        .eq('id', id)
      if (error) throw error
      setDirtyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setMessage({ kind: 'ok', text: 'Chapter opgeslagen' })
    } catch (e) {
      setMessage({ kind: 'err', text: 'Opslaan mislukt' })
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const saveAllDirty = async () => {
    if (dirtyIds.size === 0) return
    setBusy(true)
    try {
      for (const id of dirtyIds) {
        // eslint-disable-next-line no-await-in-loop
        await saveChapter(id)
      }
    } finally {
      setBusy(false)
    }
  }

  const addChapter = async () => {
    const nextOrder = (chapters.length + 1) * 10
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('lookbook_chapters')
        .insert({
          sort_order: nextOrder,
          title_nl: 'Nieuw chapter',
          hero_image_url: '',
          layout_variant: 'wide',
        })
        .select('*')
        .single()
      if (error) throw error
      const newChapter: LookbookChapterWithProducts = {
        ...data,
        products: [],
        meta: [],
      }
      setChapters((prev) => [...prev, newChapter])
      setExpanded((prev) => new Set([...prev, data.id]))
      setMessage({ kind: 'ok', text: 'Chapter toegevoegd' })
    } catch (e) {
      setMessage({ kind: 'err', text: 'Toevoegen mislukt' })
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const deleteChapter = async (id: string) => {
    setBusy(true)
    try {
      const { error } = await supabase.from('lookbook_chapters').delete().eq('id', id)
      if (error) throw error
      setChapters((prev) => prev.filter((c) => c.id !== id))
      setExpanded((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setDirtyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setMessage({ kind: 'ok', text: 'Chapter verwijderd' })
    } catch (e) {
      setMessage({ kind: 'err', text: 'Verwijderen mislukt' })
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const updateProductLinks = async (
    chapterId: string,
    links: { product_id: string; sort_order: number }[],
  ) => {
    setBusy(true)
    try {
      // Delete-then-insert: small sets, simplest reconciliation
      const { error: delError } = await supabase
        .from('lookbook_chapter_products')
        .delete()
        .eq('chapter_id', chapterId)
      if (delError) throw delError

      if (links.length > 0) {
        const { error: insError } = await supabase
          .from('lookbook_chapter_products')
          .insert(
            links.map((l) => ({
              chapter_id: chapterId,
              product_id: l.product_id,
              sort_order: l.sort_order,
            })),
          )
        if (insError) throw insError
      }

      const orderedProducts: ChapterProduct[] = links
        .map((l, idx): ChapterProduct | null => {
          const cat = catalog.find((c) => c.id === l.product_id)
          if (!cat) return null
          return {
            id: cat.id,
            slug: cat.slug,
            name: cat.name,
            name_en: null,
            base_price: cat.base_price,
            sale_price: null,
            primary_image_url: cat.primary_image_url,
            secondary_image_url: null,
            variant_colors: [],
            sort_order: idx * 10,
            is_active: cat.is_active,
            status: cat.status,
          }
        })
        .filter((p): p is ChapterProduct => p !== null)

      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId ? { ...c, products: orderedProducts } : c,
        ),
      )
      setMessage({ kind: 'ok', text: 'Producten bijgewerkt' })
    } catch (e) {
      setMessage({ kind: 'err', text: 'Producten bijwerken mislukt' })
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="text-sm text-gray-600">
          {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
          {dirtyIds.size > 0 && (
            <span className="ml-2 text-orange-600 font-bold">
              · {dirtyIds.size} niet opgeslagen
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirtyIds.size > 0 && (
            <button
              type="button"
              onClick={saveAllDirty}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider border-2 border-black bg-brand-primary text-black px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Alles opslaan ({dirtyIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={addChapter}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider border-2 border-black bg-black text-white px-3 py-2 hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            Nieuw chapter
          </button>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`border-2 border-black p-3 text-sm font-bold ${
            message.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
          onAnimationEnd={() => setMessage(null)}
        >
          {message.text}
        </div>
      )}

      {/* List */}
      {chapters.length === 0 ? (
        <div className="border-2 border-dashed border-black p-12 text-center bg-white">
          <p className="font-bold mb-1">Nog geen chapters</p>
          <p className="text-sm text-gray-600 mb-4">
            Voeg je eerste chapter toe om de lookbook te vullen.
          </p>
          <button
            type="button"
            onClick={addChapter}
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider border-2 border-black bg-black text-white px-4 py-2 hover:bg-white hover:text-black transition-colors"
          >
            <Plus size={14} />
            Eerste chapter toevoegen
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {chapters.map((chapter, index) => {
            const isOpen = expanded.has(chapter.id)
            const isDirty = dirtyIds.has(chapter.id)
            const variant = resolveShopModuleVariant(chapter.products.length)
            const displayTitle =
              activeLanguage === 'nl'
                ? chapter.title_nl
                : chapter.title_en || chapter.title_nl

            return (
              <li
                key={chapter.id}
                className={`border-2 ${
                  isDirty ? 'border-orange-500' : 'border-black'
                } bg-white transition-colors`}
              >
                {/* Summary row */}
                <div className="flex items-stretch">
                  {/* Thumb */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(chapter.id)}
                    className="relative w-20 h-20 md:w-28 md:h-28 bg-gray-100 border-r-2 border-black flex-shrink-0"
                    aria-label={isOpen ? 'Inklappen' : 'Uitklappen'}
                  >
                    {chapter.hero_image_url ? (
                      <Image
                        src={chapter.hero_image_url}
                        alt={displayTitle}
                        fill
                        className="object-cover"
                        style={{
                          objectPosition: `${chapter.image_focal_x}% ${chapter.image_focal_y}%`,
                        }}
                        sizes="(max-width: 768px) 80px, 112px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-400 p-2 text-center">
                        Geen beeld
                      </div>
                    )}
                  </button>

                  {/* Meta */}
                  <div className="flex-1 min-w-0 p-3 md:p-4 flex flex-col justify-center gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500">
                        #{index + 1}
                      </span>
                      {chapter.eyebrow_nl && (
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">
                          {chapter.eyebrow_nl}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                          chapter.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {chapter.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
                        {chapter.is_active ? 'Zichtbaar' : 'Verborgen'}
                      </span>
                    </div>
                    <div className="font-bold text-sm md:text-base truncate">
                      {displayTitle || <em className="text-gray-400">Geen titel</em>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
                        {chapter.layout_variant}
                      </span>
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-1.5 py-0.5">
                        {variant === 'none' ? '0 producten' : shopModuleVariantLabel(variant)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center gap-1 p-2 md:p-3 border-l-2 border-black flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => reorder(index, index - 1)}
                      disabled={index === 0 || busy}
                      className="p-1.5 md:p-2 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Omhoog"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder(index, index + 1)}
                      disabled={index === chapters.length - 1 || busy}
                      className="p-1.5 md:p-2 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Omlaag"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(chapter.id)}
                    className="flex items-center justify-center px-3 md:px-4 border-l-2 border-black hover:bg-black hover:text-white transition-colors flex-shrink-0"
                    aria-label={isOpen ? 'Inklappen' : 'Uitklappen'}
                  >
                    {isOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                </div>

                {/* Editor */}
                {isOpen && (
                  <>
                    <ChapterEditor
                      chapter={chapter}
                      catalog={catalog}
                      activeLanguage={activeLanguage}
                      onChange={(patch) => patchChapter(chapter.id, patch)}
                      onProductsChange={(links) => updateProductLinks(chapter.id, links)}
                      onDelete={() => deleteChapter(chapter.id)}
                    />
                    {isDirty && (
                      <div className="flex items-center justify-end gap-2 p-3 bg-orange-50 border-t-2 border-orange-500">
                        <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
                          Niet-opgeslagen wijzigingen
                        </span>
                        <button
                          type="button"
                          onClick={() => saveChapter(chapter.id)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-black text-white border-2 border-black px-3 py-1 hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Chapter opslaan
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
