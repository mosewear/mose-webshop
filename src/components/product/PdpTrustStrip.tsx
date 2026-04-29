'use client'

/**
 * Compact trust + fit anchor rendered DIRECTLY above the Add-to-Cart button.
 * Designed to neutralise the four most common conversion blockers in one
 * eye-shot before the visitor commits:
 *   1. shipping speed & cost
 *   2. returns
 *   3. authenticity / quality (made-in + signature spec)
 *   4. payment options
 *
 * The "today before 17:00 = tomorrow at home" line flips automatically into
 * a next-day-shipping line after the cutoff so we never promise something
 * we cannot deliver.
 */

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PdpTrustStripProps {
  signatureSpecs?: string | null
}

const SHIPPING_CUTOFF_HOUR = 17 // local Europe/Amsterdam time

function isBeforeCutoffNL(): boolean {
  // Amsterdam time via Intl. We rebuild the hour locally on every check.
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

export default function PdpTrustStrip({ signatureSpecs }: PdpTrustStripProps) {
  const t = useTranslations('product.trustAnchor')
  // Lazy-init runs once on first render. `Intl.DateTimeFormat` works on
  // both server and client so the SSR'd HTML matches the first client
  // render and we never flicker.
  const [beforeCutoff, setBeforeCutoff] = useState(isBeforeCutoffNL)

  useEffect(() => {
    // Subscribe to time-of-day changes via interval. The setState here
    // lives inside an external timer callback so it does not violate the
    // "no setState in effect body" rule.
    const id = window.setInterval(() => {
      setBeforeCutoff(isBeforeCutoffNL())
    }, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const lines = [
    beforeCutoff ? t('shippingBeforeCutoff') : t('shippingAfterCutoff'),
    t('returns'),
    signatureSpecs ? t('madeInWithSpec', { spec: signatureSpecs }) : t('madeInBare'),
    t('payment'),
  ]

  return (
    <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-gray-800">
          <Check
            className="w-4 h-4 md:w-[18px] md:h-[18px] text-brand-primary flex-shrink-0 mt-0.5"
            strokeWidth={3}
          />
          <span className="font-medium leading-snug">{line}</span>
        </li>
      ))}
    </ul>
  )
}
