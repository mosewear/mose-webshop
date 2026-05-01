'use client'

/**
 * Design 1 — CLASSIC
 *
 * Horizontale pill met vierkante thumbnail links en 2-regelige tekst
 * rechts. Het oorspronkelijke ontwerp; balanceert visibility en
 * subtiliteit.
 *
 * Layout: ~240x72px (mobile) / ~270x88px (desktop).
 */

import Image from 'next/image'
import { Instagram, ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillClassic({
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
      className={`group relative flex items-center gap-3 bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] pl-1.5 pr-3.5 py-1.5 md:pl-2 md:pr-4 md:py-2 transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.22)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {/* Thumbnail-kolom met crossfade-rotatie + IG-overlay + live pulse */}
      <span
        className="relative block flex-shrink-0 w-12 h-12 md:w-14 md:h-14 border-2 border-black overflow-hidden bg-gray-100"
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
              sizes="56px"
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

      {/* Tekst-kolom: 2-regelige uppercase headline + subline */}
      <span className="flex flex-col items-start leading-tight text-left min-w-0">
        <span className="font-bold text-[11px] md:text-xs uppercase tracking-[0.12em] text-black whitespace-nowrap">
          {headline}
        </span>
        <span className="flex items-center gap-1 text-[11px] md:text-xs text-gray-700 mt-0.5 whitespace-nowrap">
          <span>{subline}</span>
          <ArrowRight
            size={12}
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
