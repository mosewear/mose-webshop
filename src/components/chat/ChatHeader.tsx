'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatHeaderProps {
  onClose: () => void
}

/**
 * Kop van het chatpaneel.
 *
 * Zwart vlak met de merknaam in het display-lettertype, gelijk aan de header en
 * de footer van de shop. Hiervoor was de kop wit met zwarte tekst, waardoor het
 * paneel geen duidelijk begin had en wegviel tegen de pagina erachter.
 *
 * De regel eronder noemt de verwachte reactietijd. Dat is geen opsmuk: een
 * bezoeker die niet weet of hij binnen een minuut of binnen een dag antwoord
 * krijgt, begint het gesprek vaak niet.
 */
export default function ChatHeader({ onClose }: ChatHeaderProps) {
  const t = useTranslations('chat')

  return (
    <div className="flex-shrink-0 bg-black text-white">
      {/* Greep op mobiel: maakt zichtbaar dat het paneel naar beneden geveegd
          kan worden. Op desktop heeft het paneel een vaste plek en is dit ruis. */}
      <div className="flex justify-center pt-[calc(env(safe-area-inset-top)+0.5rem)] md:hidden">
        <span className="h-1 w-10 bg-white/30" aria-hidden="true" />
      </div>

      <div className="flex items-start justify-between gap-3 px-4 pb-3.5 pt-3 md:pt-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Vierkant in plaats van rond: de hele shop werkt met rechte
                hoeken. Geen animatie bij reduced motion. */}
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
              <span className="absolute inset-0 bg-brand-primary opacity-60 motion-safe:animate-ping" />
              <span className="relative h-2.5 w-2.5 bg-brand-primary" />
            </span>
            <h2 className="font-display text-lg uppercase leading-none tracking-wide md:text-xl">
              {t('title')}
            </h2>
            <span className="sr-only">{t('online')}</span>
          </div>
          <p className="mt-2 text-[10px] uppercase leading-none tracking-[0.12em] text-white/70">
            {t('subtitle')}
          </p>
        </div>

        <button
          onClick={onClose}
          className="-mr-1 flex h-11 w-11 flex-shrink-0 items-center justify-center border-2 border-white/30 transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={t('close')}
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
