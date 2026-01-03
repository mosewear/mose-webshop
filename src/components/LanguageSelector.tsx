'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe } from 'lucide-react'

const languages = [
  { code: 'nl', label: 'NL', fullName: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'EN', fullName: 'English', flag: '🇬🇧', disabled: true },
]

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('nl')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleLanguageChange = (code: string) => {
    if (code === 'en') {
      // Toon een notification dat Engels binnenkort komt
      // Voor nu negeren we de click
      return
    }
    setSelectedLang(code)
    setIsOpen(false)
    // Hier kun je later de daadwerkelijke taalwisseling implementeren
  }

  const currentLanguage = languages.find(lang => lang.code === selectedLang)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Desktop Version - Minimalistisch */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex items-center gap-2 px-3 py-2 hover:text-brand-primary transition-colors border-2 border-transparent hover:border-gray-200 group"
        aria-label="Selecteer taal"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-5 h-5" />
        <span className="font-bold text-sm uppercase tracking-wider">
          {currentLanguage?.label}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Mobile Version - Icon Only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 hover:text-brand-primary transition-colors"
        aria-label="Selecteer taal"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-6 h-6" />
      </button>

      {/* Dropdown Menu - Brutalist Style */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50">
          <div className="py-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={lang.disabled}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all ${
                  lang.disabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : selectedLang === lang.code
                    ? 'bg-brand-primary text-white font-bold'
                    : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
                aria-label={`Selecteer ${lang.fullName}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label={`${lang.fullName} vlag`}>
                    {lang.flag}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {lang.label}
                    </span>
                    <span className="text-xs text-gray-600">
                      {lang.fullName}
                    </span>
                  </div>
                </div>
                
                {selectedLang === lang.code && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}

                {lang.disabled && (
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

