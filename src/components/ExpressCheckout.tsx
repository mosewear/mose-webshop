'use client'

import { useEffect, useState } from 'react'
import { PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js'
import { PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import toast from 'react-hot-toast'
import { capitalizeName } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { calculateQuantityDiscount, type QuantityDiscountTier } from '@/lib/quantity-discount'

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
  staffelSavings?: number
  promoCode?: string
  userEmail?: string
}

export default function ExpressCheckout({
  cartItems,
  subtotal,
  shippingCost,
  discount,
  staffelSavings = 0,
  promoCode,
  userEmail,
}: ExpressCheckoutProps) {
  const tCheckout = useTranslations('checkout')
  const tErrors = useTranslations('errors')
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const stripe = useStripe()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (cartItems.length === 0 || !stripe) return

    async function initializePaymentRequest() {
      if (!stripe) return

      const total = subtotal - discount - staffelSavings + shippingCost
      const totalInCents = Math.round(total * 100)
      const subtotalInCents = Math.round((subtotal - staffelSavings) * 100)
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
      console.log('🍎 [Express Checkout] Apple Pay availability check:', {
        available: !!result,
        result: result,
        userAgent: navigator.userAgent,
        isHttps: window.location.protocol === 'https:',
        domain: window.location.hostname,
      })
      
      if (result) {
        console.log('✅ [Express Checkout] Payment request available:', result)
        setPaymentRequest(pr)

        // Handle payment method
        pr.on('paymentmethod', async (e: PaymentRequestPaymentMethodEvent) => {
          setIsProcessing(true)
          console.log('💳 [Express Checkout] Payment method received:', e.paymentMethod)

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
                total: subtotal - discount - staffelSavings + shippingCost,
                subtotal: subtotal - discount - staffelSavings,
                shipping_cost: shippingCost,
                tax_amount: 0,
                promo_code: promoCode || null,
                discount_amount: discount,
                shipping_address: {
                  name: capitalizeName(e.payerName || ''),
                  address: e.shippingAddress?.addressLine?.[0] || '',
                  city: e.shippingAddress?.city || '',
                  postalCode: e.shippingAddress?.postalCode || '',
                  country: e.shippingAddress?.country || 'NL',
                  phone: e.payerPhone || '',
                },
                billing_address: {
                  name: capitalizeName(e.payerName || ''),
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
              console.error('❌ [Express Checkout] Order creation failed:', orderError)
              e.complete('fail')
              toast.error('Fout bij het aanmaken van de bestelling')
              setIsProcessing(false)
              return
            }

            console.log('✅ [Express Checkout] Order created:', order.id)

            // Fetch quantity discount tiers
            const productIds = [...new Set(cartItems.map(i => i.productId))]
            const { data: allTiers } = await supabase
              .from('product_quantity_discounts')
              .select('*')
              .in('product_id', productIds)
              .eq('is_active', true)

            const { data: productPrices } = await supabase
              .from('products')
              .select('id, base_price, sale_price')
              .in('id', productIds)

            const tiersByProduct: Record<string, QuantityDiscountTier[]> = {}
            allTiers?.forEach(t => {
              if (!tiersByProduct[t.product_id]) tiersByProduct[t.product_id] = []
              tiersByProduct[t.product_id].push(t)
            })

            const salePriceMap: Record<string, boolean> = {}
            productPrices?.forEach(p => {
              salePriceMap[p.id] = !!(p.sale_price && p.sale_price < p.base_price)
            })

            // Group by product for quantity counting
            const qtyByProduct: Record<string, number> = {}
            cartItems.forEach(item => {
              qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.quantity
            })

            // Create order items with staffelkorting
            const orderItems = cartItems.map(item => {
              const tiers = tiersByProduct[item.productId]
              const hasSale = salePriceMap[item.productId]
              const totalQty = qtyByProduct[item.productId]

              if (!hasSale && tiers && tiers.length > 0) {
                const result = calculateQuantityDiscount(item.price, totalQty, tiers)
                return {
                  order_id: order.id,
                  product_id: item.productId,
                  variant_id: item.variantId,
                  quantity: item.quantity,
                  price_at_purchase: result.finalPrice,
                  original_price: item.price,
                  quantity_discount_amount: result.discountPerItem,
                  subtotal: result.finalPrice * item.quantity,
                  size: item.size,
                  color: item.color,
                }
              }

              return {
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId,
                quantity: item.quantity,
                price_at_purchase: item.price,
                original_price: item.price,
                quantity_discount_amount: 0,
                subtotal: item.price * item.quantity,
                size: item.size,
                color: item.color,
              }
            })

            // Update order total if staffelkorting applied
            const newSubtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
            if (Math.abs(newSubtotal - (subtotal - discount - staffelSavings)) > 0.01) {
              const newTotal = newSubtotal + shippingCost
              await supabase
                .from('orders')
                .update({ subtotal: newSubtotal, total: newTotal })
                .eq('id', order.id)
            }

            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems)

            if (itemsError) {
              console.error('❌ [Express Checkout] Order items creation failed:', itemsError)
              e.complete('fail')
              toast.error(tErrors('generic'))
              setIsProcessing(false)
              return
            }

            // Create payment intent
            const response = await fetch('/api/create-payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                amount: Math.round((subtotal - discount - staffelSavings + shippingCost) * 100),
                paymentMethodId: e.paymentMethod.id,
              }),
            })

            const { clientSecret, error: intentError } = await response.json()

            if (intentError || !clientSecret) {
              console.error('❌ [Express Checkout] Payment intent creation failed:', intentError)
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
              console.error('❌ [Express Checkout] Payment confirmation failed:', confirmError)
              e.complete('fail')
              toast.error(confirmError.message || 'Betaling mislukt')
              setIsProcessing(false)
              return
            }

            // Success!
            e.complete('success')
            console.log('✅ [Express Checkout] Payment successful!')

            // Track conversion
            trackPixelEvent('Purchase', {
              content_ids: cartItems.map(item => item.productId),
              content_name: cartItems.map(item => item.name).join(', '),
              content_type: 'product',
              value: subtotal - discount - staffelSavings + shippingCost,
              currency: 'EUR',
              num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            })

            // Clear cart and redirect
            toast.success('Betaling geslaagd!')
            router.push(`/order-confirmation?order_id=${order.id}`)
            
          } catch (error: any) {
            console.error('❌ [Express Checkout] Unexpected error:', error)
            e.complete('fail')
            toast.error('Er is een fout opgetreden')
            setIsProcessing(false)
          }
        })

        // Handle cancel
        pr.on('cancel', () => {
          console.log('⚠️ [Express Checkout] User cancelled payment')
          setIsProcessing(false)
        })
      } else {
        console.log('❌ [Express Checkout] Payment request NOT available - possible reasons:')
        console.log('- Not using Safari on iOS')
        console.log('- Apple Pay not set up on device')
        console.log('- Not on HTTPS (except localhost)')
        console.log('- Domain not registered with Apple')
      }
    }

    initializePaymentRequest()
  }, [cartItems, subtotal, shippingCost, discount, staffelSavings, promoCode, stripe])

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
        <span className="uppercase tracking-wide">{tCheckout('orFillIn')}</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>
    </div>
  )
}

