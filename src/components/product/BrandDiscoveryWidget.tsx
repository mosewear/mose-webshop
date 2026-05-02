'use client'

/**
 * BrandDiscoveryWidget
 *
 * Sticky pill bottom-left op de productpagina die onbekende bezoekers
 * met één klik kennis laat maken met MOSE. Toont de allernieuwste
 * Instagram-post als roterende thumbnail (3 posts crossfade), met de
 * tekst "WIE ZIJN WIJ? / Ontdek ons op Instagram". Klik opent een
 * modal met een gecondenseerde brand-story (`about_settings`) en de
 * 9 laatste IG-posts in een grid.
 *
 * Visibility-strategie:
 *   * Eerste 600ms na mount: opacity 0 + translate-y (rustige entry).
 *   * Cart drawer open: volledig verborgen (geen overlap met drawer).
 *   * Sticky variant-picker zichtbaar EN admin-toggle aan: pill
 *     SCHUIFT OMHOOG bovenop de picker zodat hij altijd in beeld
 *     blijft. Picker-detectie spiegelt StickyVariantPicker exact:
 *       - mobile: [data-sticky-picker-sentinel]
 *       - desktop: [data-pdp-main-atc]
 *   * prefers-reduced-motion: thumbnail-rotatie, pulse en hover-lift uit.
 *   * print: hidden — niet meeprinten op een product-aankoopbewijs.
 *
 * Discovery-laag (zodat bezoekers de pill ook ECHT zien):
 *   1. Live pulse-dot rechtsboven in de thumbnail — altijd-aan, ademend
 *      groen punt dat communiceert "deze knop leeft" (pauzeert bij
 *      reduced-motion).
 *   2. NIEUW-badge rechtsboven OP de pill — alleen wanneer de jongste
 *      IG-post < 48u oud is. Echte signal, geen ruis.
 *   3. One-shot speech-bubble bij eerste-scroll voorbij de hero —
 *      verschijnt naast (desktop) of boven (mobile) de pill, één keer
 *      per browser-sessie, met auto-dismiss na 5s of bij interactie.
 *
 * Engagement-collapse:
 *   Zodra de gebruiker de modal voor het eerst opent in deze sessie
 *   (`engaged` flag in sessionStorage = het toen-actieve design),
 *   schakelt de pill voor de rest van de sessie naar PillMini — een
 *   44/48px IG-tile. De pill blijft altijd in beeld én klikbaar
 *   (heropent de modal), maar claimt geen aandacht meer: bewustzijn
 *   is bereikt, dus rust mag. Persistent over PDP-navigatie binnen
 *   dezelfde tab.
 *
 *   Design-aware reset: wanneer de admin het pill-design aanpast
 *   matcht de opgeslagen design-string niet meer met het huidige.
 *   De engaged-status valt automatisch terug op false zodat de
 *   bezoeker het nieuwe ontwerp ECHT te zien krijgt — pas wanneer
 *   ze ook met de nieuwe look engagen, schakelt de pill weer mini.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import {
  Instagram,
  X,
  ArrowRight,
  ExternalLink,
  Heart,
  Film,
  Layers,
} from 'lucide-react'
import { useCartDrawer } from '@/store/cartDrawer'
import { Link as LocaleLink } from '@/i18n/routing'
import type { InstagramPost } from '@/lib/instagram/types'
import { getPillComponent, type PillDesignId } from './brand-pill'
import PillMini from './brand-pill/PillMini'

export interface BrandDiscoveryAbout {
  hero_image_url: string
  hero_image_url_mobile: string | null
  hero_alt: string
  story_title: string
  story_paragraph1: string
}

interface BrandDiscoveryWidgetProps {
  posts: InstagramPost[]
  about: BrandDiscoveryAbout
  igUrl: string
  /**
   * Of de StickyVariantPicker via de admin AAN staat. Wanneer `false`
   * is er geen picker om bovenop te zitten en moet de pill nooit
   * omhoog schuiven, ook al is de sentinel uit beeld.
   */
  pickerEnabled: boolean
  /**
   * Server-bepaald: de jongste IG-post is < 48u oud. Triggert de
   * "NIEUW"-badge en een aria-label upgrade voor screen readers.
   */
  isFresh: boolean
  /**
   * Welk visueel design de trigger-pill rendert. Default 'classic'.
   * Door de admin instelbaar via /admin/settings.
   */
  design: PillDesignId
  /**
   * IG-gebruikersnaam (zonder @), gebruikt door de Avatar-design
   * voor "@username" weergave. Default valt terug op "mosewearcom".
   */
  username: string
}

