'use client'

import Image from 'next/image'

/**
 * Gezicht van MOSE in de chat.
 *
 * Een gesprek zonder afzender voelt als een formulier. Eén herkenbaar vierkant
 * naast elk antwoord maakt er een gesprek van, zoals je dat uit WhatsApp kent.
 *
 * Bewust GEEN verzonnen gezicht. Een met AI gemaakte foto van een medewerker
 * die niet bestaat, zet de klant op het verkeerde been: die gaat ervan uit dat
 * er een bepaald iemand meeleest. Dit is het merkteken, hard en vierkant zoals
 * de rest van de winkel. Komt er een echte foto van Irma of Rick, dan vervangt
 * die dit bestand en verandert er verder niets.
 */

interface ChatAvatarProps {
  /** Rand in pixels. 40 in de kop, 32 naast een bericht. */
  maat?: number
  className?: string
}

export default function ChatAvatar({ maat = 32, className = '' }: ChatAvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{ width: maat, height: maat }}
      className={`relative block flex-shrink-0 select-none overflow-hidden bg-brand-primary ${className}`}
    >
      <Image
        src="/chat-avatar.png"
        alt=""
        fill
        sizes={`${maat}px`}
        className="object-cover"
        priority
      />
    </span>
  )
}
