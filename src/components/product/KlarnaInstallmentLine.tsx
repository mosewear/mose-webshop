'use client'

/**
 * Renders the "or 3x EUR X with Klarna" line under the price.
 *
 * Hidden when the price is below the Klarna split-pay minimum (EUR 30) so
 * we never advertise something the user cannot actually use at checkout.
 */

import { useTranslations, useLocale } from 'next-intl'
import { formatPrice } from '@/lib/format-price'

interface KlarnaInstallmentLineProps {
  price: number
}

const KLARNA_MIN_AMOUNT = 30
const KLARNA_PINK = '#FFB3C7'

export default function KlarnaInstallmentLine({ price }: KlarnaInstallmentLineProps) {
  const t = useTranslations('product.klarna')
  const locale = useLocale()

  if (!Number.isFinite(price) || price < KLARNA_MIN_AMOUNT) return null

  // Klarna actually uses ceil for instalments so customers never overpay.
  const instalment = Math.ceil((price / 3) * 100) / 100

  return (
    <div className="mt-1.5 inline-flex items-center gap-2 text-xs md:text-[13px] text-gray-700">
      <span className="leading-tight">
        {t('installment', { amount: formatPrice(instalment, locale) })}
      </span>
      <span
        className="inline-flex items-center px-1.5 py-0.5 text-[10px] md:text-[11px] font-bold rounded-sm"
        style={{ backgroundColor: KLARNA_PINK, color: '#0A0A0A' }}
        aria-label="Klarna"
      >
        Klarna
      </span>
    </div>
  )
}