const ROTATION_INTERVAL_MS = 7000
const MOUNT_DELAY_MS = 600
const STORY_TRUNCATE = 280
const BUBBLE_TIMEOUT_MS = 5000
const BUBBLE_SESSION_KEY = 'mose:brand-pill-bubble-shown'
// Sessie-flag: zodra de gebruiker de modal voor het eerst opent
// schakelt de pill voor de rest van de sessie naar PillMini (kleine
// IG-tile). Bewustzijn is bereikt → de pill mag visueel rusten.
// Persistent over PDP-navigatie binnen dezelfde tab.
const ENGAGED_SESSION_KEY = 'mose:brand-pill-engaged'
// Custom event waarmee setEngaged() alle subscribers binnen dezelfde
// tab on-the-fly synchroniseert (sessionStorage zelf vuurt geen
// storage-event in dezelfde tab).
const ENGAGED_EVENT = 'mose:brand-engaged'
// Hardcoded shift-up afstanden. De StickyVariantPicker heeft een
// voorspelbare layout: desktop ~64-72px (één rij), mobile ~104-110px
// (twee rijen + CTA). Deze waarden geven daar een nette ~16-18px
// gap boven, en de transition vangt eventuele paar pixels verschil
// tussen producten op.
const SHIFT_UP_MOBILE_PX = 124
const SHIFT_UP_DESKTOP_PX = 88
const DEFAULT_BOTTOM_MOBILE_PX = 12 // bottom-3
const DEFAULT_BOTTOM_DESKTOP_PX = 16 // bottom-4

function localizedCaption(post: InstagramPost, locale: string): string | null {
  if (locale === 'en' && post.caption_en) return post.caption_en
  return post.caption || null
}

function truncate(input: string, max: number): string {
  if (!input) return ''
  // Editors mogen in /admin/about meerdere alinea's typen via lege
  // regels (`\n\n`). De brand-modal preview is één compact `<p>`,
  // dus we platten newlines hier naar enkele spaties zodat er geen
  // rauwe linebreaks of dubbele whitespace door de zin lopen.
  const flattened = input.replace(/\s*\n+\s*/g, ' ').trim()
  if (flattened.length <= max) return flattened
  return `${flattened.slice(0, max).trimEnd()}…`
}

/**
 * useMediaQuery via useSyncExternalStore — voorkomt het anti-pattern
 * van setState binnen useEffect en geeft directe waarden zonder een
 * extra render-flits. Server-side fallback is altijd `false` zodat de
 * eerste hydration matcht en we daarna naar de echte waarde "snappen".
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined') return () => undefined
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query]
  )
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }, [query])
  const getServerSnapshot = useCallback(() => false, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * useEngagedState — design-aware engagement-tracker.
 *
 * Slaat de design-ID op die actief was op het moment dat de gebruiker
 * de modal voor het eerst opende (i.p.v. een dom "1"). Engaged is
 * dan true ALLEEN wanneer het huidige (server-bepaalde) design
 * exact matcht met de opgeslagen waarde.
 *
 * Reden: als de admin het pill-design aanpast, moet die nieuwe design
 * weer als "verse discovery surface" gepresenteerd worden — anders
 * blijft een eerder geëngageerde sessie altijd op PillMini hangen en
 * krijgt de bezoeker het nieuwe ontwerp nooit te zien. Bij design-
 * mismatch valt engaged terug op false en rendert de full pill weer
 * tot de gebruiker opnieuw engaget met de nieuwe look.
 *
 * SSR-veilig via useSyncExternalStore en cross-instance sync via
 * een custom 'mose:brand-engaged' event.
 */
