'use client'

import Image from 'next/image'
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
  type RefObject,
  type CSSProperties,
} from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Instagram,
  Heart,
  Film,
  Layers,
  ChevronLeft,
  ChevronRight,
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

/** Page Visibility API — pauzeert auto-advance + video-playback wanneer
 *  de tab verborgen is (CPU/battery). */
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

/** SSR-safe matchMedia hook via useSyncExternalStore. Vermijdt het
 *  "setState in effect"-pattern en voorkomt hydration mismatches via
 *  een stabiele server-snapshot (false). */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    [query]
  )
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }, [query])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * MOSE Instagram-carousel — buttery-smooth GPU-composited marquee
 * met opt-in finger-pause op mobiel.
 *
 * **Hoe werkt 't?**
 *  - De track scrollt continu via een **CSS `@keyframes` animatie op
 *    `transform`** (zie globals.css `.animate-marquee`). Dit draait op
 *    de compositor-thread (GPU) → géén layout/paint per frame zoals
 *    bij een rAF + `scrollLeft` aanpak. Vandaar ECHT smooth, exact
 *    zoals de oude pure-CSS marquee.
 *  - De **container heeft `overflow-x: auto`** zodat native swipe op
 *    mobiel werkt + muiswiel/trackpad-scroll op desktop. Beide
 *    composeren netjes met de transform-animatie van de track.
 *  - **Pauze**: alleen wanneer de gebruiker actief op de carousel
 *    staat (touch/pen pointerdown). NIET op hover, focus, video-
 *    autoplay of caption-open. Dit was de expliciete user-wens —
 *    auto-scroll en video-playback bestaan nu naast elkaar i.p.v.
 *    elkaar uit te zetten.
 *  - **Wrap**: omdat de post-set 2× wordt gerenderd komt de gebruiker
 *    via swipe nooit voorbij `setWidth` (we wrappen 'm op het
 *    scroll-event terug naar de "eerste set"). Visueel onmerkbaar
 *    omdat de content identiek dupliceerd is.
 *
 * Auto-pauze in de volgende gevallen:
 *   - Gebruiker actief touching/pointer-down op de carousel
 *   - Tab/window niet zichtbaar (Page Visibility API)
 *   - prefers-reduced-motion: reduce → animation: none via globals.css
 *
 * Extra UX:
 *   - Skip-buttons ← / → (desktop), brutalist tile-overlays
 *   - Caption-toggle "i"-icoon per tile (mobiel) → toont caption + likes
 *     overlay zonder naar IG te navigeren
 *   - Video-thumbnails autoplayen muted on hover (desktop) of wanneer
 *     ze het centrum van de carousel-viewport raken (mobiel) — met
 *     poster-overlay tegen "play-icon flash" / "zwart beeld"
 */
