'use client'

import Image from 'next/image'
import { useCallback, useRef } from 'react'
import { ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react'
import { Link } from '@/i18n/routing'
import type { ChapterMeta, ChapterProduct } from '@/lib/lookbook'
import { pickLocalized, resolveShopModuleVariant } from '@/lib/lookbook'
import { trackEvent } from '@/lib/analytics'

/**
 * Track a click on a lookbook product so we can later measure which
 * chapter / variant converts best. Fire-and-forget — never blocks
 * navigation.
 */
function useTrackProductClick(variant: 'piece' | 'outfit' | 'look') {
  return useCallback(
    (productId: string, productSlug: string, productName: string) => {
      try {
        void trackEvent({
          event_name: 'lookbook_product_click',
          properties: {
            product_id: productId,
            product_slug: productSlug,
            product_name: productName,
            variant,
          },
        })
      } catch {
        // Analytics failures must never bubble up to the UI.
      }
    },
    [variant],
  )
}

interface ShopModuleProps {
  products: ChapterProduct[]
  locale: 'nl' | 'en'
  /** Meta rows shown in the THE PIECE variant. */
  meta?: ChapterMeta[]
  /** Dark chapter → inverted colour palette for the shop module. */
  inverted?: boolean
}

/**
 * Public shop-module dispatcher.
 *
 *   0 products    → null (chapter renders as pure editorial)
 *   1 product     → THE PIECE      (featured-piece layout)
 *   2-3 products  → THE OUTFIT     (inline row / vertical stack)
 *   4+ products   → SHOP THE LOOK  (horizontal snap-scroll strip)
 */
export default function ShopModule({
  products,
  locale,
  meta = [],
  inverted = false,
}: ShopModuleProps) {
  const variant = resolveShopModuleVariant(products.length)
  if (variant === 'none') return null
  if (variant === 'piece') {
    return <ThePiece product={products[0]} meta={meta} locale={locale} inverted={inverted} />
  }
  if (variant === 'outfit') {
    return <TheOutfit products={products} locale={locale} inverted={inverted} />
  }
  return <ShopTheLook products={products} locale={locale} inverted={inverted} />
}

// ---------------------------------------------------------------------------
// Shared price helper
// ---------------------------------------------------------------------------

function formatPrice(value: number, locale: 'nl' | 'en'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function productName(p: ChapterProduct, locale: 'nl' | 'en'): string {
  return pickLocalized(p.name, p.name_en, locale)
}

// ---------------------------------------------------------------------------
// Variant 1 — THE PIECE
// Featured-piece layout. On desktop, a 4:5 image sits next to a caption
// panel with the editorial meta rows + a prominent CTA. On mobile the
// stack reverses to image-on-top, caption below.
// ---------------------------------------------------------------------------

function ThePiece({
  product,
  meta,
  locale,
  inverted,
}: {
  product: ChapterProduct
  meta: ChapterMeta[]
  locale: 'nl' | 'en'
  inverted: boolean
}) {
  const trackClick = useTrackProductClick('piece')
  const palette = inverted
    ? {
        panel: 'bg-black text-white border-white',
        border: 'border-white',
        button: 'bg-brand-primary text-white hover:bg-white hover:text-black border-white',
        cross: 'text-white/80 hover:text-white',
        divider: 'border-white/20',
        meta: 'text-white/80',
      }
    : {
        panel: 'bg-white text-black border-black',
        border: 'border-black',
        button: 'bg-black text-white hover:bg-brand-primary hover:text-white border-black',
        cross: 'text-gray-700 hover:text-black',
        divider: 'border-gray-200',
        meta: 'text-gray-700',
      }

  const name = productName(product, locale)
  const tLabel = locale === 'en' ? 'THE PIECE' : 'THE PIECE'
  const ctaLabel = locale === 'en' ? 'Shop this piece' : 'Shop dit item'
  const fallbackMeta: ChapterMeta[] =
    meta.length > 0
      ? meta
      : [
          {
            label_nl: 'MATERIAAL',
            label_en: 'MATERIAL',
            value_nl: 'Premium essentials',
            value_en: 'Premium essentials',
          },
          {
            label_nl: 'GEMAAKT IN',
            label_en: 'MADE IN',
            value_nl: 'Groningen, NL',
            value_en: 'Groningen, NL',
          },
        ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-[5fr_4fr] gap-0 border-2 ${palette.border}`}>
      <Link
        href={`/product/${product.slug}`}
        aria-label={name}
        onClick={() => trackClick(product.id, product.slug, name)}
        className="relative block aspect-[4/5] bg-gray-100 group overflow-hidden"
      >
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : null}
      </Link>

      <div className={`flex flex-col justify-center gap-6 p-6 md:p-8 lg:p-10 ${palette.panel}`}>
        <div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60 mb-3">
            {tLabel}
          </p>
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-display uppercase tracking-tight mb-2 leading-none">
            {name}
          </h3>
          <p className="text-lg md:text-xl font-semibold">
            {product.sale_price ? (
              <>
                <span>{formatPrice(product.sale_price, locale)}</span>
                <span className="ml-2 line-through opacity-50 text-base">
                  {formatPrice(product.base_price, locale)}
                </span>
              </>
            ) : (
              <span>{formatPrice(product.base_price, locale)}</span>
            )}
          </p>
        </div>

        {fallbackMeta.length > 0 && (
          <dl className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm ${palette.meta}`}>
            {fallbackMeta.map((m, idx) => {
              const label = pickLocalized(m.label_nl, m.label_en, locale)
              const value = pickLocalized(m.value_nl, m.value_en, locale)
              if (!label || !value) return null
              return (
                <div key={idx} className={`border-t ${palette.divider} pt-2`}>
                  <dt className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              )
            })}
          </dl>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <Link
            href={`/product/${product.slug}`}
            onClick={() => trackClick(product.id, product.slug, name)}
            className={`inline-flex items-center justify-center gap-2 border-2 px-6 py-3 font-bold uppercase tracking-wider text-sm transition-colors ${palette.button}`}
          >
            <ShoppingBag size={16} />
            {ctaLabel}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/shop"
            className={`text-xs font-bold uppercase tracking-widest underline-offset-4 hover:underline ${palette.cross}`}
          >
            {locale === 'en' ? 'Match it with →' : 'Combineer met →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant 2 — THE OUTFIT
// 2-3 product cards in a single inline row on desktop, stacked on mobile.
// Centered when count=2 for visual balance, 3-column grid when count=3.
// ---------------------------------------------------------------------------

function TheOutfit({
  products,
  locale,
  inverted,
}: {
  products: ChapterProduct[]
  locale: 'nl' | 'en'
  inverted: boolean
}) {
  const trackClick = useTrackProductClick('outfit')
  const label = locale === 'en' ? 'THE OUTFIT' : 'THE OUTFIT'
  const cta = locale === 'en' ? 'Add' : 'Bekijk'
  const palette = inverted
    ? {
        label: 'text-white',
        card: 'bg-black border-white text-white',
        btn: 'bg-white text-black hover:bg-brand-primary hover:text-white',
      }
    : {
        label: 'text-black',
        card: 'bg-white border-black text-black',
        btn: 'bg-black text-white hover:bg-brand-primary',
      }

  const gridClass =
    products.length === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'
      : 'grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'

  return (
    <div className="space-y-4 md:space-y-6">
      <p
        className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60 ${palette.label}`}
      >
        {label}
      </p>
      <div className={gridClass}>
        {products.map((p) => {
          const name = productName(p, locale)
          return (
            <article
              key={p.id}
              className={`border-2 ${palette.card} transition-colors group`}
            >
              <Link
                href={`/product/${p.slug}`}
                aria-label={name}
                onClick={() => trackClick(p.id, p.slug, name)}
                className="block"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {p.primary_image_url ? (
                    <Image
                      src={p.primary_image_url}
                      alt={name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
              </Link>
              <div className="p-3 md:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => trackClick(p.id, p.slug, name)}
                    className="block font-bold uppercase tracking-tight truncate hover:underline underline-offset-4"
                  >
                    {name}
                  </Link>
                  <p className="text-sm opacity-80">
                    {p.sale_price ? (
                      <>
                        {formatPrice(p.sale_price, locale)}
                        <span className="ml-1 line-through opacity-50 text-xs">
                          {formatPrice(p.base_price, locale)}
                        </span>
                      </>
                    ) : (
                      formatPrice(p.base_price, locale)
                    )}
                  </p>
                </div>
                <Link
                  href={`/product/${p.slug}`}
                  onClick={() => trackClick(p.id, p.slug, name)}
                  className={`inline-flex items-center gap-1 border-2 border-current px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-colors ${palette.btn}`}
                >
                  + {cta}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant 3 — SHOP THE LOOK
// Horizontal snap-scroll strip for 4+ products. Arrows for desktop mouse
// users, native overflow-scroll for touch. Native `scroll-behavior` +
// `snap` keeps the JS footprint at zero — arrows just call .scrollBy().
// ---------------------------------------------------------------------------

function ShopTheLook({
  products,
  locale,
  inverted,
}: {
  products: ChapterProduct[]
  locale: 'nl' | 'en'
  inverted: boolean
}) {
  const trackClick = useTrackProductClick('look')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const label = locale === 'en' ? 'SHOP THE LOOK' : 'SHOP THE LOOK'

  const palette = inverted
    ? {
        label: 'text-white',
        arrow:
          'border-white text-white bg-black hover:bg-white hover:text-black',
        card: 'border-white text-white bg-black',
      }
    : {
        label: 'text-black',
        arrow: 'border-black text-black bg-white hover:bg-black hover:text-white',
        card: 'border-black text-black bg-white',
      }

  const nudge = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const delta = dir === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <p
          className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60 ${palette.label}`}
        >
          {label} · {products.length}{' '}
          {locale === 'en' ? 'pieces' : 'items'}
        </p>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => nudge('left')}
            className={`p-2 border-2 transition-colors ${palette.arrow}`}
            aria-label={locale === 'en' ? 'Previous' : 'Vorige'}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => nudge('right')}
            className={`p-2 border-2 transition-colors ${palette.arrow}`}
            aria-label={locale === 'en' ? 'Next' : 'Volgende'}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {products.map((p) => {
          const name = productName(p, locale)
          return (
            <Link
              href={`/product/${p.slug}`}
              key={p.id}
              onClick={() => trackClick(p.id, p.slug, name)}
              className={`group snap-start flex-shrink-0 w-[70vw] sm:w-[45vw] md:w-[280px] lg:w-[320px] border-2 ${palette.card} transition-colors`}
            >
              <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                {p.primary_image_url ? (
                  <Image
                    src={p.primary_image_url}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 70vw, 320px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </div>
              <div className="p-3 md:p-4">
                <p className="font-bold uppercase tracking-tight truncate">{name}</p>
                <p className="text-sm opacity-80">
                  {p.sale_price ? (
                    <>
                      {formatPrice(p.sale_price, locale)}
                      <span className="ml-1 line-through opacity-50 text-xs">
                        {formatPrice(p.base_price, locale)}
                      </span>
                    </>
                  ) : (
                    formatPrice(p.base_price, locale)
                  )}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
