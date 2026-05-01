'use client'

/**
 * PillMini — auto-collapsed variant
 *
 * Wordt NIET via de admin geselecteerd. BrandDiscoveryWidget schakelt
 * automatisch naar dit design zodra de gebruiker de modal voor het
 * eerst heeft geopend in deze sessie (= bewustzijn bereikt → de pill
 * mag visueel rusten).
 *
 * Doel: maximale "rest" zonder verdwijnen. Een vierkante zwarte tile
 * met IG-icoontje die nog altijd klikbaar is (heropent de modal) en
 * de discovery-signalen (live pulse, NIEUW-badge) behoudt voor het
 * geval er ondertussen een nieuwe IG-post is verschenen.
 *
 * Layout: 44x44px (mobile) / 48x48px (desktop) — Apple's minimale
 * tap-target. Brutalist: vierkant, zwarte vulling, witte border + icon,
 * harde shadow. Geen tekst, dus consistent in elke taal.
 */

import { Instagram } from 'lucide-react'
import type { PillDesignProps } from './types'

export default function PillMini({
  isFresh,
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
      data-pill-mini="true"
      className={`group relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-black text-white border-2 border-black shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-[transform,opacity,background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
        preview
          ? 'pointer-events-none'
          : visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:bg-white hover:text-black hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.30)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      <Instagram size={18} aria-hidden="true" />

      {/* Live pulse-dot — rechtsboven OP de tile-rand. Bij isFresh is
          de NIEUW-badge het primaire signaal en zou de pulse erop
          gaan zitten; daarom dan onderdrukt. */}
      {!isFresh && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_0_1.5px_white,_0_0_0_2.5px_black] motion-safe:animate-brandPulse"
        />
      )}

      {/* NIEUW-badge — zelfde positionering en stijl als bij de andere
          designs zodat de discovery-laag herkenbaar consistent blijft. */}
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
