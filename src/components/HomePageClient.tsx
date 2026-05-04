'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import MobileProductCarousel from '@/components/MobileProductCarousel'
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
import { formatPrice } from '@/lib/format-price'

interface HomePageClientProps {
  siteSettings: {
    free_shipping_threshold: number
    return_days: number
  }
  homepageSettings: HomepageSettings
  featuredProducts: any[]
  categories: any[]
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
  const tProduct = useTranslations('product')
  const locale = useLocale()
  const { addToWishlist, removeFromWishlist, isInWishlist, loadWishlist } = useWishlist()
  
  const settings = initialSettings
  const homepageSettings = initialHomepageSettings
  const featuredProducts = initialFeaturedProducts
  const categories = initialCategories

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

  useEffect(() => {
    loadWishlist()
  }, [])

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
      <div className="min-h-screen bg-white" data-full-bleed-top>
      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image with art-directed mobile/desktop split */}
        <div className="absolute inset-0">
          {/* Desktop / tablet: landscape group shot */}
          <Image
            src={homepageSettings?.hero_image_url || '/hero-desktop.webp'}
            alt="MOSE — gemaakt in Groningen, gedragen in de stad"
            fill
            sizes="(max-width: 767px) 0px, 100vw"
            className="hidden md:block object-cover object-center scale-105"
            priority
          />
          {/* Mobile: portrait crop with the trio in frame */}
          <Image
            src={
              homepageSettings?.hero_image_url_mobile ||
              homepageSettings?.hero_image_url ||
              '/hero-mobile.webp'
            }
            alt="MOSE — gemaakt in Groningen, gedragen in de stad"
            fill
            sizes="(min-width: 768px) 0px, 100vw"
            className="block md:hidden object-cover object-center scale-105"
            priority
          />
          {/* Improved Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          {/* Vignette Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-40" />
        </div>
        
        {/* Prominent Claw Mark Watermark */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
          <Image
            src="/claw.png"
            alt=""
            width={600}
            height={600}
            className="absolute top-1/4 right-1/4 transform rotate-12 animate-pulse"
            style={{ animationDuration: '4s' }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-center px-4 animate-fadeInUp">
              <div className="text-center max-w-5xl">
                {/* Badge with Icon - Transparant met witte border */}
                <div className="inline-flex items-center gap-2 mb-8 px-5 py-3 bg-transparent border-2 border-white text-white text-sm font-bold uppercase tracking-[0.2em]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {homepageSettings?.hero_badge_text || t('hero.badge')}
                </div>

            {/* Main Heading - Responsive Sizes */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-white mb-6 md:mb-8 leading-[0.95] tracking-tight drop-shadow-2xl">
              {homepageSettings?.hero_title_line1 || t('hero.title1')}
              <br />
              <span className="text-brand-primary">{homepageSettings?.hero_title_line2 || t('hero.title2')}</span>
            </h1>

            {/* Subtitle - Responsive */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white mb-8 md:mb-12 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              {homepageSettings?.hero_subtitle || t('hero.subtitle')}
            </p>

            {/* Brutalist CTA Buttons — flat vlakken, harde randen, geen
                scale of drop-shadow. De primary CTA behoudt de
                scale-x-fill (links → rechts) animatie omdat dat een
                editorial brutalist micro-interactie is, geen "fluffy
                modern web". Tracking gelijk getrokken naar 0.2em
                (site-brede eyebrow-standaard). */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <LocaleLink
                href={homepageSettings?.hero_cta1_link || '/shop'}
                className="group w-full sm:w-auto relative sm:min-w-[220px] px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-[0.2em] overflow-hidden border-2 border-brand-primary block text-center transition-colors"
                aria-label={t('hero.cta1.aria')}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {homepageSettings?.hero_cta1_text || t('hero.cta1.text')}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-brand-primary-hover transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" aria-hidden="true" />
              </LocaleLink>
              <LocaleLink
                href={homepageSettings?.hero_cta2_link || '/lookbook'}
                className="group w-full sm:w-auto relative sm:min-w-[220px] px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-base md:text-lg uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary block text-center"
                aria-label={t('hero.cta2.aria')}
              >
                <span className="flex items-center justify-center gap-2">
                  {homepageSettings?.hero_cta2_text || t('hero.cta2.text')}
                  <svg className="w-5 h-5 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
              </LocaleLink>
            </div>
          </div>
        </div>

        {/* Brutalist scroll-indicator — verticale 2px lijn met groene
            pulsing punt. Vervangt de "rounded-full mouse"-icon die het
            meest niet-brutalist element op de pagina was. Editorial:
            label boven, ↓ pijl, dan een dunne lijn die naar beneden
            wijst. Hele groep heeft de animate-bounce voor de subtiele
            "scroll-prompt" cue, identiek aan de oude indicator. */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3 animate-bounce">
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.3em] leading-none">
              {t('hero.scroll')}
            </span>
            <span aria-hidden="true" className="block w-px h-10 bg-white/80" />
            <span aria-hidden="true" className="block w-2 h-2 bg-brand-primary animate-pulse" style={{ animationDuration: '1.6s' }} />
          </div>
        </div>
      </section>

      {/* Stats Bar — flat brand-primary statement-blok. Geen gradient,
          geen drop-shadow op cijfers, geen scale-hover. border-y-2
          zwart maakt het een echt brutalist blok (zelfde patroon als
          de shipping-pill in het mobiele menu). Tracking 0.2em
          consistent met site-brede eyebrow-standaard. */}
      <section className="bg-brand-primary text-white border-y-2 border-black py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 leading-none">
                {homepageSettings?.stats_1_number || '100%'}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] font-bold leading-tight px-1">
                {homepageSettings?.stats_1_text || t('stats.local')}
              </div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 leading-none">
                {settings.return_days}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] font-bold leading-tight px-1">
                {homepageSettings?.stats_2_text || t('stats.returns')}
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-2 md:mb-3">
                {(() => {
                  const iconMap: Record<string, LucideIcon> = { Star, CalendarCheck, Crown }
                  const iconName = homepageSettings?.stats_3_icon || 'Star'
                  const IconComponent = iconMap[iconName] || Star
                  return <IconComponent className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" strokeWidth={2.5} />
                })()}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] font-bold leading-tight px-1">
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
          <div className="text-center mb-12 md:mb-16 px-4">
            <div className="inline-flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
              <span aria-hidden="true">•</span>
              <span>{homepageSettings?.featured_label || t('featured.label')}</span>
              <span aria-hidden="true">•</span>
            </div>
            <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight uppercase">{homepageSettings?.featured_title || t('featured.title')}</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              {homepageSettings?.featured_description || t('featured.description')}
            </p>
          </div>

          {/* Mobile: Snap Scroll Carousel */}
          <MobileProductCarousel products={featuredProducts} />

          {/* Desktop: Grid - Dynamic Products */}
          <div className="hidden md:grid grid-cols-3 gap-8">
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 3).map((product: any) => {
                const isWishlisted = isInWishlist(product.id)

                return (
                  <LocaleLink
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group block"
                  >
                    <div className="bg-white overflow-hidden border-2 border-black transition-colors">
                    {/* Product Image Container */}
                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                      <Image
                        src={failedImages.has(product.id) ? '/placeholder-product.svg' : (product.image_url || '/placeholder-product.svg')}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover object-center md:group-hover:scale-110 transition-transform duration-700"
                        onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                      />

                      {/* Stock-badge — flat brutalist tile met 2px zwarte
                          border, geen shadow (consistent met menu pills
                          en PDP variant-chips). */}
                      {(() => {
                        const totalStock = product.stock_quantity + (product.presale_stock_quantity || 0)
                        const isPresale = product.stock_quantity === 0 && product.presale_stock_quantity > 0

                        if (isPresale) {
                          return (
                            <div className="absolute top-3 left-3 bg-brand-primary text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] border-2 border-black leading-none">
                              PRE-SALE
                            </div>
                          )
                        } else if (product.stock_quantity > 0) {
                          return (
                            <div className="absolute top-3 left-3 bg-brand-primary text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] border-2 border-black leading-none">
                              {t('featured.inStock')}
                            </div>
                          )
                        } else if (totalStock === 0) {
                          return (
                            <div className="absolute top-3 left-3 bg-black text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] border-2 border-black leading-none">
                              {t('featured.outOfStock')}
                            </div>
                          )
                        }
                        return null
                      })()}
                      
                      {/* Wishlist Button — flat brutalist tile met 2px
                          zwarte border, geen backdrop-blur, geen scale.
                          Hover-flip wit → groen. */}
                      <button
                        className={`absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-colors border-2 border-black ${
                          isWishlisted
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-white hover:bg-brand-primary hover:text-white'
                        }`}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()

                          const wasWishlisted = isInWishlist(product.id)
                          if (wasWishlisted) {
                            await removeFromWishlist(product.id)
                          } else {
                            await addToWishlist(product.id)
                          }

                          const nowWishlisted = isInWishlist(product.id)
                          if (!wasWishlisted && nowWishlisted) {
                            toast.success(tProduct('wishlist.added'))
                          } else if (wasWishlisted && !nowWishlisted) {
                            toast.success(tProduct('wishlist.removed'))
                          }
                        }}
                        title={isWishlisted ? tProduct('wishlist.remove') : tProduct('wishlist.add')}
                        aria-label={isWishlisted ? tProduct('wishlist.remove') : tProduct('wishlist.add')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            fill={isWishlisted ? 'currentColor' : 'none'}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                      
                      {/* Gradient Overlay on Hover (Desktop only) */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick View Button — brutalist filled-white met
                          2px zwarte border, hover-flip wit → groen. Geen
                          shadow, geen scale-fluff. */}
                      <div className="absolute bottom-3 left-3 right-3 transform translate-y-[calc(100%+1rem)] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <button className="w-full bg-white text-black font-bold py-3 px-6 uppercase tracking-[0.2em] text-xs border-2 border-black hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-colors flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {t('featured.quickView')}
                        </button>
                      </div>
                    </div>
                    
                    {/* Product Info — font-display titel matched de
                        editorial typografie van menu/PDP/shop. */}
                    <div className="p-6 text-center">
                      <h3 className="font-display text-xl md:text-2xl mb-2 uppercase tracking-tight leading-none group-hover:text-brand-primary transition-colors">
                        {product.name}
                      </h3>
                      {(() => {
                        const hasDiscount = product.sale_price && product.sale_price < product.price
                        const discountPercentage = hasDiscount && product.sale_price
                          ? Math.round(((product.price - product.sale_price) / product.price) * 100) 
                          : 0

                        if (hasDiscount && product.sale_price) {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <p className="text-2xl font-bold text-brand-primary">
                                  {formatPrice(product.sale_price, locale)}
                                </p>
                                <span className="inline-flex items-center px-2 py-1 text-xs font-bold bg-black text-white border-2 border-black">
                                  -{discountPercentage}%
                                </span>
                              </div>
                              <p className="text-base text-gray-500 line-through">
                                {formatPrice(product.price, locale)}
                              </p>
                            </div>
                          )
                        }

                        return (
                          <p className="text-2xl font-bold text-brand-primary">
                            {typeof product.price === 'number' ? formatPrice(product.price, locale) : '€0'}
                          </p>
                        )
                      })()}
                      
                      {/* Available Sizes - from variants */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="flex justify-center gap-2 mt-4 transition-opacity duration-300">
                          {Array.from(new Set<string>(product.variants.map((v: any) => v.size))).slice(0, 4).map((size) => (
                            <span key={size} className="w-8 h-8 border-2 border-gray-300 flex items-center justify-center text-xs font-semibold hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer">
                              {size}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  </LocaleLink>
                )
              })
            ) : (
              // Fallback: show placeholder if no products
              <div className="col-span-3 text-center py-12 text-gray-500">
                <p className="text-lg">{t('featured.noProducts')}</p>
                <p className="text-sm mt-2">{t('featured.noProductsDesc')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category Grid — brutalist tiles. Geen shadows, geen scale,
          geen draai-corner-accent. Vaste groene 3px topbar (i.p.v.
          opacity-tint hover-laag), tracking + typografie consistent
          met menu/PDP. */}
      <section className="py-16 md:py-24 px-4 bg-white border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center justify-center gap-2 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary leading-none">
              <span aria-hidden="true">•</span>
              <span>{t('categories.subtitle')}</span>
              <span aria-hidden="true">•</span>
            </div>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight uppercase">{t('categories.title')}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.length > 0 ? (
              categories.map((category: any) => {
                const categoryImage = category.image_url || '/og-default.jpg'
                const categoryHref = `/shop?category=${category.slug}`

                return (
                  <LocaleLink
                    key={category.id}
                    href={categoryHref}
                    className="group relative aspect-[3/4] overflow-hidden border-2 border-black bg-black"
                  >
                    <Image
                      src={failedImages.has(category.id) ? '/placeholder-product.svg' : categoryImage}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      onError={() => setFailedImages(prev => new Set(prev).add(category.id))}
                    />

                    {/* Hard gradient overlay voor leesbaarheid van het
                        label onderaan. Blijft bottom-up, geen tint-flip
                        op hover (te zacht). */}
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    {/* Hover-rim: groene 3px lijn aan de bovenkant slidet
                        in vanaf links → rechts. Editorial brutalist
                        accent — zelfde patroon als de menu-nav accent. */}
                    <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-[3px] bg-brand-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

                    <div className="absolute inset-0 flex flex-col items-center justify-end p-5 md:p-6 text-white">
                      <h3 className="font-display text-2xl md:text-3xl mb-3 uppercase tracking-tight leading-none">
                        {category.name.toUpperCase()}
                      </h3>
                      <div className="inline-flex items-center gap-2 text-brand-primary group-hover:gap-3 transition-all">
                        <span className="font-bold uppercase tracking-[0.2em] text-[11px] md:text-xs">{t('categories.shopNow')}</span>
                        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform" />
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
                className="group inline-flex items-center gap-3 px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-[0.2em] border-2 border-black hover:bg-brand-primary-hover transition-colors"
                aria-label={t('story.cta.aria')}
              >
                {t('story.cta.text')}
                <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform" />
              </LocaleLink>
            </div>

            {/* Image — brutalist frame: 2px witte border, solid 4px
                groene binnen-rand (i.p.v. translucent), floating MOSE
                tile zonder shadow, decoratieve lijn solid (i.p.v.
                opacity-20). */}
            <div className="relative">
              <div className="relative aspect-square overflow-hidden border-2 border-white">
                <Image
                  src={homepageSettings?.story_image_url || '/og-default.jpg'}
                  alt="MOSE — gedragen in het echte leven"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                <div aria-hidden="true" className="absolute inset-0 border-4 border-brand-primary pointer-events-none" />
              </div>

              <div className="absolute -bottom-6 -right-6 bg-brand-primary border-2 border-black p-6 md:p-8 flex items-center justify-center">
                <Image
                  src="/logomose.png"
                  alt="MOSE Logo"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>

              <div aria-hidden="true" className="absolute -top-6 -left-6 w-28 h-28 md:w-32 md:h-32 border-2 border-brand-primary" />
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
            aria-label="Nieuwsbrief email icoon"
          >
            <Mail className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2} aria-hidden="true" />
          </div>

          <h2 className="font-display text-4xl md:text-6xl text-white mb-6 tracking-tight uppercase">
            {t('newsletter.title')}
          </h2>

          <p className="text-base md:text-xl text-white mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('newsletter.description')}
            <br />
            <span className="font-bold">{t('newsletter.noSpam')}</span>
          </p>

          <form className="w-full max-w-full md:max-w-lg mx-auto px-4 md:px-0" aria-label="Nieuwsbrief inschrijving" onSubmit={handleNewsletterSubmit}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0">
              <label htmlFor="newsletter-email" className="sr-only">E-mailadres voor nieuwsbrief</label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder={t('newsletter.placeholder')}
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
                aria-label="Schrijf je in voor de MOSE nieuwsbrief"
                disabled={newsletterLoading || newsletterSuccess}
                className="group w-full sm:w-auto px-8 py-4 bg-black text-white font-bold text-base md:text-lg uppercase tracking-[0.2em] hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition-colors flex items-center justify-center gap-3 whitespace-nowrap border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
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
                    {t('newsletter.submit')}
                    <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <p className="text-white/80 text-xs md:text-sm mt-6 flex items-center justify-center gap-2 uppercase tracking-[0.15em] font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {t('newsletter.privacy')}
            </p>
          </form>
        </div>
      </section>
    </div>
    </>
  )
}
