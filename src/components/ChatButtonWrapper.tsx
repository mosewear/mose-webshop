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

  /**
   * Waar de chat wél en niet hoort.
   *
   * De productpagina en de winkelwagen stonden hier op verbergen, omdat de
   * zwevende knop daar over de vaste koopbalk viel en taps opving die voor
   * "afrekenen" bedoeld waren. Dat probleem was echt, maar de oplossing kostte
   * meer dan hij opleverde: de productpagina is precies waar de maatvraag
   * ontstaat, en "welke maat heb ik" is de eerste vraag die de chat zelf
   * aanbiedt. De knop was weg op de twee pagina's waar hij het meeste waard is.
   *
   * De knop schuift nu zelf boven elke vaste balk met `data-onderbalk`, dus hij
   * kan daar gewoon staan.
   *
   * Afrekenen en betalen blijven wél vrij. Wie daar is, heeft de keuze gemaakt;
   * een zwevende laag over een formulier met adresvelden en een betaalknop
   * levert daar vooral misklikken op. Hulp staat daar in de voettekst.
   */
  useEffect(() => {
    const verbergen =
      Boolean(pathname?.includes('/admin')) ||
      Boolean(pathname?.includes('/checkout')) ||
      Boolean(pathname?.includes('/payment'))
    setShouldHide(verbergen)
  }, [pathname])

  // Don't render while loading, if disabled, or if should hide
  if (isLoading || !isEnabled || shouldHide) return null

  return <ChatButton />
}

