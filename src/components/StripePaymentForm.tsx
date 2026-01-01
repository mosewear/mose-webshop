'use client'

import { useState, useEffect } from 'react'

type PaymentMethod = 'ideal' | 'card' | 'klarna' | 'bancontact' | 'paypal'

interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  description: string
  icon: string
  popular?: boolean
}

// Smart payment methods per land
const getPaymentMethods = (country: string): PaymentMethodOption[] => {
  const allMethods: PaymentMethodOption[] = [
    {
      id: 'ideal',
      name: 'iDEAL',
      description: 'Direct betalen via je bank',
      icon: '🇳🇱',
      popular: true
    },
    {
      id: 'card',
      name: 'Credit card',
      description: 'Visa, Mastercard, Amex',
      icon: '💳'
    },
    {
      id: 'klarna',
      name: 'Klarna',
      description: 'Achteraf betalen',
      icon: '🛍️'
    },
    {
      id: 'bancontact',
      name: 'Bancontact',
      description: 'Voor Belgische klanten',
      icon: '🇧🇪'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Betalen met PayPal',
      icon: '📱'
    }
  ]

  // Filter based on country
  if (country === 'NL') {
    return allMethods.filter(m => ['ideal', 'card', 'klarna', 'paypal'].includes(m.id))
  } else if (country === 'BE') {
    return allMethods.filter(m => ['bancontact', 'card', 'klarna', 'paypal'].includes(m.id))
  } else {
    return allMethods.filter(m => ['card', 'paypal'].includes(m.id))
  }
}

interface StripePaymentFormProps {
  onMethodSelected: (method: PaymentMethod) => void
  country: string
  isCreatingIntent: boolean
}

export default function StripePaymentForm({ 
  onMethodSelected,
  country,
  isCreatingIntent
}: StripePaymentFormProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-4">Kies je betaalmethode</h3>
      
      <div className="grid gap-3">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => {
              setSelectedMethod(method.id)
              onMethodSelected(method.id)
            }}
            disabled={isCreatingIntent}
            className="relative p-4 border-2 border-gray-300 hover:border-black transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{method.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-black group-hover:text-brand-primary transition-colors">{method.name}</div>
                <div className="text-sm text-gray-600">{method.description}</div>
              </div>
              {method.popular && (
                <span className="absolute top-2 right-2 px-2 py-1 bg-black text-white text-xs font-bold">
                  POPULAIR
                </span>
              )}
              <svg 
                className="w-6 h-6 text-gray-400 group-hover:text-brand-primary transition-colors flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {isCreatingIntent && selectedMethod && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-3"></div>
          <div className="text-sm text-gray-900 font-semibold">Je wordt doorgestuurd naar de betaalpagina...</div>
          <div className="text-xs text-gray-600 mt-1">Dit duurt slechts een moment</div>
        </div>
      )}

      <div className="border-t pt-4 mt-6 space-y-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Veilig betalen via Stripe</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>SSL versleutelde verbinding</span>
        </div>
      </div>
    </div>
  )
}
