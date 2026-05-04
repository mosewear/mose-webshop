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
 * BELANGRIJK: track heeft GEEN `scroll-behavior: smooth` (CSS).
 * Sommige browsers passen die rule óók toe op directe `scrollLeft = X`
 * assignments → elke rAF-tick zou dan een smooth-animation triggeren
 * die de volgende tick weer cancelt → carousel staat visueel stil.
 * Smooth scroll is enkel actief op de skip-buttons via
 * `scrollBy({ behavior: 'smooth' })`.
 *
 * Auto-pauze in de volgende gevallen:
 *   - Tab/window niet zichtbaar (Page Visibility API)
 *   - Sectie out-of-viewport (IntersectionObserver, drempel 0.1)
 *   - Cursor over de carousel (desktop hover)
 *   - Toetsenbord-focus binnen de carousel
 *   - Recente user-interactie (touch / pointer-drag / horizontaal wheel
 *     / keydown) → auto resumes 1.5s na laatste input
 *   - Caption open op een tile (mobiel)
 *   - prefers-reduced-motion: reduce → géén auto-advance, swipe + skip
 *     blijven werken
 *
 * Extra UX:
 *   - Skip-buttons ← / → (desktop), brutalist tile-overlays
 *   - Caption-toggle "i"-icoon per tile (mobiel) → toont caption + likes
 *     overlay zonder naar IG te navigeren
 *   - Video-thumbnails autoplayen muted on hover (desktop) of wanneer
 *     ze het centrum van de carousel-viewport raken (mobiel) — met
 *     poster-overlay tegen "zwart beeld" bij eerste play
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
  // Float-positie van de auto-advance. We accumuleren sub-pixel
  // movement HIER (in een ref) i.p.v. via track.scrollLeft te lezen
  // → sommige browsers truncaten scrollLeft naar integer pixels bij
  // read, waardoor dx < 1 px/frame nooit accumuleert (positie blijft
  // 0). Door intern als float bij te houden en alleen te schrijven
  // naar scrollLeft is sub-pixel-accumulatie betrouwbaar.
  const positionRef = useRef<number>(0)

  /* ---- State ---- */
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
       2. positionRef += dx (FLOAT-accumulatie, niet via scrollLeft!)
       3. wanneer positionRef ≥ halfWidth → wrap
       4. assign track.scrollLeft = positionRef
     Eerste tick na (re)start skipt dt-berekening om grote jumps na
     een lange pauze te voorkomen. positionRef wordt aan 't begin
     gesynct vanuit de ECHTE scroll-positie zodat we netjes verder
     gaan vanaf waar de gebruiker handmatig was gescrolld. */
  useEffect(() => {
    if (!isAnimating) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTickTsRef.current = 0
      return
    }

    // Sync positionRef vanuit echte scrollLeft → catch-up na manuele
    // scroll. Hierna is positionRef de single source of truth.
    if (trackRef.current) {
      positionRef.current = trackRef.current.scrollLeft
    }

    const seconds = Math.max(20, settings.marquee_speed_seconds || 60)

    const tick = (ts: number) => {
      const track = trackRef.current
      if (!track) return
      // Hermeet halfWidth elke tick (kost ~0ms): voorkomt out-of-sync
      // wrap wanneer images later pas hun final layout krijgen.
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
      const pps = halfWidth / seconds
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

  /* Wheel: alleen pauzeren wanneer de horizontale component dominant
     is. Voorkomt dat puur verticaal page-scrollen óver de carousel
     onnodig pauzeert. */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) noteUserInteraction()
    },
    [noteUserInteraction]
  )

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
            touch + wheel-scroll werkt direct. GEEN scroll-smooth EN
            géén scroll-snap (beide kunnen rAF-driven scrollLeft-
            mutaties verstoren door snap-fights of smooth-animations
            die de tick weer cancelen → carousel staat visueel stil). */}
        <div
          ref={trackRef}
          role="list"
          className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none' as const }}
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
            VideoTile met layered Image+Video (poster blijft zichtbaar
            tot de video eerste frame heeft → géén zwart beeld).
            Voor IMAGE/CAROUSEL_ALBUM tonen we de standaard Image. */}
        {isVideo && post.media_url ? (
          <VideoTile
            src={post.media_url}
            poster={post.thumbnail_url || imageSrc}
            isPriority={isPriority}
            trackRef={trackRef}
            pageVisible={pageVisible}
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
  poster: string
  isPriority: boolean
  trackRef: RefObject<HTMLDivElement | null>
  pageVisible: boolean
  captionExpanded: boolean
}

/**
 * VideoTile — toont een autoplayende muted video voor IG-Reels-posts.
 *
 * **Mount/unmount + autoPlay + onLoadedData approach**:
 *  - Poster (Next.js Image) staat ALTIJD onder als basislaag.
 *  - <video> wordt alleen gemount wanneer `shouldPlay` true is. Browser
 *    krijgt `autoPlay` + `muted` + `playsInline` mee → die start dan
 *    netjes binnen de autoplay-policies (geen JS play()-call die
 *    silent kan rejecten).
 *  - Zodra `onLoadedData` vuurt heeft de browser de eerste frame
 *    gedecodeerd → we fade'n de video in (opacity-100). Geen zwart
 *    beeld. Voor posts die vroeg in de cache zitten gebruiken we als
 *    backup ook `onPlaying`.
 *  - `videoReady` wordt op iedere shouldPlay-flip hard ge-reset via
 *    de "adjust state in response to props"-render-pattern, zodat een
 *    stale ready-flag van een vorige cycle niet leidt tot een blank
 *    frame.
 *
 * Wanneer afgespeeld:
 *  - Desktop: bij hover op de tile.
 *  - Mobiel: wanneer de tile in het centrale ~60% van de carousel-
 *    viewport staat (IO met rootMargin -20% lateraal).
 *
 * Wanneer gepauzeerd:
 *  - Tab niet zichtbaar (pageVisible=false)
 *  - Caption open op deze tile (captionExpanded=true)
 *  - Geen hover én niet centered
 *  → in die gevallen wordt de <video> simpelweg unmounted en zie je
 *    weer de poster.
 *
 * `preload="auto"` op de gemounte video duwt de browser om vroeg te
 * laden zodat playback bijna direct start na mount.
 */
function VideoTile({
  src,
  poster,
  isPriority,
  trackRef,
  pageVisible,
  captionExpanded,
}: VideoTileProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [centered, setCentered] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  /* Bereken of de video MAG spelen op dit moment. */
  const shouldPlay = (hovered || centered) && pageVisible && !captionExpanded

  /* "Adjust state in response to props" — React-aanbevolen pattern
     (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
     Reset videoReady zodra shouldPlay flipt: een stale `true` uit een
     vorige play-cycle zou anders bij re-mount instant een blank
     video-frame tonen voordat de browser frames heeft. */
  const [lastShouldPlay, setLastShouldPlay] = useState(shouldPlay)
  if (lastShouldPlay !== shouldPlay) {
    setLastShouldPlay(shouldPlay)
    setVideoReady(false)
  }

  /* IntersectionObserver: detecteert centrale-positie binnen de
     carousel. rootMargin -20% links/rechts + threshold 0.4 → tile
     "centered" zodra ~40% binnen de centrale 60% van de viewport
     valt. Iets permissiever dan strict-center zodat playback al
     start vóór de tile exact in 't midden zit. */
  useEffect(() => {
    const wrap = wrapperRef.current
    const root = trackRef.current
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
  }, [trackRef])

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster image — altijd zichtbaar, fadet ALLEEN uit wanneer
          de video én gemount én ready is. Voorkomt blank moment. */}
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
      {/* Video — alleen mounten bij shouldPlay. autoPlay + muted +
          playsInline laten browser autoplay-policy zelf afhandelen
          (geen JS play()-call die silent kan rejecten). */}
      {shouldPlay && (
        <video
          src={src}
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
