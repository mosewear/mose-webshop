'use client'

import { useState, useEffect } from 'react'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [settings, setSettings] = useState({
    free_shipping_threshold: 100,
    return_days: 14,
    shipping_cost_nl: 4.95,
    shipping_cost_be: 4.95,
  })
  const t = useTranslations('faq')

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        free_shipping_threshold: s.free_shipping_threshold,
        return_days: s.return_days,
        shipping_cost_nl: s.shipping_cost_nl || 4.95,
        shipping_cost_be: s.shipping_cost_be || 4.95,
      })
    })
  }, [])

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  // Get FAQ items from translations
  const faqItems = t.raw('items') as Array<{ question: string; answer: string }>
  
  // Replace dynamic values in answers
  const getAnswer = (answer: string) => {
    return answer
      .replace('{freeShipping}', settings.free_shipping_threshold.toString())
      .replace('{returnDays}', settings.return_days.toString())
      .replace('{shippingCostNL}', settings.shipping_cost_nl.toFixed(2))
      .replace('{shippingCostBE}', settings.shipping_cost_be.toFixed(2))
  }

  return (
    <section className="py-16 md:py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-block px-4 py-2 bg-brand-primary/10 text-brand-primary font-bold uppercase tracking-[0.2em] text-sm mb-4">
            {t('badge')}
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqItems.map((faq, index) => (
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
                  <p className="text-gray-700 leading-relaxed">{getAnswer(faq.answer)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center p-8 border-2 border-gray-200 bg-gray-50">
          <p className="text-gray-600 mb-4">
            {t('contactCta')}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors active:scale-95"
          >
            {t('contactButton')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}

