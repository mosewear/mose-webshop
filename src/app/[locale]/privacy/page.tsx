'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'

export default function PrivacyPage() {
  const t = useTranslations('privacy')
  const [settings, setSettings] = useState({
    contact_email: 'info@mosewear.nl',
    contact_phone: '+31 50 211 1931',
    contact_address: 'Stavangerweg 13, 9723 JC Groningen',
  })

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        contact_address: s.contact_address,
      })
    })
  }, [])

  const addressLines = settings.contact_address.split(',').map(line => line.trim())

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-display mb-4">{t('title')}</h1>
          <p className="text-gray-600">{t('lastUpdated')}</p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          {/* 1. Introduction */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.intro.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.intro.content')}
            </p>
          </div>

          {/* 2. Data Collection */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.dataCollection.title')}</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('sections.dataCollection.intro')}
            </p>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.dataCollection.items.${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Data Usage */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.dataUsage.title')}</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('sections.dataUsage.intro')}
            </p>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.dataUsage.items.${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Data Retention */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.dataRetention.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.dataRetention.content')}{' '}
              <a href={`mailto:${settings.contact_email}`} className="text-brand-primary hover:underline">
                {settings.contact_email}
              </a>.
            </p>
          </div>

          {/* 5. Third Parties */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.thirdParties.title')}</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('sections.thirdParties.intro')}
            </p>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.thirdParties.items.${i}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('sections.thirdParties.outro')}
            </p>
          </div>

          {/* 6. Security */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.security.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.security.content')}
            </p>
          </div>

          {/* 7. Cookies */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.cookies.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.cookies.content')}
            </p>
          </div>

          {/* 8. Rights */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.rights.title')}</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('sections.rights.intro')}
            </p>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.rights.items.${i}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('sections.rights.outro', { email: settings.contact_email })}
            </p>
          </div>

          {/* 9. Changes */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.changes.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.changes.content')}
            </p>
          </div>

          {/* 10. Contact */}
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.contact.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.contact.intro')}
            </p>
            <div className="bg-gray-50 border-2 border-gray-300 p-6 mt-4">
              <p className="text-gray-800 font-bold">MOSE</p>
              {addressLines.map((line, idx) => (
                <p key={idx} className="text-gray-700">{line}</p>
              ))}
              {!settings.contact_address.toLowerCase().includes('nederland') && 
               !settings.contact_address.toLowerCase().includes('netherlands') && (
                <p className="text-gray-700">{t('sections.contact.country')}</p>
              )}
              <p className="text-gray-700">
                {t('sections.contact.email')}{' '}
                <a href={`mailto:${settings.contact_email}`} className="text-brand-primary hover:underline">
                  {settings.contact_email}
                </a>
              </p>
              <p className="text-gray-700">
                {t('sections.contact.phone')}{' '}
                <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`} className="text-brand-primary hover:underline">
                  {settings.contact_phone}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12 pt-8 border-t-2 border-gray-200">
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
