'use client'

import { Zap, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatTabsProps {
  activeTab: 'ai' | 'team'
  onTabChange: (tab: 'ai' | 'team') => void
}

const TABS: Array<{ id: 'ai' | 'team'; key: 'direct' | 'team'; Icon: typeof Zap }> = [
  { id: 'ai', key: 'direct', Icon: Zap },
  { id: 'team', key: 'team', Icon: Users },
]

/**
 * Tabs van het chatpaneel.
 *
 * Drie dingen opgelost ten opzichte van de vorige versie:
 *
 *  1. De actieve tab was een vol merkgroen vlak met witte tekst. Wit op #00A676
 *     haalt 3,13:1 en zakt daarmee onder de 4,5:1 die tekst nodig heeft. Nu is
 *     actief zwarte tekst met een groene onderstreping: dezelfde merkkleur,
 *     maar als accent in plaats van als tekstachtergrond.
 *  2. "DIRECT ANTWOORD" brak over twee regels. In een paneel van 400px was er
 *     met text-sm en 0,14em letterafstand simpelweg geen ruimte. Nu text-xs met
 *     0,08em, waarmee het label op één regel past.
 *  3. Het waren twee losse knoppen zonder tabrol. Nu een echte tablist met
 *     pijltjesbediening, zodat toetsenbord en schermlezer de twee panelen als
 *     één keuze zien.
 */
export default function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  const t = useTranslations('chat.tabs')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    onTabChange(activeTab === 'ai' ? 'team' : 'ai')
  }

  return (
    <div
      role="tablist"
      aria-label={t('direct')}
      onKeyDown={handleKeyDown}
      className="flex flex-shrink-0 border-b-2 border-black bg-white"
    >
      {TABS.map(({ id, key, Icon }, index) => {
        const actief = activeTab === id
        return (
          <button
            key={id}
            role="tab"
            id={`chat-tab-${id}`}
            aria-selected={actief}
            aria-controls={`chat-panel-${id}`}
            tabIndex={actief ? 0 : -1}
            onClick={() => onTabChange(id)}
            className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 px-3 py-3 text-xs uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
              index === 0 ? 'border-r-2 border-black' : ''
            } ${actief ? 'bg-white font-bold text-black' : 'bg-gray-50 font-semibold text-gray-600 hover:bg-white hover:text-black'}`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${actief ? 'text-brand-primary' : 'text-gray-500'}`}
              strokeWidth={2.5}
            />
            <span className="whitespace-nowrap">{t(key)}</span>
            {/* Onderstreping in merkgroen markeert de actieve tab. Staat los van
                de tekstkleur, dus de status blijft leesbaar zonder kleur. */}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-0.5 h-[3px] ${actief ? 'bg-brand-primary' : 'bg-transparent'}`}
            />
          </button>
        )
      })}
    </div>
  )
}
