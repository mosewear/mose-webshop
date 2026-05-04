'use client'

import Image from 'next/image'
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  type RefObject,
} from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Instagram,
  Heart,
  Film,
  Layers,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Info,
  X,
} from 'lucide-react'
import type {
  InstagramDisplaySettings,
  InstagramPost,
} from '@/lib/instagram/types'

interface InstagramMarqueeProps {
  settings: InstagramDisplaySettings
  posts: InstagramPost[]
}

function localizedCaption(post: InstagramPost, locale: string): string | null {
  if (locale === 'en' && post.caption_en) return post.caption_en
  return post.caption || null
}

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Reactief: respecteert macOS/Windows-instelling op runtime-wijziging. */
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

/** Tab/window-zichtbaarheid via Page Visibility API. Pauzeert auto-
 *  advance + video-playback wanneer de tab verborgen is (CPU/battery). */
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

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * MOSE Instagram-carousel — hybrid scroller.
 *
 * Combineert het beste van twee werelden:
 *  - **Native horizontale scroll** in de container → swipen op mobiel
 *    en muiswiel/trackpad-scroll op desktop werken direct.
 *  - **Auto-advance via requestAnimationFrame** wanneer de gebruiker
 *    NIET interageert → de strip blijft "vol leven" zoals de oude
 *    pure-CSS marquee, maar nu overrul-baar.
 *
 * Auto-pauze in de volgende gevallen:
 *   - Tab/window niet zichtbaar (Page Visibility API)
 *   - Sectie out-of-viewport (IntersectionObserver, drempel 0.1)
 *   - Cursor over de carousel (desktop hover)
 *   - Toetsenbord-focus binnen de carousel
 *   - Recente user-interactie (touch / pointer-drag / wheel / keydown)
 *     → auto resumes 1.5s na laatste input
 *   - Pauze-toggle expliciet door gebruiker gezet
 *   - Caption open op een tile (mobiel)
 *   - prefers-reduced-motion: reduce → géén auto-advance, swipe + skip
 *     + pauze-toggle blijven werken
 *
 * Extra UX:
 *   - Skip-buttons ← / → (desktop), brutalist tile-overlays
 *   - Caption-toggle "i"-icoon per tile (mobiel) → toont caption + likes
 *     overlay zonder naar IG te navigeren
 *   - Pauze-toggle ❚❚/▶ inline boven de strip (mobiel + desktop)
 *   - Video-thumbnails autoplayen muted on hover (desktop) of wanneer
 *     ze het centrum van de carousel-viewport raken (mobiel)
 *
 * Loop is naadloos doordat de post-set 2× wordt gerenderd: zodra
 * scrollLeft ≥ halfWidth, springt de container terug naar
 * `scrollLeft - halfWidth`. Visueel onmerkbaar omdat de pixels exact
 * identiek zijn.
 */
