'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  MEETPARAMETER,
  isInterneSessie,
  markeerInterneSessie,
  wisInterneSessie,
} from '@/lib/meting-uitsluiten'

/**
 * Zet dit apparaat buiten de statistieken, met één link.
 *
 * Aanleiding: Rick vroeg of ons eigen IP-adres is uitgesloten van de cijfers.
 * Dat was niet zo, en het kon ook niet: de kolom `ip_address` is leeg voor
 * alle gebeurtenissen die we hebben. Maar IP is hier ook het verkeerde
 * gereedschap. Vier op de vijf bezoekers zit op een telefoon, en een mobiel
 * IP-adres wisselt per mast en wordt door duizenden mensen tegelijk gedeeld.
 * Het kantooradres uitsluiten zou bovendien een echte klant uitsluiten die
 * toevallig op dezelfde verbinding zit.
 *
 * Wat wél werkt is het apparaat markeren. Open eenmalig
 * `mosewear.com/nl?meting=uit` op elke telefoon, tablet en computer die je
 * gebruikt, en vanaf dat moment telt niets van dat apparaat nog mee, niet bij
 * ons en niet bij Meta.
 *
 * Let op: de markering zit in de opslag van die ene browser. Bekijk je de site
 * ook in de Instagram-app, dan is dat een aparte opslag en moet de link daar
 * ook een keer geopend worden.
 */
export default function MetingSchakelaar() {
  // Bewust `window.location.search` en niet `useSearchParams`. Die laatste
  // dwingt een Suspense-grens af bij het vooraf renderen, en dat is te veel
  // omhaal voor een schakelaar die alleen in de browser iets doet.
  const pathname = usePathname()
  const [keuze, setKeuze] = useState<string | null>(null)
  const [uitgesloten, setUitgesloten] = useState<boolean | null>(null)

  useEffect(() => {
    let gevraagd: string | null = null
    try {
      gevraagd = new URLSearchParams(window.location.search).get(MEETPARAMETER)
    } catch {
      gevraagd = null
    }
    setKeuze(gevraagd)
    if (!gevraagd) return
    if (gevraagd === 'uit') markeerInterneSessie()
    if (gevraagd === 'aan') wisInterneSessie()
    setUitgesloten(isInterneSessie())
  }, [pathname])

  // Zonder de parameter in de link laat dit component niets zien. Een klant
  // komt hier dus nooit iets van tegen.
  if (!keuze || uitgesloten === null) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[10000] border-t-2 border-black bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <div>
          <p className="font-display text-lg uppercase leading-tight">
            {uitgesloten ? 'Dit apparaat telt niet mee' : 'Dit apparaat telt weer mee'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {uitgesloten
              ? 'Wat je hier doet komt niet in de statistieken en gaat niet naar Meta. Dat blijft zo tot je het terugzet.'
              : 'Alles wat je hier doet wordt vanaf nu weer meegeteld.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`?${MEETPARAMETER}=${uitgesloten ? 'aan' : 'uit'}`}
            className="inline-flex min-h-[44px] items-center border-2 border-black px-4 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-black hover:text-white"
          >
            {uitgesloten ? 'Toch weer meetellen' : 'Niet meetellen'}
          </a>
          <button
            onClick={() => setUitgesloten(null)}
            className="inline-flex min-h-[44px] items-center px-4 text-sm font-semibold uppercase tracking-wide text-gray-600 transition-colors hover:text-black"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
