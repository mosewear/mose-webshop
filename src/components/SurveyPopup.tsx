'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { trackPixelEvent } from '@/lib/facebook-pixel'

// Get session ID (reuse analytics session ID if available)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

interface SurveyPopupProps {
  enabled: boolean
  trigger: 'exit_intent' | 'timer' | 'hybrid' | 'scroll'
  delaySeconds: number
  scrollPercentage: number
  frequencyDays: number
  showOnPages: string[]
}

type SurveyStep = 'intro' | 'survey' | 'thankyou'

export default function SurveyPopup({
  enabled,
  trigger,
  delaySeconds,
  scrollPercentage,
  frequencyDays,
  showOnPages
}: SurveyPopupProps) {
  const t = useTranslations('surveyPopup')
  const locale = useLocale()

  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState<SurveyStep>('intro')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Survey answers
  const [purchaseLikelihood, setPurchaseLikelihood] = useState('')
  const [whatNeeded, setWhatNeeded] = useState<string[]>([])
  const [whatNeededOther, setWhatNeededOther] = useState('')
  const [firstImpression, setFirstImpression] = useState('')
  
  const [hasTriggeredTimer, setHasTriggeredTimer] = useState(false)
  const [hasTriggeredScroll, setHasTriggeredScroll] = useState(false)
  const [hasTriggeredExit, setHasTriggeredExit] = useState(false)
  const [isDismissedThisSession, setIsDismissedThisSession] = useState(false)

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (isVisible) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scroll position
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isVisible])

  // Check if popup should be shown
  const shouldShowPopup = useCallback((): boolean => {
    if (!enabled) return false
    if (typeof window === 'undefined') return false
    
    if (isDismissedThisSession) return false

    const lastShown = localStorage.getItem('mose_survey_popup_shown')
    if (lastShown) {
      const daysSinceLastShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)
      if (daysSinceLastShown < frequencyDays) {
        return false
      }
    }

    if (showOnPages.length > 0) {
      const currentPath = window.location.pathname
      const shouldShow = showOnPages.some(page => {
        if (page === 'home') return currentPath === '/' || currentPath === '/nl' || currentPath === '/en'
        if (page === 'shop') return currentPath.includes('/shop')
        if (page === 'product') return currentPath.includes('/product/')
        return false
      })
      if (!shouldShow) return false
    }

    return true
  }, [enabled, frequencyDays, showOnPages, isDismissedThisSession])

  // Timer trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'timer' && trigger !== 'hybrid') return
    if (hasTriggeredTimer) return
    if (isDismissedThisSession) return

    const timer = setTimeout(() => {
      setIsVisible(true)
      setHasTriggeredTimer(true)
      trackPopupView()
    }, delaySeconds * 1000)

    return () => clearTimeout(timer)
  }, [trigger, delaySeconds, shouldShowPopup, hasTriggeredTimer, isDismissedThisSession])

  // Scroll trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'scroll' && trigger !== 'hybrid') return
    if (hasTriggeredScroll) return
    if (isDismissedThisSession) return

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
  }, [trigger, scrollPercentage, shouldShowPopup, hasTriggeredScroll, isDismissedThisSession])

  // Exit intent trigger
  useEffect(() => {
    if (!shouldShowPopup()) return
    if (trigger !== 'exit_intent' && trigger !== 'hybrid') return
    if (hasTriggeredExit) return
    if (isDismissedThisSession) return

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsVisible(true)
        setHasTriggeredExit(true)
        trackPopupView()
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [trigger, shouldShowPopup, hasTriggeredExit, isDismissedThisSession])

  const trackPopupView = () => {
    localStorage.setItem('mose_survey_popup_shown', Date.now().toString())
    trackPixelEvent('Lead', {
      content_name: 'Survey Popup Viewed',
      content_category: 'Survey'
    })
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissedThisSession(true)
    trackPixelEvent('Lead', {
      content_name: 'Survey Popup Dismissed',
      content_category: 'Survey'
    })
  }

  const handleIntroYes = () => {
    setCurrentStep('survey')
  }

  const handleIntroNo = () => {
    handleDismiss()
  }

  const handleWhatNeededToggle = (value: string) => {
    setWhatNeeded(prev => {
      const newValue = prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
      
      // Clear other text if "other" is unchecked
      if (value === 'other' && !newValue.includes('other')) {
        setWhatNeededOther('')
      }
      
      return newValue
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!purchaseLikelihood) {
      setError(t('errorRequired'))
      return
    }

    if (whatNeeded.length === 0) {
      setError(t('errorRequired'))
      return
    }

    // Validate that if "other" is selected, the text field is filled
    if (whatNeeded.includes('other') && !whatNeededOther.trim()) {
      setError(t('errorRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
          device_type: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
          locale,
          purchase_likelihood: purchaseLikelihood,
          what_needed: whatNeeded,
          what_needed_other: whatNeeded.includes('other') ? whatNeededOther : null,
          first_impression: firstImpression || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error'))
      }

      trackPixelEvent('CompleteRegistration', {
        content_name: 'Survey Completed',
        content_category: 'Survey'
      })

      setCurrentStep('thankyou')
      
      setTimeout(() => {
        setIsVisible(false)
      }, 3000)
    } catch (err: any) {
      console.error('Survey submission error:', err)
      setError(err.message || t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

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
          className="bg-white border-4 border-black max-w-md w-full max-h-[90vh] flex flex-col relative pointer-events-auto animate-slideUp shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 transition-colors border-2 border-black bg-white"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8">
            <div className="text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <Image
                src="/logomose.png"
                alt="MOSE"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </div>

            {currentStep === 'intro' && (
              <>
                <h3 className="text-2xl md:text-3xl font-bold mb-3 uppercase leading-tight">
                  {t('introTitle')}
                </h3>
                <div className="h-1 w-20 bg-brand-primary mx-auto mb-4" />
                
                <p className="text-base md:text-lg text-gray-700 mb-6 leading-relaxed">
                  {t('introText')}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleIntroYes}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 border-4 border-black uppercase tracking-wide transition-all duration-200 hover:translate-x-1 hover:translate-y-1"
                  >
                    {t('introYes')}
                  </button>
                  
                  <button
                    onClick={handleIntroNo}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 border-4 border-black uppercase tracking-wide transition-all duration-200 hover:translate-x-1 hover:translate-y-1"
                  >
                    {t('introNo')}
                  </button>
                </div>
              </>
            )}

            {currentStep === 'survey' && (
              <form onSubmit={handleSubmit} className="text-left space-y-6">
                {/* Question 1: Purchase Likelihood */}
                <div>
                  <label className="block font-bold text-lg mb-3">
                    {t('question1')} <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {['probably_yes', 'not_sure', 'probably_not'].map((value) => (
                      <label
                        key={value}
                        className="flex items-center p-3 border-2 border-gray-300 hover:border-brand-primary cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="purchase_likelihood"
                          value={value}
                          checked={purchaseLikelihood === value}
                          onChange={(e) => setPurchaseLikelihood(e.target.value)}
                          className="mr-3 w-4 h-4"
                        />
                        <span className="text-sm font-medium">{t(`likelihood_${value}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Question 2: What do you need */}
                <div>
                  <label className="block font-bold text-lg mb-3">
                    {t('question2')} <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {['free_shipping', 'discount', 'more_reviews', 'better_size_guide', 'more_photos', 'videos', 'other'].map((value) => (
                      <div key={value}>
                        <label
                          className="flex items-center p-3 border-2 border-gray-300 hover:border-brand-primary cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            value={value}
                            checked={whatNeeded.includes(value)}
                            onChange={() => handleWhatNeededToggle(value)}
                            className="mr-3 w-4 h-4"
                          />
                          <span className="text-sm font-medium">{t(`needed_${value}`)}</span>
                        </label>
                        {value === 'other' && whatNeeded.includes('other') && (
                          <div className="mt-2 ml-7">
                            <input
                              type="text"
                              value={whatNeededOther}
                              onChange={(e) => setWhatNeededOther(e.target.value)}
                              placeholder={t('neededOtherPlaceholder')}
                              maxLength={200}
                              className="w-full px-4 py-2 border-2 border-black focus:outline-none focus:border-brand-primary transition-colors"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question 3: First Impression */}
                <div>
                  <label className="block font-bold text-lg mb-3">
                    {t('question3')} <span className="text-gray-500 text-sm font-normal">({t('question3Optional')})</span>
                  </label>
                  <textarea
                    value={firstImpression}
                    onChange={(e) => setFirstImpression(e.target.value)}
                    placeholder={t('question3Placeholder')}
                    maxLength={200}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{firstImpression.length}/200</p>
                </div>

                {error && (
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 border-4 border-black uppercase tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1"
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                </button>
              </form>
            )}

            {currentStep === 'thankyou' && (
              <div className="py-8">
                <div className="w-16 h-16 bg-brand-primary mx-auto mb-4 flex items-center justify-center border-4 border-black">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">{t('thankYou')}</h3>
                <p className="text-gray-700">
                  {t('thankYouMessage')}
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

