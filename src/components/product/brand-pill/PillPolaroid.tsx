'use client'

/**
 * Design 3 — POLAROID
 *
 * Schuingeplaatst polaroid-fotokaartje: vierkante foto met een witte
 * frame (dik aan onderkant voor de caption), zwarte border-2 voor de
 * brutalist twist, subtiele -3deg tilt en hover die naar 0deg recht
 * trekt + lift. NIEUW-badge zit als gekantelde "stamp" rechtsboven.
 *
 * Layout: ~120x150px (mobile) / ~140x172px (desktop), incl. tilt.
 */

import Image from 'next/image'
import { Instagram } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillPolaroid({
  posts,
  currentIdx,
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
      // Outer = white polaroid frame (dik onder, dunner boven), met
      // sterkere drop-shadow voor depth en -3deg tilt. Hover trekt
      // 'm recht en lift een beetje.
      className={`group relative block bg-white border-2 border-black p-2 pb-7 md:p-2.5 md:pb-9 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? '-rotate-3 pointer-events-none'
          : visible
            ? '-rotate-3 opacity-100 pointer-events-auto hover:rotate-0 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)] motion-reduce:hover:rotate-[-3deg] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {/* Vierkante foto */}
      <span
        className="relative block w-[100px] h-[100px] md:w-[120px] md:h-[120px] bg-gray-100"
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
              sizes="120px"
              unoptimized={!src.includes('supabase')}
              priority
              className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        })}
        <span className="absolute bottom-0 right-0 bg-black text-white p-0.5 leading-none">
          <Instagram size={10} aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_0_1px_rgba(0,0,0,0.6)] motion-safe:animate-brandPulse"
        />
      </span>

      {/* Caption-strip onderaan, "handgeschreven" gevoel via italic. */}
      <span className="absolute bottom-1.5 md:bottom-2 left-2 right-2 md:left-2.5 md:right-2.5 text-center font-display italic text-[11px] md:text-xs uppercase tracking-[0.05em] text-black leading-tight">
        {headline}
      </span>

      {isFresh && (
        // "Stamp"-stijl NIEUW-badge: rotated tegen de tilt in zodat 'ie
        // visueel "schuin geprikt" lijkt op de polaroid.
        <span
          aria-hidden="true"
          className="absolute -top-2.5 -right-3 bg-brand-primary text-white text-[9px] font-bold uppercase tracking-[0.12em] border-2 border-black px-1.5 py-0.5 leading-none shadow-[0_3px_8px_rgba(0,0,0,0.22)] rotate-[8deg]"
        >
          {freshLabel}
        </span>
      )}
    </button>
  )
}