export default function InstagramMarquee({ settings, posts }: InstagramMarqueeProps) {
  const t = useTranslations('homepage.instagram')
  const locale = useLocale()
  const pageVisible = usePageVisible()
  /* `(hover: none)` matcht op pure-touch-devices (telefoons/tablets).
     Op desktop / touchscreen-laptops met muis matcht 'ie niet — daar
     gebruiken we hover als video-trigger. Op pure touch-devices
     gebruiken we IntersectionObserver-centered, omdat hover-events
     daar niet vuren. */
  const isTouchDevice = useMediaQuery('(hover: none)')
  /* A11y: respecteert OS-niveau "reduce motion". CSS animation wordt
     al gedisabled via globals.css, maar video-autoplay moeten we
     hier in JS gateen omdat dat niet via CSS gaat. */
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  /* ---- DOM refs ---- */
  const sectionRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  /* setWidthRef = breedte van één post-set (= scrollWidth / 2 met 2×
     duplicate). Wordt gebruikt door de scroll-wrap handler om de
     gebruiker netjes binnen de eerste set te houden. */
  const setWidthRef = useRef<number>(0)

  /* ---- State ---- */
  const [touchPaused, setTouchPaused] = useState(false)
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

  /* Pauze-state voor de CSS animatie. We pauzeren alleen op de "harde"
     redenen (user touch, tab hidden) — bewust GEEN hover/focus/video-
     autoplay zodat de auto-scroll lekker doorloopt. */
  const animPaused = touchPaused || !pageVisible

  /* ---- Effect: meet setWidth ---------------------------------------
     setWidth = scrollWidth / 2 (track bevat 2× post-set). Hermeten bij
     resize én bij wijziging in posts.length. */
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

  /* Scroll-wrap: zodra de gebruiker via swipe/wheel voorbij setWidth
     komt (= in de "tweede set" terechtkomt), wrappen we naar
     scrollLeft - setWidth. Visueel onmerkbaar omdat de content
     identiek dupliceerd is. Houdt de gebruiker permanent binnen de
     eerste set zodat de animatie nooit out-of-bounds gaat. */
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
     Mouse-hover mag NOOIT pauzeren (user-vereiste).
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
        // Sommige (oudere) browsers gooien wanneer capture niet kan
        // — bewust stil afvangen, valt terug op normale event-flow.
      }
    }
  }, [])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setTouchPaused(false)
    }
  }, [])

  /* Skip-button handler — scrollt 1 tile-breedte links/rechts via
     native smooth-scroll. Pauzeert NIET de animatie (auto-scroll
     loopt door, skip is een "nudge" boven op de animatie). */
  const skip = useCallback((dir: 'left' | 'right') => {
    const c = containerRef.current
    if (!c) return
    const firstCard = trackRef.current?.firstElementChild as HTMLElement | null
    const cardWidth = (firstCard?.offsetWidth ?? 280) + 24
    c.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
  }, [])

  /* Caption-toggle handler — sluit alle anderen wanneer er een opent. */
  const toggleCaption = useCallback((key: string) => {
    setExpandedKey((current) => (current === key ? null : key))
  }, [])

  /* Marquee-duration als CSS custom property → globals.css regelt de
     animation. Min 20s zodat super-snelle admin-instellingen niet
     onleesbaar worden. */
  const trackStyle: CSSProperties = {
    ['--marquee-duration' as string]: `${Math.max(20, settings.marquee_speed_seconds || 60)}s`,
  }

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

      {/* Marquee container */}
      <div className="relative w-full">
        {/* Skip-buttons (desktop). */}
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

        {/* Scroll-container — overflow-x:auto voor native swipe. Géén
            scroll-snap of scroll-smooth (kan composeren-gedrag met de
            CSS-animatie verstoren). Pointer-events vangen alleen
            touch/pen → mouse-hover pauzeert NIET. */}
        <div
          ref={containerRef}
          className="overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none' as const }}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
        >
          {/* Track — pure CSS marquee animatie via class
              animate-marquee + data-paused attribute (zie globals.css).
              GPU-composited → smooth zoals voorheen. */}
          <div
            ref={trackRef}
            role="list"
            className="flex gap-4 md:gap-6 w-max animate-marquee"
            data-paused={animPaused ? 'true' : 'false'}
            style={trackStyle}
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
                  containerRef={containerRef}
                  pageVisible={pageVisible}
                  isTouchDevice={isTouchDevice}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )
            })}
          </div>
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
  containerRef: RefObject<HTMLDivElement | null>
  pageVisible: boolean
  isTouchDevice: boolean
  prefersReducedMotion: boolean
}

