'use client'

/**
 * Compact trust + fit anchor rendered DIRECTLY above the Add-to-Cart button.
 * Designed to neutralise the four most common conversion blockers in one
 * eye-shot before the visitor commits:
 *   1. shipping options & cost
 *   2. returns
 *   3. authenticity / quality (made-in + signature spec)
 *   4. payment options
 *
 * Delivery timing belongs in the general terms, not beside the buy button.
 */

import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface PdpTrustStripProps {
  supplierFulfilled?: boolean
  signatureSpecs?: string | null
  /** Uit site_settings. De verzendregel beloofde hardgecodeerd "gratis
   *  bezorging", terwijl free_shipping_threshold op 150 staat. Dat is de
   *  regel die pal boven de koopknop staat, dus precies de belofte die een
   *  bezoeker meeneemt naar de checkout. */
  freeShippingThreshold: number
  /** Nodig om te zien of verzending altijd gratis is. */
  shippingCost?: number
}

export default function PdpTrustStrip({ signatureSpecs, supplierFulfilled = false }: PdpTrustStripProps) {
  const locale = useLocale()
  const t = useTranslations('product.trustAnchor')
  const lines = supplierFulfilled ? [
    locale === 'en' ? 'Delivery options and shipping costs are shown at checkout.' : 'Bezorgopties en verzendkosten staan bij het afrekenen.',
    locale === 'en' ? 'Team MOSE can help with sizing or your order.' : 'Team MOSE helpt je met vragen over maat of bestelling.',
    locale === 'en' ? 'Check the size chart for this specific model.' : 'Bekijk de maattabel van dit specifieke model.',
    locale === 'en' ? 'Secure payment at checkout.' : 'Veilig betalen bij het afrekenen.',
  ] : [
    t('shippingAtCheckout'),
    t('returns'),
    // Twee jaar garantie stond alleen in de veelgestelde vragen, op 5,2 scherm.
    // Dat is een van de sterkste redenen om bij een onbekend merk te kopen en
    // hij hoort hier, binnen één scherm van de koopknop.
    t('warranty'),
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
