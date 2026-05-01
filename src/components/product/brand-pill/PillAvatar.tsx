'use client'

/**
 * Design 4 — AVATAR
 *
 * Compacte horizontale pill met een ronde profielfoto (avatar style)
 * en de @username daarnaast — alsof iemand je tagt op Instagram.
 * Sociaal en uitnodigend, herkenbaar voor IG-natives.
 *
 * Layout: ~220x60px (mobile) / ~250x68px (desktop).
 */

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillAvatar({
  posts,
  currentIdx,
  isFresh,
  headline,
  username,
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
      className={`group relative flex items-center gap-2.5 md:gap-3 bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] pl-1.5 pr-3.5 py-1.5 md:pl-2 md:pr-4 md:py-2 transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.22)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {/* Ronde avatar (circle) met brand-primary ring én een pulse-dot
          als notification-badge in de rechterbovenhoek. We wrappen de
          avatar + pulse in één relative container zodat de positie van
          de pulse robuust is ongeacht de button-padding. */}
      <span className="relative flex-shrink-0" aria-hidden="true">
        <span className="block w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden bg-gray-100 ring-2 ring-brand-primary ring-offset-2 ring-offset-white">
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
                sizes="48px"
                unoptimized={!src.includes('supabase')}
                priority
                className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )
          })}
        </span>
        {/* Pulse-badge aan de top-right buiten de ring — staat boven
            de ring-offset zodat het als notification-dot leest. */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_0_1.5px_white,_0_0_0_2.5px_rgba(0,0,0,0.6)] motion-safe:animate-brandPulse" />
      </span>

      {/* Tekst-kolom: handle bold + headline klein eronder */}
      <span className="flex flex-col items-start leading-tight text-left min-w-0">
        <span className="font-bold text-xs md:text-sm text-black whitespace-nowrap">
          @{username}
        </span>
        <span className="flex items-center gap-1 text-[10px] md:text-[11px] uppercase tracking-[0.1em] text-gray-700 mt-0.5 whitespace-nowrap">
          <span>{headline}</span>
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
