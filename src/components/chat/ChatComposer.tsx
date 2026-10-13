'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatComposerProps {
  onSend: (bericht: string) => void
  disabled?: boolean
  /** Suggesties alleen tonen zolang het gesprek nog niet begonnen is. */
  toonSuggesties: boolean
  onFocusInput?: () => void
  autoFocus?: boolean
}

const STARTERS = ['size', 'shipping', 'returns', 'material'] as const
const MAX_HOOGTE = 120

/**
 * De hele onderbalk: suggesties plus invoerveld.
 *
 * De suggesties stonden eerder tussen de berichten, met dezelfde witte vulling
 * en zwarte rand als een bericht. Daardoor leek een knop op een bericht en
 * andersom. Ze staan nu in de balk waar je typt, dus hun PLAATS zegt al dat
 * het bediening is, en ze hebben een grijze vulling zonder rand zodat ze nooit
 * met een bericht te verwarren zijn.
 *
 * Het veld zelf is het enige element in de chat met een zware rand. Dat is
 * bewust: het is het enige waar je iets moet invullen.
 */
export default function ChatComposer({
  onSend,
  disabled,
  toonSuggesties,
  onFocusInput,
  autoFocus,
}: ChatComposerProps) {
  const t = useTranslations('chat')
  const [bericht, setBericht] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Alleen scherpstellen op desktop. Op mobiel schoof het toetsenbord anders
  // meteen omhoog, waardoor van het net geopende gesprek een derde overbleef.
  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => inputRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [autoFocus])

  const groeiMee = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HOOGTE)}px`
  }

  const verstuur = () => {
    if (!bericht.trim() || disabled) return
    onSend(bericht)
    setBericht('')
    requestAnimationFrame(() => groeiMee(inputRef.current))
  }

  const bijToets = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      verstuur()
    }
  }

  const kanVersturen = Boolean(bericht.trim()) && !disabled

  return (
    <div className="flex-shrink-0 bg-white">
      {toonSuggesties && (
        <div className="px-3 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black/60">
            {t('starters.intro')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((key) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onSend(t(`starters.${key}`))}
                className="flex min-h-[40px] items-center bg-black/[0.06] px-3.5 py-2 text-left text-[13px] font-semibold leading-snug text-black md:text-[12px] transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(`starters.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={bericht}
          onChange={(e) => {
            setBericht(e.target.value)
            groeiMee(e.target)
          }}
          onKeyDown={bijToets}
          onFocus={() => onFocusInput?.()}
          disabled={disabled}
          placeholder={t('input.placeholder')}
          aria-label={t('input.placeholder')}
          // 16px op mobiel: Safari op iOS zoomt in op elk veld onder die maat.
          className="min-h-[44px] flex-1 resize-none border-2 border-black px-3 py-3 text-base leading-snug text-black placeholder:text-black/40 focus:border-brand-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-black/5 md:text-sm"
          style={{ maxHeight: MAX_HOOGTE }}
        />
        <button
          onClick={verstuur}
          disabled={!kanVersturen}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
            kanVersturen
              ? 'bg-brand-primary text-white hover:bg-black'
              : 'cursor-not-allowed bg-black/[0.08] text-black/30'
          }`}
          aria-label={t('input.sendAria')}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
