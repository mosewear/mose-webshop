'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LookbookPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Compact Header */}
      <div className="text-center py-12 md:py-16 px-4">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display tracking-tight mb-4">
          LOOKBOOK
        </h1>
        <p className="text-base md:text-xl text-gray-700">
          Winter '25 / Stoer. Modern. Tijdloos.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 space-y-8 md:space-y-12">
        {/* HERO - Full-bleed lifestyle photo */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] border-2 lg:border-4 border-black overflow-hidden">
          <Image
            src="/hoodieblack.png"
            alt="MOSE Winter '25"
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center text-center text-white px-4">
            <div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display mb-3 md:mb-4 tracking-tight">
                WINTER '25
              </h2>
              <p className="text-base md:text-xl lg:text-2xl opacity-90">
                Premium basics voor echte mannen
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Image Left (40%) + Text Right (60%) - DESKTOP ASYMMETRIC */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {/* Image - Mobile: full width on top, Desktop: 2 cols (40%) */}
          <div className="lg:col-span-2 relative aspect-[3/4] border-2 border-black overflow-hidden group">
            <Image
              src="/hero_mose.png"
              alt="Urban Essentials"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Text - Mobile: below image, Desktop: 3 cols (60%) */}
          <div className="lg:col-span-3 border-2 border-black p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 tracking-tight">
              URBAN ESSENTIALS
            </h3>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8">
              Basics die je elke dag wilt dragen. Onze hoodies en tees zijn gemaakt van premium 
              katoen en lokaal geproduceerd in Groningen. Geen gedoe, gewoon perfecte basics.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-black text-white px-6 md:px-8 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors self-start"
            >
              Shop Basics
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* SECTION 2: Text Left (60%) + Image Right (40%) - FLIPPED! - DESKTOP ZIGZAG */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {/* Text - Mobile: on top, Desktop: 3 cols (60%) */}
          <div className="lg:col-span-3 border-2 border-black p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white order-2 lg:order-1">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 tracking-tight">
              CLEAN & SIMPLE
            </h3>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8">
              Minimalisme op zijn best. Onze t-shirts zijn tijdloos en veelzijdig. 
              Draag ze solo of layer ze onder een hoodie. Perfect voor elke gelegenheid.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-black text-white px-6 md:px-8 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors self-start"
            >
              Shop Tees
              <ArrowRight size={20} />
            </Link>
          </div>

          {/* Image - Mobile: below text (flipped!), Desktop: 2 cols (40%) */}
          <div className="lg:col-span-2 relative aspect-[3/4] border-2 border-black overflow-hidden group order-1 lg:order-2">
            <Image
              src="/blacktee.png"
              alt="Clean & Simple"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>

        {/* SECTION 3: Big Quote Block - Full Width */}
        <div className="bg-black text-white border-2 lg:border-4 border-black p-8 md:p-12 lg:p-16 text-center">
          <blockquote className="text-2xl md:text-4xl lg:text-5xl font-display leading-tight mb-6 md:mb-8">
            "KLEDING HOEFT NIET INGEWIKKELD TE ZIJN."
          </blockquote>
          <p className="text-base md:text-lg lg:text-xl opacity-90 max-w-3xl mx-auto">
            Goede basics. Perfect gemaakt. Lang houdbaar. <br className="hidden md:inline" />
            Dat is waar we in geloven.
          </p>
        </div>

        {/* SECTION 4: Triple Split (Desktop 3 cols, Mobile 2+1) */}
        <div className="space-y-4 md:space-y-6">
          {/* Desktop: 3 cols, Mobile: 2 cols */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Item 1 */}
            <div className="group">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src="/hoodieblack.png"
                  alt="Oversized Hoodie"
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                Oversized Hoodie
              </h4>
            </div>

            {/* Item 2 */}
            <div className="group">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src="/hoodie_cap.png"
                  alt="MOSE Cap"
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                MOSE Cap
              </h4>
            </div>

            {/* Item 3 - Full width on mobile (col-span-2), normal on desktop */}
            <div className="group col-span-2 md:col-span-1">
              <div className="relative aspect-square border-2 border-black overflow-hidden mb-3 md:mb-4">
                <Image
                  src="/blacktee.png"
                  alt="Classic Tee"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h4 className="text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider text-center">
                Classic Tee
              </h4>
            </div>
          </div>
        </div>

        {/* SECTION 5: Wide Lifestyle Photo with Text Overlay */}
        <div className="relative w-full aspect-[16/9] md:aspect-[16/7] border-2 lg:border-4 border-black overflow-hidden group">
          <Image
            src="/hero_mose.png"
            alt="Shop de Volledige Collectie"
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center p-6 md:p-8 lg:p-12">
            <div className="text-center text-white max-w-2xl">
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-display mb-4 md:mb-6 tracking-tight">
                SHOP DE VOLLEDIGE COLLECTIE
              </h3>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-white text-black px-8 md:px-10 py-3 md:py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Naar Shop
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 6: Final Green CTA */}
        <div className="bg-brand-primary text-white border-2 lg:border-4 border-brand-primary p-8 md:p-12 lg:p-16 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display mb-4 md:mb-6 tracking-tight">
            ONTDEK MOSE
          </h2>
          <p className="text-base md:text-lg lg:text-xl mb-8 md:mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
            Lokaal gemaakt in Groningen. Premium kwaliteit. Tijdloos design. 
            Ontdek waarom onze klanten MOSE blijven dragen.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-white text-brand-primary px-10 md:px-12 py-4 md:py-5 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors text-base md:text-lg"
          >
            Shop Nu
            <ArrowRight size={22} />
          </Link>
        </div>
      </div>
    </div>
  )
}
