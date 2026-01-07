'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ReturnData {
  id: string
  status: string
  return_reason: string
  customer_notes: string | null
  refund_amount: number
  return_label_cost_incl_btw: number
  total_refund: number
  return_label_payment_status: string | null
  return_tracking_code: string | null
  return_tracking_url: string | null
  return_label_url: string | null
  created_at: string
  orders: {
    id: string
    email: string
    total: number
    status: string
    created_at: string
    delivered_at: string | null
    order_items: Array<{
      id: string
      product_name: string
      size: string
      color: string
      quantity: number
      price_at_purchase: number
      image_url: string | null
    }>
  }
  return_items: Array<{
    order_item_id: string
    quantity: number
    reason: string
  }>
}

function CheckoutForm({ returnId, returnData }: { returnId: string; returnData: ReturnData }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/returns/${returnId}?payment=success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Betaling mislukt')
        setProcessing(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Voor redirect-based payment methods (zoals iDEAL, PayPal) wordt gebruiker doorgestuurd
        // Voor non-redirect methods wordt dit niet aangeroepen omdat redirect: 'if_required' is gebruikt
        // In plaats daarvan wachten we op de return_url redirect
        toast.success('Betaling succesvol! Je retourlabel wordt nu gegenereerd...')
        // Refresh page to show updated status
        setTimeout(() => {
          window.location.href = `${window.location.origin}/returns/${returnId}?payment=success`
        }, 1000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Er is iets misgegaan')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        options={{
          wallets: {
            applePay: 'auto',
            googlePay: 'auto',
          },
          layout: {
            type: 'tabs',
          },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Betalen...' : `Betaal €${returnData.return_label_cost_incl_btw.toFixed(2)}`}
      </button>
    </form>
  )
}

export default function ReturnDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [returnData, setReturnData] = useState<ReturnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [pollingLabel, setPollingLabel] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && returnId) {
      fetchReturn()
    }
  }, [user, returnId])

  // Check voor payment success parameter en toon successmelding
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment')
    if (paymentSuccess === 'success') {
      toast.success('Betaling succesvol! Je retourlabel wordt nu gegenereerd...')
      // Refresh data om de nieuwste status te krijgen
      fetchReturn().then(() => {
        // Remove query parameter na refresh
        setTimeout(() => {
          router.replace(`/returns/${returnId}`, { scroll: false })
        }, 100)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, returnId])

  // Poll voor label generatie als betaling is voltooid maar label nog niet klaar is
  useEffect(() => {
    if (returnData?.status === 'return_label_payment_completed' && !returnData.return_label_url && !pollingLabel) {
      setPollingLabel(true)
      startPollingForLabel()
    } else if (returnData?.return_label_url && pollingLabel) {
      setPollingLabel(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnData?.status, returnData?.return_label_url])

  async function startPollingForLabel() {
    let attempts = 0
    const maxAttempts = 30 // Poll voor maximaal 30 seconden (elke seconde)
    let shouldContinue = true
    
    const poll = async () => {
      if (!shouldContinue) return
      
      attempts++
      
      try {
        const response = await fetch(`/api/returns/${returnId}`)
        const data = await response.json()
        
        if (response.ok && data.return) {
          setReturnData(data.return)
          
          // Als label is gegenereerd, stop polling
          if (data.return.status === 'return_label_generated' && data.return.return_label_url) {
            setPollingLabel(false)
            shouldContinue = false
            toast.success('Je retourlabel is klaar!')
            return
          }
          
          // Blijf pollen als label nog niet klaar is en we nog niet te veel attempts hebben gedaan
          if (attempts < maxAttempts && (data.return.status === 'return_label_payment_completed' || data.return.status === 'return_label_payment_pending')) {
            setTimeout(poll, 1000) // Poll elke seconde
          } else if (attempts >= maxAttempts) {
            setPollingLabel(false)
            shouldContinue = false
            toast.error('Het genereren van het label duurt langer dan verwacht. Probeer de pagina te verversen.')
          }
        } else {
          // Stop polling bij error response
          setPollingLabel(false)
          shouldContinue = false
        }
      } catch (error) {
        console.error('Error polling for label:', error)
        if (attempts < maxAttempts && shouldContinue) {
          setTimeout(poll, 2000) // Retry na 2 seconden bij error
        } else {
          setPollingLabel(false)
          shouldContinue = false
        }
      }
    }
    
    poll()
  }

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=/returns/' + returnId)
      return
    }

    setUser(user)
  }

  async function fetchReturn() {
    try {
      const response = await fetch(`/api/returns/${returnId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch return')
      }

      setReturnData(data.return)

      // Als status approved is, maak payment intent aan
      if (data.return.status === 'return_approved' && !data.return.return_label_payment_intent_id) {
        await createPaymentIntent()
      }
    } catch (error: any) {
      toast.error(error.message || 'Kon retour niet laden')
      router.push('/account')
    } finally {
      setLoading(false)
    }
  }

  async function createPaymentIntent() {
    setPaymentLoading(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/create-payment-intent`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.client_secret)
    } catch (error: any) {
      toast.error(error.message || 'Kon betaling niet voorbereiden')
    } finally {
      setPaymentLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'return_requested':
        return 'bg-yellow-400 text-black'
      case 'return_approved':
        return 'bg-blue-500 text-white'
      case 'return_label_payment_pending':
        return 'bg-orange-500 text-white'
      case 'return_label_payment_completed':
        return 'bg-purple-500 text-white'
      case 'return_label_generated':
        return 'bg-green-500 text-white'
      case 'return_in_transit':
        return 'bg-brand-primary text-white'
      case 'return_received':
        return 'bg-gray-600 text-white'
      case 'refund_processing':
        return 'bg-indigo-500 text-white'
      case 'refunded':
        return 'bg-gray-800 text-white'
      case 'return_rejected':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const getStatusText = (status: string) => {
    const labels: Record<string, string> = {
      return_requested: 'Aangevraagd',
      return_approved: 'Goedgekeurd',
      return_label_payment_pending: 'Betaling Label',
      return_label_payment_completed: 'Label Betaald',
      return_label_generated: 'Label Beschikbaar',
      return_in_transit: 'Onderweg',
      return_received: 'Ontvangen',
      refund_processing: 'Refund Bezig',
      refunded: 'Terugbetaald',
      return_rejected: 'Afgewezen',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (!returnData) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
            <p className="text-gray-600 mb-6 text-lg">Retour niet gevonden</p>
            <Link
              href="/account"
              className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              Terug naar account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const returnItems = returnData.return_items as any[]
  const orderItems = returnData.orders.order_items

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/account?tab=returns"
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-4xl md:text-5xl font-display">RETOUR DETAILS</h1>
        </div>

        {/* Status */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-bold text-xl mb-2">
                Retour #{returnData.id.slice(0, 8).toUpperCase()}
              </h2>
              <span className={`inline-block px-4 py-2 text-sm font-bold uppercase ${getStatusColor(returnData.status)}`}>
                {getStatusText(returnData.status)}
              </span>
            </div>
            {returnData.total_refund && (
              <div className="text-left md:text-right">
                <p className="text-2xl font-display">€{returnData.total_refund.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Terug te betalen</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        {returnData.status === 'return_approved' && (
          <div className="bg-orange-50 border-2 border-orange-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">Betaal voor Retourlabel</h3>
            <p className="mb-4">
              Om je retourlabel te ontvangen, betaal je eerst €{returnData.return_label_cost_incl_btw.toFixed(2)} voor de retourverzending.
            </p>
            {paymentLoading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Betalingsformulier voorbereiden...</p>
              </div>
            ) : clientSecret ? (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                  locale: 'nl',
                }}
              >
                <CheckoutForm returnId={returnId} returnData={returnData} />
              </Elements>
            ) : (
              <button
                onClick={createPaymentIntent}
                className="w-full px-8 py-4 bg-orange-500 text-white font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors"
              >
                Betaalformulier Laden
              </button>
            )}
          </div>
        )}

        {/* Payment Completed - Label Generating */}
        {(returnData.status === 'return_label_payment_completed' || returnData.status === 'return_label_payment_pending') && !returnData.return_label_url && (
          <div className="bg-purple-50 border-2 border-purple-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">Betaling Voltooid</h3>
            <p className="mb-4">
              Je betaling is succesvol ontvangen! We genereren nu je retourlabel. Dit kan een paar momenten duren.
            </p>
            {pollingLabel && (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Retourlabel wordt gegenereerd...</p>
                <p className="text-xs text-gray-500 mt-2">De pagina wordt automatisch bijgewerkt zodra het label klaar is.</p>
              </div>
            )}
            {!pollingLabel && (
              <button
                onClick={async () => {
                  await fetchReturn()
                  setPollingLabel(true)
                  startPollingForLabel()
                }}
                className="w-full px-8 py-4 bg-purple-500 text-white font-bold uppercase tracking-wider hover:bg-purple-600 transition-colors"
              >
                Status Vernieuwen
              </button>
            )}
          </div>
        )}

        {/* Label Generated */}
        {returnData.status === 'return_label_generated' && returnData.return_label_url && (
          <div className="bg-green-50 border-2 border-green-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">Retourlabel Beschikbaar</h3>
            <p className="mb-4">
              Je retourlabel is klaar! Download het label en plak het op je pakket.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={returnData.return_label_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-green-500 text-white font-bold uppercase tracking-wider hover:bg-green-600 transition-colors text-center"
              >
                Download Retourlabel
              </a>
              {returnData.return_tracking_url && (
                <a
                  href={returnData.return_tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 border-2 border-green-500 text-green-700 font-bold uppercase tracking-wider hover:bg-green-500 hover:text-white transition-colors text-center"
                >
                  Volg Retour
                </a>
              )}
            </div>
            {returnData.return_tracking_code && (
              <p className="mt-4 text-sm text-gray-600">
                Tracking code: <span className="font-mono font-bold">{returnData.return_tracking_code}</span>
              </p>
            )}
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Order Informatie</h2>
          <div className="space-y-2">
            <p><strong>Order nummer:</strong> #{returnData.orders.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Geleverd op:</strong> {returnData.orders.delivered_at ? new Date(returnData.orders.delivered_at).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }) : 'N/A'}</p>
          </div>
        </div>

        {/* Return Items */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Retour Items</h2>
          <div className="space-y-4">
            {returnItems.map((returnItem, idx) => {
              const orderItem = orderItems.find((item) => item.id === returnItem.order_item_id)
              if (!orderItem) return null

              return (
                <div key={idx} className="flex gap-4 pb-4 border-b-2 border-gray-200 last:border-0">
                  {orderItem.image_url && (
                    <div className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-gray-200 overflow-hidden flex-shrink-0">
                      <Image
                        src={orderItem.image_url}
                        alt={orderItem.product_name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{orderItem.product_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Maat {orderItem.size} • {orderItem.color} • {returnItem.quantity}x stuks
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Reden:</strong> {returnItem.reason}
                    </p>
                    <p className="font-bold mt-2">€{(orderItem.price_at_purchase * returnItem.quantity).toFixed(2)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Return Info */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Retour Informatie</h2>
          <div className="space-y-2">
            <p><strong>Reden:</strong> {returnData.return_reason}</p>
            {returnData.customer_notes && (
              <p><strong>Notities:</strong> {returnData.customer_notes}</p>
            )}
            <p><strong>Aangevraagd op:</strong> {new Date(returnData.created_at).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}</p>
          </div>
        </div>

        {/* Refund Summary */}
        <div className="bg-black text-white p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Refund Overzicht</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Terug te betalen (items)</span>
              <span className="font-bold">€{returnData.refund_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Retourlabel kosten (al betaald)</span>
              <span>€{returnData.return_label_cost_incl_btw.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-xl font-display">
                <span>Terug te betalen</span>
                <span>€{returnData.total_refund.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                (Na ontvangst retour)
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/account?tab=returns"
            className="px-8 py-4 border-2 border-black font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors text-center"
          >
            Terug naar Retouren
          </Link>
        </div>
      </div>
    </div>
  )
}

