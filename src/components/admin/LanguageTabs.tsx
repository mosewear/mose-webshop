'use client'

import { useState } from 'react'

interface LanguageTabsProps {
  activeLanguage: 'nl' | 'en'
  onLanguageChange: (lang: 'nl' | 'en') => void
}

export default function LanguageTabs({ activeLanguage, onLanguageChange }: LanguageTabsProps) {
  return (
    <div className="flex gap-2 border-b-2 border-gray-200 mb-6">
      <button
        type="button"
        onClick={() => onLanguageChange('nl')}
        className={`px-6 py-3 font-bold uppercase tracking-wide transition-colors ${
          activeLanguage === 'nl'
            ? 'bg-brand-primary text-white border-b-4 border-brand-primary-hover'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇳🇱 Nederlands
      </button>
      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        className={`px-6 py-3 font-bold uppercase tracking-wide transition-colors ${
          activeLanguage === 'en'
            ? 'bg-brand-primary text-white border-b-4 border-brand-primary-hover'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇬🇧 Engels
      </button>
    </div>
  )
}




