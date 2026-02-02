'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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

interface AnnouncementBannerClientProps {
  config: BannerConfig
  messages: AnnouncementMessage[]
}

const DISMISS_COOKIE_NAME = 'mose_banner_dismissed'

export default function AnnouncementBannerClient({ config, messages }: AnnouncementBannerClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState(0)

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

  // Reset CSS var when banner is dismissed
  useEffect(() => {
    if (isDismissed) {
      document.documentElement.style.setProperty('--announcement-banner-height', '0px')
    }
    
    return () => {
      // Reset on unmount
      if (isDismissed) {
        document.documentElement.style.setProperty('--announcement-banner-height', '0px')
      }
    }
  }, [isDismissed])

  // Auto-rotate messages
  useEffect(() => {
    if (messages.length <= 1 || isPaused || isDismissed) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, config.rotation_interval * 1000)

    return () => clearInterval(interval)
  }, [config.rotation_interval, messages.length, isPaused, isDismissed])

  const handleNext = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % messages.length)
  }, [messages.length])

  const handlePrev = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length)
  }, [messages.length])

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + config.dismiss_cookie_days)
    localStorage.setItem(DISMISS_COOKIE_NAME, expiryDate.toISOString())
  }, [config.dismiss_cookie_days])

  if (isDismissed || messages.length === 0) {
    return null
  }

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
      id="announcement-banner"
      className="fixed top-0 left-0 right-0 z-50 bg-brand-primary text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {/* Navigation - Left (desktop only) */}
          {messages.length > 1 && (
            <button
              onClick={handlePrev}
              className="flex-shrink-0 p-1.5 hover:bg-white/10 transition-colors rounded hidden lg:flex items-center justify-center"
              aria-label="Previous message"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Message Content - Centered, Single Line on Mobile */}
          <div className="flex-1 overflow-hidden max-w-4xl">
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
                className="flex flex-row items-center justify-center gap-2 text-center whitespace-nowrap"
              >
                {/* Text - Single line, smaller on mobile */}
                <span className="text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide truncate">
                  {currentMessage.text}
                </span>

                {/* CTA Link - Inline on all screens */}
                {currentMessage.link_url && currentMessage.cta_text && (
                  <Link
                    href={currentMessage.link_url}
                    className="flex-shrink-0 text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide hover:underline underline-offset-4 transition-all flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentMessage.cta_text}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Progress Dots (desktop only) */}
            {messages.length > 1 && (
              <div className="hidden lg:flex items-center gap-2">
                {messages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1)
                      setCurrentIndex(index)
                    }}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-white w-6'
                        : 'bg-white/40 hover:bg-white/60 w-2'
                    }`}
                    aria-label={`Go to message ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Navigation - Right (desktop only) */}
            {messages.length > 1 && (
              <button
                onClick={handleNext}
                className="flex-shrink-0 p-1.5 hover:bg-white/10 transition-colors rounded hidden lg:flex items-center justify-center"
                aria-label="Next message"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Dismiss Button - Smaller padding on mobile */}
            {config.dismissable && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 md:p-1.5 hover:bg-white/10 transition-colors rounded"
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

