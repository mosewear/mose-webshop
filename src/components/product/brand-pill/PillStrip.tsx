'use client'

/**
 * Design 6 — STRIP (contact-sheet)
 *
 * Brede horizontale pill in de stijl van een fotostrip / contact-sheet:
 * 3 verschillende IG-thumbnails naast elkaar (geen rotatie — alle drie
 * tegelijk zichtbaar) met dikke zwarte dividers ertussen, en rechts
 * een zwarte CTA-balk met de headline en pijl. Maximum visuele content
 * in een horizontaal formaat: één blik en je ziet wat MOSE deelt op IG.
 *
 * Layout: ~226x44px (mobile) / ~258x52px (desktop) — een tikje breder
 * dan Classic, maar met 3x meer beeldoppervlakte.
 *
 * Pulse-dot zit op de eerste (= jongste) thumbnail, NIEUW-badge
 * zoals bij de andere designs als sticker rechtsboven buiten de pill.
 */

import Image from 'next/image'
import { Instagram, ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillStrip({
  posts,
  isFresh,
  headline,
  freshLabel,
  ariaLabel,
  ariaExpanded,
  onClick,
  onMouseEnter,
  triggerRef,
  preview = false,
  visible = true,
}: PillDesignProps) {
  // Toon altijd 3 cellen. Wanneer er minder posts zijn vullen we aan
  // met null-placeholders (gray-tile + IG-icoon) zodat de strip-vorm
  // altijd consistent leest.
  const cells = [posts[0] ?? null, posts[1] ?? null, posts[2] ?? null]

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={preview ? undefined : ariaLabel}
      aria-haspopup={preview ? undefined : 'dialog'}
      aria-expanded={preview ? undefined : ariaExpanded}
      tabIndex={preview || !visible ? -1 : 0}
      onClick={preview ? undefined : onClick}
      onMouseEnter={preview ? undefined : onMouseEnter}
      data-visible={visible ? 'true' : 'false'}
      className={`group relative flex items-stretch bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.22)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {cells.map((post, idx) => {
        const src = post
          ? post.media_type === 'VIDEO' && post.thumbnail_url
            ? post.thumbnail_url
            : post.media_url
          : null

        return (
          <span
            key={post?.id ?? `cell-${idx}`}
            className={`relative block w-10 h-10 md:w-12 md:h-12 bg-gray-100 overflow-hidden ${
              idx > 0 ? 'border-l-2 border-black' : ''
            }`}
            aria-hidden="true"
          >
            {src ? (
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 768px) 48px, 40px"
                unoptimized={!src.includes('supabase')}
                priority
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Instagram size={16} aria-hidden="true" />
              </span>
            )}

            {/* Pulse-dot uitsluitend op de eerste cel — leest als
                "nieuwste post hier links". Bij isFresh schuiven we 'm
                naar binnen-onder zodat de NIEUW-badge die rechtsboven
                bovenop het frame zit 'm niet visueel afdekt. */}
            {idx === 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_0_1px_rgba(0,0,0,0.6)] motion-safe:animate-brandPulse ${
                  isFresh ? 'bottom-1' : 'top-1'
                }`}
              />
            )}
          </span>
        )
      })}

      {/* Zwarte CTA-balk rechts: headline + pijl. Vormt het visuele
          eindpunt van de strip en geeft de "klik hier"-affordance. */}
      <span className="flex items-center gap-1.5 px-2.5 md:px-3 bg-black text-white border-l-2 border-black">
        <span className="font-bold text-[10px] md:text-[11px] uppercase tracking-[0.12em] whitespace-nowrap">
          {headline}
        </span>
        <ArrowRight
          size={12}
          aria-hidden="true"
          className="text-brand-primary transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
        />
      </span>

      {isFresh && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 bg-brand-primary text-white text-[9px] font-bold uppercase tracking-[0.08em] border-2 border-black px-1.5 py-0.5 leading-none shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
        >
          {freshLabel}
        </span>
      )}
    </button>
  )
}
