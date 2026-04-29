'use client'

/**
 * Lightweight social-proof line rendered ABOVE the product title.
 *
 * Strategy:
 *   * 3+ reviews   -> show stars, average rating + total review count, link
 *                     scrolls to the on-page reviews section.
 *   * 1-2 reviews  -> show stars + total count.
 *   * 0 reviews    -> render a brand-honest fallback line so the spot is
 *                     never empty for new visitors. No fake numbers.
 *
 * Data is fetched client-side with a short-lived cache so the line shows up
 * fast and stays in sync with admin moderation.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface ProductReviewSnippetProps {
  productId: string
}

interface ReviewStats {
  count: number
  average: number | null
}

const cache = new Map<string, { data: ReviewStats; ts: number }>()
const CACHE_TTL_MS = 60_000

async function fetchReviewStats(productId: string): Promise<ReviewStats> {
  const cached = cache.get(productId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true)

  if (error || !data) {
    const fallback: ReviewStats = { count: 0, average: null }
    cache.set(productId, { data: fallback, ts: Date.now() })
    return fallback
  }

  const count = data.length
  const average = count > 0
    ? data.reduce((sum, r) => sum + (r.rating || 0), 0) / count
    : null
  const stats: ReviewStats = { count, average }
  cache.set(productId, { data: stats, ts: Date.now() })
  return stats
}

export default function ProductReviewSnippet({ productId }: ProductReviewSnippetProps) {
  const t = useTranslations('product.reviewSnippet')
  const [stats, setStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    let active = true
    fetchReviewStats(productId).then((s) => {
      if (active) setStats(s)
    })
    return () => {
      active = false
    }
  }, [productId])

  if (!stats) {
    // Reserve space so layout doesn't jump.
    return <div className="h-4 md:h-5" aria-hidden />
  }

  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault()
    const target = document.querySelector<HTMLElement>('[data-pdp-reviews]')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (stats.count >= 3 && stats.average) {
    const rounded = stats.average.toFixed(1)
    return (
      <a
        href="#reviews"
        onClick={handleScroll}
        className="inline-flex items-center gap-2 text-xs md:text-sm text-gray-700 hover:text-brand-primary transition-colors"
      >
        <Stars value={stats.average} />
        <span className="font-bold">{rounded}/5</span>
        <span className="text-gray-500 underline-offset-2 hover:underline">
          {t('reviewCount', { count: stats.count })}
        </span>
      </a>
    )
  }

  if (stats.count >= 1 && stats.average) {
    return (
      <a
        href="#reviews"
        onClick={handleScroll}
        className="inline-flex items-center gap-2 text-xs md:text-sm text-gray-700 hover:text-brand-primary transition-colors"
      >
        <Stars value={stats.average} />
        <span className="text-gray-500 underline-offset-2 hover:underline">
          {t('reviewCount', { count: stats.count })}
        </span>
      </a>
    )
  }

  // Zero-reviews fallback: brand-honest, no fake numbers.
  return (
    <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold uppercase tracking-wider text-gray-700">
      <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-brand-primary" />
      {t('fallback')}
    </span>
  )
}

function Stars({ value }: { value: number }) {
  // Render 5 stars with a yellow fill that mirrors the rounded rating.
  const rounded = Math.round(value)
  return (
    <span aria-hidden className="inline-flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
            s <= rounded ? 'text-yellow-400' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}
