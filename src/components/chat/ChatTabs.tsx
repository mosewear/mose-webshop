'use client'

interface ChatTabsProps {
  activeTab: 'ai' | 'team'
  onTabChange: (tab: 'ai' | 'team') => void
}

export default function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <div className="flex-shrink-0 flex border-b-2 border-gray-200 bg-white">
      <button
        onClick={() => onTabChange('ai')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-all ${
          activeTab === 'ai'
            ? 'border-b-4 border-brand-primary text-black font-bold'
            : 'border-b-2 border-transparent text-gray-500 hover:text-black'
        }`}
      >
        ⚡ Direct antwoord
      </button>
      <button
        onClick={() => onTabChange('team')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-all ${
          activeTab === 'team'
            ? 'border-b-4 border-brand-primary text-black font-bold'
            : 'border-b-2 border-transparent text-gray-500 hover:text-black'
        }`}
      >
        👤 Team MOSE
      </button>
    </div>
  )
}

