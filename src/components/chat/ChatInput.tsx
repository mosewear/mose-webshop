'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const t = useTranslations('chat.input')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus input when component mounts
  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-shrink-0 border-t-4 border-black p-4 bg-white">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          placeholder={t('placeholder')}
          className="flex-1 px-4 py-3 border-2 border-black focus:outline-none focus:border-brand-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="px-6 py-3 bg-brand-primary text-white border-2 border-black hover:bg-brand-primary-hover disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-display uppercase text-sm tracking-wide"
          aria-label={t('sendAria')}
        >
          <Send className="w-4 h-4" strokeWidth={2.5} />
          <span className="hidden md:inline">{t('send')}</span>
        </button>
      </div>
    </div>
  )
}

