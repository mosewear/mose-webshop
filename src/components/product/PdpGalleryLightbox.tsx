'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { X, Play } from 'lucide-react'

/**
 * Gedeelde shape voor lightbox-items. We accepteren bewust een minimal
 * structuur (los van het ProductImage-type uit ProductPageClient) zodat
 * deze lightbox volledig herbruikbaar blijft buiten de PDP. De PDP mapt
 * zelf de relevante velden in.
 */
export interface PdpGalleryLightboxItem {
  id: string
  url: string
  alt_text?: string
  media_type: 'image' | 'video'
  /** Voor videos: poster om in de tegel te tonen. Wanneer afwezig
   *  faalt de Image-render gracefully terug op een neutrale tegel met
   *  alleen het play-icoon. */
  video_thumbnail_url?: string | null
}

interface PdpGalleryLightboxProps {
  items: PdpGalleryLightboxItem[]
  /** Welke index momenteel "active" is in de hero-viewer. Wordt subtiel
   *  gehighlight in de lightbox-grid (witte border ipv grijze) zodat de
   *  user weet welke ze net bekeken. */
  selectedIndex: number
  /** Productnaam voor accessibility-fallback in alt-text. */
  productName: string
  /** Wordt gecalled wanneer een tegel wordt aangeklikt. De parent is
   *  verantwoordelijk voor het bijwerken van de hero-viewer en het
   *  sluiten van de lightbox. */
  onSelect: (index: number) => void
  onClose: () => void
}

/**
 * MOSE brutalist fullscreen gallery lightbox. Toont alle product-media
 * in een verticaal-scrollbaar grid (1 kolom mobiel → 2 tablet → 3 desk-
 * top). Doel: oneindig schaalbare "VIEW ALL" zonder dat de PDP zelf
 * meerdere rijen thumbnails hoeft te tonen.
 *
 * UX:
 *  - Klik op een tegel  → onSelect(idx) + onClose() (parent navigeert)
 *  - Esc-toets          → onClose()
 *  - Klik op overlay-bg → onClose()
 *  - Body-scroll lock zolang open
 *  - Focus-trap light: focus naar close-knop on open, restore on close
 */
export default function PdpGalleryLightbox({
  items,
  selectedIndex,
  productName,
  onSelect,
  onClose,
}: PdpGalleryLightboxProps) {
  const t = useTranslations('product.gallery')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Body-scroll-lock + Esc-handler + focus restoration. Eén effect
  // omdat alle lifecycle-zaken samenhangen met "is de modal open".
  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Geef close-knop initial focus zodat keyboard-users meteen Esc
    // kunnen gebruiken én de tab-volgorde logisch start. requestAnima-
    // tionFrame wacht netjes tot het element in de DOM staat.
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      previousActive?.focus({ preventScroll: true })
    }
  }, [onClose])

  const handleSelect = (idx: number) => {
    onSelect(idx)
    onClose()
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      // Klik op de buitenste container sluit. We pakken alleen klikken
      // die exact op deze layer landen (e.target === e.currentTarget),
      // anders zou klikken op een tegel óók als sluit-event tellen.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col animate-fadeIn"
    >
      {/* Header: counter + close. Sticky zodat 'ie zichtbaar blijft
          tijdens het scrollen door (potentieel) lange grids. */}
      <header className="sticky top-0 z-10 bg-black border-b-2 border-white/90 flex items-center justify-between gap-4 px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-baseline gap-3 md:gap-4 text-white">
          <span className="font-display text-xl md:text-2xl uppercase tracking-tight leading-none">
            {t('title')}
          </span>
          <span
            className="text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/60"
            aria-hidden="true"
          >
            {items.length}
          </span>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="group relative inline-flex items-center gap-2 border-2 border-white text-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
        >
          <span className="hidden sm:inline">{t('close')}</span>
          <X size={16} aria-hidden="true" strokeWidth={2.5} />
        </button>
      </header>

      {/* Grid: scrollbaar verticaal. Centered met max-width zodat tegels
          niet onnodig groot worden op ultra-wide schermen. */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-8">
          <ol
            // role="list" expliciet voor older AT, ook al is het al een ol
            role="list"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3"
          >
            {items.map((item, idx) => {
              const isActive = idx === selectedIndex
              const ariaLabel = t('openPhoto', { index: idx + 1, total: items.length })
              const previewSrc =
                item.media_type === 'video' && item.video_thumbnail_url
                  ? item.video_thumbnail_url
                  : item.media_type === 'video'
                  ? null
                  : item.url

              return (
                <li key={`${item.id}-${idx}`} role="listitem">
                  <button
                    type="button"
                    onClick={() => handleSelect(idx)}
                    aria-label={ariaLabel}
                    aria-current={isActive ? 'true' : undefined}
                    className={`group relative block w-full aspect-[3/4] overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary ${
                      isActive
                        ? 'border-brand-primary'
                        : 'border-white/80 hover:border-brand-primary'
                    }`}
                  >
                    {previewSrc ? (
                      <Image
                        src={previewSrc}
                        alt={item.alt_text || productName}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      // Video zonder poster: neutrale donkere tegel met
                      // play-icoon, zodat de UI consistent blijft.
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gray-900"
                      />
                    )}

                    {/* Video-overlay met play-knop */}
                    {item.media_type === 'video' && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors"
                      >
                        <span className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white text-black border-2 border-black">
                          <Play size={22} fill="currentColor" strokeWidth={0} />
                        </span>
                      </div>
                    )}

                    {/* Active-indicator pill rechtsboven */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute top-2 right-2 bg-brand-primary text-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 border-black leading-none"
                      >
                        {t('current')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
