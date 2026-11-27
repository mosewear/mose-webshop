'use client'

/**
 * Shipping reassurance without a product-level delivery-time promise.
 */

import { Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ShippingMicrocopy() {
  const t = useTranslations('product.shippingMicro')

  const message = t('tracking')

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
