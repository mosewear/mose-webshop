'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'

interface Order {
  id: string
  email: string
  shipping_address: any // JSONB
  billing_address: any // JSONB
  subtotal: number
  shipping_cost: number
  total: number
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
  const params = use(searchParams)
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
    
    if (orderId || paymentIntentId) {
      fetchOrder()
    } else {
      console.error('❌ No orderId or paymentIntentId provided!')
      setLoading(false)
    }
  }, [orderId, paymentIntentId])

  async function fetchOrder() {
    try {
      // STEP 1: If we have payment_intent, check status first (fallback mechanism)
      if (paymentIntentId) {
        console.log('🔍 Checking payment status via fallback...')
        const statusResponse = await fetch(`/api/check-payment-status?payment_intent=${paymentIntentId}`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('✅ Payment status checked:', statusData)
          if (statusData.fallback_applied) {
            console.log('🔧 Fallback applied - order updated to PAID')
          }
        }
      }
      
      // STEP 2: Fetch order details
      const params = new URLSearchParams()
      if (orderId) params.append('order_id', orderId)
      if (paymentIntentId) params.append('payment_intent', paymentIntentId)

      console.log('📡 Fetching order via API...')
      
      const response = await fetch(`/api/get-order?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Error fetching order:', errorData)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log('✅ Order fetched:', data.order.id)
      
      setOrder(data.order)
      setOrderItems(data.items)
      setLoading(false)
    } catch (error) {
      console.error('❌ Failed to fetch order:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Bestelling laden...</p>
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
          <h1 className="text-3xl md:text-4xl font-display mb-4">BESTELLING NIET GEVONDEN</h1>
          <p className="text-gray-600 mb-8">We kunnen deze bestelling niet vinden. Controleer de link of neem contact met ons op.</p>
          <Link
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            Naar shop
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
            BEDANKT!
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 mb-3 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            Je bestelling is geplaatst
          </p>
          
          <p className="text-gray-600 mb-8 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            We hebben een bevestiging gestuurd naar<br />
            <span className="font-semibold text-black">{order.email}</span>
          </p>

          {/* Order Number Badge */}
          <div className="inline-block bg-white border-2 border-black px-6 py-3 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Bestelnummer</p>
            <p className="font-mono text-lg font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">Scroll voor details</p>
          </div>
        </div>
      </div>

      {/* ORDER DETAILS SECTION */}
      <div className="bg-white border-t-4 border-black py-16 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Your Items */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-display mb-8 text-center">JOUW ITEMS</h2>
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
                      <p>Maat: <span className="font-semibold text-black">{item.size}</span></p>
                      <p>Kleur: <span className="font-semibold text-black">{item.color}</span></p>
                      <p>Aantal: <span className="font-semibold text-black">{item.quantity}</span></p>
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
                <span>Subtotaal</span>
                <span className="font-semibold">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Waarvan BTW (21%)</span>
                <span className="text-gray-300">€{(order.subtotal - order.subtotal / 1.21).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Verzending</span>
                <span className="font-semibold">
                  {order.shipping_cost === 0 ? (
                    <span className="text-brand-primary">GRATIS</span>
                  ) : (
                    `€${order.shipping_cost.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="border-t-2 border-white pt-4 flex justify-between items-center text-2xl md:text-3xl">
                <span className="font-display">Totaal</span>
                <span className="font-display">€{order.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-300 text-right">Incl. €{(order.total - order.total / 1.21).toFixed(2)} BTW</p>
            </div>
          </div>

          {/* Delivery Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-gray-50 border-2 border-gray-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">Bezorgadres</h3>
              <div className="space-y-1 text-gray-700">
                <p className="font-semibold text-black">{order.shipping_address?.name}</p>
                <p>{order.shipping_address?.address}</p>
                <p>{order.shipping_address?.postalCode} {order.shipping_address?.city}</p>
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">Contact</h3>
              <div className="space-y-1 text-gray-700">
                <p className="font-semibold text-black">{order.email}</p>
                <p>{order.shipping_address?.phone}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-display mb-12 text-center">WAT GEBEURT ER NU?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  1
                </div>
                <h3 className="font-bold text-lg mb-2">Bevestiging per e-mail</h3>
                <p className="text-gray-600 text-sm">
                  Je ontvangt binnen enkele minuten een bevestiging met alle details.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  2
                </div>
                <h3 className="font-bold text-lg mb-2">We pakken je bestelling in</h3>
                <p className="text-gray-600 text-sm">
                  Binnen 1-2 werkdagen pakken we alles zorgvuldig in.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center font-display text-2xl mx-auto mb-4">
                  3
                </div>
                <h3 className="font-bold text-lg mb-2">Verzending & tracking</h3>
                <p className="text-gray-600 text-sm">
                  Track & trace code bij verzending. Levertijd: 2-3 werkdagen.
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
              Verder shoppen
            </Link>
            <Link
              href="/contact"
              className="block py-5 border-2 border-black text-black text-center font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-all transform hover:scale-105"
            >
              Contact opnemen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
