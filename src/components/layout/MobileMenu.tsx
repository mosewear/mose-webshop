'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Link as LocaleLink, useRouter, usePathname } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight,
  X,
  User,
  Heart,
  Search as SearchIcon,
  ShoppingBag,
  Instagram,
  Mail,
  Package,
  Undo2,
} from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { useCart } from '@/store/cart'
import { getMenuProducts, formatPrijs, type MenuProduct } from '@/lib/menu-products'
import MobileMenuInstagramRow from '@/components/layout/MobileMenuInstagramRow'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  /** Wordt gecalled wanneer de gebruiker op het zoek-icoon tapt. De parent
   *  (Header) toont de SearchOverlay; dit menu sluit zichzelf en delegeert. */
  onOpenSearch: () => void
}

/** Verhaal-links. Lookbook staat apart en zwaarder: dat is het merkverhaal. */
const VERHAAL_ITEMS = [
  { href: '/over-mose', labelKey: 'about' as const },
  { href: '/blog', labelKey: 'blog' as const },
]

const LANGUAGES = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
] as const

const INSTAGRAM_URL = 'https://instagram.com/mosewearcom'

/**
 * MOSE MOBIEL MENU
 *
 * Herbouwd na een beoordeling door drie specialisten (merchandising bij een
 * grote herenmodewinkel, mobiele navigatie, en merk). Wat de vorige versie
 * mankeerde, en wat hier anders is:
 *
 *  1. HET WAS EEN INHOUDSOPGAVE, GEEN WINKEL. Vijf identieke regels (SHOP,
 *     LOOKBOOK, BLOG, OVER MOSE, CONTACT) in hetzelfde formaat, allemaal met
 *     hetzelfde pijltje. SHOP is het enige dat omzet oplevert en zag eruit als
 *     BLOG. Nu staan de vier producten zelf in het menu, met foto en prijs.
 *     Een categorietegel was geen optie: MOSE heeft vier categorieën met elk
 *     precies één product, dus die laag verbergt één artikel achter een extra
 *     tik. Zie `src/lib/menu-products.ts`.
 *
 *  2. DE BELOFTE WAS EEN REM. "Gratis verzending vanaf €150" bij een mediane
 *     order van €75 vertelt vier op de vijf bezoekers dat ze verzendkosten
 *     gaan betalen. De regel is nu contextafhankelijk: snelheid bij een lege
 *     wagen, het restbedrag zodra er iets in zit, en de bevestiging zodra de
 *     drempel gehaald is. Zwarte tekst op merkgroen, want wit haalt daar maar
 *     3,13:1 en dat is onder de leesnorm.
 *
 *  3. DE COOKIEBANNER LAG EROVERHEEN. Die staat op z-[100], de lade stond op
 *     z-50. Bij elke eerste bezoeker dekte de banner de onderste 127px van het
 *     menu af. De lade staat nu hoger, en houdt onderaan rekening met de
 *     veilige zone van het toestel.
 *
 *  4. DE MERKSTEM ONTBRAK. In de vertalingen stond al een waardenticker
 *     ("GEEN FAST FASHION", "GEMAAKT IN GRONINGEN", "DOOR IRMA & RICK") die
 *     nergens werd gerenderd. Die staat nu direct onder de kop: eerst wie je
 *     bent, dan pas wat je verkoopt.
 *
 *  5. WAT ER HELEMAAL NIET IN ZAT. Geen winkelwagen (het tasje in de header
 *     verdween achter de lade), geen bestelling volgen, geen retour, en geen
 *     woord over pasvorm, terwijl maattwijfel bij herenmode op mobiel de
 *     grootste afhaakreden is.
 *
 * Bewust NIET gedaan: een zoekveld over de volle breedte bovenaan. Bij vier
 * producten kan zoeken niets vinden wat het menu niet al toont; het icoon in
 * de kop volstaat.
 */
