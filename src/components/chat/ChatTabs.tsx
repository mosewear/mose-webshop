'use client'

import { Zap, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatTabsProps {
  activeTab: 'ai' | 'team'
  onTabChange: (tab: 'ai' | 'team') => void
}

export default function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  const t = useTranslations('chat.tabs')
  
  return (
    <div className="flex-shrink-0 flex border-b-2 border-black bg-white">
      <button
        onClick={() => onTabChange('ai')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
          activeTab === 'ai'
            ? 'bg-brand-primary text-white font-bold'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Zap className={`w-4 h-4 ${activeTab === 'ai' ? 'text-white' : 'text-gray-700'}`} strokeWidth={2.5} />
        <span>{t('direct')}</span>
      </button>
      <div className="w-px bg-black" />
      <button
        onClick={() => onTabChange('team')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
          activeTab === 'team'
            ? 'bg-brand-primary text-white font-bold'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Users className={`w-4 h-4 ${activeTab === 'team' ? 'text-white' : 'text-gray-700'}`} strokeWidth={2.5} />
        <span>{t('team')}</span>
      </button>
    </div>
  )
}

