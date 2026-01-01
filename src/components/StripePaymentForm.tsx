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

interface CheckoutFormProps {
  clientSecret: string | null
  onSuccess: () => void
  onError: (error: string) => void
  onMethodSelected: (method: PaymentMethod) => void
  total: number
  country: string
  isCreatingIntent: boolean
}

function CheckoutForm({ 
  clientSecret, 
  onSuccess, 
  onError, 
  onMethodSelected,
  total, 
  country,
  isCreatingIntent 
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  // Smart payment methods per land
  const getPaymentMethods = (): PaymentMethodOption[] => {
    if (country === 'NL') {
      return [
        { id: 'ideal', name: 'iDEAL', description: 'Meest gebruikt in Nederland', icon: '🇳🇱', popular: true },
        { id: 'card', name: 'Creditcard / Debitcard', description: 'Visa, Mastercard, Amex', icon: '💳' },
        { id: 'klarna', name: 'Klarna', description: 'Betaal later of in delen', icon: 'K' },
      ]
    } else if (country === 'BE') {
      return [
        { id: 'bancontact', name: 'Bancontact', description: 'Meest gebruikt in België', icon: '🇧🇪', popular: true },
        { id: 'card', name: 'Creditcard / Debitcard', description: 'Visa, Mastercard, Amex', icon: '💳' },
        { id: 'klarna', name: 'Klarna', description: 'Betaal later of in delen', icon: 'K' },
      ]
    } else {
      return [
        { id: 'card', name: 'Credit / Debit Card', description: 'Visa, Mastercard, Amex', icon: '💳', popular: true },
        { id: 'klarna', name: 'Klarna', description: 'Buy now, pay later', icon: 'K' },
      ]
    }
  }

  const paymentMethods = getPaymentMethods()

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
        onError(error.message || 'Payment failed')
        setIsProcessing(false)
      } else {
        onSuccess()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Er is een fout opgetreden')
      onError(err.message || 'Payment failed')
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      {!selectedMethod ? (
        <div>
          <h2 className="text-xl font-bold mb-4">Kies je betaalmethode</h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setSelectedMethod(method.id)
                  onMethodSelected(method.id)
                }}
                disabled={isCreatingIntent}
                className="w-full border-2 border-gray-300 hover:border-brand-primary p-4 text-left transition-all hover:shadow-md group relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {method.popular && (
                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 font-bold">
                    POPULAIR
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="text-4xl flex-shrink-0">
                    {method.icon}
                  </div>
                  <div className="flex-grow">
                    <div className="font-bold text-lg group-hover:text-brand-primary transition-colors">
                      {method.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {method.description}
                    </div>
                  </div>
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
        </div>
      ) : !clientSecret ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <span className="ml-3 text-gray-600">Payment wordt voorbereid...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setSelectedMethod(null)}
            className="text-sm text-brand-primary hover:underline flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Andere betaalmethode kiezen
          </button>

          {/* Selected method indicator */}
          <div className="bg-gray-50 border-2 border-gray-200 p-4 flex items-center gap-3">
            <div className="text-2xl">
              {paymentMethods.find(m => m.id === selectedMethod)?.icon}
            </div>
            <div>
              <div className="font-bold">
                {paymentMethods.find(m => m.id === selectedMethod)?.name}
              </div>
              <div className="text-sm text-gray-600">
                {paymentMethods.find(m => m.id === selectedMethod)?.description}
              </div>
            </div>
          </div>

          <PaymentElement 
            options={{
              layout: 'accordion',
              business: { name: 'MOSE' },
            }}
          />
          
          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-600 p-4 text-red-800 text-sm">
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
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Beveiligd door Stripe</span>
            </div>
          </div>
        </form>
      )}
    </div>
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

  return (
    <Elements 
      stripe={stripePromise} 
      options={clientSecret ? { 
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
      } : undefined}
    >
      <CheckoutForm 
        clientSecret={clientSecret} 
        onSuccess={onSuccess} 
        onError={onError}
        onMethodSelected={onMethodSelected}
        total={total}
        country={country}
        isCreatingIntent={isCreatingIntent}
      />
    </Elements>
  )
}

