'use client'

import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import type { LookbookChapterWithProducts } from '@/lib/lookbook'
import { pickLocalized } from '@/lib/lookbook'
import type { LookbookGlobalSettings } from '@/lib/lookbook-data'
import LookbookChapter from './LookbookChapter'
import LookbookMarquee from './LookbookMarquee'
import { MotionFadeIn, MotionStaggerItem } from './motion'

interface LookbookClientProps {
  settings: LookbookGlobalSettings | null
  chapters: LookbookChapterWithProducts[]
  locale: 'nl' | 'en'
}

/**
 * Composes the full public lookbook experience: intro header, the
 * ordered list of chapters (with a marquee ticker woven between them),
 * and the closing green CTA.
 *
 * The ticker slot after each chapter falls back to the globally set
 * ticker text if the chapter itself doesn't override it, so admins can
 * set a single default and only customize when they need a campaign
 * flourish.
 */
export default function LookbookClient({ settings, chapters, locale }: LookbookClientProps) {
  const headerTitle = pickLocalized(
    settings?.header_title ?? 'THE LOOKBOOK',
    settings?.header_title_en ?? null,
    locale,
  )
  const headerSubtitle = pickLocalized(
    settings?.header_subtitle ?? '',
    settings?.header_subtitle_en ?? null,
    locale,
  )

  const globalTicker = pickLocalized(
    settings?.ticker_text_nl ?? '',
    settings?.ticker_text_en ?? null,
    locale,
  )

  const finalCtaTitle = pickLocalized(
    settings?.final_cta_title ?? '',
    settings?.final_cta_title_en ?? null,
    locale,
  )
  const finalCtaBody = pickLocalized(
    settings?.final_cta_text ?? '',
    settings?.final_cta_text_en ?? null,
    locale,
  )
  const finalCtaButton = pickLocalized(
    settings?.final_cta_button_text ?? (locale === 'en' ? 'Shop the collection' : 'Shop de collectie'),
    settings?.final_cta_button_text_en ?? null,
    locale,
  )
  const finalCtaLink = settings?.final_cta_button_link?.trim() || '/shop'

  return (
    <div data-full-bleed-top className="min-h-screen bg-white">
      {/* HEADER ------------------------------------------------------- */}
      <header className="relative bg-white text-black border-b-2 border-black">
        <MotionFadeIn
          stagger
          rootMargin="0px"
          className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-14 md:pt-20 lg:pt-28 pb-10 md:pb-16 lg:pb-20"
        >
          <MotionStaggerItem
            as="p"
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-4"
          >
            MOSE · Editorial
          </MotionStaggerItem>
          <MotionStaggerItem
            as="h1"
            className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-display uppercase tracking-tight leading-[0.85] mb-4 md:mb-6"
          >
            {headerTitle}
          </MotionStaggerItem>
          {headerSubtitle && (
            <MotionStaggerItem
              as="p"
              className="text-base md:text-xl text-gray-700 max-w-2xl"
            >
              {headerSubtitle}
            </MotionStaggerItem>
          )}
        </MotionFadeIn>
      </header>

      {/* EMPTY STATE -------------------------------------------------- */}
      {chapters.length === 0 ? (
        <div className="max-w-3xl mx-auto p-10 md:p-16 text-center border-b-2 border-black">
          <p className="text-lg font-bold uppercase tracking-wider text-gray-700 mb-2">
            {locale === 'en'
              ? 'The next chapter is coming soon.'
              : 'Het volgende hoofdstuk komt eraan.'}
          </p>
          <p className="text-gray-500 mb-6">
            {locale === 'en'
              ? 'In the meantime, explore the full collection.'
              : 'Bekijk ondertussen de volledige collectie.'}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-brand-primary transition-colors"
          >
            {locale === 'en' ? 'Shop the collection' : 'Shop de collectie'}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        /* CHAPTERS -------------------------------------------------- */
        chapters.map((chapter, index) => {
          const perChapterTicker = pickLocalized(
            chapter.ticker_text_nl,
            chapter.ticker_text_en,
            locale,
          )
          const tickerText = perChapterTicker || globalTicker
          const isLast = index === chapters.length - 1
          return (
            <div key={chapter.id}>
              <LookbookChapter chapter={chapter} index={index} locale={locale} />
              {/* Marquee after every chapter except the last; invert the
                  theme on chapters that aren't themselves dark so the
                  baton-pass between sections keeps its visual rhythm. */}
              {!isLast && tickerText && (
                <LookbookMarquee
                  text={tickerText}
                  inverted={chapter.layout_variant === 'dark'}
                />
              )}
            </div>
          )
        })
      )}

      {/* FINAL CTA ---------------------------------------------------- */}
      {(finalCtaTitle || finalCtaBody) && (
        <section className="border-t-2 border-black bg-brand-primary text-white">
          <MotionFadeIn
            stagger
            rootMargin="-10% 0px"
            className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20 lg:py-24 text-center"
          >
            {finalCtaTitle && (
              <MotionStaggerItem
                as="h2"
                className="text-4xl md:text-6xl lg:text-7xl font-display uppercase tracking-tight mb-4 md:mb-6 leading-[0.95]"
              >
                {finalCtaTitle}
              </MotionStaggerItem>
            )}
            {finalCtaBody && (
              <MotionStaggerItem
                as="p"
                className="text-base md:text-lg lg:text-xl opacity-95 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed"
              >
                {finalCtaBody}
              </MotionStaggerItem>
            )}
            <MotionStaggerItem as="div" className="inline-block">
              <Link
                href={finalCtaLink}
                className="inline-flex items-center gap-2 bg-white text-brand-primary px-8 md:px-10 py-4 font-bold uppercase tracking-wider hover:bg-black hover:text-white border-2 border-white transition-colors text-base md:text-lg"
              >
                {finalCtaButton}
                <ArrowRight size={20} />
              </Link>
            </MotionStaggerItem>
          </MotionFadeIn>
        </section>
      )}
    </div>
  )
}
