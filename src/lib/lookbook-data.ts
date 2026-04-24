import 'server-only'
import { cache } from 'react'
import { createAnonClient } from '@/lib/supabase/server'
import type {
  ChapterMeta,
  ChapterProduct,
  LookbookChapterWithProducts,
  LookbookLayoutVariant,
} from '@/lib/lookbook'

/**
 * Server-only data access for the public lookbook page.
 *
 * All reads are cached via React's `cache()` so that hitting them from
 * `generateMetadata` and the page body together doesn't double the DB
 * round-trips during the same render pass.
 */

export interface LookbookGlobalSettings {
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

export interface LookbookPageData {
  settings: LookbookGlobalSettings | null
  chapters: LookbookChapterWithProducts[]
}

const safeMeta = (raw: unknown): ChapterMeta[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((m) => {
      if (typeof m !== 'object' || m === null) return null
      const rec = m as Record<string, unknown>
      return {
        label_nl: typeof rec.label_nl === 'string' ? rec.label_nl : '',
        label_en: typeof rec.label_en === 'string' ? rec.label_en : '',
        value_nl: typeof rec.value_nl === 'string' ? rec.value_nl : '',
        value_en: typeof rec.value_en === 'string' ? rec.value_en : '',
      }
    })
    .filter((m): m is ChapterMeta => m !== null)
    .slice(0, 3)
}

export const getLookbookPageData = cache(async (): Promise<LookbookPageData> => {
  const supabase = createAnonClient()

  // 1. Global settings (singleton row)
  const { data: settingsRow } = await supabase
    .from('lookbook_settings')
    .select(
      'id, header_title, header_title_en, header_subtitle, header_subtitle_en, ticker_text_nl, ticker_text_en, final_cta_title, final_cta_title_en, final_cta_text, final_cta_text_en, final_cta_button_text, final_cta_button_text_en, final_cta_button_link',
    )
    .limit(1)
    .maybeSingle()

  // 2. Active chapters
  const { data: chapterRows } = await supabase
    .from('lookbook_chapters')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const chapters: LookbookChapterWithProducts[] = []
  if (chapterRows && chapterRows.length > 0) {
    const chapterIds = chapterRows.map((c) => c.id)

    // 3. All product links for those chapters
    const { data: links } = await supabase
      .from('lookbook_chapter_products')
      .select('chapter_id, product_id, sort_order')
      .in('chapter_id', chapterIds)
      .order('sort_order', { ascending: true })

    const productIds = Array.from(new Set((links ?? []).map((l) => l.product_id)))

    // 4. Product snapshots (with primary image)
    const productsById = new Map<string, ChapterProduct>()
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select(
          `id, slug, name, name_en, base_price, sale_price, status, is_active,
           product_images ( url, is_primary, position )`,
        )
        .in('id', productIds)
        .eq('is_active', true)

      for (const p of products ?? []) {
        const imgs = (p.product_images ?? []).slice().sort(
          (
            a: { is_primary: boolean; position: number },
            b: { is_primary: boolean; position: number },
          ) => {
            if (a.is_primary === b.is_primary) {
              return (a.position ?? 0) - (b.position ?? 0)
            }
            return a.is_primary ? -1 : 1
          },
        )
        productsById.set(p.id, {
          id: p.id,
          slug: p.slug,
          name: p.name,
          name_en: p.name_en,
          base_price: p.base_price,
          sale_price: p.sale_price,
          primary_image_url: imgs[0]?.url ?? null,
          secondary_image_url: imgs[1]?.url ?? null,
          variant_colors: [],
          sort_order: 0,
          is_active: p.is_active,
          status: p.status,
        })
      }
    }

    const linksByChapter = new Map<string, { product_id: string; sort_order: number }[]>()
    for (const l of links ?? []) {
      const arr = linksByChapter.get(l.chapter_id) ?? []
      arr.push({ product_id: l.product_id, sort_order: l.sort_order ?? 0 })
      linksByChapter.set(l.chapter_id, arr)
    }

    for (const row of chapterRows) {
      const chapterLinks = linksByChapter.get(row.id) ?? []
      const products = chapterLinks
        .map((l, idx): ChapterProduct | null => {
          const snap = productsById.get(l.product_id)
          if (!snap) return null
          return { ...snap, sort_order: l.sort_order ?? idx * 10 }
        })
        .filter((p): p is ChapterProduct => p !== null)

      chapters.push({
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
        meta: safeMeta(row.meta),
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        products,
      })
    }
  }

  return {
    settings: (settingsRow as LookbookGlobalSettings | null) ?? null,
    chapters,
  }
})
