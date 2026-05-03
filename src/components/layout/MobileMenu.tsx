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
} from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'

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
 * Bug-fixes t.o.v. de oude inline menu in Header.tsx:
 *  - Eigen close-knop binnen de drawer (de hamburger zat onder
 *    de drawer en was niet bereikbaar zodra het menu open was).
 *  - Esc-toets sluit
 *  - Click-outside backdrop sluit (semi-transparante zwarte laag)
 *  - Body-scroll-lock zolang open
 *  - Focus-management: focus naar close-knop on open, restore on close
 *  - role="dialog" + aria-modal voor screenreaders
 *
 * Visueel ontwerp:
 *  [1] Sticky zwarte header (logo + close-X)
 *  [2] Groene tagline-eyebrow ("GEEN FAST FASHION • …")
 *  [3] Editorial mega-nav (5 items) met "01 — SHOP →"
 *  [4] 3 brutalist actie-tegels (ACCOUNT / WISHLIST / ZOEK)
 *  [5] Zwart manifest-blok ("100% gemaakt in Groningen …")
 *  [6] Socials + taal-toggle in compacte voet-rij
 *  [7] Signature © MOSE — MADE WITH 🐾
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

  // Email komt uit site_settings (admin-beheer); we vallen netjes terug
  // op de bekende fallback waarde wanneer de fetch (nog) niet klaar is.
  const [contactEmail, setContactEmail] = useState('info@mosewear.nl')

  // Fetch site-settings één keer bij mount. Niet wachten op open zodat
  // het email-adres direct correct is wanneer de drawer voor het eerst
  // opent — getSiteSettings is gecached in lib/settings dus dit is
  // effectief gratis na de eerste call van de page.
  useEffect(() => {
    let cancelled = false
    getSiteSettings()
      .then((s) => {
        if (!cancelled && s.contact_email) {
          setContactEmail(s.contact_email)
        }
      })
      .catch(() => {
        // bewust stil — fallback waarde is al gezet en valide
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

  // Hardcoded ticker-items uit de i18n messages. We lezen de array via
  // t.raw om next-intl's array-flow te respecteren (zonder typescast
  // valt 'ie terug op `string`).
  const tickerItems = useMemo(() => {
    const raw = t.raw('tickerItems') as string[] | undefined
    return Array.isArray(raw) ? raw : []
  }, [t])

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

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 w-full bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* [1] STICKY HEADER — zwarte balk met logo + close-X */}
        <header className="sticky top-0 z-10 bg-black text-white flex items-center justify-between gap-4 px-4 h-14 border-b-2 border-white">
          <LocaleLink
            href="/"
            onClick={onClose}
            className="flex items-center"
            aria-label="MOSE"
          >
            <Image
              src="/logomose.png"
              alt="MOSE"
              width={140}
              height={48}
              className="h-7 w-auto brightness-0 invert"
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
          {/* [2] GROENE TAGLINE-EYEBROW */}
          <div
            aria-hidden="true"
            className="bg-brand-primary text-white text-[10px] font-bold uppercase tracking-[0.22em] px-4 py-2.5 flex items-center justify-center gap-3 border-b-2 border-black overflow-hidden whitespace-nowrap"
          >
            {tickerItems.map((item, idx) => (
              <span key={idx} className="flex items-center gap-3">
                {idx > 0 && <span aria-hidden="true">•</span>}
                <span>{item}</span>
              </span>
            ))}
          </div>

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
                      {/* Groene linker-marker, alleen zichtbaar op
                          hover/focus voor een sterk MOSE-feel */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-top transition-transform duration-200"
                      />
                      <span className="flex items-baseline gap-3 md:gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-primary leading-none">
                          {number}
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

          {/* [4] SECONDARY ACTIONS — 3 gelijkwaardige tegels */}
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
              <User size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none">
                {tCommon('account')}
              </span>
            </LocaleLink>
            <LocaleLink
              href="/wishlist"
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-black px-2 py-4 hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none transition-colors"
            >
              <Heart size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none">
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
              <SearchIcon size={20} strokeWidth={2} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none">
                {t('search')}
              </span>
            </button>
          </div>

          {/* [5] BRAND MANIFEST — zwart blok met merk-DNA. Klikbaar als
              link naar /over-mose zodat het méér is dan een statement. */}
          <LocaleLink
            href="/over-mose"
            onClick={onClose}
            className="group relative block bg-black text-white px-5 py-6 border-b-2 border-black hover:bg-brand-primary focus-visible:bg-brand-primary focus-visible:outline-none transition-colors"
          >
            <div className="font-display uppercase text-lg leading-tight space-y-1">
              <p>{t('manifest.lineOne')}</p>
              <p>{t('manifest.lineTwo')}</p>
              <p className="text-brand-primary group-hover:text-white group-focus-visible:text-white transition-colors">
                {t('manifest.lineThree')}
              </p>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/70 group-hover:text-white transition-colors">
              <span>{t('manifest.cta')}</span>
              <ArrowRight
                size={14}
                strokeWidth={2.5}
                className="transform group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
          </LocaleLink>

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
