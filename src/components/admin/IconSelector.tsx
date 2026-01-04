'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'

// Available icons for stats_3
const AVAILABLE_ICONS = [
  { name: 'Star', label: 'Ster', icon: LucideIcons.Star },
  { name: 'Sparkles', label: 'Sparkles', icon: LucideIcons.Sparkles },
  { name: 'Award', label: 'Award', icon: LucideIcons.Award },
  { name: 'BadgeCheck', label: 'Badge', icon: LucideIcons.BadgeCheck },
  { name: 'Crown', label: 'Kroon', icon: LucideIcons.Crown },
  { name: 'Gem', label: 'Diamant', icon: LucideIcons.Gem },
  { name: 'Heart', label: 'Hart', icon: LucideIcons.Heart },
  { name: 'Zap', label: 'Bliksem', icon: LucideIcons.Zap },
  { name: 'ShieldCheck', label: 'Schild', icon: LucideIcons.ShieldCheck },
  { name: 'Trophy', label: 'Trofee', icon: LucideIcons.Trophy },
  { name: 'Check', label: 'Vinkje', icon: LucideIcons.Check },
  { name: 'Infinity', label: 'Infinity (∞)', icon: LucideIcons.Infinity },
]

interface IconSelectorProps {
  value: string
  onChange: (iconName: string) => void
}

export default function IconSelector({ value, onChange }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedIcon = AVAILABLE_ICONS.find(i => i.name === value) || AVAILABLE_ICONS[0]
  const SelectedIconComponent = selectedIcon.icon

  return (
    <div className="relative">
      <label className="block text-sm font-bold mb-2 uppercase tracking-wide">
        Stats 3 Icon
      </label>
      
      {/* Selected Icon Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border-2 border-gray-300 hover:border-brand-primary focus:border-brand-primary focus:outline-none transition-colors bg-white flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <SelectedIconComponent className="w-6 h-6" />
          <span className="font-semibold">{selectedIcon.label}</span>
        </div>
        <LucideIcons.ChevronDown 
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Icons Grid */}
          <div className="absolute z-20 mt-2 w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
              {AVAILABLE_ICONS.map((iconOption) => {
                const IconComponent = iconOption.icon
                const isSelected = iconOption.name === value
                
                return (
                  <button
                    key={iconOption.name}
                    type="button"
                    onClick={() => {
                      onChange(iconOption.name)
                      setIsOpen(false)
                    }}
                    className={`flex flex-col items-center gap-2 p-4 border-2 transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-8 h-8" strokeWidth={2.5} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-center">
                      {iconOption.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

