'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import ChatWindow from './ChatWindow'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button - MOSE Brutalist Style */}
      <AnimatePresence>
        {!isOpen && (
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

