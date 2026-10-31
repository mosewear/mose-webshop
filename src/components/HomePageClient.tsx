'use client'

import { useLiveAvailability } from '@/hooks/useLiveAvailability'

import Image, { getImageProps } from 'next/image'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import { catalogTiles, emptyCatalogFilters, type CatalogProduct } from '@/lib/catalog-filters'
import FAQAccordion from '@/components/FAQAccordion'
import { type HomepageSettings } from '@/lib/homepage'
import { useWishlist } from '@/store/wishlist'
import {
  Star,
  CalendarCheck,
  Crown,
  Mail,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, FormEvent, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

interface HomePageClientProps {
  siteSettings: {
    free_shipping_threshold: number
    return_days: number
  }
  homepageSettings: HomepageSettings
  featuredProducts: CatalogProduct[]
  categories: Array<{id: string; slug: string; name: string; image_url: string | null}>
  instagramSlot?: React.ReactNode
}

export default function HomePageClient({
  siteSettings: initialSettings,
  homepageSettings: initialHomepageSettings,
  featuredProducts: initialFeaturedProducts,
  categories: initialCategories,
  instagramSlot,
}: HomePageClientProps) {
  const t = useTranslations('homepage')
  const locale = useLocale()
  const { loadWishlist } = useWishlist()
  
  const settings = initialSettings
  const homepageSettings = initialHomepageSettings
  const featuredProducts = useLiveAvailability(initialFeaturedProducts)
  const categories = initialCategories

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  // Versioned lossless masters avoid recompressing already-lossy WebP sources
  // and invalidate the old 30-day image cache without changing custom uploads.
  const desktopFallback = '/campaign/mose-hero-desktop-retina-2026-11.webp'
  const mobileFallback = '/campaign/mose-hero-mobile-retina-2026-11.webp'
  const desktopSetting = homepageSettings?.hero_image_url
  const mobileSetting = homepageSettings?.hero_image_url_mobile
  const [heroDesktopSrc, setHeroDesktopSrc] = useState(
    !desktopSetting || ['/campaign/mose-hero-desktop-2026-10.webp', '/campaign/mose-hero-desktop-hq-2026-11.png'].includes(desktopSetting) ? desktopFallback : desktopSetting,
  )
  const [heroMobileSrc, setHeroMobileSrc] = useState(
    !mobileSetting || ['/campaign/mose-hero-mobile-2026-10.webp', '/campaign/mose-hero-mobile-hq-2026-11.png'].includes(mobileSetting) ? mobileFallback : mobileSetting,
  )
  // A picture selects one art-directed source before downloading the hero.
  // object-cover can scale the image wider than the viewport. Account for the
  // tallest hero (820px desktop / 760px mobile), so high-density screens do
  // not receive a source sized only for the narrower visible crop.
  const desktopHero = getImageProps({ src: heroDesktopSrc, alt: '', fill: true, sizes: '(min-width: 1458px) 100vw, 1458px', quality: 95 }).props
  const mobileHero = getImageProps({ src: heroMobileSrc, alt: t('hero.imageAlt'), fill: true, sizes: '(max-width: 506px) 507px, 100vw', quality: 95 }).props

  const [storyImageSrc, setStoryImageSrc] = useState('/mose-about-collection.webp')

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  const handleNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!newsletterEmail || newsletterLoading) return

    setNewsletterLoading(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletterEmail,
          source: 'homepage',
          locale, // Pass current locale for multi-language emails
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.error || t('newsletter.error'))
        setNewsletterLoading(false)
        return
      }

      if (data.alreadySubscribed) {
        toast.success(t('newsletter.alreadySubscribed'))
      } else {
        toast.success(t('newsletter.success'))
      }
      setNewsletterSuccess(true)
      setNewsletterEmail('')

      // Reset success state after 5 seconds
      setTimeout(() => {
        setNewsletterSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      toast.error(t('newsletter.error'))
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-white">
      <section
        data-home-hero
        aria-labelledby="home-hero-title"
        className="relative isolate flex min-h-[440px] max-h-[760px] w-full overflow-hidden bg-black lg:min-h-[560px] lg:max-h-[820px]"
        style={{ height: 'calc(100svh - var(--announcement-banner-height, 0px) - var(--header-total-height, 0px))' }}
      >
        <picture>
          <source media="(min-width: 1024px)" srcSet={desktopHero.srcSet} sizes={desktopHero.sizes} />
          {/* getImageProps keeps Next image optimisation while picture avoids loading both crops. */}
          <img
            {...mobileHero}
            alt={t('hero.imageAlt')}
            loading="eager"
            fetchPriority="high"
            className="object-cover object-top"
            onError={() => {
              setHeroDesktopSrc(desktopFallback)
              setHeroMobileSrc(mobileFallback)
            }}
          />
        </picture>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_20%,rgba(0,0,0,0.20)_43%,transparent_58%)] lg:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.48)_32%,transparent_62%)] lg:block" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-end px-4 pb-5 pt-8 sm:px-8 lg:items-center lg:px-10 lg:py-12 xl:px-16">
          <div className="w-full max-w-lg text-left lg:w-[44%] lg:max-w-[640px]">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs lg:mb-5">
              {homepageSettings?.hero_badge_text || t('hero.badge')}
            </p>
            <h1 id="home-hero-title" className="mb-3 font-display text-[clamp(30px,8.5vw,44px)] leading-[1.02] tracking-tight text-white sm:text-5xl lg:mb-5 lg:text-[clamp(40px,5.2vw,84px)]">
              {homepageSettings?.hero_title_line1 || t('hero.title1')}
              <br />
              <span className="text-brand-primary">{homepageSettings?.hero_title_line2 || t('hero.title2')}</span>
            </h1>
            <p className="mb-4 max-w-[38ch] text-[13px] font-medium leading-relaxed text-white lg:mb-7 lg:max-w-[34ch] lg:text-base xl:text-lg">
              {homepageSettings?.hero_subtitle || t('hero.subtitle')}
            </p>
            <div data-hero-actions className="grid grid-cols-2 items-stretch gap-2 lg:flex lg:flex-wrap lg:gap-3">
              <LocaleLink
                href={homepageSettings?.hero_cta1_link || '/shop'}
                aria-label={t('hero.cta1.aria')}
                className="mose-button mose-button--primary px-2 md:px-8 focus-visible:ring-white"
              >
                {homepageSettings?.hero_cta1_text || t('hero.cta1.text')}
                <ArrowRight size={18} aria-hidden="true" />
              </LocaleLink>
              <LocaleLink
                href={homepageSettings?.hero_cta2_link || '/lookbook'}
                aria-label={t('hero.cta2.aria')}
                className="mose-button border-white bg-transparent px-2 text-white hover:bg-white hover:text-black focus-visible:ring-white md:px-8"
              >
                {homepageSettings?.hero_cta2_text || t('hero.cta2.text')}
              </LocaleLink>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar — flat brand-primary statement-blok. Geen gradient,
          geen drop-shadow op cijfers, geen scale-hover. border-y-2
          zwart maakt het een echt brutalist blok (zelfde patroon als
          de shipping-pill in het mobiele menu).

          Mobile typografie:
            - Label tracking → 0.12em (i.p.v. 0.2em) zodat lange teksten
              als "PREMIUM KWALITEIT" niet wrappen op iPhone SE (375px),
              waar elke kolom maar ~103px breed is.
            - Cijfers iets kleiner zodat de cijfer/label-verhouding niet
              onbalanced voelt (~3.5x i.p.v. 4×).
            - Icoon (3e kolom) klein genoeg om gelijk te ogen met cijfers
              uit kolom 1 + 2.
      */}
      <section className="bg-brand-primary text-white border-y-2 border-black py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 leading-none">
                {homepageSettings?.stats_1_number || '100%'}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.12em] sm:tracking-[0.18em] md:tracking-[0.2em] font-bold leading-tight px-0.5">
                {homepageSettings?.stats_1_text || t('stats.local')}
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 leading-none">
                {settings.return_days}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.12em] sm:tracking-[0.18em] md:tracking-[0.2em] font-bold leading-tight px-0.5">
                {homepageSettings?.stats_2_text || t('stats.returns')}
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-2 md:mb-3">
                {(() => {
                  const iconMap: Record<string, LucideIcon> = { Star, CalendarCheck, Crown }
                  const iconName = homepageSettings?.stats_3_icon || 'Star'
                  const IconComponent = iconMap[iconName] || Star
                  return <IconComponent className="w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16" strokeWidth={2.5} />
                })()}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.12em] sm:tracking-[0.18em] md:tracking-[0.2em] font-bold leading-tight px-0.5">
                {homepageSettings?.stats_3_text || t('stats.quality')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-20 px-4 relative overflow-hidden bg-gray-50">
        {/* Subtle Claw Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <Image
            src="/claw.png"
            alt=""
            width={800}
            height={800}
            className="absolute -top-32 -right-32 transform rotate-12"
          />
          <Image
            src="/claw.png"
            alt=""
            width={600}
            height={600}
            className="absolute bottom-0 -left-20 transform -rotate-45"
          />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section header — brutalist editorial. Eyebrow is solid
              brand-primary text met groene • bullet (zelfde patroon
              als de IG-eyebrow in het mobiele menu en de PDP-reviews),
              i.p.v. de tinted bg-brand-primary/10 chip. */}
          <div className="text-center mb-6 md:mb-8 px-4">
            <div className="inline-flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
              <span aria-hidden="true">•</span>
              <span>{t('featured.label')}</span>
              <span aria-hidden="true">•</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl mb-3 tracking-tight uppercase">{t('featured.title')}</h2>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
              {t('featured.description')}
            </p>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {catalogTiles(featuredProducts, emptyCatalogFilters).map(tile => <CatalogProductCard
                key={tile.tileKey} tile={tile} showCategoryLabels={false}
                imageSizes="(max-width: 767px) calc((100vw - 48px) / 2), (max-width: 1023px) calc((100vw - 56px) / 2), (max-width: 1279px) calc((100vw - 104px) / 4), 294px"
              />)}
            </div>
          ) : <p className="py-8 text-center text-gray-600">{t('featured.noProducts')}</p>}
          <div className="mt-8 text-center"><LocaleLink href="/shop" className="mose-button mose-button--secondary">{t('featured.browse')}<ArrowRight size={18} aria-hidden="true" /></LocaleLink></div>
        </div>
      </section>

      {/* Category Grid — brutalist tiles. Geen shadows, geen scale,
          geen draai-corner-accent. Vaste groene 3px topbar (i.p.v.
          opacity-tint hover-laag), tracking + typografie consistent
          met menu/PDP. */}
      <section className="py-10 md:py-16 px-4 bg-white border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
              <span aria-hidden="true">•</span>
              <span>{t('categories.subtitle')}</span>
              <span aria-hidden="true">•</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl tracking-tight uppercase">{t('categories.title')}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.length > 0 ? (
              categories.map((category) => {
                const categoryImage = category.image_url || '/og-default.jpg'
                const categoryHref = `/shop?category=${category.slug}`

                return (
                  <LocaleLink
                    key={category.id}
                    href={categoryHref}
                    className="group relative aspect-[3/4] overflow-hidden border-2 border-black bg-black"
                  >
                    <Image
                      src={failedImages.has(categoryImage) ? '/placeholder-product.svg' : categoryImage}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      quality={90}
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      onError={() => setFailedImages(prev => new Set(prev).add(categoryImage))}
                    />

                    {/* Hard gradient overlay voor leesbaarheid van het
                        label onderaan. Blijft bottom-up, geen tint-flip
                        op hover (te zacht). */}
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    {/* Hover-rim: groene 3px lijn aan de bovenkant slidet
                        in vanaf links → rechts. Editorial brutalist
                        accent — zelfde patroon als de menu-nav accent. */}
                    <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-[3px] bg-brand-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

                    <div className="absolute inset-0 flex flex-col items-center justify-end p-4 sm:p-5 md:p-6 text-white">
                      {/* Categorienaam: getrapt schaal-down zodat lange
                          labels (bv. "ACCESSOIRES", "OUTERWEAR") op
                          smalle 2-koloms grids niet wrappen en de CTA
                          eronder niet wegduwen. line-clamp-2 als laatste
                          vangnet voor extreem lange admin-namen. */}
                      <h3 className="font-display text-lg sm:text-xl md:text-3xl mb-2 md:mb-3 uppercase tracking-tight leading-[1.05] text-center line-clamp-2 break-words w-full">
                        {category.name.toUpperCase()}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 text-brand-primary group-hover:gap-2.5 sm:group-hover:gap-3 transition-all">
                        <span className="font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[10px] sm:text-[11px] md:text-xs">{t('categories.shopNow')}</span>
                        <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" className="sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </LocaleLink>
                )
              })
            ) : (
              <div className="col-span-4 text-center py-12 text-gray-500">
                <p>{t('categories.noCategories')}</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Story Section - Emotional & Powerful */}
      <section className="py-16 md:py-24 px-4 bg-black text-white relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300A676' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold uppercase tracking-[0.2em] text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {t('story.badge')}
              </div>

              <h2 className="font-display text-4xl md:text-6xl leading-tight">
                {t('story.title')}<br />
                <span className="text-brand-primary">{t('story.titleHighlight')}</span>
              </h2>
              
              <div className="space-y-4 text-lg text-gray-300 leading-relaxed">
                <p>
                  {t('story.description1')}
                </p>
                <p className="text-white font-semibold">
                  {t('story.description2')}
                </p>
              </div>

              {/* Stats Grid — brutalist tiles met 2px witte border (zelfde
                  contrastniveau als de stats-bar tegen de groene bg).
                  Drop tinted hover-bg + scale, hover-flip border naar
                  brand-primary. */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 pt-8">
                {[
                  {
                    icon: <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>,
                    label: t('story.stat1.label'),
                    sublabel: t('story.stat1.sublabel')
                  },
                  {
                    icon: <CalendarCheck className="w-8 h-8 mx-auto" strokeWidth={2} />,
                    label: t('story.stat2.label'),
                    sublabel: t('story.stat2.sublabel')
                  },
                  {
                    icon: <Crown className="w-8 h-8 mx-auto" strokeWidth={2} />,
                    label: t('story.stat3.label'),
                    sublabel: t('story.stat3.sublabel')
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center p-4 border-2 border-white/30 hover:border-brand-primary transition-colors">
                    <div className="mb-3 text-brand-primary">{stat.icon}</div>
                    <div className="text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] mb-1 leading-none">{stat.label}</div>
                    <div className="text-[11px] text-gray-400 leading-tight">{stat.sublabel}</div>
                  </div>
                ))}
              </div>

              {/* CTA — flat brutalist met 2px zwarte border, geen drop-
                  shadow. Hover-flip naar de iets donkerder primary-hover
                  blijft consistent met andere CTA's op de site. */}
              <LocaleLink
                href="/over-mose"
                className="mose-button mose-button--primary group"
                aria-label={t('story.cta.aria')}
              >
                {t('story.cta.text')}
                <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform" />
              </LocaleLink>
            </div>

            {/* Image — brutalist frame.

                Mobile-tuning:
                  - Groene binnen-rand 2px (i.p.v. 4px) zodat 'ie niet
                    de helft van een 343×343 mobiel-foto opslokt.
                  - Floating MOSE-tile is op mobiel ~33% smaller (60×60
                    logo + p-3 = ~84px tile, was ~168px = 50% van foto).
                    Op desktop blijft 'ie groot en statement-vol.
                  - Decoratief vierkant linksboven verborgen op mobiel
                    omdat 't sectie-padding overlapt en visueel druk maakt
                    op smalle viewports. Toont vanaf md:.
            */}
            <div className="relative">
              <div className="relative aspect-square overflow-hidden border-2 border-white">
                <Image
                  src={storyImageSrc}
                  onError={() => setStoryImageSrc(homepageSettings?.story_image_url || '/og-default.jpg')}
                  alt={t('story.imageAlt')}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={90}
                  className="object-cover"
                />
                <div aria-hidden="true" className="absolute inset-0 border-2 md:border-4 border-brand-primary pointer-events-none" />
              </div>

              <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-brand-primary border-2 border-black p-3 md:p-8 flex items-center justify-center">
                <Image
                  src="/logomose.png"
                  alt="MOSE Logo"
                  width={120}
                  height={120}
                  className="object-contain w-14 h-14 md:w-[120px] md:h-[120px]"
                />
              </div>

              <div aria-hidden="true" className="hidden md:block absolute -top-6 -left-6 w-28 h-28 md:w-32 md:h-32 border-2 border-brand-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed (server slot, returns null when disabled) */}
      {instagramSlot}

      {/* FAQ Accordion */}
      <FAQAccordion />

      {/* Newsletter CTA — flat brutalist statement-blok. Geen gradient,
          geen blurry blob-decoraties, geen glass-icon. Subtiele claw
          watermark blijft (scoort op merkidentiteit), maar de rest gaat
          naar een wit-canvas op groen flat blok met 4px zwarte border-t
          die het visueel "afhakt" van de FAQ erboven. */}
      <section className="relative py-16 md:py-24 px-4 bg-brand-primary border-t-4 border-black overflow-hidden">
        {/* Subtiele claw watermark — blijft als merksignatuur. */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <Image
            src="/claw.png"
            alt=""
            width={600}
            height={600}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Brutalist icon-tile — flat zwart blok met 2px witte border,
              vervangt de glass-card. Direct herkenbaar, hard, zelfde
              taal als de menu-action-tiles. */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-black border-2 border-white mb-8"
            role="img"
            aria-label={t('newsletter.iconAria')}
          >
            <Mail className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2} aria-hidden="true" />
          </div>

          <h2 className="font-display text-4xl md:text-6xl text-white mb-6 tracking-tight uppercase">
            {homepageSettings?.newsletter_title || t('newsletter.title')}
          </h2>

          <p className="text-base md:text-xl text-white mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            {homepageSettings?.newsletter_description1 || t('newsletter.description')}
            <br />
            <span className="font-bold">{homepageSettings?.newsletter_description2 || t('newsletter.noSpam')}</span>
          </p>

          <form className="w-full max-w-full md:max-w-lg mx-auto px-4 md:px-0" aria-label={t('newsletter.formAria')} onSubmit={handleNewsletterSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0">
              <label htmlFor="newsletter-email" className="sr-only">{t('newsletter.emailLabel')}</label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder={homepageSettings?.newsletter_input_placeholder || t('newsletter.placeholder')}
                required
                autoComplete="email"
                aria-required="true"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={newsletterLoading || newsletterSuccess}
                className="flex-1 px-5 py-4 text-black text-base md:text-lg bg-white border-2 border-black focus:outline-none focus:ring-4 focus:ring-white/40 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed sm:border-r-0"
              />
              <button
                type="submit"
                aria-label={t('newsletter.submitAria')}
                disabled={newsletterLoading || newsletterSuccess}
                className="mose-button mose-button--secondary group w-full sm:w-auto whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
              >
                {newsletterLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('newsletter.submitting')}
                  </>
                ) : newsletterSuccess ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('newsletter.subscribed')}
                  </>
                ) : (
                  <>
                    {homepageSettings?.newsletter_button_text || t('newsletter.submit')}
                    <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <p className="text-white/80 text-xs md:text-sm mt-6 flex items-center justify-center gap-2 uppercase tracking-[0.15em] font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {homepageSettings?.newsletter_trust_text || t('newsletter.privacy')}
            </p>
          </form>
        </div>
      </section>
    </div>
    </>
  )
}
