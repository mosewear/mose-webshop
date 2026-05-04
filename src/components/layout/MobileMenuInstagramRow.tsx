'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Instagram, ArrowRight, Film, Layers } from 'lucide-react'
import type {
  InstagramDisplaySettings,
  InstagramFeedData,
  InstagramPost,
} from '@/lib/instagram/types'

interface MobileMenuInstagramRowProps {
  /** True wanneer het menu (zichtbaar) open staat. Wordt gebruikt om
   *  de fetch lazy te triggeren — pas wanneer de gebruiker het menu
   *  voor het eerst opent slaan we onze /api/instagram/feed-call af. */
  isOpen: boolean
}

/* Aantal posts dat we maximaal in de strip tonen. */
const MAX_POSTS = 12
/* Loop-duur in seconden voor de auto-advance (één volledige set). */
const LOOP_SECONDS = 30

/** Page Visibility API — pauzeert auto-advance wanneer tab verborgen. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const update = () => setVisible(!document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

/**
 * Compacte brutalist Instagram-rij voor het mobiele menu. Toont een
 * horizontaal **auto-scrollende** strip van max 12 thumbnails (tap =
 * open IG-post in nieuwe tab) plus een minimale header (eyebrow +
 * handle + Volg-CTA).
 *
 * **Hoe werkt 't?**
 *  - Track scrollt continu via een **CSS `@keyframes` animatie op
 *    `transform`** (zie globals.css `.animate-marquee`). GPU-
 *    composited → buttery smooth, zoals de homepage carousel.
 *  - **Container heeft `overflow-x: auto`** voor native swipe op
 *    mobiel. Beide composeren netjes met de transform-animatie.
 *  - **Pauze**: alleen wanneer de gebruiker actief op de carousel
 *    staat (touch/pen pointerdown) of het menu dicht is. Géén
 *    pauze op hover/focus/etc.
 *  - **Wrap**: 2× duplicaat post-set + scroll-handler die de
 *    gebruiker terugwrapt naar de eerste set wanneer 'ie >= setWidth
 *    scrollt. Visueel onmerkbaar.
 *
 * Datasource: client-side fetch naar /api/instagram/feed (public,
 * gecached). De fetch wordt LAZY gestart wanneer `isOpen` voor het
 * eerst true wordt, daarna blijft de data in-memory bewaard zodat
 * heropenen direct rendert.
 *
 * Edge-cases:
 *  - Drawer nog nooit geopend                    → geen fetch, render null
 *  - Feed disabled door admin                    → component rendert null
 *  - Feed enabled maar 0 posts (eerste sync nog) → toont 'empty'-state
 *  - Fetch faalt                                 → component rendert null
 */
