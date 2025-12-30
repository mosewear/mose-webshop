'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Viewport */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero_mose.png"
            alt="MOSE Hero"
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        
        {/* Claw Mark Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <Image
            src="/claw.png"
            alt=""
            width={400}
            height={400}
            className="absolute top-1/4 right-1/4 transform rotate-12"
          />
        </div>

        {/* Hero Content */}
        <div className={`relative z-10 h-full flex items-center justify-center px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center max-w-5xl">
            {/* Badge */}
            <div className="inline-block mb-6 px-4 py-2 bg-brand-primary text-white text-sm font-bold uppercase tracking-wider">
              Gemaakt in Groningen
            </div>

            {/* Main Heading */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white mb-6 leading-tight tracking-wide">
              GEEN POESPAS.
              <br />
              WEL KARAKTER.
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-10 font-medium max-w-2xl mx-auto">
              Lokaal gemaakt. Kwaliteit zonder concessies.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop">
                <Button size="lg" className="min-w-[200px]">
                  Shop MOSE
                </Button>
              </Link>
              <Link href="/lookbook">
                <Button size="lg" variant="outline" className="min-w-[200px] border-2 border-white text-white hover:bg-white hover:text-black">
                  Bekijk Lookbook
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-brand-primary py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-display mb-2">100%</div>
              <div className="text-sm uppercase tracking-wider">Lokaal geproduceerd</div>
            </div>
            <div>
              <div className="text-4xl font-display mb-2">14</div>
              <div className="text-sm uppercase tracking-wider">Dagen retourrecht</div>
            </div>
            <div>
              <div className="text-4xl font-display mb-2">∞</div>
              <div className="text-sm uppercase tracking-wider">Gebouwd om lang mee te gaan</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products - ESSENTIALS DIE BLIJVEN */}
      <section className="py-20 px-4 bg-gray-50 relative overflow-hidden">
        {/* Claw Mark Background */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <Image
            src="/claw.png"
            alt=""
            width={600}
            height={600}
            className="absolute -top-20 -right-20 transform rotate-12"
          />
          <Image
            src="/claw.png"
            alt=""
            width={400}
            height={400}
            className="absolute bottom-0 left-0 transform -rotate-45"
          />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl md:text-6xl mb-4">ESSENTIALS DIE BLIJVEN</h2>
            <p className="text-lg text-gray-600">No-nonsense basics die jarenlang meegaan</p>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'The Icon Jeans',
                oldPrice: '€149,95',
                price: '€99,95',
                image: '/hoodieblack.png',
                slug: 'the-icon-jeans',
              },
              {
                name: 'The Icon Cap',
                oldPrice: '€49,95',
                price: '€34,95',
                image: '/hoodie_cap.png',
                slug: 'the-icon-cap',
              },
              {
                name: 'The Icon Hoodie',
                oldPrice: '€179,95',
                price: '€140,00',
                image: '/hoodieblack.png',
                slug: 'the-icon-hoodie',
              },
            ].map((product, idx) => (
              <div
                key={idx}
                className="bg-white border-4 border-black p-6 hover:shadow-2xl transition-shadow duration-300"
              >
                <Link href={`/product/${product.slug}`}>
                  <div className="relative aspect-[3/4] bg-white mb-6 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover object-center hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </Link>
                <div className="text-center">
                  <h3 className="font-bold text-2xl mb-3 tracking-tight">{product.name}</h3>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <span className="text-gray-400 line-through text-lg">{product.oldPrice}</span>
                    <span className="text-brand-primary font-bold text-2xl">{product.price}</span>
                  </div>
                  <button className="w-full bg-[#B8AFA0] hover:bg-[#A89D8E] text-white font-bold text-lg py-4 px-6 uppercase tracking-wider transition-colors duration-300">
                    In winkelmand
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden">
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-12">
                {[
                  {
                    name: 'The Icon Jeans',
                    oldPrice: '€149,95',
                    price: '€99,95',
                    image: '/hoodieblack.png',
                    slug: 'the-icon-jeans',
                  },
                  {
                    name: 'The Icon Cap',
                    oldPrice: '€49,95',
                    price: '€34,95',
                    image: '/hoodie_cap.png',
                    slug: 'the-icon-cap',
                  },
                  {
                    name: 'The Icon Hoodie',
                    oldPrice: '€179,95',
                    price: '€140,00',
                    image: '/hoodieblack.png',
                    slug: 'the-icon-hoodie',
                  },
                ].map((product, idx) => (
                  <div
                    key={idx}
                    className="flex-none w-[85vw] snap-start"
                  >
                    <div className="bg-white border-4 border-black p-6">
                      <Link href={`/product/${product.slug}`}>
                        <div className="relative aspect-[3/4] bg-white mb-6 overflow-hidden">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover object-center"
                          />
                        </div>
                      </Link>
                      <div className="text-center">
                        <h3 className="font-bold text-xl mb-3 tracking-tight">{product.name}</h3>
                        <div className="flex items-center justify-center gap-3 mb-6">
                          <span className="text-gray-400 line-through text-base">{product.oldPrice}</span>
                          <span className="text-brand-primary font-bold text-xl">{product.price}</span>
                        </div>
                        <button className="w-full bg-[#B8AFA0] hover:bg-[#A89D8E] text-white font-bold text-base py-3 px-4 uppercase tracking-wider transition-colors duration-300">
                          In winkelmand
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Page Indicator */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl text-center mb-12">SHOP OP CATEGORIE</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: 'HOODIES',
                image: '/hoodieblack.png',
                href: '/shop?category=hoodies',
              },
              {
                name: 'T-SHIRTS',
                image: '/blacktee.png',
                href: '/shop?category=t-shirts',
              },
              {
                name: 'CAPS',
                image: '/hoodie_cap.png',
                href: '/shop?category=caps',
              },
              {
                name: 'ACCESSOIRES',
                image: '/hoodie_cap.png',
                href: '/shop?category=accessoires',
              },
            ].map((category, idx) => (
              <Link
                key={idx}
                href={category.href}
                className="group relative aspect-[3/4] overflow-hidden border-2 border-black hover:scale-105 transition-transform duration-300"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-center">
                  <h3 className="font-display text-2xl text-white mb-2">{category.name}</h3>
                  <span className="text-brand-primary font-bold group-hover:underline">SHOP NU →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section - Gemaakt in Groningen */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div>
              <h2 className="font-display text-4xl md:text-5xl mb-6">GEMAAKT IN GRONINGEN</h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Geen poespas. Alleen karakter. Premium basics met een ziel. We maken kleding die lang meegaat, 
                lokaal geproduceerd zonder compromissen op kwaliteit.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: '🏭', label: 'Lokaal' },
                  { icon: '↩️', label: '14 dagen' },
                  { icon: '🧵', label: 'Premium' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center border-2 border-white p-4">
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-sm font-bold uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>

              <Link href="/over-mose">
                <Button size="lg" className="bg-brand-primary hover:bg-brand-primary-hover text-white">
                  Lees ons verhaal
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div className="relative aspect-square">
              <Image
                src="/hoodieblack.png"
                alt="MOSE Atelier Groningen"
                fill
                className="object-cover border-2 border-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 px-4 bg-brand-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white mb-6">JOIN THE PACK</h2>
          <p className="text-xl text-white/90 mb-8">
            Nieuws over drops, restocks en het atelier. Geen spam — alleen MOSE.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Jouw e-mailadres"
              className="flex-1 max-w-md px-6 py-4 text-black border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <Button size="lg" variant="secondary">
              Join nu
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
