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
 * Visibility-regels:
 *   * Verborgen tot 600ms na mount (rustige entry).
 *   * Verborgen wanneer de cart drawer open is.
 *   * Verborgen wanneer de sticky variant-picker zichtbaar is. We
 *     observeren dezelfde elementen als StickyVariantPicker:
 *       - mobile: [data-sticky-picker-sentinel]
 *       - desktop: [data-pdp-main-atc]
 *     zodat de twee elementen elkaar nooit in de weg zitten.
 *   * Animatie wordt overgeslagen wanneer de gebruiker
 *     prefers-reduced-motion heeft.
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
import { Instagram, X, ArrowRight, ExternalLink, Heart, Film, Layers } from 'lucide-react'
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
}

const ROTATION_INTERVAL_MS = 7000
const MOUNT_DELAY_MS = 600
const STORY_TRUNCATE = 280

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
}: BrandDiscoveryWidgetProps) {
  const t = useTranslations('product.brandWidget')
  const tModal = useTranslations('product.brandModal')
  const tIg = useTranslations('homepage.instagram')
  const locale = useLocale()
  const { isOpen: cartOpen } = useCartDrawer()

  // Mount-delay zodat we de eerste paint en LCP niet stoort.
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

  // Eerst 3 posts voor de rotatie. Bij <3 posts laten we wat er is
  // gewoon op zijn plek staan (geen flits van een lege laag).
  const rotationPosts = useMemo(() => posts.slice(0, 3), [posts])
  const gridPosts = useMemo(() => posts.slice(0, 9), [posts])

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), MOUNT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Mobile: observe de sentinel die StickyVariantPicker ook gebruikt.
  // De sentinel zit boven de gallery; zodra hij uit beeld is, weten
  // we dat de picker actief wordt en moeten wij verbergen.
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
  // StickyVariantPicker zichzelf en moeten wij wegduiken.
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

  const pickerVisible = isDesktop ? !mainAtcInView : !sentinelInView

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

  // Esc-toets sluit modal. Body-scroll-lock voorkomt dat de pagina
  // achter de modal mee-scrollt; restore on cleanup.
  useEffect(() => {
    if (!modalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [modalOpen])

  const handleOpen = useCallback(() => setModalOpen(true), [])
  const handleClose = useCallback(() => setModalOpen(false), [])

  // Veiligheidsklep: als er om wat voor reden geen posts zijn (server
  // hoort dat al af te vangen) renderen we niets.
  if (rotationPosts.length === 0) return null

  const visible = mounted && !cartOpen && !pickerVisible

  return (
    <>
      <button
        type="button"
        aria-label={t('aria')}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        onClick={handleOpen}
        data-visible={visible ? 'true' : 'false'}
        className={`group fixed bottom-3 left-3 md:bottom-4 md:left-4 z-30 flex items-center gap-3 bg-white border-2 border-black shadow-[0_4px_20px_rgba(0,0,0,0.18)] pl-1.5 pr-3.5 py-1.5 md:pl-2 md:pr-4 md:py-2 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
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
                priority={idx === 0}
                className={`object-cover transition-opacity duration-700 ${
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
          <span className="font-bold text-[11px] md:text-xs uppercase tracking-[0.12em] text-black">
            {t('headline')}
          </span>
          <span className="flex items-center gap-1 text-[11px] md:text-xs text-gray-700 mt-0.5">
            <span>{t('subline')}</span>
            <ArrowRight
              size={12}
              aria-hidden="true"
              className="text-brand-primary transition-transform duration-200 group-hover:translate-x-0.5"
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

  // Focus-management: focus de close-knop bij open zodat keyboard-
  // gebruikers meteen weten waar ze terecht zijn gekomen.
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Mobile geeft een aparte hero-image als die er is, anders fallback
  // op de desktop-versie. Op desktop pakken we altijd de desktop hero.
  const heroSrc = about.hero_image_url
  const heroSrcMobile = about.hero_image_url_mobile || about.hero_image_url

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-discovery-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="bg-white border-4 border-black w-full max-w-2xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero met overlay-titel; close-knop in de rechterbovenhoek */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-gray-200">
          <picture>
            <source media="(min-width: 640px)" srcSet={heroSrc} />
            <Image
              src={heroSrcMobile}
              alt={about.hero_alt || ''}
              fill
              sizes="(min-width: 768px) 672px, 100vw"
              unoptimized={!heroSrc.includes('supabase')}
              priority
              className="object-cover"
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10"
          />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={tModalCloseAria}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 flex items-center justify-center bg-white border-2 border-black hover:bg-black hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 pb-4 sm:pb-6">
            <p className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80 mb-2">
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
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between gap-1 p-1.5 text-white text-[10px] font-bold"
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider border-2 border-black hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
            >
              <Instagram size={18} aria-hidden="true" />
              <span>{tModalIgCta}</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <LocaleLink
              href="/over-mose"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-black font-bold text-sm uppercase tracking-wider border-2 border-black hover:bg-black hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40"
            >
              <span>{tModalAboutCta}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </LocaleLink>
          </div>
        </div>
      </div>
    </div>
  )
}
