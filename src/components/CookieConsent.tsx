'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function CookieConsent() {
  const t = useTranslations('cookieConsent')
  const [showBanner, setShowBanner] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('mose_cookie_consent')
    if (!consent) {
      setShowBanner(true)
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 100)
    } else {
      // User already made choice, load tracking if accepted
      if (consent === 'all') {
        loadTrackingScripts()
      }
    }
  }, [])

  const loadTrackingScripts = () => {
    // Enable Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      console.log('🍪 Tracking enabled: Facebook Pixel')
    }
    
    // PostHog is already loaded by provider, just notify
    console.log('🍪 Tracking enabled: PostHog')
    
    // Dispatch event so other components know tracking is enabled
    window.dispatchEvent(new Event('mose-tracking-enabled'))
  }

  const handleAccept = (type: 'all' | 'necessary') => {
    if (type === 'all') {
      localStorage.setItem('mose_cookie_consent', 'all')
      loadTrackingScripts()
    } else {
      localStorage.setItem('mose_cookie_consent', 'necessary')
      console.log('🍪 Only necessary cookies accepted')
    }
    
    // Animate out
    setIsVisible(false)
    setTimeout(() => setShowBanner(false), 300)
  }

  if (!showBanner) return null

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="bg-black text-white border-t-4 border-brand-primary">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Text */}
            <div className="flex-1">
              <h3 className="font-display text-xl md:text-2xl uppercase mb-2 tracking-wide">
                {t('title')}
              </h3>
              <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                {t('description')}{' '}
                <Link 
                  href="/privacy" 
                  className="text-brand-primary hover:underline font-semibold"
                >
                  {t('privacyLink')}
                </Link>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 min-w-fit">
              <button
                onClick={() => handleAccept('necessary')}
                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider border-2 border-white hover:bg-gray-100 transition-colors text-sm whitespace-nowrap"
              >
                {t('necessaryOnly')}
              </button>
              <button
                onClick={() => handleAccept('all')}
                className="px-6 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider border-2 border-brand-primary hover:bg-brand-primary-hover transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 text-sm whitespace-nowrap"
              >
                {t('acceptAll')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


