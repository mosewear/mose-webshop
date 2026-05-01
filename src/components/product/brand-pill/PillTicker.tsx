'use client'

/**
 * Design 7 — TICKER (news-bar)
 *
 * Horizontale pill met links een vierkante (roterende) IG-thumbnail
 * en rechts een zwart marquee-paneel waar headline + subline continu
 * langs scrollen — als een nieuwsticker. Beweging trekt subtiel de
 * aandacht zonder de pagina te overspoelen.
 *
 * Layout: ~218x44px (mobile) / ~250x52px (desktop).
 *
 * Marquee-implementatie: content wordt 2× gerenderd binnen een
 * overflow-hidden container, en de wrapper animeert van translateX(0)
 * naar translateX(-50%). Daardoor verschijnt na één cycle exact dezelfde
 * content op de plek waar 'ie begon ⇒ seamless loop. De duplicate is
 * `aria-hidden` zodat schermlezers maar één keer voorbij komen.
 *
 * Reduced-motion: marquee-animatie wordt onderdrukt (motion-safe wrapper)
 * en de duplicate wordt verborgen, zodat alleen de eerste statische
 * tekst-set leesbaar in beeld blijft.
 */

import Image from 'next/image'
import { Instagram, ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillTicker({
  posts,
  currentIdx,
  isFresh,
  headline,
  subline,
  freshLabel,
  ariaLabel,
  ariaExpanded,
  onClick,
  onMouseEnter,
  triggerRef,
  preview = false,
  visible = true,
}: PillDesignProps) {
  // Eén tekstgroep — wordt 2× gerenderd voor de seamless marquee-loop.
  // De separator-bullets in brand-primary geven het ticker-ritme.
  const tickerSet = (
    <span className="flex items-center gap-2.5 px-3 shrink-0">
      <span className="font-bold text-[11px] md:text-xs uppercase tracking-[0.12em]">
        {headline}
      </span>
      <span className="text-brand-primary leading-none">•</span>
      <span className="font-bold text-[11px] md:text-xs uppercase tracking-[0.12em]">
        {subline}
      </span>
      <span className="text-brand-primary leading-none">•</span>
      <ArrowRight
        size={12}
        aria-hidden="true"
        className="text-brand-primary"
      />
    </span>
  )

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
      {/* Vierkante thumbnail-kolom met crossfade-rotatie identiek aan
          Classic, plus IG-icoon onderaan en pulse-dot rechtsboven. */}
      <span
        className="relative block flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gray-100 overflow-hidden border-r-2 border-black"
        aria-hidden="true"
      >
        {posts.map((post, idx) => {
          const src =
            post.media_type === 'VIDEO' && post.thumbnail_url
              ? post.thumbnail_url
              : post.media_url
          const active = idx === currentIdx
          return (
            <Image
              key={post.id}
              src={src}
              alt=""
              fill
              sizes="(min-width: 768px) 48px, 40px"
              unoptimized={!src.includes('supabase')}
              priority
              className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        })}
        <span className="absolute bottom-0 right-0 bg-black text-white p-0.5 leading-none">
          <Instagram size={9} aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_0_1px_rgba(0,0,0,0.6)] motion-safe:animate-brandPulse"
        />
      </span>

      {/* Marquee-paneel: zwart met witte tekst, overflow-hidden zodat
          de scrollende content netjes binnen het paneel blijft. De
          NIEUW-badge zit op het outer-button level (niet hier) zodat
          'ie buiten kan steken. */}
      <span className="relative flex items-center bg-black text-white overflow-hidden flex-1 min-w-[150px] md:min-w-[180px]">
        <span className="flex motion-safe:animate-marquee will-change-transform">
          {tickerSet}
          {/* Tweede kopie voor seamless loop. Bij reduced-motion
              verbergen zodat alleen de eerste set in beeld blijft. */}
          <span className="flex items-stretch motion-reduce:hidden" aria-hidden="true">
            {tickerSet}
          </span>
        </span>
        {/* Subtiele fade-edges zodat de tekst niet hard wegknipt aan
            de randen. Pointer-events-none zodat ze de klik niet eten. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black to-transparent pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-black to-transparent pointer-events-none"
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
