'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatWindow from './ChatWindow'
import { trackEvent } from '@/lib/analytics'

const GEOPEND_KEY = 'mose_chat_opened'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [magPulseren, setMagPulseren] = useState(false)
  const knopRef = useRef<HTMLButtonElement>(null)

  // Eén MutationObserver voor alle drawer-detecties: één DOM-traversal
  // per mutatie i.p.v. drie aparte observers. Een gewijzigd attribute
  // (zoals het MobileMenu dat data-mobile-menu="open|closed" toggle't
  // zonder unmount) telt óók als mutation, dus we kijken expliciet
  // naar attribute-changes naast childList.
  useEffect(() => {
    const checkAllDrawers = () => {
      setIsFilterDrawerOpen(!!document.querySelector('[data-filter-drawer]'))
      setIsCartDrawerOpen(!!document.querySelector('[data-cart-drawer]'))
      // Mobile menu staat permanent in de DOM (translate off-canvas),
      // dus we checken op de attribuut-WAARDE i.p.v. enkel presence.
      setIsMobileMenuOpen(
        !!document.querySelector('[data-mobile-menu="open"]')
      )
    }

    checkAllDrawers()
    const observer = new MutationObserver(checkAllDrawers)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-mobile-menu'],
    })

    return () => observer.disconnect()
  }, [])

  // De knop pulseerde onafgebroken, bij elke bezoeker, op elke pagina. Nu alleen
  // zolang iemand de chat in deze sessie nog niet heeft geopend: wie hem al kent
  // hoeft er niet opnieuw naartoe getrokken te worden.
  useEffect(() => {
    try {
      setMagPulseren(sessionStorage.getItem(GEOPEND_KEY) !== '1')
    } catch {
      setMagPulseren(true)
    }
  }, [])

  // Verberg de chat-knop wanneer een full-screen overlay open staat
  // (filter-drawer, cart-drawer, of mobile-menu). De chat-bubble heeft
  // z-[9999] en zou anders door alle drawers heen prikken.
  const shouldHideButton = isFilterDrawerOpen || isCartDrawerOpen || isMobileMenuOpen

  const handleToggle = () => {
    const wasOpen = isOpen
    setIsOpen(!wasOpen)

    if (!wasOpen) {
      setMagPulseren(false)
      try {
        sessionStorage.setItem(GEOPEND_KEY, '1')
      } catch {
        // Opslag geblokkeerd: dan pulseert hij de volgende sessie weer.
      }
    }

    trackEvent({
      event_name: wasOpen ? 'chat_closed' : 'chat_opened',
      properties: {
        source: 'chat_button',
        page_url: window.location.href,
      },
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    // Focus terug naar de knop waar hij vandaan kwam. Zonder dit valt de focus
    // bij het sluiten terug naar het begin van de pagina.
    requestAnimationFrame(() => knopRef.current?.focus())
  }

  return (
    <>
      {/* Zwevende chatknop.
          Was een ronde bubbel van 64/80px met een rand van 4px en een
          pulsering in rgba(180, 255, 57) — fel limoengroen uit een oud palet,
          niet het merkgroen #00A676. Hij week daarmee op twee manieren af van
          de rest van de shop, die overal rechte hoeken en randen van 2px
          gebruikt. Nu een vierkante knop in merkgroen, zelfde taal als elke
          andere knop op de site. */}
      {!shouldHideButton && (
        <button
          ref={knopRef}
          onClick={handleToggle}
          className={`fixed bottom-[calc(1.5rem+var(--cookie-consent-height))] right-4 z-[9999] flex h-14 w-14 items-center justify-center border-2 border-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 md:right-6 md:h-16 md:w-16 ${
            isOpen
              ? 'hidden bg-black text-brand-primary md:flex'
              : `bg-brand-primary text-white hover:bg-black hover:text-brand-primary ${magPulseren ? 'chat-button-pulse' : ''}`
          }`}
          aria-label={isOpen ? 'Sluit chat' : 'Open chat'}
          aria-expanded={isOpen}
          aria-controls="chat-window"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6 md:h-7 md:w-7" strokeWidth={3} />
              </motion.span>
            ) : (
              <motion.span
                key="chat"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
              >
                <MessageSquare className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={handleClose} />}
      </AnimatePresence>

      {/* Pulsering in merkgroen, vierkant zoals de knop zelf. Staat uit zodra
          iemand de chat heeft geopend en bij `prefers-reduced-motion`. */}
      <style jsx global>{`
        @keyframes chat-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(0, 166, 118, 0.55);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(0, 166, 118, 0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .chat-button-pulse {
            animation: chat-pulse 2.4s ease-in-out infinite;
          }
        }

        .chat-button-pulse:hover {
          animation: none;
        }
      `}</style>
    </>
  )
}
