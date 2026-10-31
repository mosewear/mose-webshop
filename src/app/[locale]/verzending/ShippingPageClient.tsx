'use client'

import { Truck, Package, Clock, MapPin, RefreshCw, Check, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react'
import type { CommercePromises } from '@/lib/settings-server'
import { useTranslations } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import PaginaKop from '@/components/layout/PaginaKop'

export default function ShippingPageClient({settings}: {settings: CommercePromises}) {
  const t = useTranslations('shipping')

  return (
    <div className="min-h-screen bg-white">
      {/* Zelfde kop als de shop. Het zwarte vlak met patroon is weg; de vier
          kerngegevens staan als rustige tegels in het blok, zodat je in één
          blik ziet wat je moet weten. */}
      <PaginaKop
        titel={`${t('title')} & ${t('returns')}`}
        ondertitel={
          <>
            {t('checkoutDelivery')}.{' '}
            {t('returnPolicy', { days: settings.return_days })}. {t('sameConditionsNLBE')}
          </>
        }
      >
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4 md:gap-3">
          {[
            {
              icon: <Truck className="h-5 w-5" aria-hidden="true" />,
              label: t('checkoutCosts'),
              sublabel: t('shipping'),
            },
            { icon: <Clock className="h-5 w-5" aria-hidden="true" />, label: t('deliveryTime'), sublabel: t('deliveryTimeLabel') },
            { icon: <RefreshCw className="h-5 w-5" aria-hidden="true" />, label: t('returnDays', { days: settings.return_days }), sublabel: t('returns') },
            { icon: <Check className="h-5 w-5" aria-hidden="true" />, label: t('free'), sublabel: t('manufacturingFault') },
          ].map((stat) => (
            <li key={stat.sublabel} className="flex items-center gap-3 border-2 border-gray-300 bg-white px-3 py-3 md:px-4">
              <span className="shrink-0 text-brand-primary">{stat.icon}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold uppercase leading-tight tracking-wider text-black">{stat.label}</span>
                <span className="block text-xs text-gray-600">{stat.sublabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </PaginaKop>

      {/* Main Content - Brutalist Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        
        {/* Verzending Section */}
        <section className="mb-16 md:mb-24">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b-4 border-black">
            <div className="w-12 h-12 bg-brand-primary flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl uppercase">{t('title')}</h2>
          </div>
          
          {/* Hero Card - Gratis Verzending */}
          <div className="bg-brand-primary text-white p-5 md:p-8 border-2 border-black mb-8">
            <div className="flex items-start gap-4 mb-4">
              <Package className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2 uppercase">
                  {t('checkoutDelivery')}
                </h3>
                <p className="text-base leading-relaxed text-white/90 md:text-lg">{t('checkoutDeliveryBody')}</p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Verzendgebieden */}
            <div className="border-2 border-black p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="break-words font-bold text-base sm:text-xl uppercase">{t('shippingAreas')}</h3>
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
            <div className="border-2 border-black p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="break-words font-bold text-base sm:text-xl uppercase">{t('deliveryTimeLabel')}</h3>
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
            <div className="border-2 border-black p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black group-hover:bg-brand-primary transition-colors flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h3 className="break-words font-bold text-base sm:text-xl uppercase">{t('trackTrace')}</h3>
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
          <div className="mt-6 border-2 border-black bg-gray-100 p-6">
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
          <div className="bg-black text-white p-5 md:p-8 border-2 border-black mb-8">
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
          <div className="border-2 border-black p-8 bg-white mb-8">
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
          <div className="border-2 border-black bg-gray-50 p-8 mb-8">
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
                  text: t('step3Text', { returnCost: settings.return_label_cost_incl_btw.toFixed(2).replace('.', ',') }),
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
              <strong className="text-xl">€{settings.return_label_cost_incl_btw.toFixed(2).replace('.', ',')}</strong>. {t('returnCostsFollowup')}
            </p>
            <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <Check className="w-5 h-5" />
              {t('manufacturingFaultReturnFree')}
            </p>
          </div>

          {/* Terugbetaling */}
          <div className="border-2 border-black bg-white p-8">
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
          <div className="bg-black text-white p-12 md:p-16 border-2 border-black text-center">
            <h2 className="font-display text-4xl md:text-5xl mb-6 uppercase">
              {t('questionsTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              {t('questionsText')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LocaleLink 
                href="/contact"
                className="mose-button mose-button--primary group"
              >
                {t('contactUs')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </LocaleLink>
              <LocaleLink 
                href="/shop"
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
