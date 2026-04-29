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

export default function PdpFaq() {
  const t = useTranslations('product.pdpFaq')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = (t.raw('items') as Array<{ question: string; answer: string }>) || []
  if (!items.length) return null

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
                      {item.answer}
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
