'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
import dynamic from 'next/dynamic'
import { loadStripe, Stripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PaymentMethod = 'ideal' | 'card' | 'klarna' | 'bancontact' | 'paypal'

const StripePaymentForm = dynamic(() => import('@/components/StripePaymentForm'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  ),
})

interface CheckoutForm {
  email: string
  firstName: string
  lastName: string
  address: string
  city: string
  postalCode: string
  phone: string
  country: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotal, clearCart } = useCart()
  const [form, setForm] = useState<CheckoutForm>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    country: 'NL',
  })
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({})
  const [loading, setLoading] = useState(false)
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [shippingCost, setShippingCost] = useState(5.95)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(50)
  const [currentStep, setCurrentStep] = useState<'details' | 'payment'>('details')
  const [orderId, setOrderId] = useState<string>()
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)

  const subtotal = getTotal()
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCost
  const total = subtotal + shipping

  useEffect(() => {
    // Load settings
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
    })
  }, [])

  useEffect(() => {
    // Redirect to cart if empty
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [items, router])

  const validateField = (field: keyof CheckoutForm, value: string): string | undefined => {
    switch (field) {
      case 'email':
        return !/\S+@\S+\.\S+/.test(value) ? 'Vul een geldig e-mailadres in' : undefined
      case 'firstName':
      case 'lastName':
        return !value.trim() ? 'Verplicht veld' : undefined
      case 'address':
        return !value.trim() ? 'Verplicht veld' : undefined
      case 'city':
        return !value.trim() ? 'Verplicht veld' : undefined
      case 'postalCode':
        return !value.trim() ? 'Verplicht veld' : undefined
      case 'phone':
        return !value.trim() ? 'Verplicht veld' : undefined
      case 'country':
        return !value.trim() ? 'Verplicht veld' : undefined
      default:
        return undefined
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<CheckoutForm> = {}
    
    Object.keys(form).forEach((key) => {
      const field = key as keyof CheckoutForm
      const error = validateField(field, form[field])
      if (error) newErrors[field] = error
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 CHECKOUT STARTED')
    console.log('📋 Form data:', form)
    console.log('🛒 Cart items:', items)
    console.log('💰 Totals:', { subtotal, shipping, total })

    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors)
      const firstError = document.querySelector('.border-red-600')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    console.log('✅ Form validation passed')
    setLoading(true)

    try {
      // Step 1: Create order via server-side API
      const orderData = {
        email: form.email,
        status: 'pending',
        total: total,
        subtotal: subtotal,
        shipping_cost: shipping,
        tax_amount: 0,
        shipping_address: {
          name: `${form.firstName} ${form.lastName}`,
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          phone: form.phone,
          country: form.country,
        },
        billing_address: {
          name: `${form.firstName} ${form.lastName}`,
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          phone: form.phone,
          country: form.country,
        },
        stripe_payment_status: 'pending',
        payment_method: null,
      }

      const orderItems = items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.name,
        size: item.size,
        color: item.color,
        sku: `${item.productId}-${item.size}-${item.color}`,
        quantity: item.quantity,
        price_at_purchase: item.price,
        subtotal: item.price * item.quantity,
        image_url: item.image,
      }))

      console.log('📦 Creating order via API...')
      
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderData, items: orderItems }),
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json()
        console.error('❌ Checkout API error:', errorData)
        throw new Error(errorData.error || 'Failed to create order')
      }

      const { order } = await checkoutResponse.json()
      console.log('✅ Order created via API:', order)
      setOrderId(order.id)

      // Go to payment step - Payment Intent will be created when user selects method
      setCurrentStep('payment')
      setLoading(false)
    } catch (error: any) {
      console.error('💥 CHECKOUT ERROR:', error)
      alert(`Er is een fout opgetreden: ${error.message}`)
      setLoading(false)
    }
  }

  const handlePaymentMethodSelected = async (paymentMethod: PaymentMethod) => {
    if (!orderId) return
    
    setIsCreatingIntent(true)

    try {
      console.log('💳 Creating Payment Intent for:', paymentMethod)
      
      // Create Payment Intent with specific payment method
      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          items: items,
          customerEmail: form.email,
          customerName: `${form.firstName} ${form.lastName}`,
          shippingAddress: {
            name: `${form.firstName} ${form.lastName}`,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            phone: form.phone,
            country: form.country,
          },
          paymentMethod: paymentMethod,
        }),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.error('❌ Payment Intent error:', errorData)
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const { clientSecret } = await paymentResponse.json()
      console.log('✅ Payment Intent created, confirming payment...')
      
      // Initialize Stripe
      const stripe = await stripePromise
      
      if (!stripe) {
        throw new Error('Stripe kon niet worden geladen')
      }

      // For iDEAL and other redirect methods, we need to use confirmIdealPayment or a generic approach
      const returnUrl = `${window.location.origin}/order-confirmation?order_id=${orderId}`
      
      // Create payment method first
      const { paymentMethod: pm, error: pmError } = await stripe.createPaymentMethod({
        type: paymentMethod as any,
        billing_details: {
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          phone: form.phone,
          address: {
            line1: form.address,
            city: form.city,
            postal_code: form.postalCode,
            country: form.country,
          },
        },
      })

      if (pmError) {
        console.error('❌ Payment method creation error:', pmError)
        throw new Error(pmError.message || 'Payment method kon niet worden aangemaakt')
      }

      console.log('✅ Payment method created:', pm?.id)

      // Now confirm the payment with the payment method
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          payment_method: pm?.id,
          return_url: returnUrl,
        },
      })

      if (error) {
        console.error('❌ Payment confirmation error:', error)
        throw new Error(error.message || 'Betaling kon niet worden bevestigd')
      }

      // If we reach here without error, redirect is happening
      console.log('🚀 Redirecting to payment provider...')
      
    } catch (error: any) {
      console.error('💥 Payment Intent ERROR:', error)
      alert(`Er is een fout opgetreden: ${error.message}`)
      setIsCreatingIntent(false)
    }
  }

  const updateForm = (field: keyof CheckoutForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Real-time validation
    const error = validateField(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  if (items.length === 0) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 px-4 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <span className="ml-2 text-sm font-semibold text-gray-700 hidden sm:inline">Winkelwagen</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-brand-primary'}`}></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full ${currentStep === 'payment' ? 'bg-black' : 'bg-brand-primary'} text-white flex items-center justify-center font-bold text-sm transition-all`}>
                {currentStep === 'payment' ? '✓' : '2'}
              </div>
              <span className={`ml-2 text-sm font-semibold ${currentStep === 'payment' ? 'text-gray-700' : 'text-gray-900'} hidden sm:inline`}>Gegevens</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-gray-300'}`}></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-gray-300'} text-${currentStep === 'payment' ? 'white' : 'gray-600'} flex items-center justify-center font-bold text-sm`}>
                3
              </div>
              <span className={`ml-2 text-sm ${currentStep === 'payment' ? 'text-gray-900 font-semibold' : 'text-gray-500'} hidden sm:inline`}>Betalen</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Checkout Form - 3/5 width */}
          <div className="lg:col-span-3">
            <div className="bg-white border-2 border-black p-6 md:p-8">
              {currentStep === 'details' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-display mb-6">AFREKENEN</h1>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact - Compact */}
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">1</span>
                    Contact
                  </h2>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.email ? 'border-red-600' : 'border-gray-300'
                    } focus:border-brand-primary focus:outline-none transition-colors`}
                    placeholder="jouw@email.nl"
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Delivery - Compact */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">2</span>
                    Bezorging
                  </h2>
                  <div className="space-y-4">
                    {/* Name - Single Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => updateForm('firstName', e.target.value)}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.firstName ? 'border-red-600' : 'border-gray-300'
                          } focus:border-brand-primary focus:outline-none`}
                          placeholder="Voornaam"
                          autoComplete="given-name"
                        />
                        {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => updateForm('lastName', e.target.value)}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.lastName ? 'border-red-600' : 'border-gray-300'
                          } focus:border-brand-primary focus:outline-none`}
                          placeholder="Achternaam"
                          autoComplete="family-name"
                        />
                        {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => updateForm('address', e.target.value)}
                        className={`w-full px-4 py-3 border-2 ${
                          errors.address ? 'border-red-600' : 'border-gray-300'
                        } focus:border-brand-primary focus:outline-none`}
                        placeholder="Straat en huisnummer"
                        autoComplete="street-address"
                      />
                      {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
                    </div>

                    {/* Postal + City */}
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={form.postalCode}
                          onChange={(e) => updateForm('postalCode', e.target.value)}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.postalCode ? 'border-red-600' : 'border-gray-300'
                          } focus:border-brand-primary focus:outline-none`}
                          placeholder="1234 AB"
                          autoComplete="postal-code"
                        />
                        {errors.postalCode && <p className="text-red-600 text-xs mt-1">{errors.postalCode}</p>}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => updateForm('city', e.target.value)}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.city ? 'border-red-600' : 'border-gray-300'
                          } focus:border-brand-primary focus:outline-none`}
                          placeholder="Plaats"
                          autoComplete="address-level2"
                        />
                        {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        className={`w-full px-4 py-3 border-2 ${
                          errors.phone ? 'border-red-600' : 'border-gray-300'
                        } focus:border-brand-primary focus:outline-none`}
                        placeholder="06 12345678"
                        autoComplete="tel"
                      />
                      {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">Land</label>
                      <select
                        value={form.country}
                        onChange={(e) => updateForm('country', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none bg-white"
                      >
                        <option value="NL">🇳🇱 Nederland</option>
                        <option value="BE">🇧🇪 België</option>
                        <option value="DE">🇩🇪 Duitsland</option>
                        <option value="FR">🇫🇷 Frankrijk</option>
                        <option value="GB">🇬🇧 Verenigd Koninkrijk</option>
                        <option value="OTHER">🌍 Overig</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className="border-t-2 border-gray-200 pt-6 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Veilig betalen via Stripe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>14 dagen bedenktijd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>SSL beveiligde verbinding</span>
                  </div>
                </div>

                {/* Terms - Compact */}
                <div className="text-xs text-gray-600 border-t-2 border-gray-200 pt-6">
                  Door je bestelling te plaatsen ga je akkoord met onze{' '}
                  <Link href="/algemene-voorwaarden" className="text-brand-primary underline" target="_blank">
                    algemene voorwaarden
                  </Link>{' '}
                  en{' '}
                  <Link href="/privacy" className="text-brand-primary underline" target="_blank">
                    privacybeleid
                  </Link>
                  .
                </div>

                {/* Submit Button - Mobile */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full lg:hidden py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'BEZIG...' : 'DOORGAAN NAAR BETALEN'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl md:text-4xl font-display">BETALEN</h1>
                <button
                  onClick={() => setCurrentStep('details')}
                  className="text-sm text-brand-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Terug
                </button>
              </div>

              {/* Customer Info Summary */}
              <div className="bg-gray-50 border-2 border-gray-200 p-4 mb-6 text-sm">
                <div className="font-semibold mb-2">{form.firstName} {form.lastName}</div>
                <div className="text-gray-600">{form.email}</div>
                <div className="text-gray-600">{form.address}, {form.postalCode} {form.city}</div>
                <div className="text-gray-600 mt-1">
                  {form.country === 'NL' && '🇳🇱 Nederland'}
                  {form.country === 'BE' && '🇧🇪 België'}
                  {form.country === 'DE' && '🇩🇪 Duitsland'}
                  {form.country === 'FR' && '🇫🇷 Frankrijk'}
                  {form.country === 'GB' && '🇬🇧 Verenigd Koninkrijk'}
                  {form.country === 'OTHER' && '🌍 Overig'}
                </div>
              </div>

              {/* Stripe Payment Form */}
              <StripePaymentForm
                onMethodSelected={handlePaymentMethodSelected}
                country={form.country}
                isCreatingIntent={isCreatingIntent}
              />
            </>
          )}
        </div>
      </div>

          {/* Order Summary - 2/5 width - Sticky */}
          <div className="lg:col-span-2">
            {/* Mobile: Collapsible Summary */}
            <button
              onClick={() => setShowOrderSummary(!showOrderSummary)}
              className="lg:hidden w-full bg-white border-2 border-black p-4 mb-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="font-bold">{showOrderSummary ? 'Verberg' : 'Toon'} bestelling</span>
              </div>
              <span className="font-bold text-xl">€{total.toFixed(2)}</span>
            </button>

            {/* Desktop: Always visible / Mobile: Collapsible */}
            <div className={`${showOrderSummary ? 'block' : 'hidden'} lg:block bg-white border-2 border-black p-6 lg:sticky lg:top-24 space-y-6`}>
              <h2 className="text-xl font-display">BESTELLING ({items.length})</h2>

              {/* Cart Items - Scrollable */}
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <div className="relative w-16 h-20 bg-gray-100 flex-shrink-0 border border-gray-300">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover object-center"
                      />
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {item.size} • {item.color}
                      </p>
                      <p className="font-bold text-sm mt-1">€{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown - Minimal */}
              <div className="space-y-3 border-t-2 border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotaal</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verzending</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-black font-bold">GRATIS</span>
                    ) : (
                      `€${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {subtotal < freeShippingThreshold && subtotal > 0 && (
                  <div className="bg-gray-100 border border-gray-300 p-2 text-xs text-gray-900 font-semibold">
                    Nog €{(freeShippingThreshold - subtotal).toFixed(2)} tot gratis verzending!
                  </div>
                )}
              </div>

              {/* Total - Prominent */}
              <div className="flex justify-between items-center border-t-2 border-black pt-4">
                <span className="text-lg font-bold">Totaal</span>
                <span className="text-2xl font-display">€{total.toFixed(2)}</span>
              </div>

              {/* Submit Button - Desktop */}
              {currentStep === 'details' && (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="hidden lg:block w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'BEZIG...' : 'DOORGAAN NAAR BETALEN'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
