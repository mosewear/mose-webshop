'use client'

/**
 * Compact PDP-specific FAQ that addresses the five most common
 * conversion blockers right where they get in the way: fit, delivery time,
 * exchange policy, authenticity, and payment options.
 *
 * Visually consistent with the existing accordions on the rest of the PDP
 * (border-2 border-black, brand-primary chevron, expand/collapse).
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { isAltijdGratisUitWaarden } from '@/lib/verzendbelofte'

interface PdpFaqProps {
  supplierFulfilled?: boolean
  /** Uit site_settings. Het antwoord op de bezorgvraag beweerde eerder
   *  "geen minimum bestelbedrag, verzending is altijd gratis", terwijl
   *  free_shipping_threshold op 150 staat. Dat is precies de vraag die een
   *  twijfelende koper stelt, dus die belofte moet kloppen. */
  freeShippingThreshold: number
  shippingCost: number
  returnDays: number
  locale: string
}

export default function PdpFaq({
  freeShippingThreshold,
  shippingCost,
  returnDays,
  locale,
  supplierFulfilled = false,
}: PdpFaqProps) {
  const t = useTranslations('product.pdpFaq')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = supplierFulfilled ? (locale === 'en' ? [
    { question: 'How does this model fit?', answer: 'Use the model-specific size chart and product description. Compare the garment measurements with a similar item you already own.' },
    { question: 'When will my order arrive?', answer: 'Delivery options and shipping costs are shown at checkout. Items fulfilled by different partners may arrive separately.' },
    { question: 'What makes this model different?', answer: 'See the product description for the fit, fabric and details selected for this MOSE model.' },
    { question: 'What if the size does not fit?', answer: 'See our returns policy or contact MOSE for help with your return.' },
  ] : [
    { question: 'Hoe valt dit model?', answer: 'Gebruik de maattabel en beschrijving van dit specifieke model. Vergelijk de kledingmaten met een vergelijkbaar kledingstuk dat je al hebt.' },
    { question: 'Wanneer ontvang ik mijn bestelling?', answer: 'Bezorgopties en verzendkosten staan bij het afrekenen. Artikelen van verschillende partners kunnen afzonderlijk aankomen.' },
    { question: 'Wat maakt dit model bijzonder?', answer: 'Bekijk de productbeschrijving voor de pasvorm, stof en details van dit MOSE-model.' },
    { question: 'Wat als de maat niet past?', answer: 'Bekijk ons retourbeleid of neem contact op met MOSE voor hulp bij je retour.' },
  ]) : (t.raw('items') as Array<{ question: string; answer: string }>) || []
  if (!items.length) return null

  // Zelfde substitutiepatroon als FAQAccordion, zodat beide FAQ's dezelfde
  // bron gebruiken en niet uit elkaar kunnen lopen.
  const money = (v: number) => (locale === 'nl' ? v.toFixed(2).replace('.', ',') : v.toFixed(2))

  // Is verzending altijd gratis, dan slaat een antwoord met een drempel nergens
  // op. Het hele antwoord wordt dan vervangen in plaats van de waarden ingevuld.
  const altijdGratis = isAltijdGratisUitWaarden(freeShippingThreshold, shippingCost)
  const fill = (text: string) => {
    if (process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED === 'true' && text.includes('{freeShipping}')) return locale === 'en' ? 'Delivery options and shipping costs are shown at checkout, before you pay.' : 'Bezorgopties en verzendkosten staan bij het afrekenen, voordat je betaalt.'
    if (altijdGratis && text.includes('{freeShipping}')) {
      return t('answerVerzendingAltijd').replace('{returnDays}', String(returnDays))
    }
    return text
      .replace('{freeShipping}', String(freeShippingThreshold))
      .replace('{shippingCost}', money(shippingCost))
      .replace('{returnDays}', String(returnDays))
  }

  return (
    <section className="mt-12 md:mt-16 border-t-2 border-gray-200 pt-12 md:pt-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl mb-6 md:mb-8 tracking-tight text-center">
          {t('title')}
        </h2>
        <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className="border-2 border-black overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left px-4 md:px-6 py-3.5 md:py-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 active:scale-[0.99]"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-sm md:text-base uppercase tracking-wide flex-1">
                    {item.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-brand-primary flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 md:px-6 py-3.5 md:py-4 bg-gray-50 border-t-2 border-black">
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                      {fill(item.answer)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
