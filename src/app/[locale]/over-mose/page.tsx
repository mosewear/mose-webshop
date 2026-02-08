'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function AboutPage() {
  const t = useTranslations('about')
  const [settings, setSettings] = useState({
    free_shipping_threshold: 100,
    return_days: 14,
  })

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        free_shipping_threshold: s.free_shipping_threshold,
        return_days: s.return_days,
      })
    })
  }, [])

  return (
    <div className="min-h-screen pt-20 md:pt-24 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-6">{t('hero.title')}</h1>
          <p className="text-xl md:text-2xl text-gray-700">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Story Image */}
        <div className="relative aspect-[16/9] mb-12 border-2 border-black overflow-hidden">
          <Image
            src="/hero-mose-new.png"
            alt="MOSE Groningen"
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover object-center"
          />
        </div>

        {/* Story Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">{t('story.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('story.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {t('story.paragraph2')}
            </p>
          </div>

          <div className="bg-brand-primary/10 border-2 border-brand-primary p-8">
            <h3 className="text-2xl font-display mb-4">{t('local.title')}</h3>
            <p className="text-gray-800 leading-relaxed">
              {t('local.text')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('values.title')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">{t('values.quality.title')}</h3>
                <p className="text-gray-700">
                  {t('values.quality.text')}
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">{t('values.localMade.title')}</h3>
                <p className="text-gray-700">
                  {t('values.localMade.text')}
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">{t('values.fairPricing.title')}</h3>
                <p className="text-gray-700">
                  {t('values.fairPricing.text')}
                </p>
              </div>
              <div className="border-2 border-gray-300 p-6">
                <h3 className="text-xl font-bold mb-3">{t('values.noHassle.title')}</h3>
                <p className="text-gray-700">
                  {t('values.noHassle.text', { 
                    days: settings.return_days, 
                    threshold: settings.free_shipping_threshold 
                  })}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('why.title')}</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{t('why.sustainable.title')}:</strong> {t('why.sustainable.text')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{t('why.stylish.title')}:</strong> {t('why.stylish.text')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-primary text-2xl font-bold">•</span>
                <span className="text-gray-700">
                  <strong>{t('why.local.title')}:</strong> {t('why.local.text')}
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
            {t('cta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
