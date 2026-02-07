'use client'

import { useEffect, useState } from 'react'
import { getSiteSettings } from '@/lib/settings'
import ChatButton from './chat/ChatButton'

export default function ChatButtonWrapper() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSiteSettings()
      .then((settings) => {
        setIsEnabled(settings.ai_chat_enabled ?? true) // Default true
        setIsLoading(false)
      })
      .catch(() => {
        setIsEnabled(true) // Default enabled on error
        setIsLoading(false)
      })
  }, [])

  // Don't render while loading or if disabled
  if (isLoading || !isEnabled) return null

  return <ChatButton />
}

