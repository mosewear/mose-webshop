'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Lock, ChevronLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

/**
 * Het afrekenscherm krijgt zijn eigen, kale omlijsting.
 *
 * Op de gewone pagina's staat boven het formulier de volledige navigatie
 * (Shop, Lookbook, Blog, Over MOSE, Contact, zoeken, account, verlanglijst en
 * het hamburgermenu) en eronder een voettekst met nog eens twaalf links. Dat
 * zijn ongeveer twintig manieren om weg te lopen van de enige pagina die maar
 * één taak heeft. Elke grote winkel strijkt dat weg: logo, een regel over
 * veilig betalen, en verder niets.
 *
 * De aankondigingsbalk en de drie popups (campagne, nieuwsbrief, enquête) gaan
 * hier om dezelfde reden uit. Een venster met "10% korting" over een
 * betaalformulier heen is geen aanbod meer maar een obstakel.
 */

const AFREKENPADEN = ['/checkout', '/payment']

function isAfrekenen(pathname: string | null): boolean {
  if (!pathname) return false
  return AFREKENPADEN.some((pad) => pathname.includes(pad))
}

/** Rendert zijn inhoud overal BEHALVE op het afrekenscherm. */
export function BuitenAfrekenen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isAfrekenen(pathname)) return null
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
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
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
