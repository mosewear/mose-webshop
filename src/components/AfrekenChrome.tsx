'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Lock, ChevronLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

/** Keep checkout focused, with essential service and policy links available. */

const AFREKENPADEN = ['/checkout', '/payment']

function isAfrekenen(pathname: string | null): boolean {
  if (!pathname) return false
  return AFREKENPADEN.some((pad) => pathname.includes(pad))
}

/** Rendert zijn inhoud overal BEHALVE op het afrekenscherm. */
export function BuitenAfrekenen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const opAfrekenen = isAfrekenen(pathname)

  /**
   * Markeer de pagina, zodat de opvulling boven de inhoud weg kan.
   *
   * `#main-content` krijgt standaard een opvulling ter hoogte van de
   * aankondigingsbalk plus de vaste kop, want die twee liggen daar overheen.
   * Op het afrekenscherm staan ze er niet: de kale kop staat gewoon in de
   * stroom. De opvulling bleef wel staan en werd daarmee een lege witte band
   * van 106px op mobiel en 114px op desktop, met daarin ook nog een
   * achtergebleven waarde van de verdwenen aankondigingsbalk.
   */
  useEffect(() => {
    const el = document.documentElement
    if (opAfrekenen) el.setAttribute('data-afrekenen', '')
    else el.removeAttribute('data-afrekenen')
    return () => el.removeAttribute('data-afrekenen')
  }, [opAfrekenen])

  if (opAfrekenen) return null
  return <>{children}</>
}

/** De kale kop die alleen op het afrekenscherm verschijnt. */
export function AfrekenKop() {
  const pathname = usePathname()
  const t = useTranslations('checkout')
  const tc = useTranslations('common')
  if (!isAfrekenen(pathname)) return null

  // Bewust NIET sticky. Een formulier van één scherm heeft geen meelopende kop
  // nodig, en met sticky schoof de stappenbalk eronder weg.
  return (
    <header className="border-b-2 border-black bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Terug naar de winkelwagen, niet naar de winkel. Dat is de enige
            uitgang die binnen de trechter blijft. */}
        <Link
          href="/cart"
          className="flex min-h-[44px] items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-black/70 transition-colors hover:text-black"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{tc('cart')}</span>
        </Link>

        <Link href="/cart" aria-label="MOSE" className="flex items-center">
          <Image src="/logomose.png" alt="MOSE" width={110} height={45} className="h-8 w-auto" priority />
        </Link>

        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-black/70">
          <Lock className="h-4 w-4 text-brand-primary" strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('section.secure')}</span>
        </span>
      </div>
    </header>
  )
}

/** Essential help remains reachable without the full shopping navigation. */
export function AfrekenVoet() {
  const pathname = usePathname()
  const locale = useLocale()
  if (!isAfrekenen(pathname)) return null
  const en = locale === 'en'
  const links = [
    ['/contact', en ? 'Need help?' : 'Hulp nodig?'],
    ['/verzending', en ? 'Delivery & returns' : 'Bezorgen & retourneren'],
    ['/privacy', 'Privacy'],
    ['/algemene-voorwaarden', en ? 'Terms & conditions' : 'Algemene voorwaarden'],
  ]
  return <footer className="border-t border-gray-200 bg-white">
    <nav aria-label={en ? 'Checkout help and policies' : 'Hulp en voorwaarden bij afrekenen'} className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 px-4 py-5 text-xs text-gray-600">
      {links.map(([href,label]) => <Link key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-black">{label}<span className="sr-only">{en ? ' (opens in a new tab)' : ' (opent in een nieuw tabblad)'}</span></Link>)}
    </nav>
  </footer>
}
