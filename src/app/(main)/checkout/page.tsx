'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
import dynamic from 'next/dynamic'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { createClient } from '@/lib/supabase/client'
import { UserCircle2, ShoppingBag, Ticket, ChevronDown, ChevronUp } from 'lucide-react'

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
  const supabase = createClient()
  
  // Ref voor het scrollen naar de juiste sectie
  const checkoutContainerRef = useRef<HTMLDivElement>(null)
  const paymentSectionRef = useRef<HTMLDivElement>(null)
  
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
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
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  const [returnDays, setReturnDays] = useState(14)
  const [currentStep, setCurrentStep] = useState<'details' | 'payment'>('details')
  const [clientSecret, setClientSecret] = useState<string>()
  const [orderId, setOrderId] = useState<string>()
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [paymentCancelled, setPaymentCancelled] = useState(false)
  
  // Promo code state
  const [promoCodeExpanded, setPromoCodeExpanded] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)

  const subtotal = getTotal()
  const subtotalAfterDiscount = subtotal - promoDiscount
  const shipping = subtotalAfterDiscount >= freeShippingThreshold ? 0 : shippingCost
  
  // BTW berekening (21% is al inbegrepen in de prijzen)
  const subtotalExclBtw = subtotalAfterDiscount / 1.21
  const btwAmount = subtotalAfterDiscount - subtotalExclBtw
  const shippingExclBtw = shipping / 1.21
  const shippingBtw = shipping - shippingExclBtw
  const totalBtw = btwAmount + shippingBtw
  
  const total = subtotalAfterDiscount + shipping

  useEffect(() => {
    // Check for cancelled payment
    const cancelled = sessionStorage.getItem('payment_cancelled')
    const savedOrderId = sessionStorage.getItem('order_id')
    
    if (cancelled === 'true') {
      setPaymentCancelled(true)
      if (savedOrderId) {
        setOrderId(savedOrderId)
        setCurrentStep('payment')
      }
      // Clear sessionStorage
      sessionStorage.removeItem('payment_cancelled')
      sessionStorage.removeItem('payment_intent')
      sessionStorage.removeItem('order_id')
    }
  }, [])

  // Auto-scroll naar de juiste sectie bij step wijziging
  useEffect(() => {
    // Scroll naar de top van de checkout container bij elke step change
    // Gebruik een kleine delay om te zorgen dat de DOM is gerenderd
    const scrollToTop = () => {
      if (checkoutContainerRef.current) {
        // Bereken de offset van de header (80px op mobiel, 96px op desktop)
        const headerOffset = window.innerWidth >= 768 ? 96 : 80
        const elementPosition = checkoutContainerRef.current.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 16 // Extra 16px ruimte
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }

    // Kleine delay om te zorgen dat de nieuwe content is gerenderd
    const timer = setTimeout(scrollToTop, 100)
    return () => clearTimeout(timer)
  }, [currentStep])

  useEffect(() => {
    // Load settings
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
      setReturnDays(settings.return_days)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })

      if (error) throw error

      // Fetch user profile and saved addresses
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single()

      // Pre-fill form with saved data
      if (profile) {
        setForm({
          email: loginForm.email,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          address: profile.address || '',
          city: profile.city || '',
          postalCode: profile.postal_code || '',
          phone: profile.phone || '',
          country: profile.country || 'NL',
        })
      }

      // Switch to guest mode with pre-filled form
      setCheckoutMode('guest')
    } catch (error: any) {
      setLoginError(error.message || 'Inloggen mislukt. Controleer je gegevens.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Handle promo code
  const handleApplyPromo = async () => {
    setPromoError('')
    
    try {
      const response = await fetch('/api/validate-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.toUpperCase(),
          orderTotal: subtotal,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setPromoDiscount(data.discountAmount)
        setPromoCodeExpanded(false)
      } else {
        setPromoError(data.error || 'Code ongeldig')
        setPromoDiscount(0)
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError('Kon code niet valideren')
      setPromoDiscount(0)
    }
  }

  const handleRemovePromo = () => {
    setPromoCode('')
    setPromoDiscount(0)
    setPromoError('')
    setPromoCodeExpanded(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 CHECKOUT STARTED')
    console.log('📋 Form data:', form)
    console.log('🛒 Cart items:', items)
    console.log('💰 Totals:', { subtotal, subtotalAfterDiscount, promoDiscount, shipping, total })
    console.log('🎟️ Promo code:', promoCode || 'None')

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
        subtotal: subtotalAfterDiscount, // After discount
        shipping_cost: shipping,
        tax_amount: 0,
        promo_code: promoCode || null,
        discount_amount: promoDiscount,
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
        payment_status: 'pending',
        payment_method: null,
        checkout_started_at: new Date().toISOString(),
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
    
    // Prevent duplicate Payment Intent creation
    if (clientSecret && isCreatingIntent) {
      console.log('⚠️ Payment Intent already being created, skipping...')
      return
    }
    
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

      const { clientSecret: secret, paymentIntentId } = await paymentResponse.json()
      console.log('✅ Payment Intent created:', paymentIntentId)
      
      // Save payment method to order
      await fetch('/api/update-order-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentIntentId
        }),
      }).catch(err => console.error('Failed to update payment method:', err))
      
      setClientSecret(secret)
      setIsCreatingIntent(false)
    } catch (error: any) {
      console.error('💥 Payment Intent ERROR:', error)
      alert(`Er is een fout opgetreden: ${error.message}`)
      setIsCreatingIntent(false)
    }
  }

  const handlePaymentSuccess = () => {
    console.log('✅ Payment successful!')
    clearCart()
    router.push(`/order-confirmation?order=${orderId}`)
  }

  const handlePaymentError = (error: string) => {
    console.error('💥 Payment error:', error)
    alert(`Betaling mislukt: ${error}`)
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
          <div className="lg:col-span-3" ref={checkoutContainerRef}>
            <div className="bg-white border-2 border-black p-6 md:p-8">
              {currentStep === 'details' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-display mb-6">AFREKENEN</h1>
                  
                  {/* TWO-TABS CHECKOUT */}
                  <div className="mb-8">
                    <div className="border-2 border-black flex overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCheckoutMode('guest')}
                        className={`flex-1 py-4 px-4 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          checkoutMode === 'guest'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingBag size={20} />
                        <span className="hidden sm:inline">Gast Checkout</span>
                        <span className="sm:hidden">Gast</span>
                      </button>
                      <div className="w-px bg-black"></div>
                      <button
                        type="button"
                        onClick={() => setCheckoutMode('login')}
                        className={`flex-1 py-4 px-4 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          checkoutMode === 'login'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                      >
                        <UserCircle2 size={20} />
                        <span className="hidden sm:inline">Login & Checkout</span>
                        <span className="sm:hidden">Login</span>
                      </button>
                    </div>
                  </div>

                  {checkoutMode === 'login' ? (
                    /* LOGIN FORM */
                    <div className="bg-gray-50 border-2 border-gray-200 p-6 md:p-8">
                      <h2 className="text-2xl font-display mb-4">Inloggen</h2>
                      <p className="text-gray-600 mb-6">
                        Log in om je opgeslagen gegevens te gebruiken en sneller af te rekenen.
                      </p>
                      
                      {loginError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-900 text-sm">
                          {loginError}
                        </div>
                      )}

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase tracking-wide">
                            E-mailadres
                          </label>
                          <input
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder="jouw@email.nl"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase tracking-wide">
                            Wachtwoord
                          </label>
                          <input
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder="••••••••"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLoggingIn}
                          className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isLoggingIn ? 'INLOGGEN...' : 'INLOGGEN & DOORGAAN'}
                        </button>

                        <div className="text-center pt-4 border-t border-gray-300 mt-6">
                          <p className="text-sm text-gray-600">
                            Nog geen account?{' '}
                            <Link href="/login" className="text-brand-primary font-semibold hover:underline">
                              Registreer hier
                            </Link>
                          </p>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* GUEST CHECKOUT FORM */
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
                    <span>{returnDays} dagen bedenktijd</span>
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
              )}
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

              {/* Payment Cancelled Warning */}
              {paymentCancelled && (
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 flex items-start gap-3 animate-fadeIn">
                  <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 mb-1">Je vorige betaling is geannuleerd</h3>
                    <p className="text-sm text-amber-800">
                      Geen zorgen, je gegevens zijn bewaard. Kies opnieuw je betaalmethode om je bestelling af te ronden.
                    </p>
                  </div>
                  <button
                    onClick={() => setPaymentCancelled(false)}
                    className="text-amber-600 hover:text-amber-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Customer Info Summary */}
              <div className="bg-gray-50 border-2 border-gray-200 p-4 mb-6 text-sm">
                {form.firstName && form.lastName && (
                  <div className="font-semibold mb-2">{form.firstName} {form.lastName}</div>
                )}
                {form.email && <div className="text-gray-600">{form.email}</div>}
                {(form.address || form.postalCode || form.city) && (
                  <div className="text-gray-600">
                    {[form.address, form.postalCode, form.city].filter(Boolean).join(', ')}
                  </div>
                )}
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
                clientSecret={clientSecret || null}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onMethodSelected={handlePaymentMethodSelected}
                country={form.country}
                isCreatingIntent={isCreatingIntent}
                orderId={orderId}
                billingDetails={{
                  name: `${form.firstName} ${form.lastName}`,
                  email: form.email,
                  phone: form.phone,
                  address: {
                    line1: form.address,
                    city: form.city,
                    postal_code: form.postalCode,
                    country: form.country,
                    state: null, // Not required for NL/EU countries
                  }
                }}
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
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Waarvan BTW (21%)</span>
                  <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verzending</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-brand-primary font-bold">GRATIS</span>
                    ) : (
                      `€${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                {/* Promo Code Section */}
                {!promoCodeExpanded && promoDiscount === 0 ? (
                  <button
                    onClick={() => setPromoCodeExpanded(true)}
                    className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors border-t border-gray-200 pt-3"
                  >
                    <div className="flex items-center gap-2">
                      <Ticket size={16} />
                      <span>Kortingscode?</span>
                    </div>
                    <ChevronDown size={16} />
                  </button>
                ) : promoDiscount === 0 ? (
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Ticket size={16} />
                        <span>Kortingscode</span>
                      </div>
                      <button
                        onClick={() => {
                          setPromoCodeExpanded(false)
                          setPromoError('')
                          setPromoCode('')
                        }}
                        className="p-1 hover:bg-gray-200 transition-colors rounded"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase())
                          setPromoError('')
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        placeholder="CODE"
                        className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoCode}
                        className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Toepassen
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between py-2 text-sm bg-brand-primary/10 px-3 rounded">
                      <div className="flex items-center gap-2 text-brand-primary font-semibold">
                        <Ticket size={16} />
                        <span>{promoCode}</span>
                        <span className="text-xs">(-€{promoDiscount.toFixed(2)})</span>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        className="text-xs text-gray-600 hover:text-black font-semibold uppercase"
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>
                )}
                
                {subtotalAfterDiscount < freeShippingThreshold && subtotalAfterDiscount > 0 && (
                  <div className="bg-gray-100 border border-gray-300 p-2 text-xs text-gray-900 font-semibold">
                    Nog €{(freeShippingThreshold - subtotalAfterDiscount).toFixed(2)} tot gratis verzending!
                  </div>
                )}
              </div>

              {/* Total - Prominent */}
              <div className="flex justify-between items-center border-t-2 border-black pt-4">
                <span className="text-lg font-bold">Totaal</span>
                <span className="text-2xl font-display">€{total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 text-right mt-1">Incl. €{totalBtw.toFixed(2)} BTW</p>

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
