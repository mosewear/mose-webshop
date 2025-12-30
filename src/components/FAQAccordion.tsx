'use client'

import { useState } from 'react'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: 'Hoe vallen de MOSE kledingstukken?',
    answer: 'Onze kleding valt normaal qua maat. We adviseren je gebruikelijke maat te bestellen. Bij twijfel tussen twee maten? Kies dan de grotere maat voor een relaxed fit. Alle maten zijn ontworpen voor optimaal comfort.',
  },
  {
    question: 'Wat zijn de verzendkosten en levertijd?',
    answer: 'Verzending binnen Nederland is gratis vanaf €50. Daaronder betaal je €4,95. Bestellingen worden binnen 1-2 werkdagen verwerkt en verzonden. Levering duurt vervolgens 1-3 werkdagen via PostNL.',
  },
  {
    question: 'Kan ik mijn bestelling retourneren?',
    answer: 'Ja! Je hebt 14 dagen bedenktijd vanaf ontvangst. Retourneren is gratis en eenvoudig. De artikelen moeten ongedragen zijn met labels er nog aan. Vul het retourformulier in je pakket in en stuur het terug. Je krijgt binnen 5 werkdagen je geld terug.',
  },
  {
    question: 'Hoe verzorg ik mijn MOSE kleding?',
    answer: 'Was op 30°C binnenstebuiten, gebruik geen bleekmiddel en droog bij voorkeur niet in de droger. Strijk op lage temperatuur als dat nodig is. Zo blijft je MOSE kledingstuk jarenlang mooi.',
  },
  {
    question: 'Is MOSE echt lokaal geproduceerd?',
    answer: 'Absoluut! Al onze kleding wordt 100% in Nederland geproduceerd, voornamelijk in Groningen. We werken samen met een lokaal atelier die onze kwaliteitseisen deelt. Geen lange transportketens, wel eerlijke productie.',
  },
  {
    question: 'Welke betaalmethoden accepteren jullie?',
    answer: 'We accepteren iDEAL, Mastercard, Visa, American Express, PayPal en Bancontact. Alle betalingen worden veilig verwerkt via Stripe. Je betaalgegevens zijn altijd beschermd.',
  },
]

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-16 md:py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-block px-4 py-2 bg-brand-primary/10 text-brand-primary font-bold uppercase tracking-[0.2em] text-sm mb-4">
            Vragen?
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">
            VAAK GESTELD
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Alles wat je moet weten over MOSE, verzending en retourneren
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-2 border-black overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left px-6 py-5 bg-white hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <span className="font-bold text-base md:text-lg uppercase tracking-wide flex-1">
                  {faq.question}
                </span>
                <svg
                  className={`w-6 h-6 text-brand-primary flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Answer */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 py-5 bg-gray-50 border-t-2 border-black">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center p-8 border-2 border-gray-200 bg-gray-50">
          <p className="text-gray-600 mb-4">
            Staat je vraag er niet bij?
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors active:scale-95"
          >
            Neem contact op
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}

