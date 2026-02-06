'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { createClient } from '@/lib/supabase/client'

interface NewsletterPopupProps {
  enabled: boolean
  trigger: 'exit_intent' | 'timer' | 'hybrid' | 'scroll'
  delaySeconds: number
  scrollPercentage: number
  frequencyDays: number
  showOnPages: string[]
  discountPercentage: number
}

export default function NewsletterPopup({
  enabled,
  trigger,
  delaySeconds,
  scrollPercentage,
  frequencyDays,
  showOnPages,
  discountPercentage
}: NewsletterPopupProps) {
  const t = useTranslations('newsletterPopup')
  const locale = useLocale()
  const supabase = createClient()

  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(633)
  const [hasTriggeredTimer, setHasTriggeredTimer] = useState(false)
  const [hasTriggeredScroll, setHasTriggeredScroll] = useState(false)
  const [hasTriggeredExit, setHasTriggeredExit] = useState(false)

  // Check if popup should be shown (cookie check)
  const shouldShowPopup = useCallback((): boolean => {
    if (!enabled) return false
    if (typeof window === 'undefined') return false

    // Check cookie
    const lastShown = localStorage.getItem('mose_newsletter_popup_shown')
    if (lastShown) {
      const daysSinceLastShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)
      if (daysSinceLastShown < frequencyDays) {
        return false
      }
    }

    // Check if already subscribed
    const isSubscribed = localStorage.getItem('mose_newsletter_subscribed')
    if (isSubscribed === 'true') {
      return false
    }

    // Check current page
    if (showOnPages.length > 0) {
      const currentPath = window.location.pathname
      const shouldShow = showOnPages.some(page => {
        if (page === 'home') return currentPath === '/' || currentPath === '/nl' || currentPath === '/en'
        if (page === 'shop') return currentPath.includes('/shop')
        if (page === 'product') return currentPath.includes('/product/')
        if (page === 'early-access') return currentPath.includes('/early-access')
        return false
      })
      if (!shouldShow) return false
    }

    return true
  }, [enabled, frequencyDays, showOnPages])

  // Get subscriber count
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      if (count !== null) {
        setSubscriberCount(633 + count)
      }
    }

    fetchCount()
  }, [supabase])

  // Timer trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'timer' && trigger !== 'hybrid') return
    if (hasTriggeredTimer) return

    const timer = setTimeout(() => {
      setIsVisible(true)
      setHasTriggeredTimer(true)
      trackPopupView()
    }, delaySeconds * 1000)

    return () => clearTimeout(timer)
  }, [trigger, delaySeconds, shouldShowPopup, hasTriggeredTimer])

  // Scroll trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'scroll' && trigger !== 'hybrid') return
    if (hasTriggeredScroll) return

    const handleScroll = () => {
      const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      if (scrolled >= scrollPercentage) {
        setIsVisible(true)
        setHasTriggeredScroll(true)
        trackPopupView()
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trigger, scrollPercentage, shouldShowPopup, hasTriggeredScroll])

  // Exit intent trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'exit_intent' && trigger !== 'hybrid') return
    if (hasTriggeredExit) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of viewport
      if (e.clientY <= 0) {
        setIsVisible(true)
        setHasTriggeredExit(true)
        trackPopupView()
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [trigger, shouldShowPopup, hasTriggeredExit])

  // Track popup view
  const trackPopupView = () => {
    localStorage.setItem('mose_newsletter_popup_shown', Date.now().toString())
    trackPixelEvent('Lead', {
      content_name: 'Newsletter Popup Viewed',
      content_category: 'Newsletter'
    })
  }

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false)
    trackPixelEvent('Lead', {
      content_name: 'Newsletter Popup Dismissed',
      content_category: 'Newsletter'
    })
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter_popup',
          locale
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Er ging iets mis')
      }

      // Track successful subscription
      trackPixelEvent('Subscribe', {
        content_name: 'Newsletter Popup',
        currency: 'EUR',
        value: discountPercentage * 1.5, // Estimated value
        predicted_ltv: 150
      })

      // Mark as subscribed
      localStorage.setItem('mose_newsletter_subscribed', 'true')
      
      setSubmitted(true)
      setEmail('')

      // Close after 3 seconds
      setTimeout(() => {
        setIsVisible(false)
      }, 3000)
    } catch (err: any) {
      console.error('Newsletter subscription error:', err)
      setError(err.message || 'Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't render if not visible
  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white border-4 border-black max-w-md w-full p-6 md:p-8 relative pointer-events-auto animate-slideUp shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors border-2 border-black"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Logo */}
            <div className="mb-6">
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight uppercase">
                MOSE
              </h2>
              <div className="h-1 w-32 bg-black mx-auto mt-2" />
            </div>

            {submitted ? (
              // Success state
              <div className="py-8">
                <div className="w-16 h-16 bg-brand-primary mx-auto mb-4 flex items-center justify-center border-4 border-black">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">GELUKT!</h3>
                <p className="text-gray-700">
                  Check je inbox voor je {discountPercentage}% kortingscode
                </p>
              </div>
            ) : (
              <>
                {/* Headline */}
                <h3 className="text-2xl md:text-3xl font-bold mb-3 uppercase leading-tight">
                  WORDT MOSE INSIDER
                </h3>
                <div className="h-1 w-20 bg-brand-primary mx-auto mb-4" />

                {/* Offer */}
                <p className="text-lg md:text-xl font-bold mb-2">
                  {discountPercentage}% korting op je eerste bestelling
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  + early access tot nieuwe drops
                </p>

                {/* Social proof */}
                <div className="bg-gray-100 border-2 border-black p-3 mb-6">
                  <p className="text-sm font-bold">
                    {subscriberCount}+ insiders gingen je voor
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="je@email.nl"
                    required
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed text-center font-medium"
                  />

                  {error && (
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 border-4 border-black uppercase tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isSubmitting ? 'EVEN GEDULD...' : `CLAIM ${discountPercentage}% KORTING`}
                  </button>
                </form>

                {/* Dismiss link */}
                <button
                  onClick={handleDismiss}
                  className="mt-6 text-sm text-gray-600 hover:text-black transition-colors underline"
                >
                  Nee, ik betaal €{Math.round((100 * 100) / (100 - discountPercentage) - 100)} meer
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

