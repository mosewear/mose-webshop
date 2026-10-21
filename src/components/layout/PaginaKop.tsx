/**
 * De vaste kop bovenaan overzichts- en informatiepagina's.
 *
 * Komt van de shoppagina (oktober 2026) en is daar uit getild zodat elke
 * pagina dezelfde opbouw heeft: een zacht warm vlak, de titel links in de
 * displayletter, één regel uitleg eronder en eventueel bediening zoals
 * filterknoppen. Geen foto en geen zwart vlak; de inhoud eronder begint
 * direct, en daar horen de beelden.
 *
 * De tint #F5F4F1 is bewust geen zwart (vecht met zwarte knoppen in de kop)
 * en geen merkgroen (de mededelingenbalk erboven is al groen).
 */

import type { ReactNode } from 'react'

interface PaginaKopProps {
  titel: ReactNode
  /** Eén korte regel; geen alinea. */
  ondertitel?: ReactNode
  /** Klein label boven de titel, zoals "Service". Spaarzaam gebruiken. */
  bovenregel?: ReactNode
  /** Bediening in de kop, bijvoorbeeld categorieknoppen. */
  children?: ReactNode
  /**
   * Vaste minimale hoogte voor de bediening, zodat de kop niet verspringt
   * terwijl knoppen nog laden. Bijvoorbeeld 'min-h-[96px] sm:min-h-[44px]'.
   */
  bedieningHoogte?: string
  /**
   * Breedte van de kolom, gelijk aan die van de inhoud eronder, zodat de
   * titel op dezelfde linkerkant begint als de tekst of het formulier.
   */
  breedte?: 'breed' | 'midden' | 'tekst' | 'smal'
}

const BREEDTE = {
  breed: 'max-w-7xl',
  midden: 'max-w-5xl',
  tekst: 'max-w-4xl',
  smal: 'max-w-2xl',
} as const

export default function PaginaKop({
  titel,
  ondertitel,
  bovenregel,
  children,
  bedieningHoogte,
  breedte = 'breed',
}: PaginaKopProps) {
  return (
    <header className="bg-[#F5F4F1]">
      <div className={`mx-auto ${BREEDTE[breedte]} px-4 pb-7 pt-8 md:pb-9 md:pt-12`}>
        {bovenregel && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary md:text-xs">{bovenregel}</p>
        )}
        <h1
          className="font-display text-4xl uppercase leading-none tracking-tight text-black md:text-5xl"
          style={{ textWrap: 'balance' }}
        >
          {titel}
        </h1>
        {ondertitel && (
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-gray-600 md:text-base">{ondertitel}</p>
        )}
        {children && <div className={`mt-6 md:mt-7 ${bedieningHoogte || ''}`}>{children}</div>}
      </div>
    </header>
  )
}
