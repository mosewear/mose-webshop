'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Mail, Clock } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'

const HULP_PUNTEN = ['damaged', 'returns', 'custom', 'tracking', 'other'] as const

/**
 * Tweede tabblad: doorverwijzing naar een mens.
 *
 * De lijst met onderwerpen stond eerder als vijf losse kaders met een rand van
 * 2px en een vinkje erin, allemaal in hoofdletters. Dat trok meer aandacht dan
 * de twee knoppen eronder, terwijl het alleen uitleg is. Nu een rustige lijst
 * met een groen blokje ervoor, en de knoppen zijn het zwaarste element op het
 * scherm.
 */
export default function TeamMoseTab() {
  const t = useTranslations('chat.teamMose')
  const [contactPhone, setContactPhone] = useState<string | null>(null)
  const [contactEmail, setContactEmail] = useState<string | null>(null)

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setContactPhone(settings.contact_phone)
      setContactEmail(settings.contact_email)
    })
  }, [])

  // Pas een knop tonen als het echte nummer binnen is. Er stonden hier vaste
  // waarden als beginstand, dus bij een gewijzigd nummer in de instellingen
  // opende de eerste tik kort een gesprek met een verouderd nummer.
  const whatsappUrl = contactPhone ? `https://wa.me/${contactPhone.replace(/\D/g, '')}` : null

  return (
    <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain bg-gray-50 p-5">
      <div>
        <h3 className="font-display text-2xl uppercase leading-tight tracking-wide">{t('title')}</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{t('subtitle')}</p>
      </div>

      {/* WhatsApp */}
      <div className="border-2 border-black bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-black bg-brand-primary">
            <MessageCircle className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg uppercase leading-none tracking-wide">
              {t('whatsapp.title')}
            </h4>
            <p className="mt-1 text-xs leading-snug text-gray-600">{t('whatsapp.description')}</p>
          </div>
        </div>

        <a
          href={whatsappUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!whatsappUrl}
          className={`mt-3 flex min-h-[44px] w-full items-center justify-center border-2 border-black px-4 text-center font-display uppercase tracking-wide transition-colors ${
            whatsappUrl
              ? 'bg-brand-primary text-white hover:bg-black'
              : 'pointer-events-none bg-gray-100 text-gray-400'
          }`}
        >
          {t('whatsapp.button')}
        </a>

        <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-600">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
          <span>{t('whatsapp.hours')}</span>
        </div>
      </div>

      {/* E-mail */}
      <div className="border-2 border-black bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-black bg-black">
            <Mail className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-lg uppercase leading-none tracking-wide">
              {t('email.title')}
            </h4>
            <p className="mt-1 text-xs leading-snug text-gray-600">{t('email.description')}</p>
          </div>
        </div>

        <a
          href={contactEmail ? `mailto:${contactEmail}` : undefined}
          aria-disabled={!contactEmail}
          className={`mt-3 flex min-h-[44px] w-full items-center justify-center border-2 border-black px-4 text-center font-display uppercase tracking-wide transition-colors ${
            contactEmail
              ? 'bg-white text-black hover:bg-black hover:text-white'
              : 'pointer-events-none bg-gray-100 text-gray-400'
          }`}
        >
          {t('email.button')}
        </a>

        <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-600">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
          <span>{t('email.response')}</span>
        </div>
      </div>

      {/* Waar het team mee helpt */}
      <div className="border-t-2 border-black pt-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {t('help.intro')}
        </p>
        <ul className="space-y-1.5">
          {HULP_PUNTEN.map((punt) => (
            <li key={punt} className="flex items-start gap-2.5 text-sm text-gray-800">
              <span
                className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 bg-brand-primary"
                aria-hidden="true"
              />
              <span className="leading-snug">{t(`help.${punt}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
