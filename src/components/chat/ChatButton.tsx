'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatWindow from './ChatWindow'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

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

  // Hide if filter drawer is open or chat is open
  const shouldHideButton = isFilterDrawerOpen || isOpen

  return (
    <>
      {/* Floating Chat Button - Rond + Pulserend */}
      <AnimatePresence>
        {!shouldHideButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9997] w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-primary border-4 border-black hover:bg-black hover:border-brand-primary transition-all duration-300 flex items-center justify-center group chat-button-pulse"
            aria-label="Open chat"
          >
            <MessageCircle className="w-7 h-7 md:w-9 md:h-9 text-white group-hover:text-brand-primary transition-colors" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

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

