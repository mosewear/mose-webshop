'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function LookbookPage() {
  const lookbookItems = [
    {
      id: 1,
      image: '/hoodieblack.png',
      title: 'URBAN ESSENTIALS',
      description: 'Basics die je elke dag wilt dragen',
    },
    {
      id: 2,
      image: '/tshirtwhite.png',
      title: 'CLEAN & SIMPLE',
      description: 'Minimalisme op zijn best',
    },
    {
      id: 3,
      image: '/hoodiegreen.png',
      title: 'STATEMENT PIECES',
      description: 'Opvallen zonder te schreeuwen',
    },
    {
      id: 4,
      image: '/capblack.png',
      title: 'FINISHING TOUCHES',
      description: 'De details maken het verschil',
    },
  ]

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">LOOKBOOK</h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto">
            Stoer. Modern. Zonder poespas.
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] mb-16 border-2 border-black overflow-hidden">
          <Image
            src="/hoodieblack.png"
            alt="MOSE Lookbook Hero"
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-4xl md:text-6xl font-display mb-4">WINTER 2025</h2>
              <p className="text-lg md:text-xl opacity-90">Premium basics voor echte mannen</p>
            </div>
          </div>
        </div>

        {/* Lookbook Grid */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-16">
          {lookbookItems.map((item) => (
            <div key={item.id} className="group">
              <div className="relative aspect-[3/4] mb-4 border-2 border-black overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h3 className="text-2xl font-display mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Philosophy */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-6">ONZE FILOSOFIE</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Kleding hoeft niet ingewikkeld te zijn. Goede basics, perfect gemaakt, lang houdbaar. 
            Dat is waar we in geloven.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Geen seizoenen, geen trends, geen gedoe. Gewoon tijdloze stukken die je 
            jarenlang blijft dragen.
          </p>
        </div>

        {/* CTA Section */}
        <div className="bg-brand-primary text-white p-8 md:p-12 text-center border-2 border-brand-primary">
          <h2 className="text-3xl md:text-4xl font-display mb-4">SHOP DE COLLECTIE</h2>
          <p className="text-lg mb-8 opacity-90">
            Ontdek alle producten en vind jouw nieuwe favoriet
          </p>
          <Link
            href="/shop"
            className="inline-block px-12 py-5 bg-white text-brand-primary font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
          >
            Naar Shop
          </Link>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="text-center p-8 border-2 border-gray-300">
            <div className="w-16 h-16 bg-brand-primary text-white flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Premium Materialen</h3>
            <p className="text-gray-600">
              Alleen de beste stoffen voor maximale kwaliteit en comfort
            </p>
          </div>
          <div className="text-center p-8 border-2 border-gray-300">
            <div className="w-16 h-16 bg-brand-primary text-white flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Lokaal Gemaakt</h3>
            <p className="text-gray-600">
              100% geproduceerd in Groningen, Nederland
            </p>
          </div>
          <div className="text-center p-8 border-2 border-gray-300">
            <div className="w-16 h-16 bg-brand-primary text-white flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Tijdloos Design</h3>
            <p className="text-gray-600">
              Geen trends, alleen stukken die jarenlang meegaan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
