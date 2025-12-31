'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import MobileProductCarousel from '@/components/MobileProductCarousel'
import FAQAccordion from '@/components/FAQAccordion'

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image with Parallax Effect */}
        <div className="absolute inset-0">
        <Image
            src="/hero_mose.png"
            alt="MOSE Hero"
            fill
            className="object-cover object-center scale-105"
          priority
            quality={90}
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
        <div className={`relative z-10 h-full flex items-center justify-center px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-center max-w-5xl">
                {/* Badge with Icon - Transparant met witte border */}
                <div className="inline-flex items-center gap-2 mb-8 px-5 py-3 bg-transparent border-2 border-white text-white text-sm font-bold uppercase tracking-[0.2em]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Gemaakt in Groningen
                </div>

            {/* Main Heading - Responsive Sizes */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-white mb-6 md:mb-8 leading-[0.95] tracking-tight drop-shadow-2xl">
              GEEN POESPAS.
              <br />
              <span className="text-brand-primary">WEL KARAKTER.</span>
            </h1>

            {/* Subtitle - Responsive */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white mb-8 md:mb-12 font-medium max-w-2xl mx-auto leading-relaxed px-4">
              Lokaal gemaakt. Kwaliteit die blijft.
            </p>

            {/* Modern CTA Buttons - Touch Optimized */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/shop" className="group w-full sm:w-auto">
                <button className="relative w-full sm:min-w-[220px] px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-wider overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-2xl hover:shadow-brand-primary/50">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Shop MOSE
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-brand-primary-hover transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </button>
              </Link>
              <Link href="/lookbook" className="group w-full sm:w-auto">
                <button className="relative w-full sm:min-w-[220px] px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-base md:text-lg uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-black active:scale-95">
                  <span className="flex items-center justify-center gap-2">
                    Bekijk Lookbook
                    <svg className="w-5 h-5 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Animated Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <span className="text-white/60 text-sm uppercase tracking-wider">Scroll</span>
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
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 drop-shadow-lg">100%</div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                Lokaal<br className="sm:hidden" /> geproduceerd
              </div>
            </div>
            <div className="group hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 drop-shadow-lg">14</div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                Dagen<br className="sm:hidden" /> retourrecht
              </div>
            </div>
            <div className="group hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl md:text-6xl font-display mb-2 md:mb-3 drop-shadow-lg">∞</div>
              <div className="text-[10px] leading-tight sm:text-xs md:text-base uppercase tracking-tight sm:tracking-[0.15em] md:tracking-[0.2em] font-semibold opacity-90 px-1">
                Gebouwd om lang mee te gaan
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
              <span className="font-medium">Lokaal gemaakt</span>
            </div>
            
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            
            {/* Gratis Verzending */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="font-medium">Gratis verzending vanaf €50</span>
            </div>
            
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            
            {/* 14 Dagen Retour */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">14 dagen retour</span>
            </div>
            
            <div className="hidden md:block w-px h-4 bg-gray-300" />
            
            {/* Veilig Betalen */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Veilig betalen</span>
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
              Bestsellers
            </div>
            <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">ESSENTIALS DIE BLIJVEN</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              No-nonsense basics die jarenlang meegaan
            </p>
          </div>

          {/* Mobile: Snap Scroll Carousel */}
          <MobileProductCarousel />

          {/* Desktop: Grid (unchanged) */}
          <div className="hidden md:grid grid-cols-3 gap-8">
            {[
              {
                name: 'MOSE Basic Hoodie',
                price: '€79,99',
                image: '/hoodieblack.png',
                badge: 'BESTSELLER',
                badgeColor: 'bg-brand-primary',
              },
              {
                name: 'MOSE Basic Tee',
                price: '€34,99',
                image: '/blacktee.png',
                badge: 'NEW',
                badgeColor: 'bg-black',
              },
              {
                name: 'MOSE Snapback',
                price: '€29,99',
                image: '/hoodie_cap.png',
                badge: 'TRENDING',
                badgeColor: 'bg-brand-primary',
              },
            ].map((product, idx) => (
              <Link
                key={idx}
                href={`/product/${product.name.toLowerCase().replace(/ /g, '-')}`}
                className="group active:scale-95 transition-transform"
              >
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 md:hover:-translate-y-2 border-2 border-black">
                  {/* Product Image Container */}
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover object-center md:group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Badge */}
                    <div className={`absolute top-4 left-4 ${product.badgeColor} text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg`}>
                      {product.badge}
                    </div>
                    
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
                        Quick View
                      </button>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-xl mb-2 uppercase tracking-wide group-hover:text-brand-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-2xl font-bold text-brand-primary">{product.price}</p>
                    
                    {/* Size Dots - Altijd zichtbaar */}
                    <div className="flex justify-center gap-2 mt-4 transition-opacity duration-300">
                      {['S', 'M', 'L', 'XL'].map((size) => (
                        <span key={size} className="w-8 h-8 border-2 border-gray-300 flex items-center justify-center text-xs font-semibold hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Grid - Modern & Immersive */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">SHOP OP CATEGORIE</h2>
            <p className="text-lg text-gray-600">Ontdek onze collectie</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                name: 'HOODIES',
                image: '/hoodieblack.png',
                href: '/shop?category=hoodies',
                count: '12 items',
              },
              {
                name: 'T-SHIRTS',
                image: '/blacktee.png',
                href: '/shop?category=t-shirts',
                count: '18 items',
              },
              {
                name: 'CAPS',
                image: '/hoodie_cap.png',
                href: '/shop?category=caps',
                count: '8 items',
              },
              {
                name: 'ACCESSOIRES',
                image: '/hoodie_cap.png',
                href: '/shop?category=accessoires',
                count: '15 items',
              },
            ].map((category, idx) => (
              <Link
                key={idx}
                href={category.href}
                className="group relative aspect-[3/4] overflow-hidden shadow-md hover:shadow-2xl active:scale-95 transition-all duration-500 border-2 border-black"
              >
                {/* Image */}
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-colors duration-500" />
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-white">
                  <h3 className="font-display text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {category.name}
                  </h3>
                  <p className="text-sm opacity-80 mb-4">{category.count}</p>
                  <div className="flex items-center gap-2 text-brand-primary font-bold group-hover:gap-4 transition-all">
                    <span className="uppercase tracking-wider text-sm">Shop nu</span>
                    <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
                
                {/* Corner Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary transform translate-x-full translate-y-full rotate-45 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-500" />
              </Link>
            ))}
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
                Ons Verhaal
              </div>

              <h2 className="font-display text-4xl md:text-6xl leading-tight">
                GEMAAKT IN<br />
                <span className="text-brand-primary">GRONINGEN</span>
              </h2>
              
              <div className="space-y-4 text-lg text-gray-300 leading-relaxed">
                <p>
                  Geen poespas. Alleen karakter. We maken kleding die lang meegaat, 
                  lokaal geproduceerd zonder compromissen op kwaliteit.
                </p>
                <p className="text-white font-semibold">
                  Premium basics met een ziel. Gebouwd voor het echte leven.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                {[
                  { 
                    icon: <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>,
                    label: '100% Lokaal', 
                    sublabel: 'Made in NL' 
                  },
                  { 
                    icon: <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>,
                    label: '14 Dagen', 
                    sublabel: 'Retourrecht' 
                  },
                  { 
                    icon: <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>,
                    label: 'Premium', 
                    sublabel: 'Materialen' 
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="group text-center p-4 border-2 border-gray-700 hover:border-brand-primary transition-all duration-300 hover:bg-brand-primary/10">
                    <div className="mb-3 group-hover:scale-110 transition-transform">{stat.icon}</div>
                    <div className="text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="text-xs text-gray-400">{stat.sublabel}</div>
                  </div>
                ))}
              </div>

              <Link href="/over-mose" className="group inline-block">
                <button className="px-8 py-4 bg-brand-primary text-white font-bold text-base md:text-lg uppercase tracking-wider hover:bg-brand-primary-hover active:scale-95 transition-all duration-300 flex items-center gap-3 group-hover:gap-5 shadow-lg shadow-brand-primary/30">
                  Lees ons verhaal
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Link>
            </div>

            {/* Image with Frame Effect */}
            <div className="relative">
              <div className="relative aspect-square overflow-hidden shadow-2xl border-2 border-white">
                <Image
                  src="/hoodieblack.png"
                  alt="MOSE Atelier Groningen"
                  fill
                  className="object-cover"
                />
                {/* Frame Overlay */}
                <div className="absolute inset-0 border-8 border-brand-primary/20" />
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 bg-brand-primary text-white p-8 shadow-2xl">
                <div className="text-center">
                  <div className="text-4xl font-display mb-2">2020</div>
                  <div className="text-sm uppercase tracking-wider">Opgericht</div>
                </div>
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm mb-8 border-2 border-white/40">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="font-display text-4xl md:text-6xl text-white mb-6 tracking-tight">
            JOIN THE PACK
          </h2>
          
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Nieuws over drops, restocks en het atelier.
            <br />
            <span className="font-bold">Geen spam — alleen MOSE.</span>
          </p>

          <form className="w-full max-w-full md:max-w-lg mx-auto px-4 md:px-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Jouw e-mailadres"
                required
                className="flex-1 px-6 py-4 text-black text-base md:text-lg bg-white border-2 border-black focus:outline-none focus:ring-4 focus:ring-white/30 placeholder-gray-400"
              />
              <button
                type="submit"
                className="group w-full sm:w-auto px-8 py-4 bg-black text-white font-bold text-base md:text-lg uppercase tracking-wider hover:bg-gray-900 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 whitespace-nowrap border-2 border-black"
              >
                Join nu
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            
            {/* Trust Badge */}
            <p className="text-white/70 text-sm mt-6 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              We respecteren je privacy. Uitschrijven kan altijd.
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
