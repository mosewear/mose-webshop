'use client'

interface ChatTabsProps {
  activeTab: 'ai' | 'team'
  onTabChange: (tab: 'ai' | 'team') => void
}

export default function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <div className="flex-shrink-0 flex border-b-4 border-black bg-white">
      <button
        onClick={() => onTabChange('ai')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-colors border-r-2 border-black ${
          activeTab === 'ai'
            ? 'bg-brand-primary text-black font-bold'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        ⚡ Direct antwoord
      </button>
      <button
        onClick={() => onTabChange('team')}
        className={`flex-1 py-3 px-4 font-display text-sm uppercase tracking-wide transition-colors ${
          activeTab === 'team'
            ? 'bg-brand-primary text-black font-bold'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        👤 Team MOSE
      </button>
    </div>
  )
}

