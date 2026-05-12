'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  ensurePdpLightboxXlLoaded,
  hasPdpLightboxXlVariant,
  toLightboxXlUrl,
} from '@/lib/pdp-lightbox-image'

/**
 * Minimal item shape — losgekoppeld van het ProductImage type uit
 * ProductPageClient zodat de lightbox in principe ook elders inzetbaar
 * blijft. Alleen de echt relevante velden voor een fullscreen weergave.
 */
export interface PdpImageLightboxItem {
  id: string
  url: string
  alt_text?: string
}

export { prefetchPdpLightboxXl } from '@/lib/pdp-lightbox-image'

interface PdpImageLightboxProps {
  items: PdpImageLightboxItem[]
  /** Index waarmee de lightbox geopend wordt. Wordt ook als initiële
   *  scroll-positie van de horizontale strip gebruikt. */
  initialIndex: number
  /** Productnaam als alt-fallback. */
  productName: string
  /** Roept de parent op om de lightbox te sluiten. */
  onClose: () => void
  /** Optioneel: parent kan zo zijn eigen `selectedImage` mee-syncen
   *  zodat de hero-viewer dezelfde foto toont na het sluiten. */
  onIndexChange?: (index: number) => void
}

/**
 * Fullscreen strip: native `<img>` direct vanaf Supabase CDN (geen
 * `next/image` / `/_next/image`), plus progressive XL voor photoshoot-assets.
 */
function LightboxSlideImage({
  item,
  productName,
  slideIdx,
  activeIndex,
  initialIndex,
}: {
  item: PdpImageLightboxItem
  productName: string
  slideIdx: number
  activeIndex: number
  initialIndex: number
}) {
  const alt = item.alt_text || productName
  const desktop = item.url || '/placeholder-product.svg'
  const xl = toLightboxXlUrl(desktop)
  const useXl = hasPdpLightboxXlVariant(desktop)

  const inPrefetchWindow =
    Math.abs(slideIdx - activeIndex) <= 1 || slideIdx === initialIndex

  const [xlReady, setXlReady] = useState(false)

  useEffect(() => {
    if (!useXl) return
    if (!inPrefetchWindow) {
      setXlReady(false)
      return
    }
    let cancelled = false
    ensurePdpLightboxXlLoaded(desktop)
      .then(() => {
        if (!cancelled) setXlReady(true)
      })
      .catch(() => {
        /* XL ontbreekt of netwerk: desktop blijft */
      })
    return () => {
      cancelled = true
    }
  }, [useXl, inPrefetchWindow, desktop])

  const eager = slideIdx === initialIndex

  return (
    <div className="relative h-full w-full bg-black">
      <img
        src={desktop}
        alt={alt}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'low'}
        draggable={false}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain object-center select-none"
      />
      {useXl && inPrefetchWindow && xlReady && (
        <img
          src={xl}
          alt=""
          aria-hidden
          decoding="async"
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain object-center select-none"
        />
      )}
    </div>
  )
}

export default function PdpImageLightbox({
  items,
  initialIndex,
  productName,
  onClose,
  onIndexChange,
}: PdpImageLightboxProps) {
  const t = useTranslations('product.gallery')

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(items.length - 1, initialIndex)),
  )

  const isProgrammaticScroll = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    isProgrammaticScroll.current = true
    scroller.scrollTo({
      left: initialIndex * scroller.clientWidth,
      behavior: 'auto',
    })
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = useCallback(
    (idx: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      isProgrammaticScroll.current = true
      scroller.scrollTo({
        left: clamped * scroller.clientWidth,
        behavior: 'smooth',
      })
      setActiveIndex(clamped)
      onIndexChange?.(clamped)
      window.setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 500)
    },
    [items.length, onIndexChange],
  )

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, goNext])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const scroller = scrollerRef.current
      if (!scroller || scroller.clientWidth === 0) return
      const idx = Math.round(scroller.scrollLeft / scroller.clientWidth)
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      setActiveIndex((prev) => {
        if (prev === clamped) return prev
        onIndexChange?.(clamped)
        return clamped
      })
    })
  }, [items.length, onIndexChange])

  useEffect(() => {
    const onResize = () => {
      const scroller = scrollerRef.current
      if (!scroller) return
      isProgrammaticScroll.current = true
      scroller.scrollTo({
        left: activeIndex * scroller.clientWidth,
        behavior: 'auto',
      })
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeIndex])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const total = items.length
  const isFirst = activeIndex === 0
  const isLast = activeIndex === total - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fadeIn"
    >
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 pointer-events-none">
        {total > 1 ? (
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-white bg-black/50 border border-white/30 px-2.5 py-1 leading-none">
            {activeIndex + 1} / {total}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 text-white hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.25} />
        </button>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-contain scrollbar-hide touch-pan-x"
      >
        {items.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="relative flex-shrink-0 w-full h-full snap-center snap-always"
          >
            <LightboxSlideImage
              item={item}
              productName={productName}
              slideIdx={idx}
              activeIndex={activeIndex}
              initialIndex={initialIndex}
            />
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            aria-label={t('prev')}
            className="hidden md:inline-flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/85 text-white border-2 border-white/40 hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="w-7 h-7" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            aria-label={t('next')}
            className="hidden md:inline-flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/85 text-white border-2 border-white/40 hover:border-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="w-7 h-7" strokeWidth={2.25} />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
          {items.map((_, idx) => {
            const isActive = idx === activeIndex
            return (
              <button
                key={idx}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={t('openPhoto', { index: idx + 1, total })}
                aria-current={isActive ? 'true' : undefined}
                className="p-1.5 -m-1.5 focus-visible:outline-none"
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive ? 'bg-white w-6 h-1.5' : 'bg-white/40 w-1.5 h-1.5'
                  }`}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
