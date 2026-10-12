'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  onFocusInput?: () => void
}

const MAX_HOOGTE = 120

/**
 * Invoerveld van de chat.
 *
 * Vier dingen veranderd ten opzichte van de vorige versie:
 *
 *  1. Een `textarea` die meegroeit in plaats van een `input` van één regel. Een
 *     vraag als "ik ben 1.85m en 80kg en twijfel tussen M en L" schoof in het
 *     oude veld links uit beeld terwijl je typte.
 *  2. De verstuurknop had het woord VERSTUUR erin staan en at daarmee 174 van
 *     de 400px van het paneel op; er bleef 226px over om in te typen. Nu een
 *     vierkante knop van 44px, het label blijft als aria-label bestaan.
 *  3. `onKeyPress` was verouderd en is vervangen door `onKeyDown`. Shift+Enter
 *     maakt nu een nieuwe regel, Enter verstuurt.
 *  4. Het veld stond op text-sm (14px). Safari op iOS zoomt bij focus in op elk
 *     veld onder de 16px, waarna de hele pagina scheef staat. Op mobiel dus
 *     16px, op desktop 14px.
 */
export default function ChatInput({ onSend, disabled, onFocusInput }: ChatInputProps) {
  const t = useTranslations('chat.input')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Alleen scherpstellen op desktop. Op mobiel schoof het toetsenbord meteen
  // omhoog, waardoor van het net geopende gesprek nog een derde zichtbaar was.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(min-width: 768px)').matches) return
    const timer = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(timer)
  }, [])

  const groeiMee = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HOOGTE)}px`
  }

  const handleSend = () => {
    if (!message.trim() || disabled) return
    onSend(message)
    setMessage('')
    requestAnimationFrame(() => groeiMee(inputRef.current))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const kanVersturen = Boolean(message.trim()) && !disabled

  return (
    <div className="flex-shrink-0 border-t-2 border-black bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            groeiMee(e.target)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusInput?.()}
          disabled={disabled}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="min-h-[44px] flex-1 resize-none border-2 border-black px-3 py-3 text-base leading-snug text-black placeholder:text-gray-500 focus:border-brand-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 md:text-sm"
          style={{ maxHeight: MAX_HOOGTE }}
        />
        <button
          onClick={handleSend}
          disabled={!kanVersturen}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
            kanVersturen
              ? 'border-black bg-black text-white hover:border-brand-primary hover:bg-brand-primary'
              : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400'
          }`}
          aria-label={t('sendAria')}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>
      <p className="mt-2 hidden text-[10px] uppercase tracking-[0.14em] text-gray-500 md:block">
        {t('hint')}
      </p>
    </div>
  )
}
