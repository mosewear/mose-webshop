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
  Instagram,
  Mail,
  Truck,
} from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import MobileMenuInstagramRow from '@/components/layout/MobileMenuInstagramRow'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  /** Wordt gecalled wanneer de gebruiker op de "ZOEK"-tegel tapt. De
   *  parent (Header) is verantwoordelijk voor het tonen van de
   *  SearchOverlay; dit menu sluit zichzelf direct en delegeert. */
  onOpenSearch: () => void
}

const NAV_ITEMS: ReadonlyArray<{
  href: string
  /** Key in `common`-namespace voor het label */
  labelKey: 'shop' | 'lookbook' | 'blog' | 'about' | 'contact'
}> = [
  { href: '/shop', labelKey: 'shop' },
  { href: '/lookbook', labelKey: 'lookbook' },
  { href: '/blog', labelKey: 'blog' },
  { href: '/over-mose', labelKey: 'about' },
  { href: '/contact', labelKey: 'contact' },
] as const

const LANGUAGES = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
] as const

const INSTAGRAM_URL = 'https://instagram.com/mosewearcom'

/**
 * MOSE STATEMENT DRAWER — full-bleed brutalist mobile menu.
 *
 * UX-fundamenten (allemaal aanwezig):
 *  - Eigen close-knop binnen de drawer (de hamburger zat onder
 *    de drawer en was niet bereikbaar zodra het menu open was).
 *  - Esc-toets sluit
 *  - Click-outside backdrop sluit (semi-transparante zwarte laag)
 *  - Body-scroll-lock zolang open
 *  - Focus-management: focus naar close-knop on open, restore on close
 *  - role="dialog" + aria-modal voor screenreaders
 *  - Auto-close bij pathname-change (covers in-menu links + back/fwd)
 *
 * Visueel ontwerp (boven → onder):
 *  [1]   Sticky zwarte header (logo + close-X)
 *  [2]   Animated marquee-ticker (zwart-wit tape-strip met MOSE-waarden)
 *  [3]   Editorial mega-nav (5 items) met "01 — SHOP →" + stagger
 *  [3.5] Gratis-verzending-pill (smart, leest free_shipping_threshold)
 *  [4]   3 brutalist actie-tegels (ACCOUNT / WISHLIST / ZOEK)
 *  [5]   Live Instagram-rij (hergebruikt /api/instagram/feed)
 *  [6]   Socials + taal-toggle in compacte voet-rij
 *  [7]   Signature © MOSE — MADE WITH 🐾
 */
