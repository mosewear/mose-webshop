'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'

function PaymentStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('paymentStatus')
  const clearCart = useCart((s) => s.clearCart)

  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const orderId = searchParams.get('order_id')
      const payment =
        searchParams.get('payment') || searchParams.get('payment_intent')

      if (!orderId && !payment) {
        router.push('/cart')
        return
      }

      try {
        const qs = new URLSearchParams()
        if (orderId) qs.set('order_id', orderId)
        if (payment) qs.set('payment', payment)

        const response = await fetch(`/api/check-payment-status?${qs.toString()}`)
        const data = await response.json()

        if (data.status === 'succeeded' || data.mollie_status === 'paid') {
          clearCart()
          const confQs = new URLSearchParams()
          if (data.orderId || orderId) {
            confQs.set('order_id', data.orderId || orderId!)
          }
          if (data.paymentId || payment) {
            confQs.set('payment', data.paymentId || payment!)
          }
          router.push(`/order-confirmation?${confQs.toString()}`)
        } else if (
          data.status === 'canceled' ||
          data.status === 'requires_payment_method' ||
          data.mollie_status === 'canceled' ||
          data.mollie_status === 'failed' ||
          data.mollie_status === 'expired'
        ) {
          sessionStorage.setItem('payment_cancelled', 'true')
          if (data.paymentId || payment) {
            sessionStorage.setItem('payment_intent', data.paymentId || payment!)
          }
          sessionStorage.setItem('order_id', data.orderId || orderId || '')
          router.push('/checkout')
        } else {
          setError(t('statusError', { status: data.mollie_status || data.status }))
        }
      } catch (err: unknown) {
        console.error('Error checking payment status:', err)
        setError(t('checkError'))
      } finally {
        setChecking(false)
      }
    }

    checkPaymentStatus()
  }, [searchParams, router, clearCart, t])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-display mb-2">{t('checking')}</h1>
          <p className="text-gray-600">{t('checkingMessage')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-display mb-2">{t('error')}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/cart')}
            className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            {t('backToCart')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h1 className="text-2xl font-display mb-2">LADEN...</h1>
            <p className="text-gray-600">Even geduld...</p>
          </div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  )
}
