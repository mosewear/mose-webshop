'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Landmark, CreditCard, ShoppingBag, Building2, Smartphone } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PaymentMethod = 'ideal' | 'card' | 'klarna' | 'bancontact' | 'paypal'

interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  popular?: boolean
}

// Smart payment methods per land
const getPaymentMethods = (country: string): PaymentMethodOption[] => {
  const allMethods: PaymentMethodOption[] = [
    {
      id: 'ideal',
      name: 'iDEAL',
      description: 'Direct betalen via je bank',
      icon: Landmark,
      popular: true
    },
    {
      id: 'card',
      name: 'Credit card',
      description: 'Visa, Mastercard, Amex',
      icon: CreditCard
    },
    {
      id: 'klarna',
      name: 'Klarna',
      description: 'Achteraf betalen',
      icon: ShoppingBag
    },
    {
      id: 'bancontact',
      name: 'Bancontact',
      description: 'Voor Belgische klanten',
      icon: Building2
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Betalen met PayPal',
      icon: Smartphone
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
  onSuccess: () => void
  onError: (error: string) => void
  selectedMethod: PaymentMethod
  onBack: () => void
  orderId: string
  billingDetails: {
    name: string
    email: string
    phone: string
    address: {
      line1: string
      city: string
      postal_code: string
      country: string
      state?: string | null
    }
  }
}

function PaymentForm({ 
  onSuccess, 
  onError,
  selectedMethod,
  onBack,
  orderId,
  billingDetails
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('💳 [Stripe] Submit payment form')
    console.log('💳 [Stripe] Stripe loaded:', !!stripe)
    console.log('💳 [Stripe] Elements loaded:', !!elements)
    console.log('💳 [Stripe] Selected method:', selectedMethod)
    console.log('💳 [Stripe] Order ID:', orderId)

    if (!stripe || !elements) {
      console.error('❌ [Stripe] Stripe or Elements not loaded')
      return
    }

    setIsProcessing(true)
    setErrorMessage(undefined)

    try {
      console.log('💳 [Stripe] Confirming payment...')
      
      // Ensure name is at least 3 characters (Stripe requirement)
      const safeBillingDetails = {
        ...billingDetails,
        name: billingDetails.name.trim().length >= 3 ? billingDetails.name.trim() : 'Klant'
      }

      console.log('💳 [Stripe] Billing details:', safeBillingDetails)

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/payment-status`,
          payment_method_data: {
            billing_details: safeBillingDetails // Pass billing details we already collected!
          }
        },
      })

      if (error) {
        console.error('❌ [Stripe] Payment error:', error)
        setErrorMessage(error.message || 'Er is een fout opgetreden')
        onError(error.message || 'Payment failed')
        setIsProcessing(false)
      } else {
        console.log('✅ [Stripe] Payment confirmed, redirecting...')
        onSuccess()
      }
    } catch (err: any) {
      console.error('💥 [Stripe] Exception:', err)
      setErrorMessage(err.message || 'Er is een fout opgetreden')
      onError(err.message || 'Payment failed')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-brand-primary hover:underline flex items-center gap-1 mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Andere betaalmethode kiezen
      </button>

      {/* Payment Element - Stripe handles the UI based on payment method */}
      <div className="border-2 border-gray-200 p-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: 'never' // Hide all billing detail fields - we already have them!
            }
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border-2 border-red-600 text-red-900 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            BEZIG...
          </span>
        ) : (
          'BETALEN'
        )}
      </button>
    </form>
  )
}

interface StripePaymentFormProps {
  clientSecret: string | null
  onSuccess: () => void
  onError: (error: string) => void
  onMethodSelected: (method: PaymentMethod) => Promise<void>
  country: string
  isCreatingIntent: boolean
  orderId: string | undefined
  billingDetails: {
    name: string
    email: string
    phone: string
    address: {
      line1: string
      city: string
      postal_code: string
      country: string
      state?: string | null
    }
  }
}

export default function StripePaymentForm({ 
  clientSecret, 
  onSuccess, 
  onError,
  onMethodSelected,
  country,
  isCreatingIntent,
  orderId,
  billingDetails
}: StripePaymentFormProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMethodClick = async (method: PaymentMethod) => {
    setSelectedMethod(method)
    await onMethodSelected(method)
  }

  const handleBack = () => {
    setSelectedMethod(null)
    // Note: clientSecret should be cleared in parent component
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

  return (
    <div className="space-y-4">
      {!selectedMethod ? (
        <>
          <h3 className="text-lg font-bold mb-4">Kies je betaalmethode</h3>
          
          <div className="grid gap-3">
            {paymentMethods.map((method) => {
              const IconComponent = method.icon
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleMethodClick(method.id)}
                  disabled={isCreatingIntent}
                  className="relative p-4 border-2 border-gray-300 hover:border-black transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                      <IconComponent size={24} className="text-current" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-black group-hover:text-brand-primary transition-colors">{method.name}</div>
                      <div className="text-sm text-gray-600">{method.description}</div>
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
              )
            })}
          </div>

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
        </>
      ) : !clientSecret || isCreatingIntent ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-3"></div>
          <div className="text-sm text-gray-900 font-semibold">Payment wordt voorbereid...</div>
          <div className="text-xs text-gray-600 mt-1">Dit duurt slechts een moment</div>
        </div>
      ) : (
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
            onSuccess={onSuccess} 
            onError={onError}
            selectedMethod={selectedMethod}
            onBack={handleBack}
            orderId={orderId || ''}
            billingDetails={billingDetails}
          />
        </Elements>
      )}
    </div>
  )
}
