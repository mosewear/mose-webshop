'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import ChatTabs from './ChatTabs'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import TeamMoseTab from './TeamMoseTab'
import { usePathname } from 'next/navigation'

// Get session ID (reuse analytics session ID if available)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

interface ChatWindowProps {
  onClose: () => void
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
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
  const conversationIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string>(getSessionId())
  const greetingSavedRef = useRef<boolean>(false)

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

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string, metadata?: any) => {
    try {
      const response = await fetch('/api/chat/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationIdRef.current,
          sessionId: sessionIdRef.current,
          role,
          content,
          metadata: metadata || {},
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
          deviceType: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
          locale,
        }),
      })

      const data = await response.json()
      if (data.success && data.conversation_id) {
        conversationIdRef.current = data.conversation_id
      }
    } catch (error) {
      console.error('Error saving message:', error)
      // Don't fail chat if saving fails
    }
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

    const typingMessageId = (Date.now() + 2).toString()

    // Add the user message + a single assistant "typing" placeholder (WhatsApp-style)
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: typingMessageId,
        role: 'assistant',
        content: '',
        isTyping: true,
        timestamp: new Date(),
      },
    ])
    
    // Save user message to database
    await saveMessage('user', content.trim())
    
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
      let buffer = ''
      let hadStreamError = false

      // Read stream
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Process complete lines only; chunks may split mid-line.
          while (true) {
            const newlineIndex = buffer.indexOf('\n')
            if (newlineIndex === -1) break

            const rawLine = buffer.slice(0, newlineIndex).trimEnd()
            buffer = buffer.slice(newlineIndex + 1)

            if (!rawLine) continue

            // Vercel AI SDK data stream protocol:
            // 0: "text"
            // 3: {error...}
            if (rawLine.startsWith('0:')) {
              try {
                const text = JSON.parse(rawLine.slice(2))
                if (typeof text === 'string') {
                  aiContent += text
                }
              } catch {
                // Ignore malformed chunks
              }
            } else if (rawLine.startsWith('3:')) {
              hadStreamError = true
            }
          }
        }

        // Flush any remaining buffered text (if the stream doesn't end with newline)
        const tail = buffer.trim()
        if (tail.startsWith('0:')) {
          try {
            const text = JSON.parse(tail.slice(2))
            if (typeof text === 'string') {
              aiContent += text
            }
          } catch {
            // ignore
          }
        }

        // If the stream ended but we received no content, show a friendly fallback.
        if (!aiContent.trim()) {
          aiContent = hadStreamError ? t('aiOffline') : t('aiOffline')
        }

        // Replace the typing bubble with the final answer (no word-by-word updates).
        const finalAnswer = aiContent.trim() || t('aiOffline')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingMessageId
              ? { ...m, content: finalAnswer, isTyping: false }
              : m
          )
        )

        // Save AI response to database after the full message is ready
        await saveMessage('assistant', finalAnswer)
      }
    } catch (error) {
      console.error('[Chat Error]:', error)
      
      // Replace typing bubble with friendly error message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingMessageId
            ? { ...m, content: t('aiOffline'), isTyping: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Save greeting message when chat opens
  useEffect(() => {
    if (!greetingSavedRef.current) {
      greetingSavedRef.current = true
      saveMessage('assistant', t('greeting'))
    }
  }, [])

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
              <ChatMessages messages={messages} />
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
              <ChatMessages messages={messages} />
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

