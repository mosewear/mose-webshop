'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Gift, Truck, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackPixelEvent } from '@/lib/facebook-pixel'

const LAUNCH_DATE = new Date('2026-03-02T00:00:00').getTime()

export default function EarlyAccessClient() {
  const t = useTranslations('earlyAccess')
  const locale = useLocale()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(633)
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const distance = LAUNCH_DATE - now

      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  // Get subscriber count
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      if (count) {
        // Start counting from 633 minimum
        setSubscriberCount(Math.max(count, 633))
      }
    }

    fetchCount()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('subscriber_count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'newsletter_subscribers'
        },
        () => {
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Track page view
  useEffect(() => {
    trackPixelEvent('ViewContent', {
      content_name: `Newsletter Landing ${locale.toUpperCase()}`,
      content_category: 'Newsletter'
    })
  }, [locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Track form initiation
    trackPixelEvent('InitiateCheckout')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'early_access_landing',
          locale
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Track successful registration
      trackPixelEvent('CompleteRegistration', {
        content_name: `Newsletter ${locale.toUpperCase()}`,
        currency: 'EUR',
        value: 4.95 // Free shipping value
      })

      setSubmitted(true)
      setEmail('')
    } catch (err: any) {
      console.error('Newsletter subscription error:', err)
      setError(err.message || t('form.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-primary rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '12s', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Pre-title */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="text-brand-primary text-sm md:text-base uppercase tracking-wider mb-8 font-semibold"
          >
            {t('hero.preTitle')}
          </motion.p>

          {/* Main title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
            {t('hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-300 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* Countdown */}
          <div className="mb-12">
            <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">
              {t('hero.countdown.title')}
            </p>
            <div className="flex justify-center gap-4 md:gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]">
                <div className="text-3xl md:text-4xl font-bold text-brand-primary">{countdown.days}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">{t('hero.countdown.days')}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]">
                <div className="text-3xl md:text-4xl font-bold text-brand-primary">{countdown.hours}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">{t('hero.countdown.hours')}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]">
                <div className="text-3xl md:text-4xl font-bold text-brand-primary">{countdown.minutes}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">{t('hero.countdown.minutes')}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px]">
                <div className="text-3xl md:text-4xl font-bold text-brand-primary">{countdown.seconds}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">{t('hero.countdown.seconds')}</div>
              </div>
            </div>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full px-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('form.placeholder')}
                    required
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:min-w-[280px] px-6 py-4 bg-white text-black font-semibold text-base focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-brand-primary hover:bg-brand-primary-hover text-black font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSubmitting ? t('form.submitting') : t('form.button')}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-sm mt-3">{error}</p>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-brand-primary/20 border border-brand-primary rounded-lg max-w-md mx-auto"
              >
                <p className="text-brand-primary font-bold text-lg">
                  {t('form.success')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Lock className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1">{t('benefits.earlyAccess.title')}</h3>
              <p className="text-xs text-gray-400">{t('benefits.earlyAccess.desc')}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Gift className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1">{t('benefits.gift.title')}</h3>
              <p className="text-xs text-gray-400">{t('benefits.gift.desc')}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Truck className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1">{t('benefits.shipping.title')}</h3>
              <p className="text-xs text-gray-400">{t('benefits.shipping.desc')}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Mail className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-1">{t('benefits.updates.title')}</h3>
              <p className="text-xs text-gray-400">{t('benefits.updates.desc')}</p>
            </div>
          </div>

          {/* Social proof */}
          <p className="text-gray-400 text-sm mb-4">
            {t('social.count', { count: subscriberCount })}
          </p>

          {/* Trust line */}
          <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
            {t('trust')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

