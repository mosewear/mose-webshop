'use client'

import Image from 'next/image'
import type { LookbookChapterWithProducts } from '@/lib/lookbook'
import { pickLocalized } from '@/lib/lookbook'
import ShopModule from './ShopModule'
import { MotionFadeIn, MotionStaggerItem, ParallaxImage } from './motion'

interface LookbookChapterProps {
  chapter: LookbookChapterWithProducts
  index: number
  locale: 'nl' | 'en'
}

/**
 * Renders a single lookbook chapter according to its layout_variant.
 *
 * Responsibilities are split clearly:
 *   1. Layout / typography / image positioning (this file)
 *   2. Product presentation (ShopModule.tsx)
 *   3. Motion primitives with reduced-motion support (motion.tsx)
 *
 * The chapter number is formatted two digits (01, 02, …) and used as a
 * fallback eyebrow when the admin doesn't set one, giving the lookbook
 * its "book" rhythm for free.
 *
 * The first chapter (`index === 0`) always hydrates its hero with
 * `priority` so the LCP image loads fast regardless of layout variant —
 * without this, dark/split first chapters lost out on the LCP boost
 * that only the wide variant got before.
 */
export default function LookbookChapter({ chapter, index, locale }: LookbookChapterProps) {
  const title = pickLocalized(chapter.title_nl, chapter.title_en, locale)
  const caption = pickLocalized(chapter.caption_nl, chapter.caption_en, locale)
  const eyebrowLocalized = pickLocalized(chapter.eyebrow_nl, chapter.eyebrow_en, locale)
  const chapterNumber = String(index + 1).padStart(2, '0')
  const eyebrow = eyebrowLocalized || `CHAPTER ${chapterNumber}`

  const objectPosition = `${chapter.image_focal_x}% ${chapter.image_focal_y}%`

  const isDark = chapter.layout_variant === 'dark'
  const bgClass = isDark ? 'bg-black text-white' : 'bg-white text-black'
  const borderClass = isDark ? 'border-white' : 'border-black'
  const isFirst = index === 0

  return (
    <section
      data-chapter-index={index}
      className={`lookbook-chapter relative ${bgClass} py-10 md:py-16 lg:py-20 px-4 md:px-6 lg:px-8`}
    >
      <div className="max-w-7xl mx-auto space-y-10 md:space-y-14">
        {chapter.layout_variant === 'wide' && (
          <WideLayout
            eyebrow={eyebrow}
            title={title}
            caption={caption}
            imageUrl={chapter.hero_image_url}
            objectPosition={objectPosition}
            borderClass={borderClass}
            isDark={isDark}
            priority={isFirst}
          />
        )}
        {chapter.layout_variant === 'split-right' && (
          <SplitLayout
            mirrored={false}
            eyebrow={eyebrow}
            title={title}
            caption={caption}
            imageUrl={chapter.hero_image_url}
            objectPosition={objectPosition}
            borderClass={borderClass}
            isDark={isDark}
            priority={isFirst}
          />
        )}
        {chapter.layout_variant === 'split-left' && (
          <SplitLayout
            mirrored
            eyebrow={eyebrow}
            title={title}
            caption={caption}
            imageUrl={chapter.hero_image_url}
            objectPosition={objectPosition}
            borderClass={borderClass}
            isDark={isDark}
            priority={isFirst}
          />
        )}
        {chapter.layout_variant === 'dark' && (
          <DarkLayout
            eyebrow={eyebrow}
            title={title}
            caption={caption}
            imageUrl={chapter.hero_image_url}
            objectPosition={objectPosition}
            priority={isFirst}
          />
        )}

        {chapter.products.length > 0 && (
          <MotionFadeIn rootMargin="-5% 0px">
            <ShopModule
              products={chapter.products}
              locale={locale}
              meta={chapter.meta}
              inverted={isDark}
            />
          </MotionFadeIn>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// WIDE — full-bleed hero (parallax), caption underneath in editorial grid
// ---------------------------------------------------------------------------

function WideLayout({
  eyebrow,
  title,
  caption,
  imageUrl,
  objectPosition,
  borderClass,
  isDark,
  priority,
}: {
  eyebrow: string
  title: string
  caption: string
  imageUrl: string
  objectPosition: string
  borderClass: string
  isDark: boolean
  priority: boolean
}) {
  return (
    <div className="space-y-6 md:space-y-10">
      <div className={`relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/10] border-2 ${borderClass} overflow-hidden bg-gray-100`}>
        {imageUrl ? (
          priority ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              style={{ objectPosition }}
              className="object-cover"
              priority
            />
          ) : (
            <ParallaxImage
              src={imageUrl}
              alt={title}
              sizes="(max-width: 1280px) 100vw, 1280px"
              objectPosition={objectPosition}
            />
          )
        ) : null}
      </div>
      <MotionFadeIn stagger rootMargin="-10% 0px" className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 md:gap-10 items-start">
        <MotionStaggerItem as="div">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60 mb-2">
            {eyebrow}
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-display uppercase tracking-tight leading-[0.95]">
            {title}
          </h2>
        </MotionStaggerItem>
        {caption && (
          <MotionStaggerItem
            as="p"
            className={`text-base md:text-lg leading-relaxed ${
              isDark ? 'text-white/85' : 'text-gray-700'
            }`}
          >
            {caption}
          </MotionStaggerItem>
        )}
      </MotionFadeIn>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SPLIT — asymmetric 7:5 grid. When mirrored, image swaps sides.
// The sticky text block respects the actual top-chrome height via the
// same CSS vars the global layout already maintains, so it never tucks
// behind the fixed announcement banner + header.
// ---------------------------------------------------------------------------

function SplitLayout({
  mirrored,
  eyebrow,
  title,
  caption,
  imageUrl,
  objectPosition,
  borderClass,
  isDark,
  priority,
}: {
  mirrored: boolean
  eyebrow: string
  title: string
  caption: string
  imageUrl: string
  objectPosition: string
  borderClass: string
  isDark: boolean
  priority: boolean
}) {
  const imageBlock = (
    <div className={`relative aspect-[3/4] md:aspect-[4/5] border-2 ${borderClass} overflow-hidden bg-gray-100`}>
      {imageUrl ? (
        priority ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            style={{ objectPosition }}
            className="object-cover"
            priority
          />
        ) : (
          <ParallaxImage
            src={imageUrl}
            alt={title}
            sizes="(max-width: 1024px) 100vw, 50vw"
            objectPosition={objectPosition}
          />
        )
      ) : null}
    </div>
  )

  const textBlock = (
    <MotionFadeIn
      stagger
      rootMargin="-10% 0px"
      className="flex flex-col justify-center py-4 md:py-8 md:sticky md:top-[calc(var(--announcement-banner-height,0px)+var(--header-total-height,0px)+1.5rem)] self-start"
    >
      <MotionStaggerItem
        as="p"
        className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-60 mb-3"
      >
        {eyebrow}
      </MotionStaggerItem>
      <MotionStaggerItem
        as="h2"
        className="text-3xl md:text-5xl lg:text-6xl font-display uppercase tracking-tight leading-[0.95] mb-4 md:mb-6"
      >
        {title}
      </MotionStaggerItem>
      {caption && (
        <MotionStaggerItem
          as="p"
          className={`text-base md:text-lg leading-relaxed ${
            isDark ? 'text-white/85' : 'text-gray-700'
          }`}
        >
          {caption}
        </MotionStaggerItem>
      )}
    </MotionFadeIn>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
      {mirrored ? (
        <>
          <div className="lg:col-span-5 order-2 lg:order-1">{textBlock}</div>
          <div className="lg:col-span-7 order-1 lg:order-2">{imageBlock}</div>
        </>
      ) : (
        <>
          <div className="lg:col-span-7">{imageBlock}</div>
          <div className="lg:col-span-5">{textBlock}</div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DARK — inverted scheme with full-bleed image and overlaid editorial.
// Title carries a drop-shadow so the heading stays readable against
// busy photography without needing a darker gradient.
// ---------------------------------------------------------------------------

function DarkLayout({
  eyebrow,
  title,
  caption,
  imageUrl,
  objectPosition,
  priority,
}: {
  eyebrow: string
  title: string
  caption: string
  imageUrl: string
  objectPosition: string
  priority: boolean
}) {
  return (
    <div className="relative w-full aspect-[4/5] md:aspect-[16/10] lg:aspect-[16/9] border-2 border-white overflow-hidden">
      {imageUrl ? (
        priority ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            style={{ objectPosition }}
            className="object-cover"
            priority
          />
        ) : (
          <ParallaxImage
            src={imageUrl}
            alt={title}
            sizes="(max-width: 1280px) 100vw, 1280px"
            objectPosition={objectPosition}
          />
        )
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 flex items-end pointer-events-none">
        <MotionFadeIn stagger rootMargin="-15% 0px" className="p-6 md:p-12 lg:p-16 max-w-3xl pointer-events-auto">
          <MotionStaggerItem
            as="p"
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/70 mb-3"
          >
            {eyebrow}
          </MotionStaggerItem>
          <MotionStaggerItem
            as="h2"
            className="text-white text-4xl md:text-6xl lg:text-7xl font-display uppercase tracking-tight leading-[0.95] mb-4 drop-shadow-2xl"
          >
            {title}
          </MotionStaggerItem>
          {caption && (
            <MotionStaggerItem
              as="p"
              className="text-white/85 text-base md:text-lg leading-relaxed drop-shadow-md"
            >
              {caption}
            </MotionStaggerItem>
          )}
        </MotionFadeIn>
      </div>
    </div>
  )
}
