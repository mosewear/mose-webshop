'use client'

/**
 * Tiny shipping reassurance shown DIRECTLY under the [quantity + ATC]
 * row on mobile. Mirrors the time-aware logic from PdpTrustStrip so the
 * promise we make ("morgen in huis") flips automatically after the
 * 17:00 NL cutoff to "overmorgen". On desktop the larger trust-strip
 * already covers this, so this strip is hidden via `md:hidden` at the
 * call site.
 */

import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'

const SHIPPING_CUTOFF_HOUR = 17 // local Europe/Amsterdam time

function isBeforeCutoffNL(): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(fmt.format(new Date()), 10)
    return Number.isFinite(hour) && hour < SHIPPING_CUTOFF_HOUR
  } catch {
    return new Date().getHours() < SHIPPING_CUTOFF_HOUR
  }
}

export default function ShippingMicrocopy() {
  const t = useTranslations('product.shippingMicro')

  // Lazy-init: SSR + first client render produce the same value, then
  // we tick every 5 minutes so the promise auto-flips at 17:00.
  const [beforeCutoff, setBeforeCutoff] = useState(isBeforeCutoffNL)

  useEffect(() => {
    const id = window.setInterval(() => {
      setBeforeCutoff(isBeforeCutoffNL())
    }, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const message = beforeCutoff ? t('beforeCutoff') : t('afterCutoff')

  return (
    <div className="flex items-center gap-2 border-2 border-black bg-gray-50 px-3 py-2">
      <Truck
        className="w-4 h-4 text-brand-primary flex-shrink-0"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold text-black leading-snug">
        {message}
      </span>
    </div>
  )
}
