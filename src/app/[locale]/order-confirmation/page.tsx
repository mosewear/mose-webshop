'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { trackPurchase } from '@/lib/analytics'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

interface Order {
  id: string
  email: string
  shipping_address: any // JSONB
  billing_address: any // JSONB
  subtotal: number
  shipping_cost: number
  total: number
  discount_amount?: number
  promo_code?: string
  status: string
  payment_status: string
  created_at: string
}

interface OrderItem {
  id: string
  product_name: string
  size: string
  color: string
  sku: string
  quantity: number
  price_at_purchase: number
  subtotal: number
  image_url: string | null
}

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; order_id?: string; payment_intent?: string }>
}) {
  const t = useTranslations('orderConfirmation')
  const params = use(searchParams)
  const { locale } = useParams() as { locale: string }
  const orderId = params.order_id || params.order // Support both order_id and order
  const paymentIntentId = params.payment_intent
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const { clearCart } = useCart()

  useEffect(() => {
    console.log('🔍 Order Confirmation - Params:', { orderId, paymentIntentId })
    
    // Clear cart on successful order confirmation
    clearCart()
    
    // Clear promo code from localStorage (VOORSTEL 1: Auto-clear after successful order)
    console.log('🎟️ Clearing promo code from localStorage after successful order')
    localStorage.removeItem('mose_promo_code')
    localStorage.removeItem('mose_promo_discount')
    localStorage.removeItem('mose_promo_type')
    localStorage.removeItem('mose_promo_value')
    
    if (orderId || paymentIntentId) {
      fetchOrder()
    } else {
      console.error('❌ No orderId or paymentIntentId provided!')
      setLoading(false)
    }
  }, [orderId, paymentIntentId])

  async function fetchOrder() {
    try {
      console.log('═══════════════════════════════════════════')
      console.log('🔵 ORDER CONFIRMATION - FETCH ORDER START')
      console.log('═══════════════════════════════════════════')
      console.log('📋 Order ID:', orderId)
      console.log('💳 Payment Intent ID:', paymentIntentId)
      
      // STEP 1: If we have payment_intent, check status first (fallback mechanism)
      if (paymentIntentId) {
        console.log('🔍 [STEP 1] Checking payment status via fallback...')
        const statusResponse = await fetch(`/api/check-payment-status?payment_intent=${paymentIntentId}`)
        console.log('📡 [STEP 1] Response status:', statusResponse.status, statusResponse.statusText)
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('✅ [STEP 1] Payment status checked:', statusData)
          if (statusData.fallback_applied) {
            console.log('🔧 [STEP 1] Fallback applied - order updated to PAID')
          }
        } else {
          console.error('❌ [STEP 1] Failed to check payment status')
        }
      } else {
        console.log('⏭️  [STEP 1] No payment intent ID - skipping fallback check')
      }
      
      // STEP 2: Fetch order details
      const params = new URLSearchParams()
      if (orderId) params.append('order_id', orderId)
      if (paymentIntentId) params.append('payment_intent', paymentIntentId)

      console.log('📡 [STEP 2] Fetching order via API...')
      console.log('🔗 [STEP 2] API URL:', `/api/get-order?${params.toString()}`)
      
      const response = await fetch(`/api/get-order?${params.toString()}`)
      console.log('📡 [STEP 2] Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [STEP 2] Error fetching order:', errorData)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log('✅ [STEP 2] Order fetched successfully!')
      console.log('📦 [STEP 2] Order ID:', data.order.id)
      console.log('💰 [STEP 2] Order Total:', data.order.total)
      console.log('💳 [STEP 2] Payment Status:', data.order.payment_status)
      console.log('📧 [STEP 2] Email:', data.order.email)
      console.log('📅 [STEP 2] Last Email Sent At:', data.order.last_email_sent_at)
      console.log('📋 [STEP 2] Order Items Count:', data.items.length)
      
      // Check if API response indicates email was sent
      if (data.email_sent) {
        console.log('✅ [EMAIL] API confirms email was sent in this request!')
      } else if (data.order.last_email_sent_at) {
        console.log('✅ [EMAIL] Email was sent previously at:', data.order.last_email_sent_at)
      } else {
        console.log('⚠️ [EMAIL] No indication that email was sent!')
        console.log('⚠️ [EMAIL] Check server logs for email sending attempts')
      }
      
      setOrder(data.order)
      setOrderItems(data.items)
      setLoading(false)
      
      // Trigger Trustpilot review invitation
      // Trustpilot requires the invitation to be sent after DOMContentLoaded
      const sendTrustpilotInvitation = () => {
        const recipientName = data.order.shipping_address?.name || 
                             `${data.order.shipping_address?.firstName || ''} ${data.order.shipping_address?.lastName || ''}`.trim() ||
                             'Customer'
        
        const trustpilot_invitation = {
          recipientEmail: data.order.email,
          recipientName: recipientName,
          referenceId: data.order.id,
          source: 'InvitationScript'
        }
        
        console.log('📧 [TRUSTPILOT] Preparing invitation:', trustpilot_invitation)
        
        // Wait for Trustpilot script to be fully loaded
        const checkTrustpilot = setInterval(() => {
          if (typeof window !== 'undefined' && (window as any).tp && typeof (window as any).tp === 'function') {
            clearInterval(checkTrustpilot)
            
            try {
              console.log('✅ [TRUSTPILOT] Script loaded, sending invitation...')
              ;(window as any).tp('createInvitation', trustpilot_invitation)
              console.log('✅ [TRUSTPILOT] Invitation sent successfully!')
            } catch (error) {
              console.error('❌ [TRUSTPILOT] Error sending invitation:', error)
            }
          }
        }, 100)
        
        // Stop checking after 10 seconds
        setTimeout(() => {
          clearInterval(checkTrustpilot)
          if (typeof window !== 'undefined' && !(window as any).tp) {
            console.warn('⚠️ [TRUSTPILOT] Script not loaded after 10 seconds, invitation may not be sent')
          }
        }, 10000)
      }
      
      // Wait for DOM to be ready (as Trustpilot recommends)
      if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', sendTrustpilotInvitation)
        } else {
          // DOM already loaded
          sendTrustpilotInvitation()
        }
      }
      
      console.log('🎯 [STEP 3] Tracking analytics...')
      
      // Track Facebook Pixel Purchase event (MOST IMPORTANT!)
      // Dual tracking: Client + Server (CAPI) with user data
      trackPixelEvent('Purchase', {
        content_ids: data.items.map((item: OrderItem) => item.id),
        value: data.order.total,
        currency: 'EUR',
        num_items: data.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0),
        transaction_id: data.order.id
      }, {
        email: data.order.email,
        firstName: data.order.shipping_address?.firstName,
        lastName: data.order.shipping_address?.lastName,
        phone: data.order.shipping_address?.phone,
        city: data.order.shipping_address?.city,
        zip: data.order.shipping_address?.postalCode,
        country: data.order.shipping_address?.country || 'NL'
      })
      
      // Track custom analytics purchase event
      trackPurchase({
        id: data.order.id,
        total: data.order.total,
        items_count: data.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0),
        items: data.items.map((item: OrderItem) => ({
          id: item.id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price_at_purchase,
        })),
      })
      
      console.log('✅ [STEP 3] Analytics tracked!')
      console.log('═══════════════════════════════════════════')
      console.log('✅ ORDER CONFIRMATION - FETCH ORDER COMPLETE')
      console.log('═══════════════════════════════════════════')
    } catch (error) {
      console.error('═══════════════════════════════════════════')
      console.error('❌ ORDER CONFIRMATION - FETCH ORDER FAILED')
      console.error('═══════════════════════════════════════════')
      console.error('❌ Error:', error)
      console.error('❌ Error message:', (error as Error).message)
      console.error('❌ Error stack:', (error as Error).stack)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-display mb-4">{t('notFound.title')}</h1>
          <p className="text-gray-600 mb-8">{t('notFound.message')}</p>
          <Link
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            {t('notFound.button')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO SECTION - Full Screen Success */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-32 pt-24 md:pt-32">
        <div className="text-center max-w-3xl mx-auto">
          {/* Animated Check Icon */}
          <div className="relative mb-8 animate-fadeIn">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-brand-primary rounded-full flex items-center justify-center mx-auto shadow-2xl animate-success">
              <svg className="w-14 h-14 md:w-20 md:h-20 text-white animate-fadeIn" style={{ animationDelay: '0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display mb-6 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            {t('success.title')}
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 mb-3 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            {t('success.subtitle')}
          </p>
          
          <p className="text-gray-600 mb-8 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            {t('success.emailSent')}<br />
            <span className="font-semibold text-black">{order.email}</span>
          </p>

          {/* Order Number Badge */}
          <div className="inline-block bg-white border-2 border-black px-6 py-3 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{t('success.orderNumber')}</p>
            <p className="font-mono text-lg font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">{t('success.scrollHint')}</p>
          </div>
        </div>
      </div>

      {/* ORDER DETAILS SECTION */}
      <div className="bg-white border-t-4 border-black py-16 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Your Items */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-display mb-8 text-center">{t('items.title')}</h2>
            <div className="grid gap-6">
              {orderItems.map((item) => (
                <div key={item.id} className="bg-gray-50 border-2 border-gray-200 p-6 flex gap-6 hover:border-black transition-colors">
                  <div className="relative w-24 h-32 md:w-32 md:h-40 bg-white border-2 border-gray-300 flex-shrink-0">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        sizes="(max-width: 768px) 96px, 128px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg mb-2">{item.product_name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{t('items.size')} <span className="font-semibold text-black">{item.size}</span></p>
                      <p>{t('items.color')} <span className="font-semibold text-black">{item.color}</span></p>
                      <p>{t('items.quantity')} <span className="font-semibold text-black">{item.quantity}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl">€{item.subtotal.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-black text-white p-8 mb-16">
            <div className="max-w-md ml-auto space-y-4">
              <div className="flex justify-between text-lg">
                <span>{t('summary.subtotal')}</span>
                <span className="font-semibold">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{t('summary.vat')}</span>
                <span className="text-gray-300">€{(order.subtotal - order.subtotal / 1.21).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>{t('summary.shipping')}</span>
                <span className="font-semibold">
                  {order.shipping_cost === 0 ? (
                    <span className="text-brand-primary">{t('summary.free')}</span>
                  ) : (
                    `€${order.shipping_cost.toFixed(2)}`
                  )}
                </span>
              </div>
              {order.promo_code && order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-lg text-brand-primary">
                  <span>🎟️ {t('summary.discount')} ({order.promo_code})</span>
                  <span className="font-semibold">-€{order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t-2 border-white pt-4 flex justify-between items-center text-2xl md:text-3xl">
                <span className="font-display">{t('summary.total')}</span>
                <span className="font-display">€{order.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-300 text-right">
                {t('summary.inclVat', { amount: (order.total - order.total / 1.21).toFixed(2) })}
              </p>
            </div>
          </div>

          {/* Delivery Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-gray-50 border-2 border-gray-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">{t('delivery.shippingAddress')}</h3>
              <div className="space-y-1 text-gray-700">
                <p className="font-semibold text-black">{order.shipping_address?.name}</p>
                <p>{order.shipping_address?.address}</p>
                <p>{order.shipping_address?.postalCode} {order.shipping_address?.city}</p>
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">{t('delivery.contact')}</h3>
              <div className="space-y-1 text-gray-700">
                <p className="font-semibold text-black">{order.email}</p>
                <p>{order.shipping_address?.phone}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-display mb-12 text-center">{t('timeline.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  1
                </div>
                <h3 className="font-bold text-lg mb-2">{t('timeline.step1.title')}</h3>
                <p className="text-gray-600 text-sm">
                  {t('timeline.step1.description')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  2
                </div>
                <h3 className="font-bold text-lg mb-2">{t('timeline.step2.title')}</h3>
                <p className="text-gray-600 text-sm">
                  {t('timeline.step2.description')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  3
                </div>
                <h3 className="font-bold text-lg mb-2">{t('timeline.step3.title')}</h3>
                <p className="text-gray-600 text-sm">
                  {t('timeline.step3.description')}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link
              href="/shop"
              className="block py-5 bg-brand-primary text-white text-center font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-all transform hover:scale-105"
            >
              {t('actions.continueShopping')}
            </Link>
            <Link
              href="/contact"
              className="block py-5 border-2 border-black text-black text-center font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-all transform hover:scale-105"
            >
              {t('actions.contact')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