export default function MobileMenu({
  isOpen,
  onClose,
  onOpenSearch,
}: MobileMenuProps) {
  const t = useTranslations('mobileMenu')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  // Site-settings: email + free-shipping threshold worden beide gebruikt
  // in respectievelijk de socials-rij en de gratis-verzending-pill. We
  // fetchen één keer bij mount en vallen netjes terug op sane defaults.
  const [contactEmail, setContactEmail] = useState('info@mosewear.nl')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(100)

  useEffect(() => {
    let cancelled = false
    getSiteSettings()
      .then((s) => {
        if (cancelled) return
        if (s.contact_email) setContactEmail(s.contact_email)
        if (typeof s.free_shipping_threshold === 'number') {
          setFreeShippingThreshold(s.free_shipping_threshold)
        }
      })
      .catch(() => {
        // bewust stil — defaults zijn al geldig
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Refs voor focus-management. previousActiveRef onthoudt welk element
  // de focus had vóór de drawer opende (meestal de hamburger-knop), en
  // closeBtnRef krijgt focus bij open zodat keyboard-users meteen Esc
  // kunnen gebruiken én de tab-volgorde logisch begint bovenaan.
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)

  // Body-scroll-lock + Esc-handler + focus-trap-light + restore. Eén
  // effect zodat lifecycle samenhangt met de "is open"-status.
  useEffect(() => {
    if (!isOpen) return

    previousActiveRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(() => {
      closeBtnRef.current?.focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      previousActiveRef.current?.focus({ preventScroll: true })
    }
  }, [isOpen, onClose])

  // Sluit het menu wanneer de gebruiker naar een andere route navigeert
  // (bv. door op SHOP te klikken). Pathname-change is onze trigger; we
  // doen dit als effect zodat we GEEN onClick-handler hoeven te plaatsen
  // op elke individuele Link én zodat we ook closen als de route via
  // de browser-back/forward verandert.
  useEffect(() => {
    if (isOpen) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Ticker-items komen uit de i18n messages (array). Voor de marquee
  // duplicaten we de set 2× zodat de animatie naadloos kan loopen
  // (translateX 0 → -50% in CSS verlegt de tweede set exact op de
  // startpositie van de eerste). Dit is hetzelfde patroon als
  // PillTicker / InstagramMarquee elders in de codebase.
  const tickerItems = useMemo(() => {
    const raw = t.raw('tickerItems') as string[] | undefined
    return Array.isArray(raw) ? raw : []
  }, [t])

  // Smart label voor de gratis-verzending pill. De admin bepaalt het
  // gedrag via free_shipping_threshold:
  //   - 0 (of <= 0): "Altijd gratis verzending"
  //   - > 0:         "Gratis verzending vanaf €X"
  // Zo blijft de pill altijd accuraat zonder dat we hem hardcoden.
  const shippingLabel = useMemo(() => {
    if (freeShippingThreshold <= 0) return t('freeShipping.always')
    return t('freeShipping.fromAmount', {
      amount: Number.isInteger(freeShippingThreshold)
        ? freeShippingThreshold.toString()
        : freeShippingThreshold.toFixed(2),
    })
  }, [freeShippingThreshold, t])

  const handleLanguageSwitch = (newLocale: string) => {
    if (newLocale === locale) return
    router.replace(pathname, { locale: newLocale })
    onClose()
  }

  return (
    <>
      {/* Backdrop: tap-buiten-sluit + scroll-block. We renderen dit
          ook in "gesloten"-state als pointer-events:none zodat de
          fade-out animatie netjes uitloopt zonder layout-jump. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer.
          data-mobile-menu="open|closed" wordt opgepikt door ChatButton
          (en eventueel andere overlays in de toekomst) zodat zwevende
          UI netjes verbergt zolang dit menu open staat — analoog aan
          hoe ChatButton al checkt op data-filter-drawer / data-cart-
          drawer. We gebruiken een waarde i.p.v. enkel presence omdat
          het menu altijd in de DOM staat (off-canvas via translate). */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
        aria-hidden={!isOpen}
        data-mobile-menu={isOpen ? 'open' : 'closed'}
        className={`fixed inset-y-0 right-0 z-50 w-full bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* [1] STICKY HEADER — zwarte balk met logo + close-X. De
            groene 3px scheidingslijn beneden matched de signatuur uit
            de shop-hero (`border-b-4 border-brand-primary`) en geeft
            direct merk-cue zodra het menu opent. */}
        <header className="sticky top-0 z-10 bg-black text-white flex items-center justify-between gap-4 px-4 h-14 border-b-[3px] border-brand-primary">
          <LocaleLink
            href="/"
            onClick={onClose}
            className="flex items-center"
            aria-label="MOSE"
          >
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={160}
              height={56}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
          </LocaleLink>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t('closeAria')}
            className="inline-flex items-center gap-2 border-2 border-white text-white px-3 h-9 text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
          >
            <span className="hidden sm:inline">{t('closeShort')}</span>
            <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable content area onder de sticky header. We zetten
            de overscroll-behavior op contain zodat scrolling NIET door-
            geeft naar de pagina eronder (extra failsafe naast de body-
            scroll-lock). */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* [2] ANIMATED MARQUEE-TICKER — brutalist tape-strip op het
              wit-canvas (consistent met shop/PDP/home, die allemaal wit
              + zwarte borders + groene accents als handtekening hebben).
              Twee identieke sets achter elkaar zodat translateX(-50%)
              een naadloze loop oplevert. Reduced-motion → animatie uit,
              tweede set verborgen, eerste set blijft statisch leesbaar.
              Alleen renderen als er items zijn (defensive: lege i18n
              array zou anders een lege balk geven). */}
          {tickerItems.length > 0 && (
            <div
              role="region"
              aria-label={t('tickerAria')}
              className="relative bg-white text-black border-b-2 border-black overflow-hidden"
              // Custom marquee-snelheid voor deze instance (kort en
              // levendig). Globale default in globals.css = 60s.
              style={{ ['--marquee-duration' as string]: '24s' }}
            >
              <div className="flex w-max motion-safe:animate-marquee will-change-transform py-2.5">
                <TickerSet items={tickerItems} />
                <TickerSet items={tickerItems} ariaHidden />
              </div>
              {/* Subtiele fade-edges links/rechts zodat de tekst niet
                  hard wegknipt; pointer-events:none zodat ze geen taps
                  eten. */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none"
              />
            </div>
          )}

          {/* [3] PRIMARY NAVIGATION — editorial mega-items met
              stagger-fade-in. We gebruiken inline animationDelay zodat
              elk item ~50ms later inkomt; werkt out-of-the-box met
              de bestaande `animate-fadeIn` keyframe in tailwind config. */}
          <nav aria-label={t('navAria')}>
            <ol className="divide-y-2 divide-black border-b-2 border-black">
              {NAV_ITEMS.map((item, idx) => {
                const number = String(idx + 1).padStart(2, '0')
                return (
                  <li
                    key={item.href}
                    // Stagger fade-in alleen wanneer drawer open is.
                    // animation-fill-mode 'both' = backwards (opacity 0
                    // tijdens delay) + forwards (opacity 1 na animatie),
                    // dus geen flikker en geen FOUC. Bij gesloten drawer
                    // OF prefers-reduced-motion is opacity standaard 1
                    // (geen animation actief), dus altijd zichtbaar als
                    // de drawer al rendered is.
                    className={isOpen ? 'animate-fadeIn' : undefined}
                    style={
                      isOpen
                        ? {
                            animationDelay: `${80 + idx * 55}ms`,
                            animationFillMode: 'both',
                          }
                        : undefined
                    }
                  >
                    <LocaleLink
                      href={item.href}
                      onClick={onClose}
                      className="group relative flex items-center justify-between gap-4 px-5 py-5 bg-white hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
                    >
                      {/* Groene linker-marker. 3px (in plaats van 1px)
                          maakt 'm op hover/focus visueel volwaardig
                          gelijkwaardig aan de PDP-CTA accent-bar en de
                          shop-filter-borders, en blijft als brutalist
                          accent leesbaar op zwart hover-canvas. */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-primary scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-top transition-transform duration-200"
                      />
                      <span className="flex items-baseline gap-3 md:gap-4">
                        {/* Editorial-binding: nummer + em-dash + label.
                            Tracking 0.2em matched de site-brede eyebrow-
                            standard (PDP, ProductReviews, IG-eyebrow).
                            De em-dash visualiseert de relatie tussen
                            nummer en titel — herkenbaar magazine-patroon. */}
                        <span className="inline-flex items-baseline gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
                          <span>{number}</span>
                          <span aria-hidden="true" className="opacity-70">
                            —
                          </span>
                        </span>
                        <span className="font-display text-2xl md:text-3xl uppercase tracking-tight leading-none">
                          {tCommon(item.labelKey)}
                        </span>
                      </span>
                      <ArrowRight
                        size={22}
                        strokeWidth={2.5}
                        className="flex-shrink-0 transform group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 transition-transform"
                        aria-hidden="true"
                      />
                    </LocaleLink>
                  </li>
                )
              })}
            </ol>
          </nav>

          {/* [3.5] SHIPPING PILL — conversion-cue direct onder de
              primary nav. Full-width brutalist statement-strip i.p.v.
              een kleine inline pill: visueel volwaardig blok dat ritme
              maakt tussen de nav-rij en de actie-tegels. Matched de
              uitstraling van de primary CTA's op PDP/checkout (groen
              + zwart border + uppercase + 0.2em tracking). */}
          <div
            role="note"
            className="flex items-center justify-center gap-2.5 px-4 py-3 border-b-2 border-black bg-brand-primary text-white"
          >
            <Truck size={16} strokeWidth={2.5} aria-hidden="true" />
            <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] leading-none">
              {shippingLabel}
            </span>
          </div>

          {/* [4] SECONDARY ACTIONS — 3 gelijkwaardige tegels.
              text-[11px] + tracking-[0.2em] + 22px-icons matched de
              standaard chip/utility-styling op PDP en shop-filters. */}
          <div
            className="grid grid-cols-3 gap-2 p-4 border-b-2 border-black"
            aria-label={t('actionsAria')}
            role="group"
          >
            <LocaleLink
              href="/account"
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-black px-2 py-4 hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
            >
              <User size={22} strokeWidth={2} aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] leading-none">
                {tCommon('account')}
              </span>
            </LocaleLink>
            <LocaleLink
              href="/wishlist"
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-black px-2 py-4 hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
            >
              <Heart size={22} strokeWidth={2} aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] leading-none">
                {tCommon('wishlist')}
              </span>
            </LocaleLink>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenSearch()
              }}
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-black px-2 py-4 hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
              aria-label={tCommon('search')}
            >
              <SearchIcon size={22} strokeWidth={2} aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] leading-none">
                {t('search')}
              </span>
            </button>
          </div>

          {/* [5] LIVE INSTAGRAM-RIJ — community-vibe in MOSE-stijl.
              Hergebruikt de bestaande IG-feed data (cached). Lazy-fetch:
              de eerste keer dat het menu opent triggeren we de call,
              daarna blijft de data in-memory. Rendert null als de admin
              de feed disabled heeft of als het menu nog nooit open is
              geweest. Eigen border-b + empty/skeleton zit in component. */}
          <MobileMenuInstagramRow isOpen={isOpen} />

          {/* [6] SOCIALS + TAAL — compacte footer-rij */}
          <div className="flex items-center justify-between gap-4 px-4 py-4 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('social.instagram')}
                className="inline-flex items-center justify-center w-11 h-11 border-2 border-black hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
              >
                <Instagram size={18} strokeWidth={2} aria-hidden="true" />
              </a>
              <a
                href={`mailto:${contactEmail}`}
                aria-label={t('social.email')}
                className="inline-flex items-center justify-center w-11 h-11 border-2 border-black hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
              >
                <Mail size={18} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>

            {/* Taal-toggle — twee gelijkwaardige knoppen, brutalist
                segmented control met 2px zwarte border. Geen dropdown,
                geen overlay-binnen-overlay; gewoon NL · EN. */}
            <div
              role="group"
              aria-label={t('language.label')}
              className="inline-flex border-2 border-black"
            >
              {LANGUAGES.map((lang) => {
                const active = lang.code === locale
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageSwitch(lang.code)}
                    aria-label={t('language.switchTo', { label: lang.label })}
                    aria-pressed={active}
                    className={`px-3 h-9 text-xs font-bold uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors ${
                      active
                        ? 'bg-black text-white cursor-default'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {lang.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* [7] SIGNATURE — micro-mini footer-noot */}
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">
              {t('signature', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

/**
 * Eén kopie van de marquee-tekst-set. Wordt 2× gerenderd door de
 * parent zodat translateX(0) → translateX(-50%) een naadloze loop is.
 * Items worden gescheiden door een groene • bullet — kleine highlight
 * van het brand-primary in een verder zwart-wit element.
 */
function TickerSet({
  items,
  ariaHidden = false,
}: {
  items: string[]
  ariaHidden?: boolean
}) {
  return (
    <div
      // Bij ariaHidden negeert AT deze duplicate; eerste set blijft de
      // canonical voor screen readers. Reduced-motion verbergt 'm via
      // motion-reduce:hidden zodat enkel de eerste set in beeld blijft.
      aria-hidden={ariaHidden ? 'true' : undefined}
      className={`flex items-center shrink-0 ${ariaHidden ? 'motion-reduce:hidden' : ''}`}
    >
      {items.map((item, idx) => (
        <span
          key={`${ariaHidden ? 'b' : 'a'}-${idx}`}
          className="flex items-center gap-3 pr-6 text-[10px] font-bold uppercase tracking-[0.22em] whitespace-nowrap"
        >
          <span aria-hidden="true" className="text-brand-primary leading-none">
            •
          </span>
          <span>{item}</span>
        </span>
      ))}
    </div>
  )
}
