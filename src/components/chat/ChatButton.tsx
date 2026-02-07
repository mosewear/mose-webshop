'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
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
      {/* Floating Action Button - MOSE Brutalist Style */}
      <AnimatePresence>
        {!shouldHideButton && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9997] w-16 h-16 bg-brand-primary border-4 border-black hover:bg-brand-primary-hover transition-colors flex items-center justify-center group"
            aria-label="Open chat"
          >
            <MessageCircle className="w-7 h-7 text-black" strokeWidth={2.5} />
          </button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

