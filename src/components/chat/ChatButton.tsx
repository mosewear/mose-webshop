'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatWindow from './ChatWindow'
import { trackEvent } from '@/lib/analytics'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  // Verberg de chat-knop wanneer een full-screen overlay open staat
  // (filter-drawer, cart-drawer, of mobile-menu). De chat-bubble heeft
  // z-[9999] en zou anders door alle drawers heen prikken.
  const shouldHideButton = isFilterDrawerOpen || isCartDrawerOpen || isMobileMenuOpen

  return (
    <>
      {/* Floating Chat Button - Rond + Pulserend + Icon Animatie */}
      {!shouldHideButton && (
        <motion.button
          onClick={() => {
            const wasOpen = isOpen
            setIsOpen(!isOpen)
            
            // Track chat click
            if (!wasOpen) {
              // Chat opened
              trackEvent({
                event_name: 'chat_opened',
                properties: {
                  source: 'chat_button',
                  page_url: window.location.href,
                },
              })
            } else {
              // Chat closed
              trackEvent({
                event_name: 'chat_closed',
                properties: {
                  source: 'chat_button',
                  page_url: window.location.href,
                },
              })
            }
          }}
          className={`fixed bottom-6 right-6 z-[9999] w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-black transition-all duration-300 flex items-center justify-center group ${
            isOpen 
              ? 'hidden md:flex bg-black border-brand-primary' 
              : 'bg-brand-primary chat-button-pulse md:hover:bg-black md:hover:border-brand-primary'
          }`}
          aria-label={isOpen ? 'Sluit chat' : 'Open chat'}
          animate={{ 
            scale: isOpen ? 1 : 1,
            rotate: isOpen ? 90 : 0 
          }}
          transition={{ 
            duration: 0.3,
            ease: 'easeInOut'
          }}
        >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7 md:w-9 md:h-9 text-brand-primary" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-7 h-7 md:w-9 md:h-9 text-white md:group-hover:text-brand-primary transition-colors" strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      </AnimatePresence>

      {/* Pulse Animation CSS */}
      <style jsx global>{`
        @keyframes chat-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(180, 255, 57, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(180, 255, 57, 0);
          }
        }

        .chat-button-pulse {
          animation: chat-pulse 2s ease-in-out infinite;
        }

        .chat-button-pulse:hover {
          animation: none;
        }
      `}</style>
    </>
  )
}

