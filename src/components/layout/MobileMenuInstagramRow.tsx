'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
   *  Voorkomt een onnodige network-request voor élke bezoeker die
   *  het menu nooit opent. */
  isOpen: boolean
}

/**
 * Compacte brutalist Instagram-rij voor het mobiele menu. Toont een
 * horizontaal scrollbare strip van 6 thumbnails (tap = open IG-post in
 * nieuwe tab) plus een minimale header (eyebrow + handle + Volg-CTA).
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

  const [data, setData] = useState<InstagramFeedData | null>(null)
  const [loaded, setLoaded] = useState(false)
  // hasFetched voorkomt dat we bij elke open/close-toggle opnieuw
  // fetchen — eerste open initialiseert, daarna hergebruikt de in-
  // memory cache (en de server-side cache van /api/instagram/feed).
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    // AbortController zodat we netjes kunnen aborten als de component
    // unmount tijdens een trage fetch (bv. user sluit het tabblad).
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
  }, [isOpen])

  // Eerste 6 posts maximaal — meer past niet ergonomisch in de
  // scroll-strip en houdt de DOM lekker compact.
  const posts = useMemo(() => (data?.posts ?? []).slice(0, 6), [data])

  // Settings + computed afgeleiden. We pakken de username uit settings
  // (admin-beheer) en vallen netjes terug op 'mosewearcom' zodat we
  // altijd een werkbare CTA-href hebben.
  const settings: InstagramDisplaySettings | null = data?.settings ?? null
  const username = settings?.username || 'mosewearcom'
  const ctaUrl = settings?.cta_url || `https://www.instagram.com/${username}`

  // Voordat de drawer ooit open is geweest fetchen we niets en
  // renderen we niets — geen waste skeleton in de DOM voor users
  // die het menu nooit openen.
  if (!hasFetchedRef.current && !loaded) return null
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
      {/* Header-rij: eyebrow + handle + brutalist Volg-CTA. Typografie
          getuned op site-brede DNA — eyebrow text-xs/0.2em (matcht de
          PDP-eyebrow & ProductReviews), title text-2xl, en Volg-CTA als
          filled-black primary CTA met hover→groen flip (consistent met
          de PDP "Toevoegen aan mandje"-logica). */}
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

      {/* Empty state: enabled door admin maar nog geen posts. Heel
          subtiel — gewoon een dunne lijn met label. */}
      {loaded && posts.length === 0 && (
        <div className="px-4 pb-4">
          <div className="border-2 border-dashed border-gray-300 px-3 py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              {t('empty')}
            </p>
          </div>
        </div>
      )}

      {/* Thumbnail-strip: horizontaal scrollbaar met scroll-snap. Op
          smal scherm zie je ~3.5 tegels — de fade-edge rechts en de
          half-zichtbare 4e tegel hinten subtiel naar de rest. We
          gebruiken aspect-square (= IG-feed default) zodat de tegels
          niet onnodig veel verticale ruimte vreten. */}
      {posts.length > 0 && (
        <div className="relative pb-4">
          <div
            className="overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              // IE/Edge legacy fallback. Tailwind's arbitrary
              // [scrollbar-width:none] dekt moderne browsers af; deze
              // inline style is voor Edge < 79.
              msOverflowStyle: 'none',
            }}
          >
            <ol className="flex gap-2 px-4">
              {posts.map((post, idx) => (
                <InstagramThumb
                  key={`${post.id}-${idx}`}
                  post={post}
                  index={idx}
                  locale={locale}
                  viewPostLabel={t('viewPost', { index: idx + 1 })}
                />
              ))}
            </ol>
          </div>
          {/* Scroll-hint: fade-edge rechts, alleen wanneer er meer dan
              4 posts zijn (anders past alles direct in beeld). Pure
              CSS, pointer-events-none zodat 'ie geen taps eet. */}
          {posts.length > 4 && (
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 bottom-4 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none"
            />
          )}
        </div>
      )}

      {/* Skeleton: voorkom layout-jump tijdens initial load. We tonen
          6 grijze placeholders die exact dezelfde dimensies hebben als
          de echte thumbs. */}
      {!loaded && (
        <div className="overflow-hidden pb-4">
          <ol
            className="flex gap-2 px-4"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
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
    <li className="flex-shrink-0 snap-start">
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
