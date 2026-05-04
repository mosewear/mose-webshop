'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
   *  voor het eerst opent slaan we onze /api/instagram/feed-call af.
   *  Ook gate voor de auto-advance: zolang het menu dicht is loopt
   *  de rAF niet (CPU/battery). */
  isOpen: boolean
}

/* Aantal posts dat we maximaal in de strip tonen. */
const MAX_POSTS = 12
/* Loop-duur in seconden voor de auto-advance (één volledige set). */
const LOOP_SECONDS = 30

/** Reactief: respecteert macOS/Windows prefers-reduced-motion. */
function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefers(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return prefers
}

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
 * Auto-scroll: zelfde hybrid-scroll als de homepage Instagram-carousel.
 * Native swipe blijft werken; rAF schuift de strip continu door wanneer
 * de gebruiker NIET interageert. Loop is naadloos doordat de post-set
 * 2× gerenderd wordt en we wrappen op halfWidth.
 *
 * Auto-pauze in de volgende gevallen:
 *   - Menu dicht (isOpen=false)
 *   - Tab niet zichtbaar
 *   - Recente user-interactie (touch / pointer-drag / horizontaal wheel)
 *     → resumes 1.5s na laatste input
 *   - prefers-reduced-motion: reduce → géén auto-advance, swipe blijft
 *
 * BELANGRIJK: track heeft GEEN `scroll-behavior: smooth`. Sommige
 * browsers passen die rule óók toe op directe `scrollLeft = X`
 * assignments → elke rAF-tick zou dan een smooth-animation triggeren
 * die de volgende tick weer cancelt → strip staat visueel stil.
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
 *
 * A11y:
 *  - Hele sectie heeft eigen aria-label via t('instagramRow.eyebrow')
 *  - Iedere thumbnail-link krijgt een betekenisvol aria-label
 *  - Video / carousel-thumbnails krijgen een visuele icon-overlay én
 *    aria-hidden zodat schermlezers niet dubbel-aankondigen
 */