function useEngagedState(
  currentDesign: PillDesignId
): [boolean, () => void] {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window === 'undefined') return () => undefined
    window.addEventListener(ENGAGED_EVENT, onChange)
    // storage-event vuurt alleen tussen tabs; voor cross-tab sync
    // (iemand opent in een andere tab) blijven we daar ook naar luisteren.
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(ENGAGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return ''
    try {
      return window.sessionStorage.getItem(ENGAGED_SESSION_KEY) ?? ''
    } catch {
      return ''
    }
  }, [])
  const getServerSnapshot = useCallback(() => '', [])
  const storedDesign = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  // Engaged alleen wanneer het opgeslagen design EXACT overeenkomt
  // met het huidige design. Lege string of andere design ⇒ niet engaged
  // ⇒ full pill rendert opnieuw.
  const engaged = storedDesign !== '' && storedDesign === currentDesign
  const setEngaged = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(ENGAGED_SESSION_KEY, currentDesign)
    } catch {
      // Private mode: prima, dan blijft engaged binnen deze widget
      // alleen via event-broadcast levend (zonder persistentie).
    }
    window.dispatchEvent(new Event(ENGAGED_EVENT))
  }, [currentDesign])
  return [engaged, setEngaged]
}

export default function BrandDiscoveryWidget({
  posts,
  about,
  igUrl,
  pickerEnabled,
  isFresh,
  design,
  username,
}: BrandDiscoveryWidgetProps) {
  const t = useTranslations('product.brandWidget')
  const tModal = useTranslations('product.brandModal')
  const tIg = useTranslations('homepage.instagram')
  const locale = useLocale()
  const { isOpen: cartOpen } = useCartDrawer()

  const [mounted, setMounted] = useState(false)
  // Picker-detectie spiegelt StickyVariantPicker exact.
  const [sentinelInView, setSentinelInView] = useState(true)
  const [mainAtcInView, setMainAtcInView] = useState(true)
  // Media queries via useSyncExternalStore om re-render-loops in useEffect
  // (en de bijhorende eslint react-hooks/set-state-in-effect) te vermijden.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  // Engaged = gebruiker heeft de modal al geopend deze sessie ÉN het
  // toen-actieve design is nog steeds het huidige. Bij admin design-
  // change resetting we automatisch naar non-engaged zodat het nieuwe
  // ontwerp ook ECHT door de bezoeker gezien wordt.
  const [engaged, setEngaged] = useEngagedState(design)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // Onthoud of we de bubble in deze widget-instance al getriggerd
  // hebben, los van sessionStorage — voorkomt dubbele triggers binnen
  // dezelfde page-load (bv. bij snelle scroll up/down).
  const bubbleTriggeredRef = useRef(false)

  // Eerste 3 posts voor de rotatie, eerste 9 voor het grid.
  const rotationPosts = useMemo(() => posts.slice(0, 3), [posts])
  const gridPosts = useMemo(() => posts.slice(0, 9), [posts])

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), MOUNT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Mobile: observe de sentinel die StickyVariantPicker ook gebruikt.
  // De sentinel zit boven de gallery; zodra hij uit beeld is weten we
  // dat de picker actief wordt EN dat de gebruiker engaged is met
  // het product (trigger voor de speech-bubble).
  useEffect(() => {
    if (typeof window === 'undefined') return

    let observer: IntersectionObserver | null = null
    let attempt = 0

    const attach = () => {
      const node = document.querySelector<HTMLElement>(
        '[data-sticky-picker-sentinel]'
      )
      if (!node) {
        if (attempt < 20) {
          attempt += 1
          window.setTimeout(attach, 100)
        }
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry) setSentinelInView(entry.isIntersecting)
        },
        { threshold: 0 }
      )
      observer.observe(node)
    }

    attach()
    return () => observer?.disconnect()
  }, [])

  // Desktop: observe de hoofd-ATC. Wanneer hij uit beeld is, toont
  // StickyVariantPicker zichzelf en moet de pill omhoog schuiven.
  useEffect(() => {
    if (typeof window === 'undefined') return

    let observer: IntersectionObserver | null = null
    let attempt = 0

    const attach = () => {
      const node = document.querySelector<HTMLElement>('[data-pdp-main-atc]')
      if (!node) {
        if (attempt < 20) {
          attempt += 1
          window.setTimeout(attach, 100)
        }
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry) setMainAtcInView(entry.isIntersecting)
        },
        { threshold: 0, rootMargin: '0px 0px -40px 0px' }
      )
      observer.observe(node)
    }

    attach()
    return () => observer?.disconnect()
  }, [])

  // De picker is alleen "in de weg" wanneer hij OOK door de admin is
  // aangezet. Anders rendert StickyVariantPicker null en hoeft de pill
  // dus niet omhoog te schuiven, zelfs als de sentinel uit beeld is.
  const pickerVisible =
    pickerEnabled && (isDesktop ? !mainAtcInView : !sentinelInView)

  // Rotatie van de thumbnail. Pauzeert wanneer modal open of bij
  // reduced-motion zodat we niet onnodig animeren.
  useEffect(() => {
    if (rotationPosts.length < 2) return
    if (modalOpen || reducedMotion) return

    const interval = window.setInterval(() => {
      setCurrentIdx((idx) => (idx + 1) % rotationPosts.length)
    }, ROTATION_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [rotationPosts.length, modalOpen, reducedMotion])

  // Esc-toets sluit modal + body-scroll-lock + focus restoration. We
  // onthouden welk element focus had voor de modal opende, zodat we
  // bij sluiten netjes terug-focussen (default = onze trigger pill).
  useEffect(() => {
    if (!modalOpen) return

    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      const target = triggerRef.current ?? previousActive
      target?.focus({ preventScroll: true })
    }
  }, [modalOpen])

  // Speech-bubble trigger: één keer per sessie, op de eerste keer dat
  // de gebruiker voorbij de hero scrolt (= sentinel verlaat het
  // viewport). We checken sessionStorage zodat een refresh / nieuwe
  // PDP geen nieuwe bubble triggert. Dismiss-mechanismen:
  //   * 5s timer (auto)
  //   * Pill click (handleOpen)
  //   * Pill mouseenter (heeft de boodschap gezien)
  //   * Cart drawer open (geen overlap met drawer)
  //   * Modal open (cleanup van useEffect)
  useEffect(() => {
    if (!mounted) return
    if (engaged) return
    if (sentinelInView) return
    if (cartOpen || modalOpen) return
    if (bubbleTriggeredRef.current) return
    if (typeof window === 'undefined') return

    try {
      if (window.sessionStorage.getItem(BUBBLE_SESSION_KEY) === '1') return
      window.sessionStorage.setItem(BUBBLE_SESSION_KEY, '1')
    } catch {
      // Private mode of geen storage permission: stilletjes doorgaan
      // zonder gate, zodat de bubble in elk geval één keer toont.
    }

    bubbleTriggeredRef.current = true
    setBubbleVisible(true)

    const timer = window.setTimeout(
      () => setBubbleVisible(false),
      BUBBLE_TIMEOUT_MS
    )
    return () => window.clearTimeout(timer)
  }, [mounted, engaged, sentinelInView, cartOpen, modalOpen])

  // Veiligheidsnet: dismiss bubble proactief wanneer cart of modal
  // opent terwijl 'ie nog zichtbaar is.
  useEffect(() => {
    if (cartOpen || modalOpen) setBubbleVisible(false)
  }, [cartOpen, modalOpen])

  const handleOpen = useCallback(() => {
    setBubbleVisible(false)
    setModalOpen(true)
    // Markeer de sessie als "engaged" zodat de pill na het sluiten
    // van de modal in compact mode (PillMini) verder leeft.
    setEngaged()
  }, [setEngaged])
  const handleClose = useCallback(() => setModalOpen(false), [])
  const handlePillMouseEnter = useCallback(() => setBubbleVisible(false), [])

  // Veiligheidsklep: als er om wat voor reden geen posts zijn (server
  // hoort dat al af te vangen) renderen we niets.
  if (rotationPosts.length === 0) return null

  // Twee onafhankelijke gedragingen:
  //   visible — gebruikt voor opacity/translate/pointer-events op de
  //             pill. Verbergt pill volledig wanneer cart drawer open
  //             is of we nog in de mount-delay zitten.
  //   shifted — gebruikt voor het verticaal positioneren van de pill
  //             (default vs. bovenop de variant-picker).
  const visible = mounted && !cartOpen
  const shifted = pickerVisible

  const bottomPx = shifted
    ? isDesktop
      ? SHIFT_UP_DESKTOP_PX
      : SHIFT_UP_MOBILE_PX
    : isDesktop
      ? DEFAULT_BOTTOM_DESKTOP_PX
      : DEFAULT_BOTTOM_MOBILE_PX

  // Bubble alleen wanneer NIET engaged — als de gebruiker de modal al
  // heeft geopend kennen ze de pill, dan is een nudge dubbelop.
  const showBubble = bubbleVisible && visible && !modalOpen && !engaged
  const ariaLabel = isFresh ? t('ariaFresh') : t('aria')

  // Engaged → altijd PillMini (sessie-rust). Anders: het door de
  // admin gekozen design. Onbekende design-waarden vallen via
  // getPillComponent terug op Classic.
  const PillComponent = engaged ? PillMini : getPillComponent(design)

  return (
    <>
      <div
        // Wrapper is fixed en verzorgt de bottom-positie + transition.
        // Pill en bubble zitten erin als positioned children, zodat de
        // bubble altijd correct relatief aan de pill verschijnt — ook
        // wanneer de pill omhoog schuift bovenop de variant-picker.
        className="fixed left-3 md:left-4 z-30 transition-[bottom] duration-300 ease-out motion-reduce:transition-none print:hidden"
        style={{ bottom: `${bottomPx}px` }}
      >
        <PillComponent
          posts={rotationPosts}
          currentIdx={currentIdx}
          isFresh={isFresh}
          headline={t('headline')}
          subline={t('subline')}
          sublineShort={t('sublineShort')}
          tagline={t('tagline')}
          freshLabel={t('freshLabel')}
          username={username}
          ariaLabel={ariaLabel}
          ariaExpanded={modalOpen}
          onClick={handleOpen}
          onMouseEnter={handlePillMouseEnter}
          triggerRef={triggerRef}
          visible={visible}
        />

        {/* Speech-bubble — verschijnt boven (mobile) of rechts
            (desktop) van de pill bij eerste-scroll voorbij de hero.
            Klikbaar (opent modal) maar uit de tab-order zodat we de
            keyboard-flow niet vervuilen. */}
        {showBubble && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={handleOpen}
            className="group/bubble absolute left-0 bottom-full mb-3 md:mb-0 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3 bg-white border-2 border-black px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] text-[11px] md:text-xs font-bold uppercase tracking-[0.08em] text-black whitespace-nowrap motion-safe:animate-bubblePop origin-bottom md:origin-left cursor-pointer hover:bg-black hover:text-white transition-colors motion-reduce:transition-none"
          >
            <span className="flex items-center gap-1.5">
              <span>{t('bubble')}</span>
              <ArrowRight
                size={12}
                aria-hidden="true"
                className="text-brand-primary group-hover/bubble:text-white transition-colors motion-reduce:transition-none"
              />
            </span>
          </button>
        )}
      </div>

      {modalOpen && (
        <BrandDiscoveryModal
          about={about}
          posts={gridPosts}
          igUrl={igUrl}
          locale={locale}
          isDesktop={isDesktop}
          onClose={handleClose}
          tModalEyebrow={tModal('eyebrow')}
          tModalLatestPosts={tModal('latestPosts')}
          tModalIgCta={tModal('igCta')}
          tModalAboutCta={tModal('aboutCta')}
          tModalCloseAria={tModal('closeAria')}
          tIgViewPost={tIg('viewPost')}
        />
      )}
    </>
  )
}

