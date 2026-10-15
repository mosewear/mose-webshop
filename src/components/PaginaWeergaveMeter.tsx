'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

/**
 * Meet welke pagina's bekeken worden.
 *
 * Dit ontbrak volledig. De meting kende alleen `product_view`, `add_to_cart`,
 * `checkout_started`, `purchase` en de chatgebeurtenissen. Daardoor was een
 * simpele vraag als "hoeveel mensen zien de shoppagina eigenlijk" niet te
 * beantwoorden: de enige treffers op /shop in dertig dagen waren zeven
 * chatopeningen. Zonder dat getal kun je niet bepalen of een pagina een halve
 * dag of twee weken werk waard is.
 *
 * We sturen alleen het pad en de titel mee, geen inhoud. De bestaande route
 * vult land, apparaat en verwijzer zelf aan, en filtert botverkeer eruit.
 */
export default function PaginaWeergaveMeter() {
  const pathname = usePathname()
  const laatstGemeld = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    // Beheerpagina's tellen niet mee: dat zijn wij, niet de klant.
    if (pathname.includes('/admin')) return
    // Niet twee keer hetzelfde pad melden bij een herrender.
    if (laatstGemeld.current === pathname) return
    laatstGemeld.current = pathname

    trackEvent({
      event_name: 'page_view',
      properties: {
        path: pathname,
        // Zonder de taalprefix, zodat /nl/shop en /en/shop samen te tellen zijn.
        route: pathname.replace(/^\/(nl|en)(?=\/|$)/, '') || '/',
      },
    })
  }, [pathname])

  return null
}
