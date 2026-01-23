'use client'

import { useEffect, useState } from 'react'
import { PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js'
import { PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import toast from 'react-hot-toast'

interface ExpressCheckoutProps {
  cartItems: Array<{
    productId: string
    variantId: string
    name: string
    size: string
    color: string
    price: number
    quantity: number
    image: string
    sku: string
  }>
  subtotal: number
  shippingCost: number
  discount: number
  promoCode?: string
  userEmail?: string
}

export default function ExpressCheckout({
  cartItems,
  subtotal,
  shippingCost,
  discount,
  promoCode,
  userEmail,
}: ExpressCheckoutProps) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const stripe = useStripe()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (cartItems.length === 0 || !stripe) return

    async function initializePaymentRequest() {
      if (!stripe) return

      const total = subtotal - discount + shippingCost
      const totalInCents = Math.round(total * 100)
      const subtotalInCents = Math.round(subtotal * 100)
      const shippingInCents = Math.round(shippingCost * 100)
      const discountInCents = Math.round(discount * 100)

      // Create payment request
      const pr = stripe.paymentRequest({
        country: 'NL',
        currency: 'eur',
        total: {
          label: 'Totaal',
          amount: totalInCents,
        },
        displayItems: [
          {
            label: 'Subtotaal',
            amount: subtotalInCents,
          },
          ...(discount > 0 ? [{
            label: `Korting${promoCode ? ` (${promoCode})` : ''}`,
            amount: -discountInCents,
          }] : []),
          {
            label: 'Verzending',
            amount: shippingInCents,
          },
        ],
        requestPayerName: true,
        requestPayerEmail: true,
        requestShipping: true,
        shippingOptions: [
          {
            id: 'standard',
            label: 'Standaard verzending',
            amount: shippingInCents,
            detail: '2-3 werkdagen',
          },
        ],
      })

      // Check if payment request is available
      const result = await pr.canMakePayment()
      
      if (result) {
        setPaymentRequest(pr)

        // Handle payment method
        pr.on('paymentmethod', async (e: PaymentRequestPaymentMethodEvent) => {
          setIsProcessing(true)

          try {
            // Validate stock availability
            for (const item of cartItems) {
              const { data: variant } = await supabase
                .from('product_variants')
                .select('stock_quantity, is_available')
                .eq('id', item.variantId)
                .single()

              if (!variant || !variant.is_available || variant.stock_quantity < item.quantity) {
                e.complete('fail')
                toast.error(`${item.name} is niet meer op voorraad`)
                setIsProcessing(false)
                return
              }
            }

            // Create order in database
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                email: e.payerEmail,
                status: 'pending',
                total: subtotal - discount + shippingCost,
                subtotal: subtotal - discount,
                shipping_cost: shippingCost,
                tax_amount: 0,
                promo_code: promoCode || null,
                discount_amount: discount,
                shipping_address: {
                  name: e.payerName,
                  address: e.shippingAddress?.addressLine?.[0] || '',
                  city: e.shippingAddress?.city || '',
                  postalCode: e.shippingAddress?.postalCode || '',
                  country: e.shippingAddress?.country || 'NL',
                  phone: e.payerPhone || '',
                },
                billing_address: {
                  name: e.payerName,
                  address: e.shippingAddress?.addressLine?.[0] || '',
                  city: e.shippingAddress?.city || '',
                  postalCode: e.shippingAddress?.postalCode || '',
                  country: e.shippingAddress?.country || 'NL',
                  phone: e.payerPhone || '',
                },
              })
              .select()
              .single()

            if (orderError || !order) {
              e.complete('fail')
              toast.error('Fout bij het aanmaken van de bestelling')
              setIsProcessing(false)
              return
            }

            // Create order items
            const orderItems = cartItems.map(item => ({
              order_id: order.id,
              product_id: item.productId,
              variant_id: item.variantId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              color: item.color,
            }))

            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems)

            if (itemsError) {
              e.complete('fail')
              toast.error('Fout bij het toevoegen van producten')
              setIsProcessing(false)
              return
            }

            // Create payment intent
            const response = await fetch('/api/create-payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                amount: Math.round((subtotal - discount + shippingCost) * 100),
                paymentMethodId: e.paymentMethod.id,
              }),
            })

            const { clientSecret, error: intentError } = await response.json()

            if (intentError || !clientSecret) {
              e.complete('fail')
              toast.error('Fout bij het verwerken van de betaling')
              setIsProcessing(false)
              return
            }

            // Confirm payment
            if (!stripe) {
              e.complete('fail')
              setIsProcessing(false)
              return
            }

            const { error: confirmError } = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: e.paymentMethod.id },
              { handleActions: false }
            )

            if (confirmError) {
              e.complete('fail')
              toast.error(confirmError.message || 'Betaling mislukt')
              setIsProcessing(false)
              return
            }

            // Success!
            e.complete('success')

            // Track conversion
            trackPixelEvent('Purchase', {
              content_ids: cartItems.map(item => item.productId),
              content_name: cartItems.map(item => item.name).join(', '),
              content_type: 'product',
              value: subtotal - discount + shippingCost,
              currency: 'EUR',
              num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            })

            // Clear cart and redirect
            toast.success('Betaling geslaagd!')
            router.push(`/order-confirmation?order_id=${order.id}`)
            
          } catch (error: any) {
            e.complete('fail')
            toast.error('Er is een fout opgetreden')
            setIsProcessing(false)
          }
        })

        // Handle cancel
        pr.on('cancel', () => {
          setIsProcessing(false)
        })
      }
    }

    initializePaymentRequest()
  }, [cartItems, subtotal, shippingCost, discount, promoCode, stripe])

  if (!paymentRequest || isProcessing) {
    return null
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Stripe Payment Request Button (Apple Pay / Google Pay) - Direct, geen box */}
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'buy',
              theme: 'dark',
              height: '56px',
            },
          },
        }}
      />

      {/* Divider - subtiel */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="uppercase tracking-wide">of vul in</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>
    </div>
  )
}

