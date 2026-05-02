'use client'

import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, Heart, Instagram, Film, Layers } from 'lucide-react'
import type {
  InstagramDisplaySettings,
  InstagramPost,
} from '@/lib/instagram/types'

interface PdpInstagramFeedProps {
  settings: InstagramDisplaySettings
  /** Maximaal 6 posts; bovenliggende fetcher slice't al op 6. Mobiel
   *  worden er met CSS 4 zichtbaar gemaakt en op desktop alle 6. */
  posts: InstagramPost[]
}

function localizedCaption(post: InstagramPost, locale: string): string | null {
  if (locale === 'en' && post.caption_en) return post.caption_en
  return post.caption || null
}

/**
 * Compactere PDP-variant van [InstagramMarquee](src/components/home/InstagramMarquee.tsx).
 *
 * Belangrijke verschillen met de homepage:
 *   * geen oneindige marquee-loop — een statische, brutalist 4/6-grid
 *     past beter in de PDP-flow tussen reviews en FAQ
 *   * geen grote groene CTA-block onderaan — slechts één onopvallende
 *     tekstlink die de aandacht niet wegtrekt van de aankoop
 *   * eigen, PDP-specifieke kop ("Gedragen door onze community") en
 *     subline om het anders te framen dan de homepage
 *   * mobiel toont 4 tegels (2x2), desktop 6 tegels (1x6); we gebruiken
 *     `[&>*:nth-child(n+5)]:hidden` zodat we maar één DOM-render doen
 *
 * Plaatsing: alleen renderen als de fetcher 1+ posts doorgeeft, daarom
 * is er geen "geen posts"-fallback op dit niveau.
 */
export default function PdpInstagramFeed({ settings, posts }: PdpInstagramFeedProps) {
  const t = useTranslations('product.instagram')
  const locale = useLocale()

  const ctaUrl = settings.cta_url || `https://www.instagram.com/${settings.username}`

  return (
    <section
      role="region"
      aria-labelledby="pdp-instagram-heading"
      className="relative bg-white border-t-2 border-b-2 border-black py-10 md:py-14 mt-12 md:mt-16"
    >
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        {/* Header — links uitgelijnd op desktop, gecentreerd op mobiel
            voor visueel rust onder een single-column scroll. */}
        <div className="md:flex md:items-end md:justify-between md:gap-8 mb-6 md:mb-8 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-2 mb-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              <Instagram size={14} aria-hidden="true" className="text-brand-primary" />
              <span>{t('tagLabel')}</span>
            </div>
            <h2
              id="pdp-instagram-heading"
              className="font-display text-3xl md:text-4xl uppercase tracking-tight leading-none"
            >
              {t('title')}
            </h2>
            <p className="mt-2 md:mt-3 text-xs md:text-sm text-gray-500 max-w-md mx-auto md:mx-0">
              {t('subline', { username: settings.username })}
            </p>
          </div>

          {/* Subtiele tekstlink — zit op desktop rechts uitgelijnd onder
              de kop, op mobiel onder de subline. Geen knop-block omdat
              dit blok niet de aandacht moet stelen van de aankoop-CTA. */}
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <span>{t('cta', { username: settings.username })}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        {/* Grid — mobiel 2 kolommen, sm 3, md 6. nth-child verbergt 5+6
            op alles onder md zodat er mobiel altijd een nette 2x2 staat
            zonder een lege of half-gevulde rij. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 [&>*:nth-child(n+5)]:hidden sm:[&>*:nth-child(n+4)]:block sm:[&>*:nth-child(n+5)]:hidden md:[&>*:nth-child(n+5)]:block">
          {posts.slice(0, 6).map((post, idx) => {
            const caption = localizedCaption(post, locale)
            const ariaLabel = caption
              ? `${t('viewPost')} — ${caption.slice(0, 120)}`
              : t('viewPost')
            const imageSrc =
              post.media_type === 'VIDEO' && post.thumbnail_url
                ? post.thumbnail_url
                : post.media_url
            const isPriority = idx < 4

            return (
              <a
                key={`${post.id}-${idx}`}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={ariaLabel}
                className="group relative block aspect-square border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
              >
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  unoptimized={!imageSrc.includes('supabase')}
                  sizes="(min-width: 768px) 16vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={isPriority}
                  loading={isPriority ? undefined : 'lazy'}
                />

                {/* Mediatype-badge: alleen voor video / carousel zodat de
                    pure foto-tegels visueel rustig blijven. */}
                {post.media_type !== 'IMAGE' && (
                  <div
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 bg-white border-2 border-black px-1 py-0.5"
                  >
                    {post.media_type === 'VIDEO' ? (
                      <Film size={12} />
                    ) : (
                      <Layers size={12} />
                    )}
                  </div>
                )}

                {/* Hover-overlay — caption + likes. Zelfde patroon als
                    de homepage marquee maar net wat compacter (kleinere
                    padding & font-sizes) zodat het niet domineert. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 md:p-3"
                >
                  {caption && (
                    <p className="text-white text-[11px] md:text-xs leading-snug line-clamp-2 mb-1.5">
                      {caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-white text-[10px] md:text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Instagram size={11} aria-hidden="true" />
                      <span className="uppercase tracking-wider">{t('viewPost')}</span>
                    </span>
                    {typeof post.like_count === 'number' && post.like_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart size={10} className="fill-current" />
                        {post.like_count.toLocaleString(locale)}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        {/* Mobile-only tekstlink onder de grid — dezelfde target als de
            desktop-versie hierboven. */}
        <div className="md:hidden mt-5 text-center">
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <span>{t('cta', { username: settings.username })}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
