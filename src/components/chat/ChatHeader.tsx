'use client'

import { X, ArrowLeft, Headphones } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ChatAvatar from './ChatAvatar'

interface ChatHeaderProps {
  weergave: 'gesprek' | 'contact'
  onClose: () => void
  onNaarContact: () => void
  onTerug: () => void
}

/**
 * Kop van het chatpaneel.
 *
 * Hier zat de grootste verwarring van de vorige versie. Onder de kop stond een
 * tabbalk met "DIRECT ANTWOORD" en "TEAM MOSE": twee even zware keuzes die je
 * moest maken voordat je iets gevraagd had, met labels die het verschil niet
 * uitleggen. Een bezoeker met een vraag wil geen kanaal kiezen, die wil typen.
 *
 * De chat opent nu rechtstreeks in het gesprek. Een mens bereik je via één
 * knop rechtsboven, die het contactblad eroverheen schuift met een pijl terug.
 * Eén taak per scherm.
 */
export default function ChatHeader({ weergave, onClose, onNaarContact, onTerug }: ChatHeaderProps) {
  const t = useTranslations('chat')
  const opContact = weergave === 'contact'

  const knopKlassen =
    'flex h-11 w-11 flex-shrink-0 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset'

  return (
    <div className="flex-shrink-0 bg-black text-white">
      {/* Greep op mobiel: maakt zichtbaar dat het blad naar beneden kan. */}
      <div className="flex justify-center pt-[calc(env(safe-area-inset-top)+0.625rem)] md:hidden">
        <span className="h-1 w-9 bg-white/25" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-1 px-2 py-2.5 md:py-3">
        {opContact ? (
          <button onClick={onTerug} className={knopKlassen} aria-label={t('back')}>
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
        ) : (
          /* Het merkteken, zoals een contactfoto in een berichtenapp. Hier
             stond alleen een los groen blokje: dat zei wel "online", maar niet
             wie er online was. Het stipje staat nu bij de statusregel, want
             over het portret heen werd het op een groene achtergrond een zwart
             blokje in de hoek. */
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center">
            <ChatAvatar maat={36} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base uppercase leading-none tracking-wide md:text-lg">
            {opContact ? t('teamMose.headerTitle') : t('title')}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] leading-none text-white/55">
            {!opContact && (
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0" aria-hidden="true">
                <span className="absolute inset-0 bg-brand-primary opacity-60 motion-safe:animate-ping" />
                <span className="relative h-1.5 w-1.5 bg-brand-primary" />
              </span>
            )}
            {opContact ? t('teamMose.headerSubtitle') : t('subtitle')}
          </p>
        </div>

        {!opContact && (
          <button onClick={onNaarContact} className={knopKlassen} aria-label={t('toHuman')} title={t('toHuman')}>
            <Headphones className="h-5 w-5" strokeWidth={2.2} />
          </button>
        )}

        <button onClick={onClose} className={knopKlassen} aria-label={t('close')}>
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
