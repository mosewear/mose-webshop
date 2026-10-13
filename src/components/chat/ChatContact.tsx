'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Mail } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { useTranslations } from 'next-intl'

const HULP_PUNTEN = ['damaged', 'returns', 'custom', 'tracking', 'other'] as const

/**
 * Contactblad: hier bereik je een mens.
 *
 * Was het tweede tabblad, met twee kaders van 2px en daaronder vijf losse
 * vinkjeskaders die meer aandacht trokken dan de twee knoppen. Nu twee rijen
 * die zelf de knop zijn, met daaronder een rustige lijst als uitleg.
 */
export default function ChatContact() {
  const t = useTranslations('chat.teamMose')
  const [telefoon, setTelefoon] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setTelefoon(settings.contact_phone)
      setEmail(settings.contact_email)
    })
  }, [])

  // Pas een link tonen als de echte waarde binnen is. Er stonden hier vaste
  // waarden als beginstand, dus bij een gewijzigd nummer in de instellingen
  // opende de eerste tik kort een gesprek met een verouderd nummer.
  const whatsappUrl = telefoon ? `https://wa.me/${telefoon.replace(/\D/g, '')}` : null

  const rij =
    'flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary'

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain bg-[#EFEFEC]">
      <div className="bg-white">
        <a
          href={whatsappUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!whatsappUrl}
          className={`${rij} border-b border-black/10 ${whatsappUrl ? 'hover:bg-black/[0.04]' : 'pointer-events-none opacity-40'}`}
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-brand-primary">
            <MessageCircle className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base uppercase leading-none tracking-wide">
              {t('whatsapp.title')}
            </span>
            {/* Het nummer zelf erbij: wie liever belt dan appt, hoeft er niet
                naar te zoeken, en je ziet waar de knop je heen stuurt. */}
            <span className="mt-1.5 block truncate text-[13px] text-black/70">
              {telefoon ?? '\u00A0'}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-black/45">{t('whatsapp.hours')}</span>
          </span>
        </a>

        <a
          href={email ? `mailto:${email}` : undefined}
          aria-disabled={!email}
          className={`${rij} ${email ? 'hover:bg-black/[0.04]' : 'pointer-events-none opacity-40'}`}
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-black">
            <Mail className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base uppercase leading-none tracking-wide">
              {t('email.title')}
            </span>
            <span className="mt-1.5 block truncate text-[13px] text-black/70">{email ?? '\u00A0'}</span>
            <span className="mt-0.5 block truncate text-[11px] text-black/45">{t('email.response')}</span>
          </span>
        </a>
      </div>

      <div className="px-4 py-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
          {t('help.intro')}
        </p>
        <ul className="space-y-2">
          {HULP_PUNTEN.map((punt) => (
            <li key={punt} className="flex items-start gap-2.5 text-[13px] leading-snug text-black/75">
              <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 bg-brand-primary" aria-hidden="true" />
              {t(`help.${punt}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
