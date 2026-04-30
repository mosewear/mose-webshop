'use client'

import Image from 'next/image'
import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Instagram, Heart, Film, Layers } from 'lucide-react'
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

export default function InstagramMarquee({ settings, posts }: InstagramMarqueeProps) {
  const t = useTranslations('homepage.instagram')
  const locale = useLocale()
  const [paused, setPaused] = useState(false)

  // Dupliceer de posts zodat de loop naadloos is bij translateX(-50%).
  const loopPosts = useMemo(() => [...posts, ...posts], [posts])

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

  // CSS-var voor de animatie-snelheid; respecteert admin-instelling.
  const trackStyle: React.CSSProperties = {
    // CSS custom property accepted at runtime; cast through string-keyed
    // object to keep TS happy without using `any`.
    ...({ '--marquee-duration': `${settings.marquee_speed_seconds}s` } as Record<string, string>),
  }

  return (
    <section
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

      {/* Marquee track (edge-to-edge, geen container) */}
      <div
        className="relative w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          className="flex gap-4 md:gap-6 animate-marquee w-max"
          data-paused={paused ? 'true' : 'false'}
          style={trackStyle}
        >
          {loopPosts.map((post, idx) => {
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
                className="group relative flex-shrink-0 aspect-square w-[60vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] xl:w-[18vw] border-2 border-black overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary"
              >
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

                {/* Media-type badge (video / carousel) */}
                {post.media_type !== 'IMAGE' && (
                  <div
                    aria-hidden="true"
                    className="absolute top-2 right-2 bg-white border-2 border-black px-1.5 py-1"
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
                    className="absolute top-2 left-2 bg-brand-primary text-black border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Pin
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4"
                >
                  {caption && (
                    <p className="text-white text-xs md:text-sm leading-snug line-clamp-2 mb-2">
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
            )
          })}
        </div>

        {/* Edge fade-outs (alleen desktop, voor cinematisch effect) */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent"
        />
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent"
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
