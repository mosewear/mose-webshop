'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Settings as SettingsIcon, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LanguageTabs from '@/components/admin/LanguageTabs'
import type {
  ChapterMeta,
  ChapterProduct,
  LookbookChapterWithProducts,
  LookbookLayoutVariant,
} from '@/lib/lookbook'
import ChapterList from './ChapterList'
import GlobalSettings, { type GlobalLookbookSettings } from './GlobalSettings'

interface CatalogProduct {
  id: string
  slug: string
  name: string
  base_price: number
  primary_image_url: string | null
  status: string
  is_active: boolean
}

type Tab = 'chapters' | 'global'

/**
 * MOSE Lookbook Admin — brand-new editor for the re-designed editorial
 * lookbook page.
 *
 * Structure
 *  - Tab 1 "Chapters": full CRUD over `lookbook_chapters` + reorder +
 *    product linking. This is where 99% of editorial work happens.
 *  - Tab 2 "Globale instellingen": header copy, default marquee ticker,
 *    final CTA panel — everything that sits outside of a chapter.
 *
 * The public page reads the same tables with ISR so edits appear after
 * the next revalidation window (or immediately via the manual revalidate
 * button). Admin RLS is enforced by the layout's requireAdmin guard and
 * the Supabase policies created in 20260425120000_lookbook_chapters.sql.
 */
export default function LookbookAdminPage() {
  const [tab, setTab] = useState<Tab>('chapters')
  const [activeLanguage, setActiveLanguage] = useState<'nl' | 'en'>('nl')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chapters, setChapters] = useState<LookbookChapterWithProducts[]>([])
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [settings, setSettings] = useState<GlobalLookbookSettings | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      try {
        // 1. Global settings row (singleton)
        const { data: ls, error: lsError } = await supabase
          .from('lookbook_settings')
          .select(
            'id, header_title, header_title_en, header_subtitle, header_subtitle_en, ticker_text_nl, ticker_text_en, final_cta_title, final_cta_title_en, final_cta_text, final_cta_text_en, final_cta_button_text, final_cta_button_text_en, final_cta_button_link',
          )
          .single()
        if (lsError) throw lsError

        // 2. Chapters with product links
        const { data: rawChapters, error: chErr } = await supabase
          .from('lookbook_chapters')
          .select('*')
          .order('sort_order', { ascending: true })
        if (chErr) throw chErr

        const { data: links, error: linkErr } = await supabase
          .from('lookbook_chapter_products')
          .select('chapter_id, product_id, sort_order')
          .order('sort_order', { ascending: true })
        if (linkErr) throw linkErr

        // 3. Catalog (active products) + primary image in one shot
        const { data: products, error: pErr } = await supabase
          .from('products')
          .select(
            `id, slug, name, base_price, status, is_active,
             product_images ( url, is_primary, position )`,
          )
          .eq('is_active', true)
          .order('name')
        if (pErr) throw pErr

        const catalogProducts: CatalogProduct[] = (products ?? []).map((p) => {
          const imgs = (p.product_images ?? []).slice().sort((a: { is_primary: boolean; position: number }, b: { is_primary: boolean; position: number }) => {
            if (a.is_primary === b.is_primary) {
              return (a.position ?? 0) - (b.position ?? 0)
            }
            return a.is_primary ? -1 : 1
          })
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            base_price: p.base_price,
            status: p.status,
            is_active: p.is_active,
            primary_image_url: imgs[0]?.url ?? null,
          }
        })

        // Build chapter+products tree
        const catalogById = new Map(catalogProducts.map((p) => [p.id, p]))
        const linksByChapter = new Map<string, typeof links>()
        for (const l of links ?? []) {
          const list = linksByChapter.get(l.chapter_id) ?? []
          list.push(l)
          linksByChapter.set(l.chapter_id, list)
        }

        const mergedChapters: LookbookChapterWithProducts[] = (rawChapters ?? []).map(
          (row) => {
            const myLinks = linksByChapter.get(row.id) ?? []
            const products: ChapterProduct[] = myLinks
              .map((l, idx): ChapterProduct | null => {
                const cat = catalogById.get(l.product_id)
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
                  sort_order: l.sort_order ?? idx * 10,
                  is_active: cat.is_active,
                  status: cat.status,
                }
              })
              .filter((p): p is ChapterProduct => p !== null)

            // Parse meta (stored as JSONB)
            let meta: ChapterMeta[] = []
            if (Array.isArray(row.meta)) {
              meta = row.meta
                .map((m: Record<string, unknown>) => ({
                  label_nl: typeof m.label_nl === 'string' ? m.label_nl : '',
                  label_en: typeof m.label_en === 'string' ? m.label_en : '',
                  value_nl: typeof m.value_nl === 'string' ? m.value_nl : '',
                  value_en: typeof m.value_en === 'string' ? m.value_en : '',
                }))
                .slice(0, 3)
            }

            return {
              id: row.id,
              sort_order: row.sort_order,
              eyebrow_nl: row.eyebrow_nl,
              eyebrow_en: row.eyebrow_en,
              title_nl: row.title_nl,
              title_en: row.title_en,
              caption_nl: row.caption_nl,
              caption_en: row.caption_en,
              hero_image_url: row.hero_image_url,
              image_focal_x: row.image_focal_x,
              image_focal_y: row.image_focal_y,
              layout_variant: row.layout_variant as LookbookLayoutVariant,
              ticker_text_nl: row.ticker_text_nl,
              ticker_text_en: row.ticker_text_en,
              meta,
              is_active: row.is_active,
              created_at: row.created_at,
              updated_at: row.updated_at,
              products,
            }
          },
        )

        setSettings(ls as GlobalLookbookSettings)
        setCatalog(catalogProducts)
        setChapters(mergedChapters)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="border-2 border-red-500 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-bold">Kon de lookbook-data niet laden.</p>
        <p>{error ?? 'Lookbook settings row ontbreekt.'}</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'chapters', label: 'Chapters', icon: BookOpen },
    { id: 'global', label: 'Globale instellingen', icon: SettingsIcon },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Lookbook
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Editorial chapters, ticker en slot-CTA voor de lookbook-pagina.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/lookbook"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider border-2 border-black bg-white px-3 py-2 hover:bg-black hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Bekijk pagina</span>
            <span className="sm:hidden">Preview</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-black">
        <div className="flex border-b-2 border-black overflow-x-auto scrollbar-hide">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 md:py-4 font-bold uppercase tracking-wider text-xs md:text-sm whitespace-nowrap transition-colors ${
                  active ? 'bg-black text-white' : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-6">
          <LanguageTabs activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />

          {tab === 'chapters' ? (
            <ChapterList
              initialChapters={chapters}
              catalog={catalog}
              activeLanguage={activeLanguage}
            />
          ) : (
            <GlobalSettings initial={settings} activeLanguage={activeLanguage} />
          )}
        </div>
      </div>
    </div>
  )
}
