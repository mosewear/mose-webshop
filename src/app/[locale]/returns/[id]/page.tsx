'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useLocale, useTranslations } from 'next-intl'
import { formatBedrag } from '@/lib/format-price'

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
  label_mode: string | null
  created_by_admin_id: string | null
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

export default function ReturnDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useTranslations('returnFlow')
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL'
  const returnId = params.id as string

  // Opgeslagen redenen zijn Nederlands; toon ze in de taal van de site.
  const reasonKeys: Record<string, string> = {
    'Past niet goed': 'doesNotFit',
    'Niet wat ik verwachtte': 'notAsExpected',
    'Defect product': 'defective',
    'Verkeerde maat/kleur geleverd': 'wrongItem',
    'Anders': 'other',
  }
  const reasonLabel = (reason: string) =>
    reasonKeys[reason] ? t(`reasons.${reasonKeys[reason]}`) : reason

  const [user, setUser] = useState<any>(null)
  const [returnData, setReturnData] = useState<ReturnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [pollingLabel, setPollingLabel] = useState(false)
  const [generatingFreeLabel, setGeneratingFreeLabel] = useState(false)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef<boolean>(false)
  const maxAttemptsRef = useRef<number>(0)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && returnId) {
      fetchReturn()
    }
  }, [user, returnId])

  // Mollie return URL: ?payment=return — confirm via API, never trust redirect alone
  useEffect(() => {
    const paymentParam = searchParams.get('payment')
    if (paymentParam !== 'return' && paymentParam !== 'success') return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/check-payment-status?return_id=${encodeURIComponent(returnId)}`
        )
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'succeeded' || data.mollie_status === 'paid') {
          toast.success(t('paymentSucceededToast'))
          await fetchReturn()
          if (!isPollingRef.current) startPollingForLabel()
        }
      } catch (err) {
        console.error('Return payment status check failed:', err)
      } finally {
        router.replace(`/returns/${returnId}`, { scroll: false })
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, returnId])

  // Poll voor label generatie als betaling is voltooid maar label nog niet klaar is
  useEffect(() => {
    // Stop polling als label is gegenereerd
    if (returnData?.return_label_url && isPollingRef.current) {
      stopPolling()
      return
    }

    // Start polling als status payment_completed is en label nog niet klaar
    // customer_free returns starten wel op payment_completed maar wachten op
    // een klikactie van de klant, dus die niet automatisch pollen.
    if (
      returnData?.status === 'return_label_payment_completed' &&
      !returnData.return_label_url &&
      returnData.label_mode !== 'customer_free' &&
      !isPollingRef.current
    ) {
      startPollingForLabel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnData?.status, returnData?.return_label_url])

  // Cleanup polling bij unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  function stopPolling() {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
    isPollingRef.current = false
    setPollingLabel(false)
    maxAttemptsRef.current = 0
  }

  async function startPollingForLabel() {
    // Voorkom dubbele polling
    if (isPollingRef.current) {
      console.log('Polling al actief, skip...')
      return
    }

    isPollingRef.current = true
    setPollingLabel(true)
    maxAttemptsRef.current = 0
    const MAX_ATTEMPTS = 60 // Poll voor maximaal 60 seconden (elke 2 seconden)
    
    const poll = async () => {
      // Check of we nog moeten pollen
      if (!isPollingRef.current) {
        return
      }

      maxAttemptsRef.current++
      
      try {
        const response = await fetch(`/api/returns/${returnId}`)
        const data = await response.json()
        
        if (response.ok && data.return) {
          setReturnData(data.return)
          
          // Als label is gegenereerd, stop polling
          if (data.return.status === 'return_label_generated' && data.return.return_label_url) {
            stopPolling()
            toast.success(t('labelReadyToast'))
            return
          }
          
          // Als max attempts bereikt, stop polling
          if (maxAttemptsRef.current >= MAX_ATTEMPTS) {
            stopPolling()
            toast.error(t('labelSlowToast'))
            return
          }
          
          // Blijf pollen als status nog payment_completed of payment_pending is
          // OF als status generated is maar URL nog niet bestaat
          if (data.return.status === 'return_label_payment_completed' || 
              data.return.status === 'return_label_payment_pending' ||
              (data.return.status === 'return_label_generated' && !data.return.return_label_url)) {
            // Schedule volgende poll (maar alleen als we nog actief zijn)
            if (isPollingRef.current) {
              pollingTimeoutRef.current = setTimeout(poll, 2000)
            }
          } else {
            // Onverwachte status, stop polling
            stopPolling()
            console.log(`Stopped polling: unexpected status ${data.return.status}`)
          }
        } else {
          // Stop polling bij error response
          stopPolling()
        }
      } catch (error) {
        console.error('Error polling for label:', error)
        // Retry bij error, maar alleen als we onder max attempts zijn
        if (maxAttemptsRef.current < MAX_ATTEMPTS && isPollingRef.current) {
          pollingTimeoutRef.current = setTimeout(poll, 2000)
        } else {
          stopPolling()
        }
      }
    }
    
    // Start eerste poll na 1 seconde (geef webhook tijd)
    pollingTimeoutRef.current = setTimeout(poll, 1000)
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

      // Payment is created on demand when the customer clicks "Betaal via Mollie"

      // Return data voor gebruikers van deze functie
      return data.return
    } catch (error: any) {
      toast.error(error.message || t('returnLoadFailed'))
      router.push('/account')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateFreeLabel() {
    if (!returnData) return
    setGeneratingFreeLabel(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/generate-label`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('labelCreateFailed'))
      }
      toast.success(t('labelCreatedToast'))
      await fetchReturn()
    } catch (err: any) {
      toast.error(err.message || t('labelCreateFailed'))
    } finally {
      setGeneratingFreeLabel(false)
    }
  }

  async function startMolliePayment() {
    setPaymentLoading(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      if (!data.checkoutUrl) {
        throw new Error(t('noCheckoutUrl'))
      }

      window.location.href = data.checkoutUrl
    } catch (error: any) {
      toast.error(error.message || t('paymentPrepareFailed'))
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
    const known = [
      'return_requested',
      'return_approved',
      'return_label_payment_pending',
      'return_label_payment_completed',
      'return_label_generated',
      'return_in_transit',
      'return_received',
      'refund_processing',
      'refunded',
      'return_rejected',
    ]
    return known.includes(status) ? t(`status.${status}`) : status
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!returnData) {
    return (
      <div className="min-h-screen px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
            <p className="text-gray-600 mb-6 text-lg">{t('returnNotFound')}</p>
            <Link
              href="/account"
              className="mose-button mose-button--primary"
            >
              {t('backToAccount')}
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
          <h1 className="text-4xl md:text-5xl font-display">{t('detailsTitle')}</h1>
        </div>

        {/* Status */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-bold text-xl mb-2">
                {t('returnNumber', { id: returnData.id.slice(0, 8).toUpperCase() })}
              </h2>
              <span className={`inline-block px-4 py-2 text-sm font-bold uppercase ${getStatusColor(returnData.status)}`}>
                {getStatusText(returnData.status)}
              </span>
            </div>
            {returnData.total_refund && (
              <div className="text-left md:text-right">
                <p className="text-2xl font-display">{formatBedrag(returnData.total_refund, locale)}</p>
                <p className="text-sm text-gray-600">{t('refundTotal')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Free Label - klant mag zelf retourlabel genereren */}
        {returnData.label_mode === 'customer_free' &&
          returnData.status === 'return_label_payment_completed' &&
          !returnData.return_label_url && (
            <div className="bg-green-50 border-2 border-green-500 p-6 mb-6">
              <h3 className="text-xl font-display mb-2">{t('freeLabelTitle')}</h3>
              <p className="mb-4">
                {t('freeLabelText')}
              </p>
              <button
                onClick={handleGenerateFreeLabel}
                disabled={generatingFreeLabel}
                className="w-full px-8 py-4 bg-green-600 text-white font-bold uppercase tracking-wider hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {generatingFreeLabel ? t('creatingLabel') : t('createLabel')}
              </button>
            </div>
          )}

        {/* In-Store drop-off instructies */}
        {returnData.label_mode === 'in_store' &&
          returnData.status === 'return_approved' && (
            <div className="bg-yellow-50 border-2 border-yellow-500 p-6 mb-6">
              <h3 className="text-xl font-display mb-2">{t('inStoreTitle')}</h3>
              <p className="mb-3">
                {t.rich('inStoreText', {
                  number: () => (
                    <span className="font-mono font-bold">
                      #{returnData.id.slice(0, 8).toUpperCase()}
                    </span>
                  ),
                })}
              </p>
              <p className="text-sm text-gray-600">
                {t.rich('inStoreContact', {
                  link: (chunks) => (
                    <Link href="/contact" className="underline font-bold">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          )}

        {returnData.label_mode === 'in_store' &&
          returnData.status === 'return_received' && (
            <div className="bg-blue-50 border-2 border-blue-500 p-6 mb-6">
              <h3 className="text-xl font-display mb-2">{t('inStoreReceivedTitle')}</h3>
              <p>
                {t('inStoreReceivedText')}
              </p>
            </div>
          )}

        {/* Payment Section - Klant moet direct betalen na aanvraag */}
        {returnData.status === 'return_label_payment_pending' && (
          <div className="bg-orange-50 border-2 border-orange-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">{t('payLabelTitle')}</h3>
            <p className="mb-4">
              {t('payLabelText', { amount: formatBedrag(returnData.return_label_cost_incl_btw, locale) })}
            </p>
            {paymentLoading ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{t('redirectingMollie')}</p>
              </div>
            ) : (
              <button
                onClick={startMolliePayment}
                className="w-full px-8 py-4 bg-orange-500 text-white font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors"
              >
                {t('payViaMollie', { amount: formatBedrag(returnData.return_label_cost_incl_btw, locale) })}
              </button>
            )}
          </div>
        )}

        {/* Payment Completed - Label Generating */}
        {returnData.status === 'return_label_payment_completed' &&
          !returnData.return_label_url &&
          returnData.label_mode !== 'customer_free' && (
          <div className="bg-purple-50 border-2 border-purple-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">{t('paymentCompletedTitle')}</h3>
            <p className="mb-4">
              {t('paymentCompletedText')}
            </p>
            {pollingLabel && (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{t('generatingLabel')}</p>
                <p className="text-xs text-gray-500 mt-2">{t('autoRefresh')}</p>
              </div>
            )}
            {!pollingLabel && (
              <button
                onClick={async () => {
                  await fetchReturn()
                  if (!isPollingRef.current) {
                    startPollingForLabel()
                  }
                }}
                className="w-full px-8 py-4 bg-purple-500 text-white font-bold uppercase tracking-wider hover:bg-purple-600 transition-colors"
              >
                {t('refreshStatus')}
              </button>
            )}
          </div>
        )}

        {/* Label Generated */}
        {returnData.status === 'return_label_generated' && returnData.return_label_url && (
          <div className="bg-green-50 border-2 border-green-500 p-6 mb-6">
            <h3 className="text-xl font-display mb-4">{t('labelAvailableTitle')}</h3>
            <p className="mb-4">
              {t('labelAvailableText')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`/api/returns/${returnData.id}/download-label`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-green-500 text-white font-bold uppercase tracking-wider hover:bg-green-600 transition-colors text-center"
              >
                {t('downloadLabel')}
              </a>
              {returnData.return_tracking_url && (
                <a
                  href={returnData.return_tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 border-2 border-green-500 text-green-700 font-bold uppercase tracking-wider hover:bg-green-500 hover:text-white transition-colors text-center"
                >
                  {t('trackReturn')}
                </a>
              )}
            </div>
            {returnData.return_tracking_code && (
              <p className="mt-4 text-sm text-gray-600">
                {t('trackingCode')} <span className="font-mono font-bold">{returnData.return_tracking_code}</span>
              </p>
            )}
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">{t('orderInfo')}</h2>
          <div className="space-y-2">
            <p><strong>{t('orderNumberLabel')}</strong> #{returnData.orders.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>{t('deliveredOnLabel')}</strong> {returnData.orders.delivered_at ? new Date(returnData.orders.delivered_at).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }) : 'N/A'}</p>
          </div>
        </div>

        {/* Return Items */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">{t('returnItems')}</h2>
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
                        quality={90}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{orderItem.product_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {t('itemMeta', { size: orderItem.size, color: orderItem.color, quantity: returnItem.quantity })}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>{t('reasonLabel')}</strong> {reasonLabel(returnItem.reason)}
                    </p>
                    <p className="font-bold mt-2">{formatBedrag((orderItem.price_at_purchase * returnItem.quantity), locale)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Return Info */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">{t('returnInfo')}</h2>
          <div className="space-y-2">
            <p><strong>{t('reasonLabel')}</strong> {reasonLabel(returnData.return_reason)}</p>
            {returnData.customer_notes && (
              <p><strong>{t('notesLabel')}</strong> {returnData.customer_notes}</p>
            )}
            <p><strong>{t('requestedOnLabel')}</strong> {new Date(returnData.created_at).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}</p>
          </div>
        </div>

        {/* Refund Summary */}
        <div className="bg-black text-white p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">{t('refundSummary')}</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t('refundItems')}</span>
              <span className="font-bold">{formatBedrag(returnData.refund_amount, locale)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{t('labelCostPaid')}</span>
              <span>{formatBedrag(returnData.return_label_cost_incl_btw, locale)}</span>
            </div>
            <div className="border-t-2 border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-xl font-display">
                <span>{t('refundTotal')}</span>
                <span>{formatBedrag(returnData.total_refund, locale)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {t('refundNote')}
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
            {t('backToReturns')}
          </Link>
        </div>
      </div>
    </div>
  )
}

