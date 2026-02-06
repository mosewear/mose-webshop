'use client'

import { useEffect, useState } from 'react'
import NewsletterPopup from './NewsletterPopup'

interface PopupSettings {
  popup_enabled: boolean
  popup_trigger: 'exit_intent' | 'timer' | 'hybrid' | 'scroll'
  popup_delay_seconds: number
  popup_scroll_percentage: number
  popup_frequency_days: number
  popup_show_on_pages: string[]
  popup_discount_percentage: number
}

export default function NewsletterPopupWrapper() {
  const [settings, setSettings] = useState<PopupSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/newsletter/popup-settings')
        if (!response.ok) throw new Error('Failed to load popup settings')
        
        const data = await response.json()
        setSettings(data)
      } catch (error) {
        console.error('Error loading popup settings:', error)
        // Set defaults on error
        setSettings({
          popup_enabled: false,
          popup_trigger: 'hybrid',
          popup_delay_seconds: 20,
          popup_scroll_percentage: 50,
          popup_frequency_days: 7,
          popup_show_on_pages: ['home', 'shop', 'product'],
          popup_discount_percentage: 10
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  if (loading || !settings || !settings.popup_enabled) {
    return null
  }

  return (
    <NewsletterPopup
      enabled={settings.popup_enabled}
      trigger={settings.popup_trigger}
      delaySeconds={settings.popup_delay_seconds}
      scrollPercentage={settings.popup_scroll_percentage}
      frequencyDays={settings.popup_frequency_days}
      showOnPages={settings.popup_show_on_pages}
      discountPercentage={settings.popup_discount_percentage}
    />
  )
}

