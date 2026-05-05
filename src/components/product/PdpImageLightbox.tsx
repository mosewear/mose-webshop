'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

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
 * MOSE PDP fullscreen image lightbox met **echte** swipe-navigatie.
 *
 * Waarom deze component bestaat:
 *  De oude inline-lightbox toonde alleen de huidige foto en bood enkel
 *  klikbare dots als navigatie. Op mobiel betekende dat: lightbox open
 *  tikken = vast komen te zitten op die ene foto. Onacceptabel voor een
 *  PDP waar een variant zomaar 9 foto's kan hebben.
 *
 * UX:
 *  - Mobiel: horizontale `scroll-snap` strip met álle foto's. Swipen
 *    voelt native aan en triggert automatisch de index-update via
 *    `onScroll`. Pinch-zoom van de browser blijft per-foto werken.
 *  - Desktop: prev/next buttons + ←/→ keyboard arrows. Swipe blijft
 *    werken voor trackpad/touchscreen-laptops omdat we de scroll-snap
 *    container ook daar gebruiken.
 *  - Esc sluit. Body-scroll-lock zolang de modal openstaat.
 *  - Klik op de close-knop sluit; klik op de foto zelf doet niets
 *    (anders sluit men per ongeluk tijdens het swipen).
 */
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

  // Tijdens een programmatische scrollTo (initial mount, dot-click,
  // arrow-key, resize) willen we de scroll-listener tijdelijk negeren.
  // Anders kan een race tussen "zet active naar X" en "scroll-event nog
  // op oude positie Y" een korte flits naar de oude index veroorzaken.
  const isProgrammaticScroll = useRef(false)
  const rafRef = useRef<number | null>(null)

  // Body-scroll-lock — restore on unmount.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Initiële scroll-positie zetten ná de eerste paint zodat
  // `clientWidth` correct is. `auto` (instant) zodat de gebruiker geen
  // smooth-animatie ziet bij het openen.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    isProgrammaticScroll.current = true
    scroller.scrollTo({
      left: initialIndex * scroller.clientWidth,
      behavior: 'auto',
    })
    // Eén RAF is genoeg; de scroll-jump is synchronously toegepast.
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false
    })
    // We willen dit alleen één keer doen bij mount. Index-changes daarna
    // komen via gebruiker-acties (swipe / arrow / dot).
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
      // Smooth scroll kan 200-400ms duren; pas daarna mogen scroll-
      // events de index weer updaten. 500ms is ruim genoeg en blokkeert
      // verder geen user interaction omdat we tussentijds nog wel
      // andere goTo's accepteren.
      window.setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 500)
    },
    [items.length, onIndexChange],
  )

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  // Keyboard: Esc sluit, ←/→ navigeert.
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

  // Sync active-index op user-driven scroll (swipe). Throttled met
  // requestAnimationFrame zodat we niet bij elk scroll-tick een
  // setState doen.
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

  // Bij viewport-resize / device-rotatie moet de scroll-positie mee
  // bewegen; anders staat de actieve slide ineens half buiten beeld.
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

  // Cleanup van pending RAF bij unmount.
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
      {/* Header: counter + close. Absolute zodat de scroll-strip de
          volledige hoogte krijgt; pointer-events alleen op de knop zelf
          zodat het swipen niet hapert wanneer een vinger de header
          raakt. */}
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

      {/* Horizontale scroll-snap strip. Alle foto's leven hier in,
          mobiel-swipe is gewoon native scrollen. `touch-pan-x` houdt
          verticale gestures (close gestures, refresh) buiten de strip
          zodat alleen horizontaal swipen telt. */}
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
            <Image
              src={item.url || '/placeholder-product.svg'}
              alt={item.alt_text || productName}
              fill
              sizes="100vw"
              className="object-contain object-center select-none"
              draggable={false}
              priority={idx === initialIndex}
            />
          </div>
        ))}
      </div>

      {/* Prev/Next — desktop only. Op mobiel is swipen het primaire
          gebaar; arrows zouden daar alleen maar boven de foto in de weg
          zitten. */}
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

      {/* Dot indicators — werkend tikbaar (was voorheen alleen visueel). */}
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
