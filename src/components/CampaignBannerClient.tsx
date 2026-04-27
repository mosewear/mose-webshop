'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Link } from '@/i18n/routing'

export interface CampaignBannerProps {
  slug: string
  message: string
  ctaText: string | null
  href: string | null
  code: string | null
  themeColor: string
  textColor: string
  dismissable: boolean
  showCode: boolean
  closeLabel: string
}

export default function CampaignBannerClient({
  slug,
  message,
  ctaText,
  href,
  code,
  themeColor,
  textColor,
  dismissable,
  showCode,
  closeLabel,
}: CampaignBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const dismissKey = `mose_campaign_banner_dismissed:${slug}`

  // CSS var management for content offset.
  useEffect(() => {
    if (isDismissed) {
      document.documentElement.style.setProperty('--announcement-banner-height', '0px')
    }
    return () => {
      if (isDismissed) {
        document.documentElement.style.setProperty('--announcement-banner-height', '0px')
      }
    }
  }, [isDismissed])

  useEffect(() => {
    if (!dismissable) return
    try {
      if (sessionStorage.getItem(dismissKey)) {
        setIsDismissed(true)
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, [dismissable, dismissKey])

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      sessionStorage.setItem(dismissKey, '1')
    } catch {
      /* ignore */
    }
  }

  if (isDismissed) return null

  const content = (
    <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3">
      <div className="flex items-center justify-center gap-2 md:gap-3 min-h-[24px]">
        <span className="text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide truncate leading-tight text-center">
          {message}
        </span>

        {showCode && code ? (
          <span
            className="hidden md:inline-flex items-center px-2 py-0.5 border-2 font-mono font-bold text-[10px] md:text-xs tracking-[0.2em] flex-shrink-0"
            style={{ borderColor: textColor }}
          >
            {code}
          </span>
        ) : null}

        {ctaText ? (
          <span className="inline-flex items-center gap-1 text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide hover:underline underline-offset-4 transition-all whitespace-nowrap flex-shrink-0">
            {ctaText}
            <span aria-hidden="true">→</span>
          </span>
        ) : null}
      </div>
    </div>
  )

  const banner = (
    <div
      id="announcement-banner"
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: themeColor, color: textColor }}
    >
      <div className="relative">
        {content}
        {dismissable ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDismiss()
            }}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/15 transition-colors"
            aria-label={closeLabel}
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {banner}
      </Link>
    )
  }
  return banner
}
