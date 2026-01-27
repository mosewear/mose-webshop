'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { routing } from '@/i18n/routing'

const languages = [
  { code: 'nl', label: 'NL', fullName: 'Nederlands' },
  { code: 'en', label: 'EN', fullName: 'English' },
]

export default function LanguageSelector() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('language')
  const [isOpen, setIsOpen] = useState(false)
  const selectedLang = locale
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

  const handleLanguageChange = (newLocale: string) => {
    if (!routing.locales.includes(newLocale as any) || newLocale === locale) {
      setIsOpen(false)
      return
    }

    // next-intl router automatically handles locale switching
    router.replace(pathname, { locale: newLocale })
    setIsOpen(false)
  }

  const currentLanguage = languages.find(lang => lang.code === selectedLang)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Desktop & Mobile - Unified Version */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 hover:text-brand-primary transition-colors border-2 border-transparent hover:border-gray-200 group"
        aria-label={t('selector')}
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

      {/* Dropdown Menu - Brutalist Style */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border-4 border-black z-50">
          <div className="py-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all ${
                  selectedLang === lang.code
                    ? 'bg-brand-primary text-white font-bold'
                    : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
                aria-label={`${t('selector')}: ${t(lang.code)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {lang.label}
                    </span>
                    <span className="text-xs text-gray-600">
                      {t(lang.code)}
                    </span>
                  </div>
                </div>
                
                {selectedLang === lang.code && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


