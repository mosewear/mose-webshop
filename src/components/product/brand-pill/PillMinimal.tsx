'use client'

/**
 * Design 5 — MINIMAL
 *
 * Compact tekst-tag met IG-icoon links. Geen thumbnail, alleen het
 * brand-primary IG-vlak + korte tagline. Voor wie de pill bewust
 * subtiel wil houden zonder visuele afleiding van de productfoto's.
 *
 * Layout: ~150x44px (mobile) / ~170x48px (desktop).
 *
 * Hover = volledige inversie (zwarte vulling) i.p.v. lift, past bij
 * het strakke karakter.
 */

import { Instagram, ArrowRight } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillMinimal({
  isFresh,
  tagline,
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
      className={`group relative flex items-center gap-2 bg-white border-2 border-black shadow-[0_3px_14px_rgba(0,0,0,0.16)] pl-1.5 pr-3 py-1.5 md:pl-2 md:pr-3.5 md:py-2 transition-[transform,opacity,background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:bg-black hover:text-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)]'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      {/* IG-icoon vakje in brand-primary — vervangt de thumbnail. Met
          live pulse-dot rechtsboven om "alive" te communiceren ondanks
          de afwezige roterende foto. */}
      <span
        className="relative flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-brand-primary text-white flex items-center justify-center border-2 border-black"
        aria-hidden="true"
      >
        <Instagram size={14} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_0_1.5px_white,_0_0_0_2.5px_black] motion-safe:animate-brandPulse"
        />
      </span>

      {/* Tagline + arrow */}
      <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-[0.1em] whitespace-nowrap">
        <span>{tagline}</span>
        <ArrowRight
          size={13}
          aria-hidden="true"
          className="text-brand-primary group-hover:text-white transition-[transform,color] duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
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
