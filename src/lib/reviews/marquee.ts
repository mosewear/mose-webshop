import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/server'

/**
 * Cache-tag voor de homepage reviews-marquee. We invalidaten deze tag
 * automatisch wanneer een review goedgekeurd of verwijderd wordt vanuit
 * de admin (zie src/app/api/admin/reviews/route.ts) zodat nieuwe reviews
 * binnen seconden in de marquee verschijnen — zonder dat we de hele
 * homepage hoeven te revalidaten.
 */
export const REVIEWS_MARQUEE_TAG = 'reviews-marquee'

/** Hoeveel reviews maximaal in de marquee. 12 is genoeg voor een
 *  naadloze loop én klein genoeg om de payload <2kB te houden. */
const MARQUEE_LIMIT = 12

/** Minimum aantal goedgekeurde reviews voor de marquee zichtbaar wordt.
 *  <3 voelt schraal/leeg en oogt eerder als bug dan feature, dus we
 *  verbergen het hele blok in dat geval (dan toont de homepage niets
 *  i.p.v. een halflege strip). */
export const MARQUEE_MIN_REVIEWS = 3

/** Hoogste rating-grens — we tonen exclusief 5★ reviews op de homepage.
 *  Dat is een bewuste keuze: dit is hét social-proof oppervlak voor
 *  bezoekers die nog niets weten over MOSE; we leiden niet met
 *  middelmatige reviews. Lagere reviews blijven gewoon zichtbaar op de
 *  PDP zelf. */
const RATING_THRESHOLD = 5

export interface MarqueeReview {
  id: string
  rating: number
  /** Korte preview-tekst; afgeleid van comment (preferred) of title. */
  text: string
  reviewerName: string
  isVerifiedPurchase: boolean
  productSlug: string
  productName: string
  createdAt: string
}

interface RawReviewRow {
  id: string
  rating: number
  title: string | null
  comment: string | null
  reviewer_name: string
  is_verified_purchase: boolean | null
  created_at: string
  product_id: string
  products: { slug: string; name: string } | { slug: string; name: string }[] | null
}

/** Maximum lengte van de zichtbare review-tekst in de marquee. Boven
 *  deze limit slicen we netjes op woord-grens met een ellipsis. Te lang
 *  = marquee scrollt te traag voorbij; te kort = inhoudsloos. */
const MAX_TEXT_LEN = 70

function condenseText(input: string): string {
  // Eerst whitespace + line-breaks platslaan zodat de marquee 1 regel
  // hoog blijft (multiline reviews zouden anders de tape-strip breken).
  const flat = input.replace(/\s+/g, ' ').trim()
  if (flat.length <= MAX_TEXT_LEN) return flat
  const sliced = flat.slice(0, MAX_TEXT_LEN)
  const lastSpace = sliced.lastIndexOf(' ')
  // Als er geen sane break-point is (één lang woord) → harde knip + …
  const safe = lastSpace > MAX_TEXT_LEN * 0.6 ? sliced.slice(0, lastSpace) : sliced
  return `${safe}…`
}

/** Normaliseert reviewer-naam naar "Voornaam L." voor privacy + visuele
 *  consistentie in de strip. Vervangt lege strings door een neutrale
 *  fallback zodat we nooit een lege auteur hebben. */
function formatReviewerName(raw: string): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return 'KLANT'
  const parts = trimmed.split(/\s+/)
  const first = parts[0]
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : ''
  return [first, lastInitial].filter(Boolean).join(' ')
}

async function fetchHomeReviewsFromDb(): Promise<MarqueeReview[]> {
  const supabase = createAnonClient()

  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(
        // We pakken óók title naast comment zodat we ergens een fallback
        // hebben wanneer iemand wel een titel maar geen body schreef.
        'id, rating, title, comment, reviewer_name, is_verified_purchase, created_at, product_id, products!inner(slug, name)'
      )
      .eq('is_approved', true)
      .gte('rating', RATING_THRESHOLD)
      .order('created_at', { ascending: false })
      .limit(MARQUEE_LIMIT)

    if (error) {
      console.error('[reviews-marquee] query error:', error)
      return []
    }

    const rows = (data ?? []) as unknown as RawReviewRow[]

    const items: MarqueeReview[] = []
    for (const row of rows) {
      // Supabase joint kan products als object óf array (afhankelijk
      // van schema-inferentie) teruggeven; normaliseer naar object.
      const product = Array.isArray(row.products) ? row.products[0] : row.products
      if (!product?.slug || !product?.name) continue

      const rawText = (row.comment?.trim() || row.title?.trim() || '').toString()
      // Alleen reviews met ínhoud zijn waardevol als social proof; een
      // ster zonder tekst zegt niks. Skip de leegtoners.
      if (!rawText) continue

      items.push({
        id: row.id,
        rating: row.rating,
        text: condenseText(rawText),
        reviewerName: formatReviewerName(row.reviewer_name),
        isVerifiedPurchase: Boolean(row.is_verified_purchase),
        productSlug: product.slug,
        productName: product.name,
        createdAt: row.created_at,
      })
    }

    return items
  } catch (err) {
    console.error('[reviews-marquee] unexpected error:', err)
    return []
  }
}

/**
 * Public, ISR-vriendelijke fetch voor de homepage reviews-marquee.
 * - Cache-key: vast (geen per-locale variatie — reviews staan in hun
 *   originele taal, alleen de eyebrow/labels zijn i18n).
 * - Revalidate: 5 minuten.
 * - Tag: REVIEWS_MARQUEE_TAG → admin can-trigger via revalidateTag().
 */
export const getHomeReviewsMarquee = unstable_cache(
  fetchHomeReviewsFromDb,
  ['reviews-marquee:home'],
  { revalidate: 300, tags: [REVIEWS_MARQUEE_TAG] }
)
