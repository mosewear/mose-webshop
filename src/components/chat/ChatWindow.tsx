'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import ChatHeader from './ChatHeader'
import ChatTabs from './ChatTabs'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import TeamMoseTab from './TeamMoseTab'

const THREAD_KEY = 'mose_chat_thread'

// Get session ID (reuse analytics session ID if available)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
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

type BewaardBericht = { id: string; role: 'user' | 'assistant'; content: string; ts: string }
type BewaardeDraad = { conversationId: string | null; messages: BewaardBericht[] }

/**
 * Leest het lopende gesprek terug uit sessionStorage.
 *
 * Zonder dit begon de chat bij elke heropening weer bij de begroeting. Dat is
 * precies het moment waarop het misgaat: iemand sluit de chat om zijn
 * ordernummer op te zoeken, komt terug, en moet zijn hele vraag opnieuw typen.
 * De draad leeft zolang het tabblad leeft, net als de analytics-sessie.
 */
function leesDraad(): BewaardeDraad | null {
  if (typeof window === 'undefined') return null
  try {
    const rauw = sessionStorage.getItem(THREAD_KEY)
    if (!rauw) return null
    const draad = JSON.parse(rauw) as BewaardeDraad
    if (!Array.isArray(draad.messages) || draad.messages.length === 0) return null
    return draad
  } catch {
    return null
  }
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const t = useTranslations('chat')
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai')
  const portalEl = typeof document !== 'undefined' ? document.body : null
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardOffsetPx, setKeyboardOffsetPx] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const vv = window.visualViewport
    const innerH = window.innerHeight
    const vvH = vv?.height ?? innerH
    const vvTop = vv?.offsetTop ?? 0
    return Math.max(0, Math.round(innerH - vvH - vvTop))
  })
  const updateKeyboardOffsetRef = useRef<() => void>(() => {})

  const hersteld = useRef<BewaardeDraad | null>(leesDraad())
  const [messages, setMessages] = useState<Message[]>(() => {
    const draad = hersteld.current
    if (draad) {
      return draad.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.ts),
      }))
    }
    return [
      {
        id: '1',
        role: 'assistant',
        content: t('greeting'),
        timestamp: new Date(),
      },
    ]
  })
  const [isLoading, setIsLoading] = useState(false)
  const locale = useLocale()
  const pathname = usePathname()
  const conversationIdRef = useRef<string | null>(hersteld.current?.conversationId ?? null)
  const sessionIdRef = useRef<string>(getSessionId())
  const greetingSavedRef = useRef<boolean>(Boolean(hersteld.current))

  // Bewaar de draad bij elke wijziging. Het typ-ballonnetje slaan we over: dat
  // is een tijdelijke weergave, geen bericht.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const draad: BewaardeDraad = {
        conversationId: conversationIdRef.current,
        messages: messages
          .filter((m) => !m.isTyping)
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            ts: m.timestamp.toISOString(),
          })),
      }
      sessionStorage.setItem(THREAD_KEY, JSON.stringify(draad))
    } catch {
      // Opslag vol of geblokkeerd: de chat werkt verder gewoon, alleen zonder
      // geheugen. Geen reden om het gesprek te laten klappen.
    }
  }, [messages])

  // Get context for AI
  const getContext = () => {
    const context: Record<string, unknown> = { locale }

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
          const cart = JSON.parse(cartData) as Array<{ price: number; quantity: number }>
          const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
          context.cart = {
            items: cart.length,
            total: total.toFixed(2),
          }
        }
      } catch {
        // Ignore cart errors
      }
    }

    return context
  }

  // Save message to database
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const response = await fetch('/api/chat/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationIdRef.current,
          sessionId: sessionIdRef.current,
          role,
          content,
          metadata: {},
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

  // Save greeting message when chat opens. Bij een herstelde draad staat de
  // begroeting al in de database, dus die slaan we niet nog een keer op.
  useEffect(() => {
    if (!greetingSavedRef.current) {
      greetingSavedRef.current = true
      saveMessage('assistant', t('greeting'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape sluit het paneel. Stond er niet, terwijl dit op desktop de snelste
  // manier is om een overlay weg te krijgen.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // On mobile Safari, `overflow: hidden` alone is not a reliable scroll lock (especially with the keyboard).
  // We lock scroll by fixing the body in place and restoring scroll position on close.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mobiel = window.matchMedia('(max-width: 767px)').matches
    setIsMobile(mobiel)
    if (!mobiel) return

    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY

    const prev = {
      body: {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
      },
      html: {
        overscrollBehaviorY: html.style.overscrollBehaviorY,
      },
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    html.style.overscrollBehaviorY = 'none'

    return () => {
      body.style.position = prev.body.position
      body.style.top = prev.body.top
      body.style.left = prev.body.left
      body.style.right = prev.body.right
      body.style.width = prev.body.width
      body.style.overflow = prev.body.overflow
      html.style.overscrollBehaviorY = prev.html.overscrollBehaviorY
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Focus vasthouden zolang het paneel het hele scherm vult. Op desktop juist
  // niet: daar mag je gewoon verder bladeren terwijl de chat openstaat, en dat
  // is precies waarvoor je hem gebruikt ("past deze hoodie mij?").
  useEffect(() => {
    if (!isMobile) return
    const panel = panelRef.current
    if (!panel) return

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusbaar = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (focusbaar.length === 0) return
      const eerste = focusbaar[0]
      const laatste = focusbaar[focusbaar.length - 1]
      if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }

    panel.addEventListener('keydown', onKey)
    return () => panel.removeEventListener('keydown', onKey)
  }, [isMobile])

  // Industry-standard approach for mobile modals:
  // keep the overlay fullscreen (`fixed inset-0`) and only offset the bottom area by keyboard height.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const mobiel = window.matchMedia('(max-width: 767px)').matches
    if (!mobiel) return

    const vv = window.visualViewport

    const update = () => {
      const innerH = window.innerHeight
      const vvH = vv?.height ?? innerH
      const vvTop = vv?.offsetTop ?? 0
      const next = Math.max(0, Math.round(innerH - vvH - vvTop))
      setKeyboardOffsetPx(next)
    }

    updateKeyboardOffsetRef.current = update

    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Vegen om te sluiten, maar alleen vanaf de kop. Het luisterde eerder op het
  // hele paneel: wie een lang antwoord teruglas en van boven naar beneden
  // veegde terwijl de lijst al bovenaan stond, gooide zijn gesprek dicht.
  const swipeStartRef = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartRef.current = e.touches[0].clientY
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartRef.current === null) return
    if (e.touches[0].clientY - swipeStartRef.current > 90) {
      swipeStartRef.current = null
      onClose()
    }
  }

  const handleInputFocus = () => {
    // VisualViewport events sometimes arrive a tick later on iOS. This forces a fast re-measure.
    updateKeyboardOffsetRef.current?.()
    requestAnimationFrame(() => updateKeyboardOffsetRef.current?.())
  }

  const ui = (
    <motion.div
      ref={panelRef}
      id="chat-window"
      role="dialog"
      aria-modal={isMobile || undefined}
      aria-label={t('title')}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="fixed inset-0 z-[9998] flex flex-col overscroll-none bg-white md:inset-auto md:bottom-[calc(6.5rem+var(--cookie-consent-height))] md:right-6 md:h-[640px] md:max-h-[calc(100vh-10rem)] md:w-[400px] md:border-2 md:border-black"
    >
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <ChatHeader onClose={onClose} />
      </div>

      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === 'ai' ? (
          <div
            id="chat-panel-ai"
            role="tabpanel"
            aria-labelledby="chat-tab-ai"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ChatMessages
              messages={messages}
              onPickStarter={handleSendMessage}
              isLoading={isLoading}
            />
            <div
              className="flex-shrink-0"
              style={{
                paddingBottom: isMobile
                  ? `calc(env(safe-area-inset-bottom) + ${keyboardOffsetPx}px)`
                  : undefined,
              }}
            >
              <ChatInput onSend={handleSendMessage} disabled={isLoading} onFocusInput={handleInputFocus} />
            </div>
          </div>
        ) : (
          <div
            id="chat-panel-team"
            role="tabpanel"
            aria-labelledby="chat-tab-team"
            className="flex flex-1 flex-col overflow-hidden"
            style={{
              paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
            }}
          >
            <TeamMoseTab />
          </div>
        )}
      </div>
    </motion.div>
  )

  // Render as a portal so the modal isn't affected by transforms/stacking contexts higher up the tree.
  return portalEl ? createPortal(ui, portalEl) : ui
}
