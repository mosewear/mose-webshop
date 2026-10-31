'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatComposer from './ChatComposer'
import ChatContact from './ChatContact'

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
 * Zonder dit begon de chat bij elke heropening weer bij de begroeting, precies
 * op het moment waarop het misgaat: iemand sluit de chat om zijn ordernummer op
 * te zoeken, komt terug, en moet zijn hele vraag opnieuw typen.
 */
function leesDraad(locale: string): BewaardeDraad | null {
  if (typeof window === 'undefined') return null
  try {
    const rauw = sessionStorage.getItem(`${THREAD_KEY}_${locale}`)
    if (!rauw) return null
    const draad = JSON.parse(rauw) as BewaardeDraad
    if (!Array.isArray(draad.messages) || draad.messages.length === 0) return null
    return draad
  } catch {
    return null
  }
}

/** Het paneel wordt pas aangemaakt na een klik, dus `window` bestaat hier. */
function isMobielScherm(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const [weergave, setWeergave] = useState<'gesprek' | 'contact'>('gesprek')
  const portalEl = typeof document !== 'undefined' ? document.body : null
  const panelRef = useRef<HTMLDivElement>(null)
  const beperkteBeweging = useReducedMotion()

  // Bij de EERSTE render al bekend, niet pas na een effect. De openingsanimatie
  // verschilt per scherm (blad omhoog op mobiel, groeien uit de knop op
  // desktop) en moet dus goed staan vanaf het eerste beeldje.
  const [isMobile, setIsMobile] = useState(isMobielScherm)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const bij = () => setIsMobile(mq.matches)
    mq.addEventListener('change', bij)
    return () => mq.removeEventListener('change', bij)
  }, [])

  const [keyboardOffsetPx, setKeyboardOffsetPx] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const vv = window.visualViewport
    const innerH = window.innerHeight
    const vvH = vv?.height ?? innerH
    const vvTop = vv?.offsetTop ?? 0
    return Math.max(0, Math.round(innerH - vvH - vvTop))
  })
  const updateKeyboardOffsetRef = useRef<() => void>(() => {})

  const hersteld = useRef<BewaardeDraad | null>(leesDraad(locale))
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
    return [{ id: '1', role: 'assistant', content: t('greeting'), timestamp: new Date() }]
  })
  const [isLoading, setIsLoading] = useState(false)
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
          .map((m) => ({ id: m.id, role: m.role, content: m.content, ts: m.timestamp.toISOString() })),
      }
      sessionStorage.setItem(`${THREAD_KEY}_${locale}`, JSON.stringify(draad))
    } catch {
      // Opslag vol of geblokkeerd: de chat werkt verder gewoon, alleen zonder
      // geheugen. Geen reden om het gesprek te laten klappen.
    }
  }, [messages, locale])

  // Get context for AI
  const getContext = () => {
    const context: Record<string, unknown> = { locale }

    if (pathname?.includes('/product/')) {
      const slug = pathname.split('/product/')[1]
      if (slug) context.product = { slug }
    }

    if (typeof window !== 'undefined') {
      try {
        const cartData = localStorage.getItem('mose-cart')
        if (cartData) {
          const cart = JSON.parse(cartData) as Array<{ price: number; quantity: number }>
          const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
          context.cart = { items: cart.length, total: total.toFixed(2) }
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const typingMessageId = (Date.now() + 2).toString()

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: typingMessageId, role: 'assistant', content: '', isTyping: true, timestamp: new Date() },
    ])

    await saveMessage('user', content.trim())

    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          context: getContext(),
        }),
      })

      if (!response.ok) {
        throw new Error('AI response failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''
      let buffer = ''

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

            // Vercel AI SDK data stream protocol: 0 = text, 3 = error
            if (rawLine.startsWith('0:')) {
              try {
                const text = JSON.parse(rawLine.slice(2))
                if (typeof text === 'string') aiContent += text
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        }

        const tail = buffer.trim()
        if (tail.startsWith('0:')) {
          try {
            const text = JSON.parse(tail.slice(2))
            if (typeof text === 'string') aiContent += text
          } catch {
            // ignore
          }
        }

        const finalAnswer = aiContent.trim() || t('aiOffline')
        setMessages((prev) =>
          prev.map((m) => (m.id === typingMessageId ? { ...m, content: finalAnswer, isTyping: false } : m))
        )

        await saveMessage('assistant', finalAnswer)
      }
    } catch (error) {
      console.error('[Chat Error]:', error)
      setMessages((prev) =>
        prev.map((m) => (m.id === typingMessageId ? { ...m, content: t('aiOffline'), isTyping: false } : m))
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

  // Escape sluit het paneel, of gaat eerst terug van het contactblad.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (weergave === 'contact') setWeergave('gesprek')
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, weergave])

  // On mobile Safari, `overflow: hidden` alone is not a reliable scroll lock
  // (especially with the keyboard). We fix the body in place and restore the
  // scroll position on close.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 767px)').matches) return

    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY

    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscroll: html.style.overscrollBehaviorY,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    html.style.overscrollBehaviorY = 'none'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      html.style.overscrollBehaviorY = prev.overscroll
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Focus vasthouden zolang het paneel het hele scherm vult. Op desktop juist
  // niet: daar mag je verder bladeren terwijl de chat openstaat, en dat is
  // precies waarvoor je hem gebruikt ("past deze hoodie mij?").
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

  // Het paneel blijft het volle scherm vullen; alleen de onderkant schuift mee
  // met de hoogte van het toetsenbord.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 767px)').matches) return

    const vv = window.visualViewport

    const update = () => {
      const innerH = window.innerHeight
      const vvH = vv?.height ?? innerH
      const vvTop = vv?.offsetTop ?? 0
      setKeyboardOffsetPx(Math.max(0, Math.round(innerH - vvH - vvTop)))
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

  // Vegen om te sluiten, maar alleen vanaf de kop. Het luisterde in een eerdere
  // versie op het hele paneel: wie een lang antwoord teruglas en van boven naar
  // beneden veegde terwijl de lijst al bovenaan stond, gooide zijn gesprek dicht.
  const veegStartRef = useRef<number | null>(null)
  const bijVeegStart = (e: React.TouchEvent) => {
    veegStartRef.current = e.touches[0].clientY
  }
  const bijVegen = (e: React.TouchEvent) => {
    if (veegStartRef.current === null) return
    if (e.touches[0].clientY - veegStartRef.current > 80) {
      veegStartRef.current = null
      onClose()
    }
  }

  const handleInputFocus = () => {
    // VisualViewport-events komen op iOS soms een tel later. Dit forceert een
    // snelle hermeting.
    updateKeyboardOffsetRef.current?.()
    requestAnimationFrame(() => updateKeyboardOffsetRef.current?.())
  }

  /**
   * Openen en sluiten.
   *
   * Op mobiel was dit een fade met een verschuiving van 24px: een vol scherm
   * dat ter plekke oplicht en weer uitgaat, zonder richting. Het is nu een blad
   * dat van onderaf omhoog komt en langs dezelfde weg weer verdwijnt, met een
   * veer die stevig genoeg staat om niet na te wiebelen.
   *
   * Op desktop groeit het paneel uit de hoek waar de knop staat, zodat de
   * herkomst klopt. Bij `prefers-reduced-motion` blijft alleen een korte fade
   * over.
   */
  const varianten = beperkteBeweging
    ? { verborgen: { opacity: 0 }, zichtbaar: { opacity: 1 } }
    : isMobile
      ? { verborgen: { y: '100%' }, zichtbaar: { y: 0 } }
      : { verborgen: { opacity: 0, scale: 0.96, y: 8 }, zichtbaar: { opacity: 1, scale: 1, y: 0 } }

  const overgang = beperkteBeweging
    ? { duration: 0.15 }
    : isMobile
      ? { type: 'spring' as const, damping: 34, stiffness: 330, mass: 0.85 }
      : { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }

  const ui = (
    <motion.div
      ref={panelRef}
      id="chat-window"
      role="dialog"
      aria-modal={isMobile || undefined}
      aria-label={t('title')}
      variants={varianten}
      initial="verborgen"
      animate="zichtbaar"
      exit="verborgen"
      transition={overgang}
      style={{ transformOrigin: 'bottom right' }}
      className="fixed inset-0 z-[9998] flex flex-col overflow-hidden overscroll-none bg-white md:inset-auto md:bottom-[calc(6.5rem+var(--cookie-consent-height))] md:right-6 md:h-[620px] md:max-h-[calc(100vh-10rem)] md:w-[396px] md:border-2 md:border-black"
    >
      <div onTouchStart={bijVeegStart} onTouchMove={bijVegen}>
        <ChatHeader
          weergave={weergave}
          onClose={onClose}
          onNaarContact={() => setWeergave('contact')}
          onTerug={() => setWeergave('gesprek')}
        />
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <ChatMessages messages={messages} />

        <div
          style={{
            paddingBottom: isMobile
              ? `calc(env(safe-area-inset-bottom) + ${keyboardOffsetPx}px)`
              : undefined,
          }}
        >
          <ChatComposer
            onSend={handleSendMessage}
            disabled={isLoading}
            toonSuggesties={!messages.some((m) => m.role === 'user')}
            onFocusInput={handleInputFocus}
            autoFocus={!isMobile}
          />
        </div>

        {/* Contactblad schuift over het gesprek heen, met een pijl terug in de
            kop. Zo blijft er altijd maar één taak op het scherm. */}
        <AnimatePresence>
          {weergave === 'contact' && (
            <motion.div
              initial={beperkteBeweging ? { opacity: 0 } : { x: '100%' }}
              animate={beperkteBeweging ? { opacity: 1 } : { x: 0 }}
              exit={beperkteBeweging ? { opacity: 0 } : { x: '100%' }}
              transition={beperkteBeweging ? { duration: 0.15 } : { type: 'spring', damping: 34, stiffness: 340, mass: 0.8 }}
              className="absolute inset-0 flex flex-col bg-white"
              style={{
                paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
              }}
            >
              <ChatContact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )

  // Als portal zodat transforms of stacking contexts hogerop het paneel niet
  // kunnen beïnvloeden.
  return portalEl ? createPortal(ui, portalEl) : ui
}
