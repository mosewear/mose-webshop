'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">OVER MOSE</h1>
          <p className="text-xl md:text-2xl text-gray-700">
            Geen poespas. Wel karakter.
          </p>
        </div>

        {/* Story Image */}
        <div className="relative aspect-[16/9] mb-12 border-2 border-black overflow-hidden">
          <Image
            src="/groningen.jpg"
            alt="MOSE Groningen"
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover object-center"
          />
        </div>

        {/* Story Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">ONS VERHAAL</h2>
            <p className="text-gray-700 leading-relaxed">
              MOSE is geboren uit frustratie. Frustratie over fast fashion, over wegwerpkleding, 
              over merken die grote beloftes maken maar niet nakomen. Wij geloven dat kleding 
              gewoon goed moet zijn. Punt.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Daarom maken we premium basics die lang meegaan. Kleding zonder concessies, 
              zonder poespas. Stoer, modern, en met karakter. Gebouwd om te blijven.
            </p>
          </div>

          <div className="bg-brand-primary/10 border-2 border-brand-primary p-8">
            <h3 className="text-2xl font-display mb-4">LOKAAL GEMAAKT IN GRONINGEN</h3>
            <p className="text-gray-800 leading-relaxed">
              Al onze producten worden lokaal gemaakt in Groningen. Niet omdat het hip is, 
              maar omdat we precies willen weten waar onze kleding vandaan komt en hoe het 
              gemaakt wordt. Eerlijk, transparant, en met respect voor iedereen die eraan werkt.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">ONZE WAARDEN</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">Premium Kwaliteit</h3>
                <p className="text-gray-700">
                  Alleen de beste materialen en perfecte afwerking. 
                  Kleding die jarenlang meegaat.
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">Lokaal Gemaakt</h3>
                <p className="text-gray-700">
                  100% geproduceerd in Groningen. We kennen iedereen 
                  die aan je kleding werkt.
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">Eerlijke Prijzen</h3>
                <p className="text-gray-700">
                  Geen opgeblazen prijzen of fake sales. Gewoon eerlijk 
                  geprijsd voor wat je krijgt.
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">Geen Gedoe</h3>
                <p className="text-gray-700">
                  14 dagen retour, gratis verzending vanaf €50, en 
                  snelle klantenservice. Simpel.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">WAAROM MOSE?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>Duurzaam zonder bullshit:</strong> We maken kleding die lang meegaat. 
                  Dat is de beste sustainability.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>Stoer maar stijlvol:</strong> Basics met karakter. Voor moderne mannen 
                  die weten wat ze willen.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>Trots lokaal:</strong> Gemaakt in Groningen, gedragen door heel Nederland.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/shop"
            className="inline-block px-12 py-5 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-lg"
          >
            Ontdek de collectie
          </Link>
        </div>
      </div>
    </div>
  )
}
