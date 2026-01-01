'use client'

import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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

interface PaymentFormProps {
  total: number
  onSuccess: () => void
  onError: (error: string) => void
}

function PaymentForm({ 
  total,
  onSuccess, 
  onError
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(undefined)

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
        },
      })

      if (error) {
        setErrorMessage(error.message || 'Er is een fout opgetreden')
        onError(error.message || 'Er is een fout opgetreden')
      } else {
        onSuccess()
      }
    } catch (err) {
      setErrorMessage('Er is een onverwachte fout opgetreden')
      onError('Er is een onverwachte fout opgetreden')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'BEZIG MET VERWERKEN...' : `BETALEN €${total.toFixed(2)}`}
      </button>

      <div className="text-xs text-center text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Beveiligd door Stripe</span>
        </div>
      </div>
    </form>
  )
}

interface StripePaymentFormProps {
  clientSecret: string | null
  onSuccess: () => void
  onError: (error: string) => void
  onMethodSelected: (method: PaymentMethod) => void
  total: number
  country: string
  isCreatingIntent: boolean
}

export default function StripePaymentForm({ 
  clientSecret, 
  onSuccess, 
  onError,
  onMethodSelected,
  total,
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
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const paymentMethods = getPaymentMethods(country)

  // Show payment method selection when no clientSecret yet
  if (!clientSecret) {
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
              className="relative p-4 border-2 border-gray-300 hover:border-black transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{method.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-black">{method.name}</div>
                  <div className="text-sm text-gray-600">{method.description}</div>
                </div>
                {method.popular && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-black text-white text-xs font-bold">
                    POPULAIR
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {isCreatingIntent && selectedMethod && (
          <div className="text-center py-4 text-gray-600">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black mb-2"></div>
            <div className="text-sm">Payment wordt voorbereid...</div>
          </div>
        )}
      </div>
    )
  }

  // Show Stripe Payment Element when clientSecret is available
  return (
    <Elements 
      key={clientSecret} 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#000000',
            colorBackground: '#ffffff',
            colorText: '#000000',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '0px',
          },
        },
        locale: 'nl',
      }}
    >
      <PaymentForm 
        total={total}
        onSuccess={onSuccess} 
        onError={onError}
      />
    </Elements>
  )
}
