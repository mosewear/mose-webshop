'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function CookieConsent() {
  const t = useTranslations('cookieConsent')
  const [showBanner, setShowBanner] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  // Staat bewust vóór de effecten die hem aanroepen. React's
  // immutability-regel leest in bronvolgorde, dus een verwijzing naar een
  // functie die lager staat wordt gemarkeerd, ook al is hij gehoist.
  function loadTrackingScripts() {
    window.dispatchEvent(new Event('mose-tracking-enabled'))
  }

  // Publiceer de eigen hoogte als CSS-variabele zolang de balk staat. Andere
  // vaste elementen onderaan het scherm (de sticky koopbalk op de PDP, de
  // afrekenbalk in de winkelwagen) schuiven daarop mee in plaats van eronder te
  // verdwijnen. De banner moet zichtbaar blijven voor geldige toestemming, dus
  // hem onder de koopbalk leggen is geen optie; meeschuiven wel.
  useEffect(() => {
    const el = bannerRef.current
    const clear = () => document.documentElement.style.setProperty('--cookie-consent-height', '0px')
    if (!showBanner || !el) {
      clear()
      return
    }
    const write = () => {
      document.documentElement.style.setProperty(
        '--cookie-consent-height',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      )
    }
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => {
      ro.disconnect()
      clear()
    }
  }, [showBanner])

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

  const handleAccept = (type: 'all' | 'necessary') => {
    if (type === 'all') {
      localStorage.setItem('mose_cookie_consent', 'all')
      loadTrackingScripts()
    } else {
      localStorage.setItem('mose_cookie_consent', 'necessary')
    }
    
    // Animate out
    setIsVisible(false)
    setTimeout(() => setShowBanner(false), 300)
  }

  if (!showBanner) return null

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={t('title')}
      className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      {/* Compact op mobiel. Deze balk was daar circa 230 tot 260px hoog (grote
          display-kop, py-6, gestapelde knoppen) en bedekte daarmee ongeveer een
          derde van het scherm, inclusief de sticky koopbalk op de PDP (z-40) en
          de afrekenbalk in de winkelwagen. Elke advertentieklik landde dus op
          een product waarvan de koopknop onbereikbaar was tot de banner werd
          weggeklikt. Op desktop blijft de ruimere opmaak staan. */}
      <div className="bg-black text-white border-t-4 border-brand-primary">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            {/* Text */}
            <div className="flex-1">
              <h3 className="hidden md:block font-display text-xl md:text-2xl uppercase mb-2 tracking-wide">
                {t('title')}
              </h3>
              <p className="text-xs md:text-base text-gray-300 leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-none">
                {t('description')}{' '}
                <Link
                  href="/privacy"
                  className="text-brand-primary hover:underline font-semibold"
                >
                  {t('privacyLink')}
                </Link>
              </p>
            </div>

            {/* Buttons: op mobiel naast elkaar, niet gestapeld */}
            <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 min-w-0 md:min-w-fit">
              <button
                onClick={() => handleAccept('necessary')}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 min-h-[44px] bg-white text-black font-bold uppercase tracking-wide md:tracking-wider border-2 border-white hover:bg-gray-100 transition-colors text-xs md:text-sm leading-tight whitespace-normal md:whitespace-nowrap"
              >
                {t('necessaryOnly')}
              </button>
              <button
                onClick={() => handleAccept('all')}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 min-h-[44px] bg-brand-primary text-white font-bold uppercase tracking-wide md:tracking-wider border-2 border-brand-primary hover:bg-brand-primary-hover transition-all md:hover:translate-x-1 md:hover:translate-y-1 text-xs md:text-sm leading-tight whitespace-normal md:whitespace-nowrap"
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




