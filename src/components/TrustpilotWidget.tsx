'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useTranslations, useLocale } from 'next-intl'

interface TrustpilotWidgetProps {
  variant?: 'footer' | 'product'
  className?: string
}

/**
 * Trustpilot Widget Component
 * Only displays if there are 30+ reviews on Trustpilot
 * 
 * Checks review count via API route that queries Trustpilot's Business Unit API
 */
export default function TrustpilotWidget({ variant = 'footer', className = '' }: TrustpilotWidgetProps) {
  const t = useTranslations('trustpilot')
  const locale = useLocale()
  const [shouldShow, setShouldShow] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check review count via API route
    const checkReviewCount = async () => {
      try {
        const response = await fetch('/api/trustpilot/review-count')
        const data = await response.json()
        
        if (data.hasMinimumReviews) {
          setShouldShow(true)
        }
      } catch (error) {
        console.error('Error checking Trustpilot review count:', error)
        // Fallback: check environment variable
        const fallbackCount = parseInt(process.env.NEXT_PUBLIC_TRUSTPILOT_REVIEW_COUNT || '0')
        if (fallbackCount >= 30) {
          setShouldShow(true)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkReviewCount()
  }, [])

  // Don't render anything if we shouldn't show or still loading
  if (isLoading || !shouldShow) {
    return null
  }

  // Different layouts for footer vs product page
  // Note: Trustpilot script is already loaded in main layout for domain verification
  if (variant === 'product') {
    return (
      <div className={`${className}`}>
        <a
          href="https://www.trustpilot.com/review/mosewear.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-brand-primary transition-colors"
        >
          <span className="font-semibold text-yellow-500">★★★★★</span>
          <span className="uppercase tracking-wider">{t('rated')}</span>
        </a>
      </div>
    )
  }

  // Footer variant
  // Note: Trustpilot script is already loaded in main layout for domain verification
  return (
    <div className={`${className}`}>
      <a
        href="https://www.trustpilot.com/review/mosewear.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className="font-semibold text-yellow-500">★★★★★</span>
        <span>{t('rated')}</span>
      </a>
    </div>
  )
}

