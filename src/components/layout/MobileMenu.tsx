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
import { useCartDrawer } from '@/store/cartDrawer'
import { getMenuProducts, formatPrijs, type MenuProduct } from '@/lib/menu-products'
import { levertMorgen, voorCutoff } from '@/lib/shipping-cutoff'
import MobileMenuInstagramRow from '@/components/layout/MobileMenuInstagramRow'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  /** Wordt gecalled wanneer de gebruiker op het zoek-icoon tapt. De parent
   *  (Header) toont de SearchOverlay; dit menu sluit zichzelf en delegeert. */
  onOpenSearch: () => void
}

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
  const [productenGeladen, setProductenGeladen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const itemCount = useCart((s) => s.getItemCount())
  const openDrawer = useCartDrawer((s) => s.openDrawer)
  const cartTotal = useCart((s) => s.getTotal())

  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
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
        // Zonder producten blijft "Shop alles" staan als uitweg.
      })
      .finally(() => {
        if (!gestopt) setProductenGeladen(true)
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

    // Terug naar boven. De lade blijft in de DOM staan, dus wie onderaan sloot,
    // opende hem daarna opnieuw op 346px: voorbij het hele productraster, met
    // zicht op de taalknoppen.
    if (scrollRef.current) scrollRef.current.scrollTop = 0

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
    // Lege wagen: vertel over snelheid, maar alleen wat waar IS. De regel stond
    // hier vast op "morgen in huis", ook op zaterdagavond. De gedeelde functie
    // kijkt nu naar het uur EN de weekdag.
    if (!mounted || itemCount === 0 || freeShippingThreshold <= 0) {
      if (freeShippingThreshold <= 0) return t('freeShipping.always')
      if (!mounted) return t('promise.fast')
      if (levertMorgen()) return t('promise.fast')
      if (voorCutoff()) return t('promise.sameDay')
      return t('promise.nextWorkday')
    }
    const tekort = freeShippingThreshold - cartTotal
    if (tekort <= 0) return t('promise.freeIncluded')
    return t('promise.toFree', { amount: formatPrijs(tekort, locale) })
  }, [mounted, itemCount, cartTotal, freeShippingThreshold, locale, t])

  const merkregel = useMemo(() => {
    try {
      const ruw = t.raw('tickerItems')
      return Array.isArray(ruw) && ruw.length > 0 ? String(ruw[0]) : null
    } catch {
      return null
    }
  }, [t])

  const handleLanguageSwitch = (nieuweLocale: string) => {
    if (nieuweLocale === locale) return
    router.replace(pathname, { locale: nieuweLocale })
    onClose()
  }

  const isHuidig = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  // Naar rechts vegen sluit, maar alleen vanaf de kop. Op het scrollgebied zou
  // het gebaar met horizontaal scrollende onderdelen vechten (de Instagram-rij),
  // en wie een lijst doorleest wil niet dat een schuine veeg zijn menu dichtgooit.
  const veegStartRef = useRef<{ x: number; y: number } | null>(null)
  const bijVeegStart = (e: React.TouchEvent) => {
    veegStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const bijVegen = (e: React.TouchEvent) => {
    const start = veegStartRef.current
    if (!start) return
    const dx = e.touches[0].clientX - start.x
    const dy = Math.abs(e.touches[0].clientY - start.y)
    // Duidelijk horizontaal, anders is het een scrollpoging.
    if (dx > 70 && dy < 40) {
      veegStartRef.current = null
      onClose()
    }
  }

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
        id="mobiel-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
        aria-hidden={!isOpen}
        data-mobile-menu={isOpen ? 'open' : 'closed'}
        // `inert` in plaats van alleen aria-hidden: met aria-hidden bleven de 22
        // links en knoppen gewoon bereikbaar met Tab. Zeven keer Tab vanaf de
        // pagina zette de focus op het logo ín het onzichtbare menu.
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-[110] flex w-[90%] max-w-[430px] transform flex-col bg-white transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${
          isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <h2 className="sr-only">{t('ariaLabel')}</h2>

        {/* [1] KOP — logo, zoeken, winkelwagen, sluiten.
            De winkelwagen stond hier niet, terwijl het tasje in de sitekop
            achter deze lade verdwijnt zodra hij opent. Wie iets in zijn mandje
            had, moest eerst het menu sluiten om erbij te komen. */}
        <header
          onTouchStart={bijVeegStart}
          onTouchMove={bijVegen}
          className="flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b-[3px] border-brand-primary bg-black px-3 text-white"
        >
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

            {/* Het tasje opent de winkelmandlade, net als in de header en net
                als bij elke grote herenwinkel. Het linkte hiervoor door naar
                /cart: je sprong dan uit het menu naar een hele pagina, en bij
                een lege mand stond je op een scherm zonder sluitknop en zonder
                weg terug, want een pagina heeft geen kruisje. De lade legt zich
                over de pagina waar je al was, en je sluit hem met het kruisje,
                met Escape of door naast de lade te tikken. */}
            <button
              type="button"
              onClick={() => {
                onClose()
                openDrawer()
              }}
              // Het aantal hoort in de NAAM, niet alleen in een badge: een
              // schermlezer leest een los getal naast een knop niet voor.
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
            </button>

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
        {/* [2] MERKREGEL — was een oneindig lopende marquee. Die begon bij
            openen midden in een woord ("FASHION | GEMAAKT IN GRONINGEN"),
            herhaalde beloftes die tien pixels lager nog een keer stonden
            ("VERZENDING IN 1-2 DAGEN" pal boven "MORGEN IN HUIS"), en bewegende
            tekst die langer dan vijf seconden doorloopt hoort een pauzeknop te
            hebben. Eén vaste regel met de scherpste claim doet hetzelfde werk,
            is op elk scherm volledig leesbaar en beweegt niet. */}
        {merkregel && (
          <div className="flex h-7 flex-shrink-0 items-center justify-center border-b-2 border-black bg-black px-3">
            <span className="truncate font-display text-[11px] uppercase tracking-[0.2em] text-white">
              {merkregel}
            </span>
          </div>
        )}

        {/* [3] BELOFTE — zwarte tekst op merkgroen (6,7:1). Wit haalde 3,13:1. */}
        <div
          role="note"
          className="flex h-9 flex-shrink-0 items-center justify-center border-b-2 border-black bg-brand-primary px-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-black"
        >
          {belofte}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
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

          {/* Plaatshouders zolang de producten onderweg zijn. Zonder dit zat er
              een gat tussen "Shop alles" en de pasvormregel dat zich daarna
              met 266px vulde, waardoor alles eronder versprong onder de duim
              van iemand die al aan het tikken was. */}
          {!productenGeladen && (
            <div
              aria-hidden="true"
              className="grid grid-cols-2 gap-[2px] border-b-2 border-black bg-black [@media(max-height:480px)]:grid-cols-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/3] bg-neutral-800" />
              ))}
            </div>
          )}

          {productenGeladen && producten.length > 0 && (
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
                        quality={90}
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

          {/* [6] VERHAAL — hier klapte de typografie om. Boven deze regel was
              alles Anton in hoofdletters, eronder ging alles over op een gewone
              letter met brede spatiëring, waarmee het merk halverwege het menu
              ophield. Lookbook en Over MOSE blijven nu in het display-lettertype
              en zijn duidelijk zwaarder dan de servicerijen eronder.

              Over MOSE krijgt de makersregel mee. Vier producten en twee makers
              is het enige in dit menu dat niemand kan kopiëren, en het stond
              alleen verstopt in een ticker. */}
          <LocaleLink
            href="/lookbook"
            onClick={onClose}
            aria-current={isHuidig('/lookbook') ? 'page' : undefined}
            className="group relative flex min-h-[60px] items-center justify-between gap-4 border-b-2 border-black px-4 py-3.5 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-brand-primary transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
            />
            <span className="font-display text-2xl uppercase leading-none tracking-tight">
              {tCommon('lookbook')}
            </span>
            <ArrowRight size={20} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
          </LocaleLink>

          <LocaleLink
            href="/over-mose"
            onClick={onClose}
            aria-current={isHuidig('/over-mose') ? 'page' : undefined}
            className="group relative flex min-h-[60px] items-center justify-between gap-4 border-b-2 border-black px-4 py-3 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-brand-primary transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
            />
            <span className="min-w-0">
              <span className="block font-display text-2xl uppercase leading-none tracking-tight">
                {tCommon('about')}
              </span>
              <span className="mt-1.5 block text-[11px] leading-none text-black/60 group-hover:text-white/70 group-focus-visible:text-white/70">
                {t('makers')}
              </span>
            </span>
            <ArrowRight size={20} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
          </LocaleLink>

          <LocaleLink
            href="/blog"
            onClick={onClose}
            aria-current={isHuidig('/blog') ? 'page' : undefined}
            className="group relative flex min-h-[48px] items-center justify-between gap-4 border-b-2 border-black px-4 py-2.5 transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-brand-primary transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
            />
            <span className="font-display text-lg uppercase leading-none tracking-tight">
              {tCommon('blog')}
            </span>
            <ArrowRight size={18} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
          </LocaleLink>

          {/* [7] SERVICE — eigen grijze ondergrond, zodat je in één oogopslag
              ziet dat dit een ander soort links zijn dan het merkverhaal
              erboven. Hiervoor stonden hier drie rasters van 50, 50 en 54px
              met zeven labels in hetzelfde formaat: zeven regels die allemaal
              even belangrijk leken.

              "Waar is mijn pakket" krijgt de volle breedte, want dat is bij
              verkeer uit advertenties de grootste echte taak in een menu. */}
          <div className="border-b-2 border-black bg-[#F4F4F2]">
            <LocaleLink
              href="/track-order"
              onClick={onClose}
              className="flex min-h-[48px] items-center gap-2.5 border-b border-black/15 px-4 text-[12px] font-bold uppercase tracking-[0.06em] transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
            >
              <Package size={17} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
              <span className="leading-tight">{t('help.track')}</span>
              <ArrowRight size={16} strokeWidth={2.5} className="ml-auto flex-shrink-0" aria-hidden="true" />
            </LocaleLink>

            <ul className="grid grid-cols-2">
              {[
                // `/returns` bestaat niet als pagina, alleen `/returns/new` en
                // `/returns/[id]`. Een link naar `/returns` gaf een 404 die
                // Next.js al bij het renderen ophaalde.
                { href: '/returns/new', label: t('help.returns'), Icon: Undo2 },
                { href: '/account', label: tCommon('account'), Icon: User },
                { href: '/wishlist', label: t('wishlist'), Icon: Heart },
                { href: '/contact', label: t('contact'), Icon: Mail },
              ].map((item, i) => (
                <li
                  key={item.href}
                  className={`${i % 2 === 0 ? 'border-r border-black/15' : ''} ${i < 2 ? 'border-b border-black/15' : ''}`}
                >
                  <LocaleLink
                    href={item.href}
                    onClick={onClose}
                    aria-current={isHuidig(item.href) ? 'page' : undefined}
                    className="flex min-h-[52px] flex-row items-center justify-center gap-2 px-2 text-center transition-colors hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none"
                  >
                    <item.Icon size={17} strokeWidth={2.2} aria-hidden="true" />
                    <span className="text-[11px] font-bold uppercase leading-tight tracking-[0.04em]">
                      {item.label}
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

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