export default function MobileMenu({ isOpen, onClose, onOpenSearch }: MobileMenuProps) {
  const t = useTranslations('mobileMenu')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [contactEmail, setContactEmail] = useState('info@mosewear.com')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(150)
  const [producten, setProducten] = useState<MenuProduct[]>([])
  const [mounted, setMounted] = useState(false)

  const itemCount = useCart((s) => s.getItemCount())
  const cartTotal = useCart((s) => s.getTotal())

  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // De winkelwagen komt uit localStorage en bestaat dus niet tijdens de eerste
  // render op de server. Zonder deze vlag wijkt de eerste client-render af van
  // de server-render en klapt de hydratatie.
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let gestopt = false
    getSiteSettings()
      .then((s) => {
        if (gestopt) return
        if (s.contact_email) setContactEmail(s.contact_email)
        if (typeof s.free_shipping_threshold === 'number') {
          setFreeShippingThreshold(s.free_shipping_threshold)
        }
      })
      .catch(() => {
        // bewust stil: de standaardwaarden zijn geldig
      })
    return () => {
      gestopt = true
    }
  }, [])

  // Producten bij MOUNT ophalen, niet pas bij openen. De lade staat permanent
  // in de DOM (off-canvas), dus de foto's zijn al binnen tegen de tijd dat
  // iemand het menu opent. Anders kijk je de eerste driehonderd milliseconden
  // tegen een leeg raster aan.
  useEffect(() => {
    let gestopt = false
    getMenuProducts(locale)
      .then((rijen) => {
        if (!gestopt) setProducten(rijen)
      })
      .catch(() => {
        // Zonder producten valt het raster weg en blijft "Shop alles" staan.
      })
    return () => {
      gestopt = true
    }
  }, [locale])

  // Scroll-lock, Escape, focus naar de sluitknop en focus terug bij sluiten.
  useEffect(() => {
    if (!isOpen) return

    previousActiveRef.current = document.activeElement as HTMLElement | null
    const vorigeOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => {
      closeBtnRef.current?.focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      // Echte focusval. De pagina eronder staat nog in de DOM, dus zonder dit
      // liep Tab het menu uit en zwierf de focus door een scherm dat je niet
      // ziet.
      if (e.key !== 'Tab') return
      const paneel = panelRef.current
      if (!paneel) return
      const focusbaar = paneel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusbaar.length === 0) return
      const eerste = focusbaar[0]
      const laatste = focusbaar[focusbaar.length - 1]
      if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }

    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = vorigeOverflow
      window.removeEventListener('keydown', onKey)
      previousActiveRef.current?.focus({ preventScroll: true })
    }
  }, [isOpen, onClose])

  // Sluiten zodra de route verandert, ook via de terugknop van de browser.
  useEffect(() => {
    if (isOpen) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  /**
   * De belofteregel. Drie standen, want één vaste regel is óf een rem óf een
   * open deur:
   *  - lege wagen: snelheid, daar koopt iemand op
   *  - onder de drempel: wat er nog bij moet, het enige moment dat dat helpt
   *  - erboven: de bevestiging
   */
  const belofte = useMemo(() => {
    if (!mounted || itemCount === 0 || freeShippingThreshold <= 0) {
      return freeShippingThreshold <= 0 ? t('freeShipping.always') : t('promise.fast')
    }
    const tekort = freeShippingThreshold - cartTotal
    if (tekort <= 0) return t('promise.freeIncluded')
    return t('promise.toFree', { amount: formatPrijs(tekort, locale) })
  }, [mounted, itemCount, cartTotal, freeShippingThreshold, locale, t])

  const tickerItems = useMemo(() => {
    try {
      const ruw = t.raw('tickerItems')
      return Array.isArray(ruw) ? (ruw as string[]) : []
    } catch {
      return []
    }
  }, [t])

  const handleLanguageSwitch = (nieuweLocale: string) => {
    if (nieuweLocale === locale) return
    router.replace(pathname, { locale: nieuweLocale })
    onClose()
  }

  const isHuidig = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const koptekstKnop =
    'flex h-11 w-11 flex-shrink-0 items-center justify-center text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black'

  return (
    <>
      {/* Achtergrond: tikken sluit. Blijft gerenderd zodat de fade netjes
          uitloopt. Ligt bewust boven de cookiebanner (z-[100]), die anders
          over het menu heen valt. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[105] bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
        aria-hidden={!isOpen}
        data-mobile-menu={isOpen ? 'open' : 'closed'}
        className={`fixed inset-y-0 right-0 z-[110] flex w-full transform flex-col bg-white transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h2 className="sr-only">{t('ariaLabel')}</h2>

        {/* [1] KOP — logo, zoeken, winkelwagen, sluiten.
            De winkelwagen stond hier niet, terwijl het tasje in de sitekop
            achter deze lade verdwijnt zodra hij opent. Wie iets in zijn mandje
            had, moest eerst het menu sluiten om erbij te komen. */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b-[3px] border-brand-primary bg-black px-3 text-white">
          <LocaleLink href="/" onClick={onClose} className="flex h-11 items-center px-1" aria-label="MOSE">
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={160}
              height={56}
              className="h-7 w-auto brightness-0 invert"
              priority
            />
          </LocaleLink>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenSearch()
              }}
              aria-label={t('searchAria')}
              className={koptekstKnop}
            >
              <SearchIcon size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <LocaleLink
              href="/cart"
              onClick={onClose}
              // Het aantal hoort in de NAAM, niet alleen in een badge: een
              // schermlezer leest een los getal naast een link niet voor.
              aria-label={
                mounted && itemCount > 0
                  ? t('cartAria', { count: itemCount })
                  : t('cartEmptyAria')
              }
              className={`relative ${koptekstKnop}`}
            >
              <ShoppingBag size={20} strokeWidth={2.5} aria-hidden="true" />
              {mounted && itemCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center bg-brand-primary px-1 text-[10px] font-bold leading-none text-black"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </LocaleLink>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={t('closeAria')}
              className={koptekstKnop}
            >
              <X size={22} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* [2] WAARDENTICKER — stond al vertaald in nl.json en en.json maar
            werd nergens gerenderd. Eerst wie je bent, dan wat je verkoopt. */}
        {tickerItems.length > 0 && (
          <div
            className="flex h-7 flex-shrink-0 items-center overflow-hidden border-b-2 border-black bg-black"
            role="note"
            aria-label={t('tickerAria')}
          >
            <div className={`flex whitespace-nowrap will-change-transform ${isOpen ? 'animate-marquee' : ''}`}>
              {[0, 1].map((herhaling) => (
                <div key={herhaling} className="flex shrink-0" aria-hidden={herhaling === 1}>
                  {tickerItems.map((item) => (
                    <span
                      key={`${herhaling}-${item}`}
                      className="px-4 font-display text-[11px] uppercase tracking-[0.2em] text-white"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [3] BELOFTE — zwarte tekst op merkgroen (6,7:1). Wit haalde 3,13:1. */}
        <div
          role="note"
          className="flex h-9 flex-shrink-0 items-center justify-center border-b-2 border-black bg-brand-primary px-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-black"
        >
          {belofte}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* [4] SHOP ALLES + PRODUCTRASTER */}
          <LocaleLink
            href="/shop"
            onClick={onClose}
            aria-current={isHuidig('/shop') ? 'page' : undefined}
            className="group flex items-center justify-between gap-4 border-b-2 border-black px-4 py-3.5 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span className="font-display text-2xl uppercase leading-none tracking-tight">
              {t('shopAll')}
            </span>
            <ArrowRight
              size={22}
              strokeWidth={2.5}
              className="flex-shrink-0 transition-transform group-hover:translate-x-1.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </LocaleLink>

          {producten.length > 0 && (
            <ul
              aria-label={t('productsAria')}
              // Liggend 4:3 in plaats van vierkant: scheelt per rij tientallen
              // pixels op een klein scherm, zonder dat de kleding onherkenbaar
              // wordt. In landschap klapt het naar één rij.
              className="grid grid-cols-2 gap-[2px] border-b-2 border-black bg-black [@media(max-height:480px)]:grid-cols-4"
            >
              {producten.map((product) => (
                <li key={product.id}>
                  <LocaleLink
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="group relative block aspect-[4/3] overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
                  >
                    {product.beeld && (
                      <Image
                        src={product.beeld}
                        alt=""
                        fill
                        sizes="50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      />
                    )}
                    {/* Verloop zodat de naam leesbaar blijft op elke foto,
                        licht of donker. Contrast mag niet afhangen van welk
                        beeld de fotograaf aanlevert. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 to-transparent"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-2.5 text-white">
                      <span className="line-clamp-2 font-display text-[13px] uppercase leading-tight tracking-wide">
                        {product.naam}
                      </span>
                      <span className="text-[12px] font-bold leading-none">
                        €{formatPrijs(product.prijs, locale)}
                        {product.vanafPrijs !== null && (
                          <span className="ml-1.5 font-normal text-white/60 line-through">
                            €{formatPrijs(product.vanafPrijs, locale)}
                          </span>
                        )}
                      </span>
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          )}

          {/* [5] PASVORM — de grootste afhaakreden bij herenmode op mobiel is
              twijfel over de maat, niet over verzendkosten. Dit antwoord stond
              alleen onderaan een productpagina. */}
          <LocaleLink
            href="/verzending"
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-2.5 border-b-2 border-black bg-white px-4 py-2.5 text-[12px] font-semibold leading-snug text-black transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span className="h-2 w-2 flex-shrink-0 bg-brand-primary" aria-hidden="true" />
            {t('fit')}
          </LocaleLink>

          {/* [6] VERHAAL — Lookbook zwaarder dan de rest: dat is het merk. */}
          <LocaleLink
            href="/lookbook"
            onClick={onClose}
            aria-current={isHuidig('/lookbook') ? 'page' : undefined}
            className="group relative flex items-center justify-between gap-4 border-b-2 border-black px-4 py-3 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-brand-primary transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
            />
            <span className="font-display text-xl uppercase leading-none tracking-tight">
              {tCommon('lookbook')}
            </span>
            <ArrowRight size={20} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
          </LocaleLink>

          <nav aria-label={t('navAria')}>
            <ul className="grid grid-cols-2 border-b-2 border-black">
              {VERHAAL_ITEMS.map((item, i) => (
                <li key={item.href} className={i === 0 ? 'border-r-2 border-black' : undefined}>
                  <LocaleLink
                    href={item.href}
                    onClick={onClose}
                    aria-current={isHuidig(item.href) ? 'page' : undefined}
                    className="flex min-h-[48px] items-center px-4 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
                  >
                    {tCommon(item.labelKey)}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* [7] HULP — de grootste winst bij verkeer uit advertenties: een
              groot deel van wie het menu opent heeft al besteld en zoekt zijn
              pakket. Die moesten eerst helemaal naar de footer. */}
          <ul className="grid grid-cols-2 border-b-2 border-black">
            {[
              { href: '/track-order', label: t('help.track'), Icon: Package },
              // Let op: `/returns` bestaat niet als pagina, alleen `/returns/new`
              // en `/returns/[id]`. Een link naar `/returns` gaf een 404, en
              // Next.js haalt die bij het renderen van het menu al op, dus de
              // fout stond in de console nog voordat iemand erop tikte.
              { href: '/returns/new', label: t('help.returns'), Icon: Undo2 },
            ].map((item, i) => (
              <li key={item.href} className={i === 0 ? 'border-r-2 border-black' : undefined}>
                <LocaleLink
                  href={item.href}
                  onClick={onClose}
                  className="flex min-h-[48px] items-center gap-2 px-3 text-[11px] font-bold uppercase leading-tight tracking-[0.02em] transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
                >
                  <item.Icon size={16} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{item.label}</span>
                </LocaleLink>
              </li>
            ))}
          </ul>

          {/* [8] PERSOONLIJK */}
          <ul className="grid grid-cols-3 border-b-2 border-black">
            {[
              { href: '/account', label: tCommon('account'), Icon: User },
              { href: '/wishlist', label: tCommon('wishlist'), Icon: Heart },
              { href: '/contact', label: tCommon('contact'), Icon: Mail },
            ].map((item, i) => (
              <li key={item.href} className={i < 2 ? 'border-r-2 border-black' : undefined}>
                <LocaleLink
                  href={item.href}
                  onClick={onClose}
                  aria-current={isHuidig(item.href) ? 'page' : undefined}
                  className="flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
                >
                  <item.Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                  <span className="truncate text-[10px] font-bold uppercase tracking-[0.1em]">
                    {item.label}
                  </span>
                </LocaleLink>
              </li>
            ))}
          </ul>

          <MobileMenuInstagramRow isOpen={isOpen} />

          {/* [9] VOET — taal staat hier bewust, niet naast de sluitknop: het is
              een eenmalige voorkeur en een vergisklik laadt de hele route
              opnieuw. */}
          <div
            className="flex items-center justify-between gap-4 px-4 py-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('social.instagram')}
                className="flex h-11 w-11 items-center justify-center border-2 border-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Instagram size={18} strokeWidth={2} aria-hidden="true" />
              </a>
              <a
                href={`mailto:${contactEmail}`}
                aria-label={t('social.email')}
                className="flex h-11 w-11 items-center justify-center border-2 border-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Mail size={18} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>

            <div className="flex border-2 border-black" role="group" aria-label={t('language.label')}>
              {LANGUAGES.map((taal) => {
                const actief = taal.code === locale
                return (
                  <button
                    key={taal.code}
                    type="button"
                    onClick={() => handleLanguageSwitch(taal.code)}
                    aria-current={actief ? 'true' : undefined}
                    aria-label={t('language.switchTo', { label: taal.label })}
                    className={`flex h-11 w-12 items-center justify-center text-[12px] font-bold tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
                      actief ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {taal.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
