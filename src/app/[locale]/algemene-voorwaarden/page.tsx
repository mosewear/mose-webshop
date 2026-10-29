'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/settings'
import { COMPANY, formatKvk, formatVat } from '@/lib/company'
import { useTranslations } from 'next-intl'
import { isAltijdGratisUitWaarden } from '@/lib/verzendbelofte'
import PaginaKop from '@/components/layout/PaginaKop'

export default function TermsPage() {
  const t = useTranslations('terms')
  // Match current public terms before client settings have loaded.
  const [settings, setSettings] = useState({
    free_shipping_threshold: 0,
    return_days: 30,
    shipping_cost: 0,
    return_label_cost_incl_btw: 6.95,
    contact_email: 'info@mosewear.com',
    contact_phone: '+31 50 234 0025',
    contact_address: 'Helper Brink 27a, 9722 EG Groningen',
  })

  const altijdGratisVerzending = isAltijdGratisUitWaarden(
    settings.free_shipping_threshold,
    settings.shipping_cost
  )

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        free_shipping_threshold: s.free_shipping_threshold,
        return_days: s.return_days,
        shipping_cost: s.shipping_cost,
        return_label_cost_incl_btw: s.return_label_cost_incl_btw,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        contact_address: s.contact_address,
      })
    })
  }, [])

  const addressLines = settings.contact_address.split(',').map(line => line.trim())

  return (
    <div className="min-h-screen">
      <PaginaKop titel={t('title')} ondertitel={t('lastUpdated')} breedte="tekst" />
      <div className="px-4 pb-16 pt-8 md:pt-12">
      <div className="max-w-4xl mx-auto">

        {/* Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.general.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.general.content')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.pricing.title')}</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>{t('sections.pricing.items.0')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>{t('sections.pricing.items.1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>{altijdGratisVerzending
                  ? t('sections.pricing.itemAltijd')
                  : t('sections.pricing.items.2', { threshold: settings.free_shipping_threshold })}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary font-bold">•</span>
                <span>{t('sections.pricing.items.3')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.ordering.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.ordering.content')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.payment.title')}</h2>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.payment.items.${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.shipping.title')}</h2>
            <ul className="space-y-2 text-gray-700">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{altijdGratisVerzending && i === 3
                    ? t('sections.shipping.itemAltijd')
                    : t(`sections.shipping.items.${i}`, {
                        threshold: settings.free_shipping_threshold,
                        cost: settings.shipping_cost.toFixed(2).replace('.', ','),
                      })}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.returns.title')}</h2>
            <ul className="space-y-2 text-gray-700">
              {/* Afgeleid van de werkelijke lijstlengte; met de vaste reeks
                  [0,1,2,3] viel de vijfde voorwaarde altijd weg. */}
              {((t.raw('sections.returns.items') as string[]) ?? []).map((_, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{t(`sections.returns.items.${i}`, {
                    days: settings.return_days,
                    returnCost: settings.return_label_cost_incl_btw.toFixed(2).replace('.', ','),
                  })}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.warranty.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.warranty.content')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.liability.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.liability.content')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.disputes.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.disputes.content')}
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-display mb-4">{t('sections.contact.title')}</h2>
            <p className="text-gray-700 leading-relaxed">
              {t('sections.contact.content', { 
                email: settings.contact_email, 
                phone: settings.contact_phone 
              })}
            </p>
            {/* Wettelijk verplichte bedrijfsgegevens. Stonden nergens op de
                site, ook niet in deze voorwaarden. */}
            <p className="text-gray-700 leading-relaxed mt-4">
              {COMPANY.legalName}, {settings.contact_address} &middot; {formatKvk()} &middot; {formatVat()}
            </p>
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
    </div>
  )
}
