'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import MobileProductCarousel from '@/components/MobileProductCarousel'
import FAQAccordion from '@/components/FAQAccordion'
import { type HomepageSettings } from '@/lib/homepage'
import * as LucideIcons from 'lucide-react'
import { useState, FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

interface HomePageClientProps {
  siteSettings: {
    free_shipping_threshold: number
    return_days: number
  }
  homepageSettings: HomepageSettings
  featuredProducts: any[]
  categories: any[]
}

export default function HomePageClient({
  siteSettings: initialSettings,
  homepageSettings: initialHomepageSettings,
  featuredProducts: initialFeaturedProducts,
  categories: initialCategories,
}: HomePageClientProps) {
  const t = useTranslations('homepage')
  const locale = useLocale()
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  const settings = initialSettings
  const homepageSettings = initialHomepageSettings
  const featuredProducts = initialFeaturedProducts
  const categories = initialCategories

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

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

      // Success!
      toast.success(t('newsletter.success'))
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
      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image with Parallax Effect */}
        <div className="absolute inset-0">
        <Image
            src={homepageSettings?.hero_image_url || '/hero-mose-new.png'}
            alt="MOSE Hero"
            fill
            className="object-cover object-center scale-105"
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

            {/* Modern CTA Buttons - Touch Optimized */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <LocaleLink 
                href={homepageSettings?.hero_cta1_link || '/shop'} 
                className="group w-full sm:w-auto relative sm:min-w-[220px] px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-wider overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-2xl hover:shadow-brand-primary/50 block text-center"
                aria-label={t('hero.cta1.aria')}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {homepageSettings?.hero_cta1_text || t('hero.cta1.text')}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-brand-primary-hover transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              </LocaleLink>
              <LocaleLink 
                href={homepageSettings?.hero_cta2_link || '/lookbook'} 
                className="group w-full sm:w-auto relative sm:min-w-[220px] px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-base md:text-lg uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-black active:scale-95 block text-center"
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

        {/* Animated Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <span className="text-white/60 text-sm uppercase tracking-wider">{t('hero.scroll')}</span>
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-brand-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar - Mobile Optimized */}
      <section className="bg-gradient-to-r from-brand-primary via-brand-primary-hover to-brand-primary py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8 text-center text-white">
            <div className="group hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 drop-shadow-lg">{homepageSettings?.stats_1_number || '100%'}</div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                {homepageSettings?.stats_1_text || t('stats.local')}
              </div>
            </div>
            <div className="group hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 drop-shadow-lg">{settings.return_days}</div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                {homepageSettings?.stats_2_text || t('stats.returns')}
              </div>
            </div>
            <div className="group hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer">
              {/* Render Icon dynamically */}
              <div className="flex justify-center mb-2 md:mb-3">
                {(() => {
                  const iconName = homepageSettings?.stats_3_icon || 'Star'
                  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Star
                  return <IconComponent className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 drop-shadow-lg" strokeWidth={2.5} />
                })()}
              </div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                {homepageSettings?.stats_3_text || t('stats.quality')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Bar */}
      <section className="bg-gray-100 border-y border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-700">
            {/* Lokaal Gemaakt */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{t('trust.local')}</span>
            </div>
            
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            
            {/* Gratis Verzending */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="font-medium">{t('trust.freeShipping', { threshold: settings.free_shipping_threshold })}</span>
            </div>
            
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            
            {/* Retourbeleid */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">{t('trust.returns', { days: settings.return_days })}</span>
            </div>
            
            <div className="hidden md:block w-px h-4 bg-gray-300" />
            
            {/* Veilig Betalen */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">{t('trust.secure')}</span>
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
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16 px-4">
            <div className="inline-block px-4 py-2 bg-brand-primary/10 text-brand-primary font-bold uppercase tracking-[0.2em] text-sm mb-4">
              {homepageSettings?.featured_label || t('featured.label')}
            </div>
            <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">{homepageSettings?.featured_title || t('featured.title')}</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              {homepageSettings?.featured_description || t('featured.description')}
            </p>
          </div>

          {/* Mobile: Snap Scroll Carousel */}
          <MobileProductCarousel products={featuredProducts} />

          {/* Desktop: Grid - Dynamic Products */}
          <div className="hidden md:grid grid-cols-3 gap-8">
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 3).map((product: any) => (
                <LocaleLink
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group active:scale-95 transition-transform"
                >
                  <div className="bg-white overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 md:hover:-translate-y-2 border-2 border-black">
                    {/* Product Image Container */}
                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                      <Image
                        src={product.images?.[0]?.image_url || product.image_url || '/placeholder.png'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover object-center md:group-hover:scale-110 transition-transform duration-700"
                      />
                      
                      {/* Badge - show stock status including presale */}
                      {(() => {
                        const totalStock = product.stock_quantity + (product.presale_stock_quantity || 0)
                        const isPresale = product.stock_quantity === 0 && product.presale_stock_quantity > 0
                        
                        if (isPresale) {
                          return (
                            <div className="absolute top-4 left-4 bg-brand-primary text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg">
                              PRE-SALE
                            </div>
                          )
                        } else if (product.stock_quantity > 0) {
                          return (
                            <div className="absolute top-4 left-4 bg-brand-primary text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg">
                              {t('featured.inStock')}
                            </div>
                          )
                        } else if (totalStock === 0) {
                          return (
                            <div className="absolute top-4 left-4 bg-black text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg">
                              {t('featured.outOfStock')}
                            </div>
                          )
                        }
                        return null
                      })()}
                      
                      {/* Wishlist Button - Hover on desktop */}
                      <button 
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-brand-primary hover:text-white active:scale-90 border-2 border-black"
                        onClick={(e) => {
                          e.preventDefault();
                          // Wishlist logic here
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      
                      {/* Gradient Overlay on Hover (Desktop only) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick View Button (Desktop only) - Volledig verborgen tot hover */}
                      <div className="absolute bottom-4 left-4 right-4 transform translate-y-[calc(100%+1rem)] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <button className="w-full bg-white text-black font-bold py-3 px-6 uppercase tracking-wider text-sm hover:bg-brand-primary hover:text-white transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-95">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {t('featured.quickView')}
                        </button>
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-6 text-center">
                      <h3 className="font-bold text-xl mb-2 uppercase tracking-wide group-hover:text-brand-primary transition-colors">
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
                                <p className="text-2xl font-bold text-red-600">
                                  €{product.sale_price.toFixed(2)}
                                </p>
                                <span className="inline-flex items-center px-2 py-1 text-xs font-bold bg-red-600 text-white">
                                  -{discountPercentage}%
                                </span>
                              </div>
                              <p className="text-base text-gray-500 line-through">
                                €{product.price.toFixed(2)}
                              </p>
                            </div>
                          )
                        }

                        return (
                          <p className="text-2xl font-bold text-brand-primary">
                            €{typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
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
              ))
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

      {/* Category Grid - Modern & Immersive */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">{t('categories.title')}</h2>
            <p className="text-lg text-gray-600">{t('categories.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.length > 0 ? (
              categories.map((category: any) => {
                const categoryImage = category.image_url || '/hoodieblack.png'
                const categoryHref = `/shop?category=${category.slug}`
                
                return (
                  <LocaleLink
                    key={category.id}
                    href={categoryHref}
                    className="group relative aspect-[3/4] overflow-hidden shadow-md hover:shadow-2xl active:scale-95 transition-all duration-500 border-2 border-black"
                  >
                    {/* Image */}
                    <Image
                      src={categoryImage}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-colors duration-500" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-white">
                      <h3 className="font-display text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                        {category.name.toUpperCase()}
                      </h3>
                      <div className="flex items-center gap-2 text-brand-primary font-bold group-hover:gap-4 transition-all">
                        <span className="uppercase tracking-wider text-sm">{t('categories.shopNow')}</span>
                        <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Corner Accent */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary transform translate-x-full translate-y-full rotate-45 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-500" />
                  </LocaleLink>
                )
              })
            ) : (
              // Fallback
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

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                {[
                  { 
                    icon: <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>,
                    label: t('story.stat1.label'), 
                    sublabel: t('story.stat1.sublabel') 
                  },
                  { 
                    icon: <LucideIcons.CalendarCheck className="w-8 h-8 mx-auto" strokeWidth={2} />,
                    label: t('story.stat2.label'), 
                    sublabel: t('story.stat2.sublabel') 
                  },
                  { 
                    icon: <LucideIcons.Crown className="w-8 h-8 mx-auto" strokeWidth={2} />,
                    label: t('story.stat3.label'), 
                    sublabel: t('story.stat3.sublabel') 
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="group text-center p-4 border-2 border-gray-700 hover:border-brand-primary transition-all duration-300 hover:bg-brand-primary/10">
                    <div className="mb-3 group-hover:scale-110 transition-transform">{stat.icon}</div>
                    <div className="text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="text-xs text-gray-400">{stat.sublabel}</div>
                  </div>
                ))}
              </div>

              <LocaleLink 
                href="/over-mose" 
                className="group inline-flex items-center gap-3 px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-wider hover:bg-brand-primary-hover active:scale-95 transition-all duration-300 group-hover:gap-5 shadow-lg shadow-brand-primary/30"
                aria-label={t('story.cta.aria')}
              >
                {t('story.cta.text')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </LocaleLink>
            </div>

            {/* Image with Frame Effect */}
            <div className="relative">
              <div className="relative aspect-square overflow-hidden shadow-2xl border-2 border-white">
                <Image
                  src="/cordless-over-mose.png"
                  alt="MOSE Atelier Groningen"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                {/* Frame Overlay */}
                <div className="absolute inset-0 border-8 border-brand-primary/20" />
              </div>
              
              {/* Floating Badge met MOSE Logo */}
              <div className="absolute -bottom-6 -right-6 bg-brand-primary p-8 shadow-2xl flex items-center justify-center">
                <Image
                  src="/logomose.png"
                  alt="MOSE Logo"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>

              {/* Decorative Element */}
              <div className="absolute -top-8 -left-8 w-32 h-32 border-4 border-brand-primary opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <FAQAccordion />

      {/* Newsletter CTA - Modern & Engaging */}
      <section className="relative py-16 md:py-24 px-4 bg-gradient-to-br from-brand-primary via-brand-primary-hover to-brand-primary overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        </div>

        {/* Claw Mark */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
            <Image
            src="/claw.png"
            alt=""
            width={600}
            height={600}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm mb-8 border-2 border-white/40" role="img" aria-label="Nieuwsbrief email icoon">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="font-display text-4xl md:text-6xl text-white mb-6 tracking-tight">
            {t('newsletter.title')}
          </h2>
          
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('newsletter.description')}
            <br />
            <span className="font-bold">{t('newsletter.noSpam')}</span>
          </p>

          <form className="w-full max-w-full md:max-w-lg mx-auto px-4 md:px-0" aria-label="Nieuwsbrief inschrijving" onSubmit={handleNewsletterSubmit}>
            <div className="flex flex-col sm:flex-row gap-4">
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
                className="flex-1 px-6 py-4 text-black text-base md:text-lg bg-white border-2 border-black focus:outline-none focus:ring-4 focus:ring-white/30 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                aria-label="Schrijf je in voor de MOSE nieuwsbrief"
                disabled={newsletterLoading || newsletterSuccess}
                className="group w-full sm:w-auto px-8 py-4 bg-black text-white font-bold text-base md:text-lg uppercase tracking-wider hover:bg-gray-900 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 whitespace-nowrap border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:active:scale-100"
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
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            
            {/* Trust Badge */}
            <p className="text-white/70 text-sm mt-6 flex items-center justify-center gap-2">
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