export default function InstagramMarquee({ settings, posts }: InstagramMarqueeProps) {
  const t = useTranslations('homepage.instagram')
  const locale = useLocale()
  const prefersReducedMotion = usePrefersReducedMotion()
  const pageVisible = usePageVisible()

  /* ---- DOM refs ---- */
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  /* ---- Helper refs (geen re-render nodig) ---- */
  const halfWidthRef = useRef<number>(0)
  const lastTickTsRef = useRef<number>(0)
  const rafIdRef = useRef<number | null>(null)
  const userResumeTimeoutRef = useRef<number | null>(null)
  const isPointerDownRef = useRef<boolean>(false)

  /* ---- State ---- */
  const [explicitPaused, setExplicitPaused] = useState(false) // pauze-toggle
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [userInteracting, setUserInteracting] = useState(false)
  // Default true: aanname "in viewport" tot de IntersectionObserver
  // 't tegendeel zegt. Voorkomt FOUC waarbij de animatie pas start
  // ná de eerste IO-callback (typisch ~50ms) en geeft ons een nette
  // SSR-fallback wanneer IO niet beschikbaar is.
  const [inViewport, setInViewport] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  /* ---- Loop-set (2× duplicaat) ---- */
  const loopPosts = useMemo(() => [...posts, ...posts], [posts])

  /* ---- Admin-instelbare teksten ---- */
  const title =
    locale === 'en' && settings.section_title_en
      ? settings.section_title_en
      : settings.section_title_nl || t('sectionTitle')

  const subtitle =
    locale === 'en' && settings.section_subtitle_en
      ? settings.section_subtitle_en
      : settings.section_subtitle_nl || t('sectionSubtitle')

  const ctaText =
    locale === 'en' && settings.cta_text_en
      ? settings.cta_text_en
      : settings.cta_text_nl || t('ctaText')

  const ctaUrl = settings.cta_url || `https://www.instagram.com/${settings.username}`

  /* Bepaalt of de auto-advance MAG draaien op dit moment. */
  const isAnimating =
    !explicitPaused &&
    !hoverPaused &&
    !focusPaused &&
    !userInteracting &&
    !expandedKey &&
    inViewport &&
    pageVisible &&
    !prefersReducedMotion &&
    posts.length > 1

  /* ---- Effect: meet halfWidth (= 1 post-set) ----------------------
     halfWidth = scrollWidth / 2. Hermeten bij resize én bij wijziging
     in posts.length zodat de loop-wrap altijd op de juiste positie
     terugspringt. */
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

  /* ---- Effect: IntersectionObserver voor sectie-zichtbaarheid ----
     inViewport default = true (zie state-init). Wanneer IO niet
     beschikbaar is op de browser, blijven we dus permanent "in
     viewport". Anders krijgt de observer 't laatste woord. */
  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === 'undefined') {
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setInViewport(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )
    io.observe(sectionRef.current)
    return () => io.disconnect()
  }, [])

  /* ---- Effect: rAF auto-advance loop -----------------------------
     Loopt alleen wanneer isAnimating true is. Per frame:
       1. delta-time → pixels-per-second × dt = dx
       2. scrollLeft += dx
       3. wanneer scrollLeft ≥ halfWidth → wrap
     Eerste tick na (re)start skipt dt-berekening om grote jumps na
     een lange pauze te voorkomen. */
  useEffect(() => {
    if (!isAnimating) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTickTsRef.current = 0
      return
    }

    const seconds = Math.max(20, settings.marquee_speed_seconds || 60)

    const tick = (ts: number) => {
      const track = trackRef.current
      if (!track) return
      const halfWidth = halfWidthRef.current
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
      const pps = halfWidth / seconds
      const dx = pps * dt
      const next = track.scrollLeft + dx
      track.scrollLeft = next >= halfWidth ? next - halfWidth : next
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isAnimating, settings.marquee_speed_seconds])

  /* ---- User-interaction → pauzeer auto-advance gedurende 1.5s ---- */
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

  /* Pointer-events met "is down"-tracking zodat we drag-to-scroll op
     desktop netjes als gebruikersinteractie tellen, maar onschuldige
     hover-bewegingen NIET de timer eindeloos resetten. */
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

  /* Skip-button handler — scrollt 1 tile-breedte links/rechts via
     native smooth-scroll. Triggert ook noteUserInteraction zodat de
     auto-advance pauzeert tijdens (en kort na) de smooth-scroll. */
  const skip = useCallback((dir: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    const firstCard = track.firstElementChild as HTMLElement | null
    // Tile-breedte + gap (~24px op desktop, ~16px op mobiel — we
    // nemen 24 als veilige bovengrens; eventueel iets te ver scrollen
    // op mobiel valt nog netjes in de native scroll op).
    const cardWidth = (firstCard?.offsetWidth ?? 280) + 24
    track.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
    noteUserInteraction()
  }, [noteUserInteraction])

  /* Caption-toggle handler — sluit alle anderen wanneer er een opent.
     We passen één expandedKey per carousel toe (i.p.v. per-tile state)
     zodat we altijd max 1 caption tegelijk tonen. */
  const toggleCaption = useCallback((key: string) => {
    setExpandedKey((current) => (current === key ? null : key))
  }, [])

  /* Pauze-toggle handler */
  const togglePaused = useCallback(() => {
    setExplicitPaused((p) => !p)
  }, [])

  /* Cleanup op unmount */
  useEffect(() => {
    return () => {
      if (userResumeTimeoutRef.current !== null) {
        clearTimeout(userResumeTimeoutRef.current)
      }
    }
  }, [])

  /* ---- Render ----------------------------------------------------- */
  return (
    <section
      ref={sectionRef}
      role="region"
      aria-labelledby="instagram-feed-heading"
      className="relative bg-white border-t-2 border-b-2 border-black py-16 md:py-24 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto text-center mb-10 md:mb-14">
        <div className="inline-flex items-center gap-2 mb-4 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
          <Instagram size={16} aria-hidden="true" className="text-brand-primary" />
          <span>Instagram</span>
        </div>
        <h2
          id="instagram-feed-heading"
          className="font-display text-4xl md:text-6xl uppercase tracking-tight leading-[0.95] mb-3 md:mb-4"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm md:text-base text-gray-600 max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Pauze-toggle — kleine inline knop boven de strip, rechts uit-
          gelijnd. Reflect explicit user pause-intent — hover/focus
          pauses laten deze toggle in z'n "play"-state staan. */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-end mb-4 md:mb-6">
        <button
          type="button"
          onClick={togglePaused}
          aria-label={explicitPaused ? t('playMarquee') : t('pauseMarquee')}
          aria-pressed={explicitPaused}
          className="inline-flex items-center gap-2 border-2 border-black px-3 h-9 text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors"
        >
          {explicitPaused ? (
            <Play size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Pause size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          )}
          <span>{explicitPaused ? t('playMarquee') : t('pauseMarquee')}</span>
        </button>
      </div>

      {/* Marquee container */}
      <div
        className="relative w-full"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocusCapture={() => setFocusPaused(true)}
        onBlurCapture={() => setFocusPaused(false)}
      >
        {/* Skip-buttons (desktop). Brutalist tiles — bg-zwart + 2px
            witte border, hover/focus flip naar groen. Layered op z=10
            zodat ze boven de tiles én de fade-edges staan. */}
        <button
          type="button"
          onClick={() => skip('left')}
          aria-label={t('prev')}
          className="hidden md:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-11 h-11 lg:w-12 lg:h-12 bg-black text-white border-2 border-white hover:bg-brand-primary hover:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary transition-colors"
        >
          <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => skip('right')}
          aria-label={t('next')}
          className="hidden md:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-11 h-11 lg:w-12 lg:h-12 bg-black text-white border-2 border-white hover:bg-brand-primary hover:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary transition-colors"
        >
          <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
        </button>

        {/* Track — overflow-x-auto met verborgen scrollbar. Native
            touch + wheel-scroll werkt direct. scroll-snap proximity
            geeft mobiele swipe een "premium" snap-feel zonder de
            rAF auto-advance te storen (proximity = alleen snappen
            wanneer scroll-velocity 0 bereikt). */}
        <div
          ref={trackRef}
          role="list"
          className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none' as const }}
          onTouchStart={noteUserInteraction}
          onTouchMove={noteUserInteraction}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUpLike}
          onPointerCancel={handlePointerUpLike}
          onPointerLeave={handlePointerUpLike}
          onPointerMove={handlePointerMove}
          onWheel={noteUserInteraction}
          onKeyDown={noteUserInteraction}
        >
          {loopPosts.map((post, idx) => {
            const key = `${post.id}-${idx}`
            return (
              <Tile
                key={key}
                tileKey={key}
                post={post}
                locale={locale}
                isPriority={idx < 4}
                expanded={expandedKey === key}
                onToggleCaption={toggleCaption}
                trackRef={trackRef}
                pageVisible={pageVisible}
                explicitPaused={explicitPaused}
              />
            )
          })}
        </div>

        {/* Edge fade-outs (desktop, cinematisch effect) */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-[1]"
        />
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-[1]"
        />
      </div>

      {/* CTA */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto mt-10 md:mt-14 text-center">
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('ctaAria')}
          className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-brand-primary text-white font-bold text-sm md:text-base uppercase tracking-wider border-2 border-black hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black"
        >
          <Instagram size={18} aria-hidden="true" />
          <span>{ctaText}</span>
        </a>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Tile sub-component                                                 */
/* ------------------------------------------------------------------ */

interface TileProps {
  tileKey: string
  post: InstagramPost
  locale: string
  isPriority: boolean
  expanded: boolean
  onToggleCaption: (key: string) => void
  trackRef: RefObject<HTMLDivElement | null>
  pageVisible: boolean
  explicitPaused: boolean
}

function Tile({
  tileKey,
  post,
  locale,
  isPriority,
  expanded,
  onToggleCaption,
  trackRef,
  pageVisible,
  explicitPaused,
}: TileProps) {
  const t = useTranslations('homepage.instagram')
  const caption = localizedCaption(post, locale)
  const ariaLabel = caption
    ? `${t('viewPost')} — ${caption.slice(0, 120)}`
    : t('viewPost')

  const isVideo = post.media_type === 'VIDEO'
  const imageSrc =
    isVideo && post.thumbnail_url ? post.thumbnail_url : post.media_url

  return (
    <div role="listitem" className="relative flex-shrink-0 snap-start">
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="group relative block aspect-square w-[60vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] xl:w-[18vw] border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
      >
        {/* Image of Video — voor VIDEO-posts gebruiken we een
            VideoTile die zelf bepaalt wanneer hij play/pause is.
            Voor IMAGE/CAROUSEL_ALBUM tonen we de standaard Image. */}
        {isVideo && post.media_url ? (
          <VideoTile
            src={post.media_url}
            poster={post.thumbnail_url || imageSrc}
            trackRef={trackRef}
            pageVisible={pageVisible}
            explicitPaused={explicitPaused}
            captionExpanded={expanded}
          />
        ) : (
          <Image
            src={imageSrc}
            alt=""
            fill
            unoptimized={!imageSrc.includes('supabase')}
            sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, (min-width: 640px) 40vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={isPriority}
            loading={isPriority ? undefined : 'lazy'}
          />
        )}

        {/* Media-type badge (video / carousel) */}
        {post.media_type !== 'IMAGE' && (
          <div
            aria-hidden="true"
            className="absolute top-2 right-2 bg-white border-2 border-black px-1.5 py-1 z-[2]"
          >
            {post.media_type === 'VIDEO' ? (
              <Film size={14} />
            ) : (
              <Layers size={14} />
            )}
          </div>
        )}

        {/* Pinned badge */}
        {post.is_pinned && (
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 bg-brand-primary text-black border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider z-[2]"
          >
            Pin
          </div>
        )}

        {/* Caption-overlay — gestapeld onderin de tile.
            Desktop: zichtbaar op hover/focus.
            Mobiel: zichtbaar wanneer de gebruiker via de "i"-knop
            expliciet de caption toont (caption-on-tap, optie B). */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4 z-[2] ${
            expanded
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        >
          {caption && (
            <p className="text-white text-xs md:text-sm leading-snug line-clamp-3 md:line-clamp-2 mb-2">
              {caption}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-white text-xs md:text-sm font-bold">
            <span className="flex items-center gap-1.5">
              <Instagram size={14} />
              <span className="uppercase tracking-wider">
                {t('viewPost')}
              </span>
            </span>
            {typeof post.like_count === 'number' && post.like_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart size={12} className="fill-current" />
                {post.like_count.toLocaleString(locale)}
              </span>
            )}
          </div>
        </div>
      </a>

      {/* Caption-toggle — alleen mobiel. Bewust BUITEN de <a> zodat
          tap op deze knop NIET naar IG navigeert; de rest van de tile
          (incl. afbeelding) gaat wel naar IG. preventDefault +
          stopPropagation als extra failsafe. */}
      {caption && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleCaption(tileKey)
          }}
          aria-label={expanded ? t('hideCaption') : t('showCaption')}
          aria-pressed={expanded}
          className="md:hidden absolute bottom-2 right-2 z-20 inline-flex items-center justify-center w-9 h-9 bg-white text-black border-2 border-black hover:bg-brand-primary hover:text-white hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors"
        >
          {expanded ? (
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Info size={14} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VideoTile sub-component                                            */
/* ------------------------------------------------------------------ */

interface VideoTileProps {
  src: string
  poster?: string
  trackRef: RefObject<HTMLDivElement | null>
  pageVisible: boolean
  explicitPaused: boolean
  captionExpanded: boolean
}

/**
 * VideoTile — toont een autoplayende muted video voor IG-Reels-posts.
 *
 * Wanneer afgespeeld:
 *  - Desktop: bij hover op de tile.
 *  - Mobiel: wanneer de tile in het centrale 50% van de carousel-
 *    viewport staat (gemeten via IntersectionObserver met root=track).
 *
 * Wanneer gepauzeerd:
 *  - Tab niet zichtbaar (pageVisible=false)
 *  - Pauze-toggle aan (explicitPaused=true)
 *  - Caption open op deze tile (captionExpanded=true; voorkomt dat de
 *    video onder de caption-overlay door blijft spelen)
 *  - Geen hover én niet centered
 *
 * preload="metadata" voorkomt dat we het volledige videobestand vóór
 * playback al downloaden; pas wanneer play() wordt aangeroepen begint
 * de buffer te vullen.
 */
function VideoTile({
  src,
  poster,
  trackRef,
  pageVisible,
  explicitPaused,
  captionExpanded,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [centered, setCentered] = useState(false)

  /* Bereken of de video MAG spelen op dit moment. */
  const shouldPlay =
    (hovered || centered) && pageVisible && !explicitPaused && !captionExpanded

  /* Sync play/pause met de actual <video>-element. play() retourneert
     een Promise die kan rejecten op autoplay-policies; we vangen 'em
     stil af zodat 't geen unhandled rejection wordt. */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } else {
      video.pause()
      try {
        video.currentTime = 0
      } catch {
        // Sommige browsers gooien wanneer currentTime wordt gezet
        // voordat metadata geladen is — bewust stil afvangen.
      }
    }
  }, [shouldPlay])

  /* IntersectionObserver: detecteert centrale-positie binnen de
     carousel. rootMargin -25% links/rechts → alleen het middelste
     50% van de carousel telt als "centered" → voorkomt dat 5 video's
     tegelijk afspelen op een breed scherm. */
  useEffect(() => {
    const video = videoRef.current
    const root = trackRef.current
    if (!video || !root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setCentered(entry.intersectionRatio >= 0.6)
      },
      { root, rootMargin: '0px -25% 0px -25%', threshold: [0, 0.3, 0.6, 0.9, 1] }
    )
    io.observe(video)
    return () => io.disconnect()
  }, [trackRef])

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      aria-hidden="true"
    />
  )
}
