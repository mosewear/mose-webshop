'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AnnouncementMessage {
  id: string
  text: string
  link_url: string | null
  cta_text: string | null
  icon: string | null
  sort_order: number
}

interface BannerConfig {
  enabled: boolean
  rotation_interval: number
  dismissable: boolean
  dismiss_cookie_days: number
}

const DISMISS_COOKIE_NAME = 'mose_banner_dismissed'

export default function AnnouncementBanner() {
  const [config, setConfig] = useState<BannerConfig | null>(null)
  const [messages, setMessages] = useState<AnnouncementMessage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState(0) // 1 = forward, -1 = backward
  
  const supabase = createClient()

  // Check if banner is dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_COOKIE_NAME)
    if (dismissed) {
      const dismissedUntil = new Date(dismissed)
      if (dismissedUntil > new Date()) {
        setIsDismissed(true)
      } else {
        localStorage.removeItem(DISMISS_COOKIE_NAME)
      }
    }
  }, [])

  // Fetch banner config and messages
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        // Fetch config
        const { data: configData, error: configError } = await supabase
          .from('announcement_banner')
          .select('*')
          .single()

        console.log('🎯 [BANNER] Config fetched:', configData, configError)

        if (configData) {
          console.log('🎯 [BANNER] Config enabled:', configData.enabled)
          
          if (configData.enabled) {
            setConfig(configData)

            // Fetch active messages
            const { data: messagesData, error: messagesError } = await supabase
              .from('announcement_messages')
              .select('*')
              .eq('banner_id', configData.id)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })

            console.log('🎯 [BANNER] Active messages fetched:', messagesData?.length || 0, messagesError)

            if (messagesData && messagesData.length > 0) {
              setMessages(messagesData)
            } else {
              console.log('🎯 [BANNER] No active messages found')
            }
          } else {
            console.log('🎯 [BANNER] Banner is disabled')
          }
        } else {
          console.log('🎯 [BANNER] No banner config found')
        }
      } catch (error) {
        console.error('🎯 [BANNER] Error fetching announcement banner:', error)
      }
    }

    fetchBanner()
  }, [])

  // Auto-rotate messages
  useEffect(() => {
    if (!config || messages.length <= 1 || isPaused || isDismissed) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, config.rotation_interval * 1000)

    return () => clearInterval(interval)
  }, [config, messages.length, isPaused, isDismissed])

  const handleNext = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % messages.length)
  }, [messages.length])

  const handlePrev = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length)
  }, [messages.length])

  const handleDismiss = useCallback(() => {
    if (!config) return
    
    setIsDismissed(true)
    
    // Set cookie expiry
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + config.dismiss_cookie_days)
    localStorage.setItem(DISMISS_COOKIE_NAME, expiryDate.toISOString())
  }, [config])

  // Don't render if dismissed, not enabled, or no messages
  if (isDismissed || !config?.enabled || messages.length === 0) {
    console.log('🎯 [BANNER] Not rendering:', { 
      isDismissed, 
      configEnabled: config?.enabled, 
      messagesCount: messages.length 
    })
    return null
  }

  console.log('🎯 [BANNER] Rendering banner with message:', messages[currentIndex]?.text)

  const currentMessage = messages[currentIndex]

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  }

  const BannerContent = (
    <div
      className="relative z-[100] bg-brand-primary text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Navigation - Left */}
          {messages.length > 1 && (
            <button
              onClick={handlePrev}
              className="flex-shrink-0 p-1 hover:bg-white/10 transition-colors rounded hidden md:block"
              aria-label="Previous message"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Message Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentMessage.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="flex items-center justify-center gap-2 md:gap-3"
              >
                {/* Icon */}
                {currentMessage.icon && (
                  <span className="text-lg md:text-xl flex-shrink-0" aria-hidden="true">
                    {currentMessage.icon}
                  </span>
                )}

                {/* Text */}
                <span className="text-xs md:text-sm font-bold uppercase tracking-wide text-center">
                  {currentMessage.text}
                </span>

                {/* CTA Link */}
                {currentMessage.link_url && currentMessage.cta_text && (
                  <Link
                    href={currentMessage.link_url}
                    className="flex-shrink-0 text-xs md:text-sm font-bold uppercase tracking-wide hover:underline flex items-center gap-1 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="hidden sm:inline">|</span>
                    {currentMessage.cta_text}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Progress Dots */}
            {messages.length > 1 && (
              <div className="hidden md:flex items-center gap-1.5">
                {messages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1)
                      setCurrentIndex(index)
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-white w-4'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to message ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Navigation - Right */}
            {messages.length > 1 && (
              <button
                onClick={handleNext}
                className="flex-shrink-0 p-1 hover:bg-white/10 transition-colors rounded hidden md:block"
                aria-label="Next message"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Dismiss Button */}
            {config.dismissable && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/10 transition-colors rounded"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // If message has link and no CTA, make entire banner clickable
  if (currentMessage.link_url && !currentMessage.cta_text) {
    return (
      <Link href={currentMessage.link_url} className="block">
        {BannerContent}
      </Link>
    )
  }

  return BannerContent
}

