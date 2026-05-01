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
 *   * Sticky variant-picker zichtbaar: pill SCHUIFT OMHOOG bovenop de
 *     picker zodat hij altijd in beeld blijft, net zoals de gebruiker
 *     verwachtte ("altijd in beeld"). De picker-detectie spiegelt
 *     StickyVariantPicker exact:
 *       - mobile: [data-sticky-picker-sentinel]
 *       - desktop: [data-pdp-main-atc]
 *   * prefers-reduced-motion: thumbnail-rotatie en hover-lift uit.
 *   * print: hidden — niet meeprinten op een product-aankoopbewijs.
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
}

const ROTATION_INTERVAL_MS = 7000
const MOUNT_DELAY_MS = 600
const STORY_TRUNCATE = 280
// Hardcoded shift-up afstanden. De StickyVariantPicker heeft een
// voorspelbare layout: desktop ~64-72px (één rij), mobile ~104-110px
// (twee rijen + CTA). Deze waarden geven daar een nette ~16-18px
// gap boven, en de transition vangt eventuele paar pixels verschil
// tussen producten op.
const SHIFT_UP_MOBILE_PX = 124
const SHIFT_UP_DESKTOP_PX = 88

function localizedCaption(post: InstagramPost, locale: string): string | null {
  if (locale === 'en' && post.caption_en) return post.caption_en
  return post.caption || null
}

function truncate(input: string, max: number): string {
  if (!input) return ''
  if (input.length <= max) return input
  return `${input.slice(0, max).trimEnd()}…`
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

export default function BrandDiscoveryWidget({
  posts,
  about,
  igUrl,
  pickerEnabled,
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
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Eerste 3 posts voor de rotatie, eerste 9 voor het grid.
  const rotationPosts = useMemo(() => posts.slice(0, 3), [posts])
  const gridPosts = useMemo(() => posts.slice(0, 9), [posts])

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), MOUNT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Mobile: observe de sentinel die StickyVariantPicker ook gebruikt.
  // De sentinel zit boven de gallery; zodra hij uit beeld is weten we
  // dat de picker actief wordt en moeten wij omhoog schuiven.
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
      // Focus terug naar trigger als de pill bestaat (vrijwel altijd),
      // anders naar het element dat focus had voor de modal.
      const target = triggerRef.current ?? previousActive
      target?.focus({ preventScroll: true })
    }
  }, [modalOpen])

  const handleOpen = useCallback(() => setModalOpen(true), [])
  const handleClose = useCallback(() => setModalOpen(false), [])

  // Veiligheidsklep: als er om wat voor reden geen posts zijn (server
  // hoort dat al af te vangen) renderen we niets.
  if (rotationPosts.length === 0) return null

  // Twee onafhankelijke gedragingen:
  //   visible        — gebruikt voor opacity/translate/pointer-events.
  //                    Verbergt pill volledig wanneer cart drawer open
  //                    is of we nog in de mount-delay zitten.
  //   shifted        — gebruikt voor het verticaal positioneren van de
  //                    pill (default vs. bovenop de variant-picker).
  const visible = mounted && !cartOpen
  const shifted = pickerVisible

  const bottomPx = shifted
    ? isDesktop
      ? SHIFT_UP_DESKTOP_PX
      : SHIFT_UP_MOBILE_PX
    : isDesktop
      ? 16 // bottom-4
      : 12 // bottom-3

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('aria')}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        tabIndex={visible ? 0 : -1}
        onClick={handleOpen}
        style={{ bottom: `${bottomPx}px` }}
        className={`group fixed left-3 md:left-4 z-30 flex items-center gap-3 bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] pl-1.5 pr-3.5 py-1.5 md:pl-2 md:pr-4 md:py-2 transition-[transform,opacity,bottom,box-shadow] duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 print:hidden ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.22)] motion-reduce:hover:translate-y-0'
            : 'translate-y-3 opacity-0 pointer-events-none'
        }`}
      >
        {/* Thumbnail-kolom met crossfade-rotatie */}
        <span
          className="relative block flex-shrink-0 w-12 h-12 md:w-14 md:h-14 border-2 border-black overflow-hidden bg-gray-100"
          aria-hidden="true"
        >
          {rotationPosts.map((post, idx) => {
            const src =
              post.media_type === 'VIDEO' && post.thumbnail_url
                ? post.thumbnail_url
                : post.media_url
            const active = idx === currentIdx
            return (
              <Image
                key={post.id}
                src={src}
                alt=""
                fill
                sizes="56px"
                unoptimized={!src.includes('supabase')}
                priority
                className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )
          })}
          {/* Klein IG-icoon overlay rechtsonder, maakt de aard van de
              content meteen duidelijk. */}
          <span className="absolute bottom-0 right-0 bg-black text-white p-0.5 leading-none">
            <Instagram size={10} aria-hidden="true" />
          </span>
        </span>

        {/* Twee-regelige tekst */}
        <span className="flex flex-col items-start leading-tight text-left min-w-0">
          <span className="font-bold text-[11px] md:text-xs uppercase tracking-[0.12em] text-black whitespace-nowrap">
            {t('headline')}
          </span>
          <span className="flex items-center gap-1 text-[11px] md:text-xs text-gray-700 mt-0.5 whitespace-nowrap">
            <span>{t('subline')}</span>
            <ArrowRight
              size={12}
              aria-hidden="true"
              className="text-brand-primary transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </button>

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
