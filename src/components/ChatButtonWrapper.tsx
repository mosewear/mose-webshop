'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getSiteSettings } from '@/lib/settings'
import ChatButton from './chat/ChatButton'

export default function ChatButtonWrapper() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shouldHide, setShouldHide] = useState(false)
  const pathname = usePathname()

  // Check settings
  useEffect(() => {
    getSiteSettings()
      .then((settings) => {
        setIsEnabled(settings.ai_chat_enabled ?? true)
        setIsLoading(false)
      })
      .catch(() => {
        setIsEnabled(true)
        setIsLoading(false)
      })
  }, [])

  // Hide chat button in specific situations
  useEffect(() => {
    // Hide on product pages (has sticky buy button)
    if (pathname?.includes('/product/')) {
      setShouldHide(true)
      return
    }

    // Hide on admin pages
    if (pathname?.includes('/admin')) {
      setShouldHide(true)
      return
    }

    // Hide on checkout/payment pages
    if (pathname?.includes('/checkout') || pathname?.includes('/payment')) {
      setShouldHide(true)
      return
    }

    // Show on all other pages
    setShouldHide(false)
  }, [pathname])

  // Don't render while loading, if disabled, or if should hide
  if (isLoading || !isEnabled || shouldHide) return null

  return <ChatButton />
}

