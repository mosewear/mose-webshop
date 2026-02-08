'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Mail, Clock } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'

export default function TeamMoseTab() {
  const t = useTranslations('chat.teamMose')
  const [contactPhone, setContactPhone] = useState('+31 50 211 1931')
  const [contactEmail, setContactEmail] = useState('info@mosewear.com')

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setContactPhone(settings.contact_phone)
      setContactEmail(settings.contact_email)
    })
  }, [])

  const whatsappUrl = `https://wa.me/${contactPhone.replace(/\D/g, '')}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-display text-2xl uppercase tracking-wide mb-2">
          {t('title')}
        </h3>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* WhatsApp */}
      <div className="bg-white border-2 border-black p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary border-2 border-black flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-lg uppercase tracking-wide">{t('whatsapp.title')}</h4>
            <p className="text-sm text-gray-600">{t('whatsapp.description')}</p>
          </div>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-4 bg-brand-primary text-white border-2 border-black hover:bg-brand-primary-hover transition-colors text-center font-display uppercase tracking-wide"
        >
          {t('whatsapp.button')}
        </a>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" strokeWidth={2} />
          <span>{t('whatsapp.hours')}</span>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white border-2 border-black p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center">
            <Mail className="w-6 h-6 text-gray-700" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-lg uppercase tracking-wide">{t('email.title')}</h4>
            <p className="text-sm text-gray-600">{t('email.description')}</p>
          </div>
        </div>

        <a
          href={`mailto:${contactEmail}`}
          className="block w-full py-3 px-4 bg-gray-100 text-black border-2 border-black hover:bg-gray-200 transition-colors text-center font-display uppercase tracking-wide"
        >
          {t('email.button')}
        </a>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" strokeWidth={2} />
          <span>{t('email.response')}</span>
        </div>
      </div>

      {/* Info - Checklist Style */}
      <div className="border-t-4 border-black pt-4 bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
        <p className="text-center text-xs uppercase tracking-wider font-bold text-gray-900 mb-4">
          {t('help.intro')}
        </p>
        <div className="space-y-2 max-w-xs mx-auto">
          <div className="flex items-center gap-3 bg-white border-2 border-black p-2">
            <div className="w-5 h-5 border-2 border-black bg-brand-primary flex-shrink-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">{t('help.damaged')}</span>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-black p-2">
            <div className="w-5 h-5 border-2 border-black bg-brand-primary flex-shrink-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">{t('help.returns')}</span>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-black p-2">
            <div className="w-5 h-5 border-2 border-black bg-brand-primary flex-shrink-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">{t('help.custom')}</span>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-black p-2">
            <div className="w-5 h-5 border-2 border-black bg-brand-primary flex-shrink-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">{t('help.tracking')}</span>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-black p-2">
            <div className="w-5 h-5 border-2 border-black bg-brand-primary flex-shrink-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">{t('help.other')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