function Tile({
  tileKey,
  post,
  locale,
  isPriority,
  expanded,
  onToggleCaption,
  containerRef,
  pageVisible,
  isTouchDevice,
  prefersReducedMotion,
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
    <div role="listitem" className="relative flex-shrink-0">
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="group relative block aspect-square w-[60vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] xl:w-[18vw] border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
      >
        {/* Image of Video — voor VIDEO-posts gebruiken we een
            VideoTile met poster-laag tegen play-icon-flash. */}
        {isVideo && post.media_url ? (
          <VideoTile
            src={post.media_url}
            poster={post.thumbnail_url || imageSrc}
            isPriority={isPriority}
            containerRef={containerRef}
            pageVisible={pageVisible}
            captionExpanded={expanded}
            isTouchDevice={isTouchDevice}
            prefersReducedMotion={prefersReducedMotion}
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
            expliciet de caption toont. */}
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
          tap op deze knop NIET naar IG navigeert. */}
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
  poster: string
  isPriority: boolean
  containerRef: RefObject<HTMLDivElement | null>
  pageVisible: boolean
  captionExpanded: boolean
  isTouchDevice: boolean
  prefersReducedMotion: boolean
}

/**
 * VideoTile — autoplayende muted video voor IG-Reels.
 *
 * **Device-split trigger** (belangrijk!):
 *  - **Desktop** (hover-capable): video speelt ALLEEN bij hover. Geen
 *    IO-centered, want op brede schermen zouden 3-4 tiles tegelijk in
 *    de centrale zone vallen → 3-4 videos tegelijk afspelen = heavy +
 *    visueel onrustig. Hover geeft bewuste user-controle.
 *  - **Mobiel** (no hover): video speelt wanneer de tile in het
 *    centrum van de carousel staat (IO met threshold 0.4). Hover-
 *    events vuren niet op touch dus dit is de enige werkbare trigger.
 *
 * **Anti-play-icon-flash architectuur**:
 *  - Native <video poster={...}> — de browser toont de poster zelf
 *    tijdens loading i.p.v. een play-icon-fallback. Dit is dé fix
 *    voor de "play icon flash" die de user zag.
 *  - Next.js <Image> daarbovenop — geoptimaliseerd format/sizing,
 *    fadet pas weg wanneer de video écht een frame heeft (`onLoadedData`).
 *  - <video> wordt alleen gemount wanneer `shouldPlay=true` → spaart
 *    bandwidth en voorkomt dat 12 video's tegelijk laden.
 *
 * `autoPlay` + `muted` + `playsInline` voldoen aan álle browser
 * autoplay-policies → de browser handelt 't autoplay-protocol zelf
 * af, geen JS play()-call die silent kan rejecten.
 *
 * Wanneer gepauzeerd (= unmount):
 *  - Tab niet zichtbaar (pageVisible=false)
 *  - Caption open op deze tile (captionExpanded=true)
 *  - prefers-reduced-motion: reduce → a11y respect
 *  - Desktop: niet gehoverd. Mobiel: niet centered.
 */
function VideoTile({
  src,
  poster,
  isPriority,
  containerRef,
  pageVisible,
  captionExpanded,
  isTouchDevice,
  prefersReducedMotion,
}: VideoTileProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [centered, setCentered] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  /* Device-aware trigger:
     - touch device → IO-centered (geen hover beschikbaar)
     - desktop → hover-only (voorkomt multi-play in center zone) */
  const trigger = isTouchDevice ? centered : hovered
  const shouldPlay =
    trigger && pageVisible && !captionExpanded && !prefersReducedMotion

  /* "Adjust state in response to props" — React-aanbevolen pattern.
     Reset videoReady zodra shouldPlay flipt zodat een stale `true`
     uit een vorige cycle niet leidt tot een blank frame bij re-mount. */
  const [lastShouldPlay, setLastShouldPlay] = useState(shouldPlay)
  if (lastShouldPlay !== shouldPlay) {
    setLastShouldPlay(shouldPlay)
    setVideoReady(false)
  }

  /* IntersectionObserver: ALLEEN op touch-devices (op desktop gebruiken
     we hover, dus IO is dan onnodig CPU-werk). rootMargin -20% lateraal
     → centrale 60% van de carousel-viewport telt als "centered". */
  useEffect(() => {
    if (!isTouchDevice) return
    const wrap = wrapperRef.current
    const root = containerRef.current
    if (!wrap || !root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setCentered(entry.intersectionRatio >= 0.4)
      },
      { root, rootMargin: '0px -20% 0px -20%', threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
    )
    io.observe(wrap)
    return () => io.disconnect()
  }, [containerRef, isTouchDevice])

  /* Mouse-events ALLEEN renderen op desktop. Op touch-devices vuren
     deze events niet sowieso, maar door ze conditioneel te zetten
     houden we de DOM-attributes schoon. */
  const mouseHandlers = isTouchDevice
    ? undefined
    : {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 w-full h-full"
      {...mouseHandlers}
    >
      {/* Poster image — altijd zichtbaar, fadet ALLEEN uit wanneer de
          video én gemount én ready is. Voorkomt blank moment bij
          re-mount. */}
      <Image
        src={poster}
        alt=""
        fill
        unoptimized={!poster.includes('supabase')}
        sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, (min-width: 640px) 40vw, 60vw"
        className={`absolute inset-0 object-cover transition-opacity duration-200 group-hover:scale-105 ${
          videoReady && shouldPlay ? 'opacity-0' : 'opacity-100'
        }`}
        priority={isPriority}
        loading={isPriority ? undefined : 'lazy'}
      />
      {/* Video — alleen mounten bij shouldPlay. KRITISCH: native
          poster-attribuut → browser toont poster zelf tijdens load,
          GEEN play-icon-fallback. autoPlay + muted + playsInline
          dekken alle browser autoplay-policies. */}
      {shouldPlay && (
        <video
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 group-hover:scale-105 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
