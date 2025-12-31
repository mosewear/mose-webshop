'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  customer_name: string
  customer_email: string
  shipping_address: string
  phone: string
  subtotal: number
  shipping_cost: number
  total: number
  status: string
  payment_status: string
  created_at: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: {
    name: string
    slug: string
  }
  product_variants: {
    size: string
    color: string
    sku: string
  }
  product_images: {
    url: string
  }[]
}

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const params = use(searchParams)
  const orderId = params.order
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  async function fetchOrder() {
    const supabase = createClient()

    // Fetch order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      setLoading(false)
      return
    }

    setOrder(orderData)

    // Fetch order items with product info
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products!order_items_product_id_fkey(name, slug),
        product_variants!order_items_variant_id_fkey(size, color, sku)
      `)
      .eq('order_id', orderId)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
    } else {
      // Fetch primary image for each product
      const itemsWithImages = await Promise.all(
        itemsData.map(async (item: any) => {
          const { data: imageData } = await supabase
            .from('product_images')
            .select('url')
            .eq('product_id', item.product_id)
            .eq('is_primary', true)
            .limit(1)
            .single()

          return {
            ...item,
            product_images: imageData ? [imageData] : [],
          }
        })
      )
      setOrderItems(itemsWithImages)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 flex items-center justify-center pt-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Bestelling laden...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-display mb-6">BESTELLING NIET GEVONDEN</h1>
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
    <div className="min-h-screen px-4 pb-16 pt-6">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-6xl font-display mb-4">BEDANKT!</h1>
          <p className="text-xl text-gray-700 mb-2">Je bestelling is geplaatst</p>
          <p className="text-gray-600">
            We hebben een bevestiging gestuurd naar <span className="font-semibold">{order.customer_email}</span>
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white border-2 border-black p-6 md:p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-2">Bestelnummer</h2>
              <p className="font-mono text-lg">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-2">Besteldatum</h2>
              <p className="text-lg">{new Date(order.created_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-2">Bezorgadres</h2>
              <p className="text-gray-700">{order.customer_name}</p>
              <p className="text-gray-700">{order.shipping_address}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-2">Contact</h2>
              <p className="text-gray-700">{order.customer_email}</p>
              <p className="text-gray-700">{order.phone}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t-2 border-gray-200 pt-8">
            <h2 className="text-2xl font-display mb-6">JOUW ITEMS</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="relative w-20 h-24 bg-gray-100 flex-shrink-0">
                    {item.product_images.length > 0 ? (
                      <Image
                        src={item.product_images[0].url}
                        alt={item.products.name}
                        fill
                        sizes="80px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <Link
                      href={`/product/${item.products.slug}`}
                      className="font-bold hover:text-brand-primary transition-colors"
                    >
                      {item.products.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      Maat: {item.product_variants.size} • Kleur: {item.product_variants.color}
                    </p>
                    <p className="text-sm text-gray-500">Aantal: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="border-t-2 border-gray-200 pt-6 mt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotaal</span>
              <span className="font-semibold">€{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verzending</span>
              <span className="font-semibold">
                {order.shipping_cost === 0 ? (
                  <span className="text-green-600">GRATIS</span>
                ) : (
                  `€${order.shipping_cost.toFixed(2)}`
                )}
              </span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-black pt-4 text-xl">
              <span className="font-bold">Totaal</span>
              <span className="font-display text-2xl">€{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-gray-50 border-2 border-gray-300 p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-display mb-6">WAT GEBEURT ER NU?</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold mb-1">Bevestiging per e-mail</h3>
                <p className="text-gray-600 text-sm">
                  Je ontvangt binnen enkele minuten een bevestiging met alle details van je bestelling.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold mb-1">We pakken je bestelling in</h3>
                <p className="text-gray-600 text-sm">
                  Binnen 1-2 werkdagen pakken we je bestelling zorgvuldig in en maken deze klaar voor verzending.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold mb-1">Verzending & tracking</h3>
                <p className="text-gray-600 text-sm">
                  Je ontvangt een track & trace code zodra je bestelling onderweg is. Verwachte levertijd: 2-3 werkdagen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/shop"
            className="flex-1 py-4 bg-brand-primary text-white text-center font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            Verder shoppen
          </Link>
          <Link
            href="/contact"
            className="flex-1 py-4 border-2 border-black text-black text-center font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            Contact opnemen
          </Link>
        </div>
      </div>
    </div>
  )
}


