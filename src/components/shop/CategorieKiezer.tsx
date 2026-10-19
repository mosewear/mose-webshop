'use client'

/**
 * Horizontale rij categoriekaarten boven het shopraster.
 *
 * Bewust een *filter* op dezelfde pagina en geen navigatie naar een andere
 * collectie. Grote winkels gebruiken zo'n rij om honderden producten op te
 * delen, maar MOSE heeft drie producten die samen op één scherm passen. Een
 * extra pagina ertussen zou de weg naar het kledingstuk langer maken in plaats
 * van korter; filteren houdt alles binnen handbereik.
 *
 * De rij scrollt horizontaal zodra hij niet past, zonder zichtbare balk, en
 * houdt de actieve kaart in beeld.
 */

import Image from 'next/image'
import { useEffect, useRef } from 'react'

export interface CategorieItem {
  slug: string
  naam: string
  beeld: string | null
  aantal: number
}

interface CategorieKiezerProps {
  items: CategorieItem[]
  actief: string
  onKies: (slug: string) => void
  allesLabel: string
  allesBeeld?: string | null
  totaalAantal: number
}

export default function CategorieKiezer({
  items,
  actief,
  onKies,
  allesLabel,
  allesBeeld,
  totaalAantal,
}: CategorieKiezerProps) {
  const rijRef = useRef<HTMLDivElement>(null)

  // Houd de gekozen kaart in beeld. Zonder dit kan de actieve categorie na een
  // keuze buiten de zichtbare strook vallen op een smal scherm.
  useEffect(() => {
    const rij = rijRef.current
    if (!rij) return
    const knop = rij.querySelector<HTMLElement>(`[data-slug="${CSS.escape(actief)}"]`)
    if (!knop) return
    const r = knop.getBoundingClientRect()
    const rr = rij.getBoundingClientRect()
    if (r.left < rr.left || r.right > rr.right) {
      knop.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [actief])

  if (items.length === 0) return null

  // De Alles-kaart heeft een eigen beeld: twee personen naast elkaar, wat
  // past bij "de hele collectie" en duidelijk verschilt van de
  // categoriekaarten die er allemaal één tonen. Zonder beeld viel hij als
  // zwart gat tussen de andere drie.
  const kaarten: CategorieItem[] = [
    { slug: 'all', naam: allesLabel, beeld: allesBeeld ?? null, aantal: totaalAantal },
    ...items,
  ]

  return (
    <nav aria-label={allesLabel} className="mb-6 md:mb-8">
      <div
        ref={rijRef}
        className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {kaarten.map((kaart) => {
          const isActief = kaart.slug === actief
          return (
            <button
              key={kaart.slug}
              type="button"
              data-slug={kaart.slug}
              onClick={() => onKies(kaart.slug)}
              aria-pressed={isActief}
              className={`group relative flex-shrink-0 w-[108px] md:w-[136px] overflow-hidden border-2 text-left transition-colors ${
                isActief ? 'border-brand-primary' : 'border-black hover:border-gray-500'
              }`}
            >
              <div className={`relative aspect-[4/5] ${kaart.beeld ? 'bg-gray-100' : 'bg-black'}`}>
                {kaart.beeld ? (
                  <Image
                    src={kaart.beeld}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="136px"
                    quality={90}
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                {/* Donkere voet zodat het label leesbaar blijft op elk beeld. */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-1 px-2 pb-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-white">
                  <span className="truncate">{kaart.naam}</span>
                  <span className="font-medium text-white/70">{kaart.aantal}</span>
                </span>
              </div>
              {isActief && (
                <span className="absolute inset-x-0 top-0 h-1 bg-brand-primary" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
