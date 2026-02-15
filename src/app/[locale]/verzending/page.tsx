'use client'

import { useState, useEffect } from 'react'
import { Truck, Package, Clock, MapPin, RefreshCw, Check, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

export default function VerzendingPage() {
  const t = useTranslations('shipping')
  const locale = useLocale()
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  const [settings, setSettings] = useState<{
    free_shipping_threshold: number
    shipping_cost: number
    return_days: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings({
        free_shipping_threshold: s.free_shipping_threshold,
        shipping_cost: s.shipping_cost,
        return_days: s.return_days,
      })
      setLoading(false)
    })
  }, [])

  // Don't render content until settings are loaded to prevent flash of incorrect text
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Brutalist Style */}
      <section className="relative bg-black text-white py-16 md:py-24 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300A676' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold uppercase tracking-[0.2em] text-sm mb-6">
              <Truck className="w-4 h-4" />
              {t('service')}
            </div>

            <h1 className="font-display text-5xl md:text-7xl mb-6 leading-tight">
              {t('title')}<br />
              <span className="text-brand-primary">& {t('returns')}</span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
              {settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                ? t('alwaysFreeShipping')
                : t('freeShipping', { threshold: settings.free_shipping_threshold })
              }. 
              {t('returnPolicy', { days: settings.return_days })}.
            </p>
            <p className="text-sm text-gray-400 mt-3">
              {t('sameConditionsNLBE')}
            </p>
          </div>

          {/* Trust Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-5xl mx-auto">
            {[
              { 
                icon: <Truck className="w-6 h-6" />, 
                label: settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                  ? t('alwaysFree')
                  : t('freeFrom', { threshold: settings.free_shipping_threshold }), 
                sublabel: t('shipping') 
              },
              { icon: <Clock className="w-6 h-6" />, label: t('deliveryTime'), sublabel: t('deliveryTimeLabel') },
              { icon: <RefreshCw className="w-6 h-6" />, label: t('returnDays', { days: settings.return_days }), sublabel: t('returns') },
              { icon: <Check className="w-6 h-6" />, label: t('free'), sublabel: t('manufacturingFault') },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 border-2 border-gray-700 hover:border-brand-primary transition-all duration-300 hover:bg-brand-primary/10 group">
                <div className="mb-3 flex justify-center group-hover:scale-110 transition-transform">{stat.icon}</div>
                <div className="text-lg font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="text-xs text-gray-400">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content - Brutalist Cards */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        
        {/* Verzending Section */}
        <section className="mb-16 md:mb-24">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b-4 border-black">
            <div className="w-12 h-12 bg-brand-primary flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase">{t('title')}</h2>
          </div>
          
          {/* Hero Card - Gratis Verzending */}
          <div className="bg-brand-primary text-white p-8 md:p-12 border-4 border-black mb-8">
            <div className="flex items-start gap-4 mb-4">
              <Package className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2 uppercase">
                  {settings.free_shipping_threshold === 0 && settings.shipping_cost === 0
                    ? t('alwaysFreeShipping')
                    : t('freeShipping', { threshold: settings.free_shipping_threshold })
                  }
                </h3>
                {settings.free_shipping_threshold === 0 && settings.shipping_cost === 0 ? (
                  <p className="text-xl text-white/90">
                    {t('alwaysFreeShippingText')}
                  </p>
                ) : (
                  <p className="text-xl text-white/90">
                    {t('shippingCost', { threshold: settings.free_shipping_threshold, cost: settings.shipping_cost.toFixed(2) })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Verzendgebieden */}
            <div className="border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl uppercase">{t('shippingAreas')}</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-primary" />
                  <span>{t('netherlands')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-primary" />
                  <span>{t('belgium')}</span>
                </li>
              </ul>
            </div>

            {/* Levertijd */}
            <div className="border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl uppercase">{t('deliveryTimeLabel')}</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-primary" />
                  <span>{t('processing')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-primary" />
                  <span>{t('delivery')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black" />
                  <span className="font-bold">{t('total')}</span>
                </li>
              </ul>
            </div>

            {/* Track & Trace */}
            <div className="border-4 border-black p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl uppercase">{t('trackTrace')}</h3>
              </div>
              <p className="text-sm mb-3">
                {t.rich('viaDHL', {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-primary" />
                  <span>{t('trackCode')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-primary" />
                  <span>{t('expectedDelivery')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-primary" />
                  <span>{t('trackLink')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 border-4 border-black bg-gray-100 p-6">
            <p className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-brand-primary flex-shrink-0 mt-0.5" />
              <span>
                <strong>{t('trackOrder')}</strong> {t('goToAccount')}{' '}
                <LocaleLink href="/account" className="text-brand-primary font-bold underline hover:no-underline">
                  {t('account')}
                </LocaleLink>{' '}
                {t('orUseTrack')}
              </span>
            </p>
          </div>
        </section>

        {/* Retourneren Section */}
        <section>
          <div className="flex items-center gap-4 mb-8 pb-4 border-b-4 border-black">
            <div className="w-12 h-12 bg-brand-primary flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase">{t('returns')}</h2>
          </div>
          
          {/* Hero Card - Bedenktijd */}
          <div className="bg-black text-white p-8 md:p-12 border-4 border-black mb-8">
            <h3 className="text-3xl md:text-4xl font-bold mb-3 uppercase">
              {t('returnPeriodTitle', { days: settings.return_days })}
            </h3>
            <p className="text-xl text-gray-300">
              {t('returnPeriodText', { days: settings.return_days })}
            </p>
            <p className="text-sm text-gray-400 mt-3">
              {t('sameConditionsNLBE')}
            </p>
          </div>

          {/* Voorwaarden */}
          <div className="border-4 border-black p-8 bg-white mb-8">
            <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-3">
              <div className="w-8 h-1 bg-brand-primary" />
              {t('conditionsTitle')}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                t('conditionUnworn'),
                t('conditionTagsAttached'),
                t('conditionOriginalPackaging'),
                t('conditionWithinDays', { days: settings.return_days }),
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 border-2 border-gray-200">
                  <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hoe Retourneren - Stappen */}
          <div className="border-4 border-black bg-gray-50 p-8 mb-8">
            <h3 className="text-2xl font-bold uppercase mb-8 flex items-center gap-3">
              <div className="w-8 h-1 bg-brand-primary" />
              {t('howToReturnTitle')}
            </h3>
            <div className="space-y-6">
              {[
                {
                  number: '1',
                  title: t('step1Title'),
                  text: (
                    <>
                      {t('step1TextBeforeLink')}{' '}
                      <LocaleLink href="/account" className="text-brand-primary font-bold underline hover:no-underline">
                        {t('step1LinkText')}
                      </LocaleLink>{' '}
                      {t('step1TextAfterLink')}
                    </>
                  ),
                },
                {
                  number: '2',
                  title: t('step2Title'),
                  text: t('step2Text'),
                },
                {
                  number: '3',
                  title: t('step3Title'),
                  text: t('step3Text'),
                },
                {
                  number: '4',
                  title: t('step4Title'),
                  text: t('step4Text'),
                },
                {
                  number: '5',
                  title: t('step5Title'),
                  text: t('step5Text'),
                },
                {
                  number: '6',
                  title: t('step6Title'),
                  text: t('step6Text'),
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-12 h-12 bg-brand-primary text-white flex items-center justify-center font-bold text-xl border-2 border-black group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <div className="flex-1 pt-2">
                    <h4 className="font-bold text-lg mb-1 uppercase">{step.title}</h4>
                    <p className="text-gray-700">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retourkosten Warning */}
          <div className="border-4 border-yellow-400 bg-yellow-50 p-8 mb-8">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              {t('returnCostsTitle')}
            </h3>
            <p className="text-lg mb-3">
              {t('returnCostsText')}{' '}
              <strong className="text-xl">€5,95</strong>. {t('returnCostsFollowup')}
            </p>
            <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <Check className="w-5 h-5" />
              {t('manufacturingFaultReturnFree')}
            </p>
          </div>

          {/* Terugbetaling */}
          <div className="border-4 border-black bg-white p-8">
            <h3 className="text-2xl font-bold uppercase mb-4 flex items-center gap-3">
              <div className="w-8 h-1 bg-brand-primary" />
              {t('refundTitle')}
            </h3>
            <div className="space-y-4 text-gray-700">
              <p className="flex items-start gap-3">
                <Check className="w-5 h-5 text-brand-primary flex-shrink-0 mt-1" />
                <span>
                  {t('refundTextOneBefore')}
                  <strong>5-7 {t('businessDays')}</strong> {t('refundTextOneAfter')}
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Check className="w-5 h-5 text-brand-primary flex-shrink-0 mt-1" />
                <span>
                  {t('refundTextTwo')}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section - Brutalist */}
        <section className="mt-16 md:mt-24">
          <div className="bg-black text-white p-12 md:p-16 border-4 border-black text-center">
            <h2 className="font-display text-4xl md:text-5xl mb-6 uppercase">
              {t('questionsTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {t('questionsText')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LocaleLink 
                href={localeLink('/contact')} 
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-primary text-white font-bold text-lg uppercase tracking-wider hover:bg-brand-primary-hover transition-all duration-300 border-2 border-brand-primary"
              >
                {t('contactUs')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </LocaleLink>
              <LocaleLink 
                href={localeLink('/shop')} 
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-lg uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300"
              >
                {t('continueShopping')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </LocaleLink>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