export default function MobileMenuInstagramRow({
  isOpen,
}: MobileMenuInstagramRowProps) {
  const t = useTranslations('mobileMenu.instagramRow')
  const locale = useLocale()
  const pageVisible = usePageVisible()

  const [data, setData] = useState<InstagramFeedData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  /* ---- DOM refs voor de marquee ---- */
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLOListElement | null>(null)
  const setWidthRef = useRef<number>(0)

  /* ---- State: pauze alleen op finger-touch + visibility ---- */
  const [touchPaused, setTouchPaused] = useState(false)

  // Eerste-open-gate: setState-in-render-pattern.
  if (isOpen && !everOpened) {
    setEverOpened(true)
  }

  // Lazy fetch — pas wanneer het menu daadwerkelijk geopend is en we
  // nog géén data binnen hebben.
  useEffect(() => {
    if (!everOpened || loaded) return

    const ctrl = new AbortController()

    fetch('/api/instagram/feed', { signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<InstagramFeedData>) : null))
      .then((payload) => {
        setData(payload)
        setLoaded(true)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[MobileMenuInstagramRow] fetch failed:', err)
          setLoaded(true)
        }
      })

    return () => ctrl.abort()
  }, [everOpened, loaded])

  // Eerste 12 posts maximaal.
  const posts = useMemo(
    () => (data?.posts ?? []).slice(0, MAX_POSTS),
    [data]
  )
  // Loop-set: posts 2× gedupliceerd voor naadloze wrap.
  const loopPosts = useMemo(() => [...posts, ...posts], [posts])

  // Settings + computed afgeleiden.
  const settings: InstagramDisplaySettings | null = data?.settings ?? null
  const username = settings?.username || 'mosewearcom'
  const ctaUrl = settings?.cta_url || `https://www.instagram.com/${username}`

  /* Animatie-pauze. Alleen op de "harde" redenen — géén hover/focus. */
  const animPaused = touchPaused || !isOpen || !pageVisible

  /* Meet setWidth (= scrollWidth / 2 bij 2× duplicate). */
  useLayoutEffect(() => {
    const measure = () => {
      const t = trackRef.current
      if (!t) return
      setWidthRef.current = t.scrollWidth / 2
    }
    measure()
    let ro: ResizeObserver | null = null
    if (trackRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure)
      ro.observe(trackRef.current)
    }
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [posts.length])

  /* Scroll-wrap — houdt de gebruiker binnen de eerste set. */
  const handleScroll = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const setW = setWidthRef.current
    if (setW <= 0) return
    if (c.scrollLeft >= setW) {
      c.scrollLeft -= setW
    } else if (c.scrollLeft < 0) {
      c.scrollLeft += setW
    }
  }, [])

  /* Pointer-pauze logic — ALLEEN voor touch/pen, niet voor mouse.
     setPointerCapture op pointerdown garandeert dat de bijbehorende
     pointerup óók op deze handler vuurt, zelfs als de vinger tijdens
     swipen buiten de carousel eindigt. Zonder capture zou
     touchPaused dan eeuwig true blijven hangen. */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setTouchPaused(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Stille fallback voor browsers die capture niet ondersteunen.
      }
    }
  }, [])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setTouchPaused(false)
    }
  }, [])

  // Voordat de drawer ooit open is geweest fetchen we niets en
  // renderen we niets.
  if (!everOpened) return null
  if (loaded && data && !data.enabled) return null
  if (loaded && !data) return null

  /* Marquee-duration als CSS custom property. */
  const trackStyle: CSSProperties = {
    ['--marquee-duration' as string]: `${LOOP_SECONDS}s`,
  }

  return (
    <section
      aria-label={t('eyebrow')}
      className="border-b-2 border-black"
    >
      {/* Header-rij */}
      <div className="flex items-end justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
            <Instagram size={14} strokeWidth={2.5} aria-hidden="true" />
            <span>{t('eyebrow')}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-tight leading-none truncate">
            {t('title', { username })}
          </h2>
          <p className="mt-1.5 text-[11px] text-gray-500 truncate">
            {t('subline')}
          </p>
        </div>

        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-black text-white border-2 border-black px-3 h-9 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brand-primary hover:border-brand-primary focus-visible:bg-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-colors"
        >
          <span>{t('viewAllShort')}</span>
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
        </a>
      </div>

      {/* Empty state */}
      {loaded && posts.length === 0 && (
        <div className="px-4 pb-4">
          <div className="border-2 border-dashed border-gray-300 px-3 py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              {t('empty')}
            </p>
          </div>
        </div>
      )}

      {/* Auto-scrollende thumbnail-strip via CSS marquee animatie.
          Container = overflow-x:auto voor native swipe. Pointer-events
          vangen alleen touch/pen → mouse pauzeert NIET. */}
      {posts.length > 0 && (
        <div className="relative pb-4">
          <div
            ref={containerRef}
            className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: 'none' as const }}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
          >
            <ol
              ref={trackRef}
              className="flex gap-2 px-4 w-max animate-marquee"
              data-paused={animPaused ? 'true' : 'false'}
              style={trackStyle}
            >
              {loopPosts.map((post, idx) => (
                <InstagramThumb
                  key={`${post.id}-${idx}`}
                  post={post}
                  index={idx}
                  locale={locale}
                  viewPostLabel={t('viewPost', { index: (idx % posts.length) + 1 })}
                />
              ))}
            </ol>
          </div>
          {/* Fade-edges links + rechts */}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 bottom-4 w-6 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 bottom-4 w-6 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none"
          />
        </div>
      )}

      {/* Skeleton */}
      {!loaded && (
        <div className="overflow-hidden pb-4">
          <ol
            className="flex gap-2 px-4"
            aria-hidden="true"
          >
            {Array.from({ length: MAX_POSTS }).map((_, i) => (
              <li
                key={i}
                className="flex-shrink-0 w-24 aspect-square border-2 border-black bg-gray-100 animate-pulse"
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

interface InstagramThumbProps {
  post: InstagramPost
  index: number
  locale: string
  viewPostLabel: string
}

function InstagramThumb({ post, index, locale, viewPostLabel }: InstagramThumbProps) {
  const imageSrc =
    post.media_type === 'VIDEO' && post.thumbnail_url
      ? post.thumbnail_url
      : post.media_url

  const caption =
    locale === 'en' && post.caption_en ? post.caption_en : post.caption
  const enrichedLabel = caption
    ? `${viewPostLabel} — ${caption.slice(0, 80)}`
    : viewPostLabel

  return (
    <li className="flex-shrink-0">
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={enrichedLabel}
        className="group relative block w-24 aspect-square border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          unoptimized={!imageSrc.includes('supabase')}
          sizes="96px"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          priority={index < 3}
          loading={index < 3 ? undefined : 'lazy'}
        />

        {post.media_type !== 'IMAGE' && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 inline-flex items-center justify-center bg-white border-2 border-black p-0.5 leading-none"
          >
            {post.media_type === 'VIDEO' ? (
              <Film size={10} strokeWidth={2.5} />
            ) : (
              <Layers size={10} strokeWidth={2.5} />
            )}
          </span>
        )}

        <span
          aria-hidden="true"
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Instagram size={18} className="text-white" strokeWidth={2.5} />
        </span>
      </a>
    </li>
  )
}
