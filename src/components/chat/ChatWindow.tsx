'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import ChatTabs from './ChatTabs'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import TeamMoseTab from './TeamMoseTab'
import { usePathname } from 'next/navigation'

interface ChatWindowProps {
  onClose: () => void
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const t = useTranslations('chat')
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('greeting'),
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const locale = useLocale()
  const pathname = usePathname()

  // Get context for AI
  const getContext = () => {
    const context: any = { locale }

    // Check if on product page
    if (pathname?.includes('/product/')) {
      const slug = pathname.split('/product/')[1]
      if (slug) {
        context.product = { slug }
      }
    }

    // Get cart from localStorage (if available)
    if (typeof window !== 'undefined') {
      try {
        const cartData = localStorage.getItem('mose-cart')
        if (cartData) {
          const cart = JSON.parse(cartData)
          const total = cart.reduce((sum: number, item: any) => {
            return sum + (item.price * item.quantity)
          }, 0)
          context.cart = {
            items: cart.length,
            total: total.toFixed(2),
          }
        }
      } catch (e) {
        // Ignore cart errors
      }
    }

    return context
  }

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Call AI API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: getContext(),
        }),
      })

      if (!response.ok) {
        throw new Error('AI response failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''

      // Create AI message placeholder
      const aiMessageId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ])

      // Read stream
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              const text = line.slice(3, -1) // Remove '0:"' and '"'
              aiContent += text
              
              // Update AI message in real-time
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId
                    ? { ...m, content: aiContent }
                    : m
                )
              )
            }
          }
        }
      }
    } catch (error) {
      console.error('[Chat Error]:', error)
      
      // Add friendly error message (AI not yet configured)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: t('aiOffline'),
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Disable body scroll when chat is open (mobile)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [])

  // Handle swipe down to close (mobile)
  useEffect(() => {
    let startY = 0
    let currentY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY
      const diff = currentY - startY

      // Only close if swiping down from top
      if (diff > 100 && window.scrollY === 0) {
        onClose()
      }
    }

    const chatElement = document.getElementById('chat-window')
    if (chatElement) {
      chatElement.addEventListener('touchstart', handleTouchStart)
      chatElement.addEventListener('touchmove', handleTouchMove)

      return () => {
        chatElement.removeEventListener('touchstart', handleTouchStart)
        chatElement.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [onClose])

  return (
    <>
      {/* Overlay - Desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="hidden md:block fixed inset-0 bg-black/30 z-[9997]"
        onClick={onClose}
      />

      {/* Mobile: Fullscreen */}
      <motion.div
        id="chat-window"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[9998] bg-white flex flex-col md:hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b-2 border-black px-4 py-4 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-brand-primary border-2 border-black" />
            <h2 className="font-display text-xl uppercase tracking-wide">{t('title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-black hover:bg-gray-100 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'ai' ? (
            <>
              <ChatMessages messages={messages} isLoading={isLoading} />
              <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </>
          ) : (
            <TeamMoseTab />
          )}
        </div>
      </motion.div>

      {/* Desktop: Window - MOSE Brutalist Style (no shadow) */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden md:flex fixed bottom-24 right-6 z-[9998] w-[400px] h-[600px] max-h-[80vh] bg-white border-2 border-black flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b-2 border-black px-4 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-primary border-2 border-black" />
            <h2 className="font-display text-lg uppercase tracking-wide">{t('title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'ai' ? (
            <>
              <ChatMessages messages={messages} isLoading={isLoading} />
              <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </>
          ) : (
            <TeamMoseTab />
          )}
        </div>
      </motion.div>
    </>
  )
}

