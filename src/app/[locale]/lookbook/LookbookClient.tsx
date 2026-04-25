'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { LookbookChapterWithProducts } from '@/lib/lookbook'
import { pickLocalized } from '@/lib/lookbook'
import type { LookbookGlobalSettings } from '@/lib/lookbook-data'
import LookbookChapter from './LookbookChapter'
import LookbookStamp from './LookbookStamp'
import { MotionFadeIn, MotionStaggerItem } from './motion'

interface LookbookClientProps {
  settings: LookbookGlobalSettings | null
  chapters: LookbookChapterWithProducts[]
  locale: 'nl' | 'en'
}

/**
 * Composes the full public lookbook experience: intro header, the
 * ordered list of chapters (with a slim editorial divider woven
 * between them), and the closing CTA panel.
 *
 * All UI strings resolve through the `lookbook` next-intl namespace
 * so NL and EN render identical markup from a single source of truth.
 * Admin-authored content (titles, captions, ticker text, final CTA
 * copy) still comes from the DB via `pickLocalized`.
 */
export default function LookbookClient({ settings, chapters, locale }: LookbookClientProps) {
  const t = useTranslations('lookbook')

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

  // Editorial stamp left side (e.g. "GRONINGEN · 53.21°N 6.57°E").
  // Falls back to the canonical Groningen coordinates so the stamp
  // never collapses to "blank" if an editor accidentally clears it.
  const stampLeft = pickLocalized(
    settings?.stamp_left_nl ?? 'GRONINGEN · 53.21°N 6.57°E',
    settings?.stamp_left_en ?? null,
    locale,
  )

  const totalChapters = chapters.length
  const totalLabel = String(totalChapters).padStart(2, '0')
  const nextLabel = t('stamp.next')

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
    settings?.final_cta_button_text ?? t('finalCta.defaultButton'),
    settings?.final_cta_button_text_en ?? null,
    locale,
  )
  const finalCtaLink = settings?.final_cta_button_link?.trim() || '/shop'

  return (
    // No `data-full-bleed-top` here: the lookbook has a regular white
    // header (not a full-viewport hero behind the chrome), so it must
    // respect the global #main-content top-offset that compensates for
    // the fixed announcement banner + header. Only the homepage opts
    // out of that rule because its hero intentionally sits behind it.
    <div className="min-h-screen bg-white">
      {/* HEADER ------------------------------------------------------- */}
      <header className="relative bg-white text-black border-b-2 border-black">
        <MotionFadeIn
          stagger
          rootMargin="0px"
          className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-10 md:pt-14 lg:pt-20 pb-10 md:pb-16 lg:pb-20"
        >
          <MotionStaggerItem
            as="p"
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-4"
          >
            {t('eyebrow')}
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
            {t('emptyState.title')}
          </p>
          <p className="text-gray-500 mb-6">{t('emptyState.body')}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-brand-primary transition-colors"
          >
            {t('emptyState.cta')}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        /* CHAPTERS -------------------------------------------------- */
        chapters.map((chapter, index) => {
          const isLast = index === chapters.length - 1
          const nextChapter = isLast ? null : chapters[index + 1]
          const nextTitle = nextChapter
            ? pickLocalized(nextChapter.title_nl, nextChapter.title_en, locale)
            : ''
          const nextNumber = String(index + 2).padStart(2, '0')
          const stampRight = nextChapter
            ? `${nextLabel} — ${nextNumber} / ${totalLabel} · ${nextTitle}`
            : ''

          return (
            <div key={chapter.id}>
              <LookbookChapter chapter={chapter} index={index} locale={locale} />
              {/* Editorial stamp between chapters: location on the
                  left, hairline ruling, "next chapter" cue on the
                  right. Theme flips on dark chapters so contrast is
                  preserved against whatever sits directly above. */}
              {!isLast && (
                <LookbookStamp
                  leftText={stampLeft}
                  rightText={stampRight}
                  inverted={chapter.layout_variant === 'dark'}
                  ariaLabel={t('stamp.ariaLabel')}
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
