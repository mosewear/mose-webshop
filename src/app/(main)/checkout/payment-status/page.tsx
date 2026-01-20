'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const paymentIntent = searchParams.get('payment_intent')
      const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')
      const redirectStatus = searchParams.get('redirect_status')

      console.log('🔍 Payment Status Check:', { paymentIntent, redirectStatus })

      if (!paymentIntent) {
        console.error('❌ No payment_intent in URL')
        router.push('/cart')
        return
      }

      try {
        // Check status from Stripe via our API
        const response = await fetch(`/api/check-payment-status?payment_intent=${paymentIntent}`)
        const data = await response.json()

        console.log('✅ Payment status:', data.status)

        if (data.status === 'succeeded') {
          // Successful payment → go to confirmation
          console.log('✅ Payment succeeded, redirecting to confirmation')
          router.push(`/order-confirmation?payment_intent=${paymentIntent}`)
        } else if (data.status === 'canceled' || data.status === 'requires_payment_method') {
          // Cancelled or failed → back to checkout with message
          console.log('⚠️ Payment cancelled/failed, redirecting to checkout')
          
          // Save state to sessionStorage
          sessionStorage.setItem('payment_cancelled', 'true')
          sessionStorage.setItem('payment_intent', paymentIntent)
          sessionStorage.setItem('order_id', data.orderId || '')
          
          router.push('/checkout')
        } else {
          // Other status (processing, etc.)
          console.log('🔄 Payment status:', data.status)
          setError(`Betaling status: ${data.status}. Probeer het later opnieuw.`)
        }
      } catch (error: any) {
        console.error('❌ Error checking payment status:', error)
        setError('Er is een fout opgetreden bij het controleren van je betaling.')
      } finally {
        setChecking(false)
      }
    }

    checkPaymentStatus()
  }, [searchParams, router])

  if (checking) {
    return (
      <div className="min-h-screen pt-24 md:pt-32 px-4 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-display mb-2">BETALING CONTROLEREN</h1>
          <p className="text-gray-600">Even geduld, we controleren je betaling...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 md:pt-32 px-4 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-display mb-2">FOUT</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/cart')}
            className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            Terug naar winkelwagen
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-24 md:pt-32 px-4 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-display mb-2">BETALING CONTROLEREN</h1>
          <p className="text-gray-600">Even geduld, we controleren je betaling...</p>
        </div>
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  )
}