interface BrandDiscoveryModalProps {
  about: BrandDiscoveryAbout
  posts: InstagramPost[]
  igUrl: string
  locale: string
  isDesktop: boolean
  onClose: () => void
  tModalEyebrow: string
  tModalLatestPosts: string
  tModalIgCta: string
  tModalAboutCta: string
  tModalCloseAria: string
  tIgViewPost: string
}

function BrandDiscoveryModal({
  about,
  posts,
  igUrl,
  locale,
  isDesktop,
  onClose,
  tModalEyebrow,
  tModalLatestPosts,
  tModalIgCta,
  tModalAboutCta,
  tModalCloseAria,
  tIgViewPost,
}: BrandDiscoveryModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  // Focus de close-knop bij open zodat keyboard- en schermlezer-
  // gebruikers meteen weten waar ze zijn.
  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [])

  // Focus-trap binnen de modal-card. Tab vanaf laatst → eerst, en
  // Shift+Tab vanaf eerst → laatst, zodat focus nooit ontsnapt naar
  // de pagina achter de modal.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    card.addEventListener('keydown', handler)
    return () => card.removeEventListener('keydown', handler)
  }, [])

  // Mobile gebruikt de mobiele hero (portrait crop) wanneer beschikbaar,
  // desktop pakt altijd de landscape hero.
  const heroSrc = isDesktop
    ? about.hero_image_url
    : about.hero_image_url_mobile || about.hero_image_url

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-discovery-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn print:hidden"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="relative bg-white border-4 border-black w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close-knop zit OP de modal-card (relative parent), niet in
            de scrollende inner. Zo blijft hij altijd in beeld als de
            gebruiker door de modal-content scrolt. */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={tModalCloseAria}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-10 h-10 flex items-center justify-center bg-white border-2 border-black hover:bg-black hover:text-white transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Inner scroll-container — alle inhoud die kan scrollen.
            We gebruiken dynamic viewport units (dvh) zodat de modal
            niet "jojoot" wanneer iOS Safari z'n address-bar in/uit
            laat klappen tijdens scroll. */}
        <div className="max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto overscroll-contain">
          {/* Hero met overlay-titel */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-gray-200">
            <Image
              src={heroSrc}
              alt={about.hero_alt || ''}
              fill
              sizes="(min-width: 768px) 672px, 100vw"
              unoptimized={!heroSrc.includes('supabase')}
              priority
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10"
            />
            <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 pb-4 sm:pb-6 pr-16 sm:pr-20">
              <p className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/85 mb-2">
                <Instagram size={12} aria-hidden="true" />
                <span>{tModalEyebrow}</span>
              </p>
              <h2
                id="brand-discovery-modal-title"
                className="font-display text-3xl sm:text-4xl md:text-5xl uppercase leading-[0.95] text-white"
              >
                {about.story_title}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8 space-y-6 sm:space-y-8">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              {truncate(about.story_paragraph1, STORY_TRUNCATE)}
            </p>

            {posts.length > 0 && (
              <div>
                <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3 sm:mb-4 flex items-center gap-2">
                  <Instagram size={12} aria-hidden="true" />
                  <span>{tModalLatestPosts}</span>
                </h3>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {posts.map((post) => {
                    const caption = localizedCaption(post, locale)
                    const ariaLabel = caption
                      ? `${tIgViewPost} — ${caption.slice(0, 80)}`
                      : tIgViewPost
                    const src =
                      post.media_type === 'VIDEO' && post.thumbnail_url
                        ? post.thumbnail_url
                        : post.media_url
                    return (
                      <a
                        key={post.id}
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ariaLabel}
                        className="group relative aspect-square border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 200px, 33vw"
                          unoptimized={!src.includes('supabase')}
                          loading="lazy"
                          className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
                        />
                        {post.media_type !== 'IMAGE' && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1 right-1 bg-white border-2 border-black p-0.5 leading-none"
                          >
                            {post.media_type === 'VIDEO' ? (
                              <Film size={10} />
                            ) : (
                              <Layers size={10} />
                            )}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none flex items-end justify-between gap-1 p-1.5 text-white text-[10px] font-bold"
                        >
                          <Instagram size={12} aria-hidden="true" />
                          {typeof post.like_count === 'number' && post.like_count > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Heart size={10} className="fill-current" />
                              {post.like_count.toLocaleString(locale)}
                            </span>
                          )}
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider border-2 border-black hover:bg-brand-primary-hover transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
              >
                <Instagram size={18} aria-hidden="true" />
                <span>{tModalIgCta}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <LocaleLink
                href="/over-mose"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-black font-bold text-sm uppercase tracking-wider border-2 border-black hover:bg-black hover:text-white transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40"
              >
                <span>{tModalAboutCta}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </LocaleLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
