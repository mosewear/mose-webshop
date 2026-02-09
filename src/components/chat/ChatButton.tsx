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

  // Listen for filter drawer state (detect by checking if element exists)
  useEffect(() => {
    const checkFilterDrawer = () => {
      const filterDrawer = document.querySelector('[data-filter-drawer]')
      setIsFilterDrawerOpen(!!filterDrawer)
    }

    // Check on mount and when DOM changes
    checkFilterDrawer()
    const observer = new MutationObserver(checkFilterDrawer)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  // Listen for cart drawer state
  useEffect(() => {
    const checkCartDrawer = () => {
      const cartDrawer = document.querySelector('[data-cart-drawer]')
      setIsCartDrawerOpen(!!cartDrawer)
    }

    // Check on mount and when DOM changes
    checkCartDrawer()
    const observer = new MutationObserver(checkCartDrawer)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  // Hide button on mobile when chat is open, but always show on desktop
  // Also hide when filter or cart drawer is open
  const shouldHideButton = isFilterDrawerOpen || isCartDrawerOpen

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