export default function MobileMenuInstagramRow({
  isOpen,
}: MobileMenuInstagramRowProps) {
  const t = useTranslations('mobileMenu.instagramRow')
  const locale = useLocale()
  const prefersReducedMotion = usePrefersReducedMotion()
  const pageVisible = usePageVisible()

  const [data, setData] = useState<InstagramFeedData | null>(null)
  const [loaded, setLoaded] = useState(false)
  // everOpened wordt true zodra de drawer voor het EERST opent en
  // blijft daarna true. Werkt als gate voor (a) de fetch en (b) of
  // we überhaupt iets in de DOM willen (skeleton/empty/strip). Voor
  // bezoekers die het menu nooit openen blijft het component dus
  // volledig "uit".
  const [everOpened, setEverOpened] = useState(false)

  /* ---- DOM + helper refs voor de auto-advance loop ---- */
  const trackRef = useRef<HTMLDivElement | null>(null)
  const halfWidthRef = useRef<number>(0)
  const lastTickTsRef = useRef<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const userResumeTimeoutRef = useRef<number | null>(null)
  const isPointerDownRef = useRef<boolean>(false)
  // Float-positie van de auto-advance. We accumuleren sub-pixel
  // movement HIER (in een ref) i.p.v. via track.scrollLeft te lezen
  // → sommige browsers truncaten scrollLeft naar integer pixels bij
  // read, waardoor dx < 1 px/frame nooit accumuleert (positie blijft
  // 0). Door intern als float bij te houden en alleen te schrijven
  // is sub-pixel-accumulatie betrouwbaar.
  const positionRef = useRef<number>(0)
  const [userInteracting, setUserInteracting] = useState(false)

  // Eerste-open-gate: setState-in-render-pattern, het door React
  // aanbevolen alternatief voor "derive state from prop history"
  // zonder een useEffect-roundtrip
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  // Triggert een directe re-render maar stabiliseert na 1 cycle.
  if (isOpen && !everOpened) {
    setEverOpened(true)
  }

  // Lazy fetch — pas wanneer het menu daadwerkelijk geopend is en we
  // nog géén data binnen hebben. AbortController zodat we netjes
  // kunnen aborten als de component unmount tijdens een trage fetch.
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
        // AbortError is expected on unmount — geen log-noise.
        if (err?.name !== 'AbortError') {
          console.warn('[MobileMenuInstagramRow] fetch failed:', err)
          setLoaded(true)
        }
      })

    return () => ctrl.abort()
  }, [everOpened, loaded])

  // Eerste 12 posts maximaal — past nét comfortabel in de loop-set en
  // houdt de DOM in toom.
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

  /* ---- Auto-advance: gate-check ---- */
  const isAnimating =
    isOpen &&
    pageVisible &&
    !userInteracting &&
    !prefersReducedMotion &&
    posts.length > 1

  /* ---- Effect: meet halfWidth (= 1 post-set) ----
     Gemeten via useLayoutEffect zodat 't synchroon na DOM-commit
     gebeurt. Hermeten bij wijziging in posts.length én bij resize. */
  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        halfWidthRef.current = trackRef.current.scrollWidth / 2
      }
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

  /* ---- Effect: rAF auto-advance loop ----
     Float-accumulatie: positionRef wordt bij start gesynct vanuit
     scrollLeft, en daarna intern als float bijgehouden. Elke tick
     schrijven we positionRef naar scrollLeft. Sub-pixel-bewegingen
     accumuleren netjes ondanks browser-rounding. */
  useEffect(() => {
    if (!isAnimating) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTickTsRef.current = 0
      return
    }

    if (trackRef.current) {
      positionRef.current = trackRef.current.scrollLeft
    }

    const tick = (ts: number) => {
      const track = trackRef.current
      if (!track) return
      const halfWidth = track.scrollWidth / 2
      halfWidthRef.current = halfWidth
      if (halfWidth <= 0) {
        rafIdRef.current = requestAnimationFrame(tick)
        return
      }
      const last = lastTickTsRef.current
      lastTickTsRef.current = ts
      if (last === 0) {
        rafIdRef.current = requestAnimationFrame(tick)
        return
      }
      const dt = (ts - last) / 1000
      const pps = halfWidth / LOOP_SECONDS
      const dx = pps * dt
      let pos = positionRef.current + dx
      if (pos >= halfWidth) pos -= halfWidth
      if (pos < 0) pos += halfWidth // safety
      positionRef.current = pos
      track.scrollLeft = pos
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isAnimating])

  /* ---- User interaction → pauzeer 1.5s ---- */
  const noteUserInteraction = useCallback(() => {
    setUserInteracting(true)
    if (userResumeTimeoutRef.current !== null) {
      clearTimeout(userResumeTimeoutRef.current)
    }
    userResumeTimeoutRef.current = window.setTimeout(() => {
      setUserInteracting(false)
      userResumeTimeoutRef.current = null
    }, 1500)
  }, [])

  const handlePointerDown = useCallback(() => {
    isPointerDownRef.current = true
    noteUserInteraction()
  }, [noteUserInteraction])

  const handlePointerUpLike = useCallback(() => {
    isPointerDownRef.current = false
  }, [])

  const handlePointerMove = useCallback(() => {
    if (isPointerDownRef.current) noteUserInteraction()
  }, [noteUserInteraction])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) noteUserInteraction()
    },
    [noteUserInteraction]
  )

  /* Cleanup op unmount */
  useEffect(() => {
    return () => {
      if (userResumeTimeoutRef.current !== null) {
        clearTimeout(userResumeTimeoutRef.current)
      }
    }
  }, [])

  // Voordat de drawer ooit open is geweest fetchen we niets en
  // renderen we niets — geen waste skeleton in de DOM voor users
  // die het menu nooit openen.
  if (!everOpened) return null
  // Wanneer feed disabled is door admin: rendert helemaal niets. Niet
  // tonen is beter dan een lege placeholder voor de admin die expliciet
  // gekozen heeft om geen IG te koppelen.
  if (loaded && data && !data.enabled) return null
  // Fetch faalt + nooit data binnen → ook niets tonen.
  if (loaded && !data) return null

  return (
    <section
      aria-label={t('eyebrow')}
      className="border-b-2 border-black"
    >
      {/* Header-rij: eyebrow + handle + brutalist Volg-CTA. */}
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

      {/* Auto-scrollende thumbnail-strip. GEEN scroll-snap (kan rAF-
          driven scrollLeft mutaties verstoren) en GEEN scroll-smooth
          (zou elke tick een smooth-anim triggeren die de volgende
          tick weer cancelt → carousel staat visueel stil). */}
      {posts.length > 0 && (
        <div className="relative pb-4">
          <div
            ref={trackRef}
            className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              // IE/Edge legacy fallback. Tailwind's arbitrary
              // [scrollbar-width:none] dekt moderne browsers af; deze
              // inline style is voor Edge < 79.
              msOverflowStyle: 'none',
            }}
            onTouchStart={noteUserInteraction}
            onTouchMove={noteUserInteraction}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpLike}
            onPointerCancel={handlePointerUpLike}
            onPointerLeave={handlePointerUpLike}
            onPointerMove={handlePointerMove}
            onWheel={handleWheel}
            onKeyDown={noteUserInteraction}
          >
            <ol className="flex gap-2 px-4">
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
          {/* Scroll-hint: fade-edges links + rechts. Met de continue
              auto-scroll loopt er altijd content beide kanten op uit
              beeld; subtiele fade-edges geven dat een polished gevoel.
              pointer-events-none zodat ze geen taps eten. */}
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

      {/* Skeleton: voorkom layout-jump tijdens initial load. We tonen
          12 grijze placeholders die exact dezelfde dimensies hebben
          als de echte thumbs. */}
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
  // Gebruikt poster_url voor video's wanneer beschikbaar, anders
  // valt 'ie terug op media_url. Voor IMAGE / CAROUSEL_ALBUM werkt
  // media_url altijd direct.
  const imageSrc =
    post.media_type === 'VIDEO' && post.thumbnail_url
      ? post.thumbnail_url
      : post.media_url

  // Korte caption preview voor screen readers. Niet visueel getoond
  // (compacte rij heeft geen ruimte) maar wel meegenomen in het
  // aria-label zodat schermlezers context hebben.
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

        {/* Media-type icon-chip — alleen voor video / carousel zodat
            de gebruiker weet wat er achter de tap zit. Brutalist: wit
            blokje met zwarte border, 1px padding. */}
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

        {/* Subtiele hover-laag met IG-icoon. Op touch (geen hover)
            valt deze weg, op desktop+focus geeft 'ie context. */}
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
