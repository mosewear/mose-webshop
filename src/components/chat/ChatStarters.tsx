'use client'

import { useTranslations } from 'next-intl'

interface ChatStartersProps {
  onPick: (vraag: string) => void
  disabled?: boolean
}

const STARTERS = ['size', 'shipping', 'returns', 'material'] as const

/**
 * Voorgestelde openingsvragen, alleen zichtbaar zolang de bezoeker nog niets
 * heeft getypt.
 *
 * Het paneel toonde eerder één begroeting boven een leeg vlak van ruim duizend
 * pixels. Een leeg invoerveld is de hoogste drempel in elke chat: de bezoeker
 * moet zelf bedenken of zijn vraag hier wel thuishoort. Deze vier vragen zijn
 * de onderwerpen waarvoor de assistent echte data heeft (maat, verzending,
 * retour, materiaal), dus elke tik levert ook werkelijk een goed antwoord.
 */
export default function ChatStarters({ onPick, disabled }: ChatStartersProps) {
  const t = useTranslations('chat.starters')

  return (
    <div className="pl-10">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
        {t('intro')}
      </p>
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(t(key))}
            className="flex min-h-[44px] items-center border-2 border-black bg-white px-3.5 py-2 text-left text-xs font-semibold leading-snug text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(key)}
          </button>
        ))}
      </div>
    </div>
  )
}
