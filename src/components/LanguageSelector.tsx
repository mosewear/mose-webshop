'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe, Check } from 'lucide-react'

const languages = [
  { code: 'nl', label: 'NL', fullName: 'Nederlands', disabled: false },
  { code: 'en', label: 'EN', fullName: 'English', disabled: true },
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

  const handleLanguageChange = (code: string, disabled: boolean) => {
    if (disabled) {
      // Disabled language - do nothing
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

      {/* Dropdown Menu - Minimalist Brutalist Style */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50">
          <div className="py-2">
            {languages.map((lang, index) => (
              <div key={lang.code}>
                <button
                  onClick={() => handleLanguageChange(lang.code, lang.disabled || false)}
                  disabled={lang.disabled}
                  className={`w-full text-left px-4 py-3 transition-all ${
                    lang.disabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : selectedLang === lang.code
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  aria-label={`Selecteer ${lang.fullName}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className={`font-display text-2xl uppercase tracking-tight ${
                        selectedLang === lang.code ? 'text-white' : 'text-black'
                      }`}>
                        {lang.label}
                      </span>
                      <span className={`text-xs mt-1 ${
                        selectedLang === lang.code ? 'text-white/90' : 'text-gray-600'
                      }`}>
                        {lang.fullName}
                      </span>
                    </div>
                    
                    {selectedLang === lang.code && !lang.disabled && (
                      <Check className="w-6 h-6 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
                    )}

                    {lang.disabled && (
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 flex-shrink-0">
                        SOON
                      </span>
                    )}
                  </div>
                </button>
                
                {/* Divider between languages */}
                {index < languages.length - 1 && (
                  <div className="border-t-2 border-black" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

