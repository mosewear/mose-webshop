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

interface CheckoutFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  total: number
}

function CheckoutForm({ clientSecret, onSuccess, onError, total }: CheckoutFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'tabs',
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
  )
}

interface StripePaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  total: number
}

export default function StripePaymentForm({ 
  clientSecret, 
  onSuccess, 
  onError,
  total 
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
      <CheckoutForm 
        clientSecret={clientSecret} 
        onSuccess={onSuccess} 
        onError={onError}
        total={total}
      />
    </Elements>
  )
}

