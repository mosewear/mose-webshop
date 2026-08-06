'use client'

import { useState, useEffect } from 'react'
import { Landmark, CreditCard, ShoppingBag, Building2, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'

type PaymentMethod = 'ideal' | 'card' | 'klarna' | 'bancontact' | 'paypal'

interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  descriptionKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  popular?: boolean
}

interface MolliePaymentFormProps {
  onError: (error: string) => void
  onMethodSelected: (method: PaymentMethod) => Promise<void>
  country: string
  isCreatingPayment: boolean
  orderId: string | undefined
}

export default function MolliePaymentForm({
  onError,
  onMethodSelected,
  country,
  isCreatingPayment,
  orderId,
}: MolliePaymentFormProps) {
  const t = useTranslations('payment')
  const [mounted, setMounted] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getPaymentMethods = (countryCode: string): PaymentMethodOption[] => {
    const allMethods: PaymentMethodOption[] = [
      {
        id: 'ideal',
        name: 'iDEAL',
        descriptionKey: 'methods.ideal',
        icon: Landmark,
        popular: true,
      },
      {
        id: 'card',
        name: 'Credit card',
        descriptionKey: 'methods.card',
        icon: CreditCard,
      },
      {
        id: 'klarna',
        name: 'Klarna',
        descriptionKey: 'methods.klarna',
        icon: ShoppingBag,
      },
      {
        id: 'bancontact',
        name: 'Bancontact',
        descriptionKey: 'methods.bancontact',
        icon: Building2,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        descriptionKey: 'methods.paypal',
        icon: Smartphone,
      },
    ]

    if (countryCode === 'NL') {
      return allMethods.filter((m) =>
        ['ideal', 'card', 'klarna', 'paypal'].includes(m.id)
      )
    }
    if (countryCode === 'BE') {
      return allMethods.filter((m) =>
        ['bancontact', 'card', 'klarna', 'paypal'].includes(m.id)
      )
    }
    return allMethods.filter((m) => ['card', 'paypal'].includes(m.id))
  }

  const handleMethodClick = async (method: PaymentMethod) => {
    if (!orderId || isCreatingPayment) return
    setSelectedMethod(method)
    try {
      await onMethodSelected(method)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('error')
      onError(message)
      setSelectedMethod(null)
    }
  }

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200"></div>
        <div className="h-12 bg-gray-200"></div>
        <div className="h-12 bg-gray-200"></div>
      </div>
    )
  }

  const paymentMethods = getPaymentMethods(country)

  if (selectedMethod || isCreatingPayment) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-3"></div>
        <div className="text-sm text-gray-900 font-semibold">{t('preparing')}</div>
        <div className="text-xs text-gray-600 mt-1">{t('redirecting')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-4">{t('chooseMethod')}</h3>

      <div className="grid gap-3">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => handleMethodClick(method.id)}
              disabled={isCreatingPayment || !orderId}
              className="relative p-4 border-2 border-gray-300 hover:border-black transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                  <IconComponent size={24} className="text-current" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-black group-hover:text-brand-primary transition-colors">
                    {method.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t(method.descriptionKey)}
                  </div>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-brand-primary transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t pt-4 mt-6 space-y-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-black flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>{t('secure')}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-black flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>{t('ssl')}</span>
        </div>
      </div>
    </div>
  )
}
