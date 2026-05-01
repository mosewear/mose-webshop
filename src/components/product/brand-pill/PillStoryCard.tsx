'use client'

/**
 * Design 2 — STORY CARD
 *
 * Verticale "magazine cover": grote portrait-thumbnail bovenin (4:5
 * aspect) met daaronder een zwarte titelbalk in MOSE-stijl. Maximale
 * visuele impact zonder het hele scherm te claimen.
 *
 * Layout: ~110x172px (mobile) / ~130x200px (desktop).
 */

import Image from 'next/image'
import { Instagram, ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillStoryCard({
  posts,
  currentIdx,
  isFresh,
  headline,
  sublineShort,
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
      className={`group relative block w-[110px] md:w-[130px] bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] text-left transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(0,0,0,0.24)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {/* Portrait thumbnail (4:5) — vult de hele bovenkant */}
      <span
        className="relative block w-full aspect-[4/5] bg-gray-100 border-b-2 border-black"
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
              sizes="(min-width: 768px) 130px, 110px"
              unoptimized={!src.includes('supabase')}
              priority
              className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        })}
        {/* Subtiele gradient onderaan voor leesbaarheid van eventuele
            licht-op-licht thumbnails tegen de zwarte balk eronder. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent"
        />
        {/* IG-icoon links-onder, pulse rechts-boven */}
        <span className="absolute bottom-1 left-1 bg-black text-white p-1 leading-none">
          <Instagram size={11} aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_0_1px_rgba(0,0,0,0.6)] motion-safe:animate-brandPulse"
        />
      </span>

      {/* Zwarte titelbalk */}
      <span className="block bg-black text-white px-2.5 py-2">
        <span className="block font-bold text-[11px] md:text-xs uppercase tracking-[0.1em] leading-tight">
          {headline}
        </span>
        <span className="flex items-center gap-1 mt-1 text-[10px] md:text-[11px] text-white/80 uppercase tracking-wider">
          <span>{sublineShort}</span>
          <ArrowRight
            size={11}
            aria-hidden="true"
            className="text-brand-primary transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
          />
        </span>
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
