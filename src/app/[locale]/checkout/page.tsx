'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { useCart } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
import dynamic from 'next/dynamic'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { UserCircle2, ShoppingBag, Ticket, ChevronDown, ChevronUp, Search, Edit2, Check, CreditCard, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { trackCheckoutStarted } from '@/lib/analytics'
import ExpressCheckout from '@/components/ExpressCheckout'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

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
  huisnummer: string
  toevoeging: string
}

export default function CheckoutPage() {
  const t = useTranslations('checkout')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const tCart = useTranslations('cart')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, getTotal, clearCart, setItems } = useCart()
  const supabase = createClient()
  
  // Ref voor het scrollen naar de juiste sectie
  const checkoutContainerRef = useRef<HTMLDivElement>(null)
  const paymentSectionRef = useRef<HTMLDivElement>(null)
  
  const [user, setUser] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'login'>('guest')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  
  const [form, setForm] = useState<CheckoutForm>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    country: 'NL',
    huisnummer: '',
    toevoeging: '',
  })
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({})
  const [touchedFields, setTouchedFields] = useState<Set<keyof CheckoutForm>>(new Set())
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // Prevent duplicate submissions
  const [addressLookup, setAddressLookup] = useState({
    isLookingUp: false,
    isLookedUp: false,
    error: null as string | null,
  })
  const [countryChangedInfo, setCountryChangedInfo] = useState<{show: boolean, oldCountry: string, newCountry: string} | null>(null)
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
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('fixed')
  const [promoValue, setPromoValue] = useState(0)
  
  // Newsletter subscription state
  const [newsletterOptIn, setNewsletterOptIn] = useState(true) // Default checked
  const [newsletterSubscribing, setNewsletterSubscribing] = useState(false)

  // Subscribe to newsletter (async, non-blocking)
  const subscribeToNewsletter = async (email: string) => {
    if (!newsletterOptIn || newsletterSubscribing) return
    
    setNewsletterSubscribing(true)
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          source: 'checkout',
          locale: locale
        })
      })
      
      const data = await response.json()
      if (data.success) {
        console.log('✅ Newsletter subscription successful')
      } else {
        // Silently fail - don't interrupt checkout flow
        console.log('⚠️ Newsletter subscription failed:', data.error)
      }
    } catch (error) {
      // Silently fail - don't interrupt checkout flow
      console.error('Newsletter subscription error:', error)
    } finally {
      setNewsletterSubscribing(false)
    }
  }

  // Load promo from localStorage and revalidate on mount
  useEffect(() => {
    const savedPromo = localStorage.getItem('mose_promo_code')
    const savedType = localStorage.getItem('mose_promo_type')
    const savedValue = localStorage.getItem('mose_promo_value')
    
    if (savedPromo && savedType && savedValue) {
      setPromoCode(savedPromo)
      setPromoType(savedType as 'percentage' | 'fixed')
      setPromoValue(parseFloat(savedValue))
      // Don't set discount here - will be revalidated below
    }
  }, [])

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

  // Auto-revalidate promo code whenever cart total changes
  useEffect(() => {
    const clearPromo = () => {
      setPromoCode('')
      setPromoDiscount(0)
      setPromoError('')
      setPromoType('fixed')
      setPromoValue(0)
      
      // Clear from localStorage
      localStorage.removeItem('mose_promo_code')
      localStorage.removeItem('mose_promo_discount')
      localStorage.removeItem('mose_promo_type')
      localStorage.removeItem('mose_promo_value')
    }
    
    const revalidatePromo = async () => {
      const savedPromo = localStorage.getItem('mose_promo_code')
      
      // If no promo code saved, clear everything
      if (!savedPromo) {
        clearPromo()
        return
      }

      // If cart is empty, clear promo
      if (items.length === 0 || subtotal === 0) {
        clearPromo()
        return
      }

      // Revalidate promo code against current cart total
      try {
        const response = await fetch('/api/validate-promo-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: savedPromo,
            orderTotal: subtotal,
            items: items, // ✅ NEW: Send items for no-stacking discount check
          }),
        })

        const data = await response.json()

        if (data.valid) {
          // Update discount based on NEW cart total
          setPromoCode(data.code)
          setPromoDiscount(data.discountAmount)
          setPromoType(data.discountType)
          setPromoValue(data.discountValue)
          
          // Update localStorage with NEW discount amount
          localStorage.setItem('mose_promo_discount', data.discountAmount.toString())
          localStorage.setItem('mose_promo_type', data.discountType)
          localStorage.setItem('mose_promo_value', data.discountValue.toString())
        } else {
          // Promo no longer valid - clear it
          clearPromo()
        }
      } catch (error) {
        console.error('Error revalidating promo code:', error)
        // On error, keep the promo but recalculate locally
        const savedType = localStorage.getItem('mose_promo_type') as 'percentage' | 'fixed'
        const savedValue = parseFloat(localStorage.getItem('mose_promo_value') || '0')
        
        let newDiscount = 0
        if (savedType === 'percentage') {
          newDiscount = (subtotal * savedValue) / 100
        } else if (savedType === 'fixed') {
          newDiscount = Math.min(savedValue, subtotal)
        }
        
        setPromoDiscount(newDiscount)
      }
    }

    // Revalidate on mount and when subtotal/items change
    revalidatePromo()
  }, [subtotal, items.length]) // Revalidate when subtotal or item count changes

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

  // ============================================
  // CHECK PAYMENT INTENT EXPIRY ON MOUNT
  // ============================================
  useEffect(() => {
    const checkPaymentIntentExpiry = async () => {
      // ALLEEN checken als we een bestaande order hebben die we ophalen
      // NIET checken voor verse nieuwe orders die we zojuist hebben aangemaakt
      if (!clientSecret || !orderId) return
      
      try {
        console.log('🔍 [Expiry Check] Checking payment intent expiry...')
        
        // Fetch order to get payment intent ID
        const { data: order } = await supabase
          .from('orders')
          .select('stripe_payment_intent_id, checkout_started_at, created_at')
          .eq('id', orderId)
          .single()
        
        if (!order || !order.stripe_payment_intent_id) {
          console.log('⚠️ [Expiry Check] No payment intent found for order')
          return
        }
        
        // If checkout_started_at is null, skip expiry check (order just created)
        if (!order.checkout_started_at) {
          console.log('✅ [Expiry Check] Order just created (no checkout_started_at), skipping expiry check')
          return
        }
        
        // Check if order was created in the last 2 minutes - if so, it's fresh, don't check expiry
        const orderCreatedTime = new Date(order.created_at)
        const now = new Date()
        const minutesSinceCreation = (now.getTime() - orderCreatedTime.getTime()) / (1000 * 60)
        
        if (minutesSinceCreation < 2) {
          console.log('✅ [Expiry Check] Order created < 2 minutes ago, skipping expiry check')
          return
        }
        
        // Check if payment intent is older than 1 hour (Stripe default expiry)
        const checkoutTime = new Date(order.checkout_started_at)
        const hoursSinceCheckout = (now.getTime() - checkoutTime.getTime()) / (1000 * 60 * 60)
        
        console.log(`🔍 [Expiry Check] Hours since checkout: ${hoursSinceCheckout.toFixed(2)}`)
        
        if (hoursSinceCheckout > 1) {
          console.log('❌ [Expiry Check] Payment intent expired (>1 hour old)')
          setClientSecret(undefined)
          setCurrentStep('details')
          toast.error(t('messages.paymentExpired'))
        } else {
          console.log('✅ [Expiry Check] Payment intent is still valid')
        }
      } catch (error) {
        console.error('❌ [Expiry Check] Error checking payment intent expiry:', error)
      }
    }
    
    checkPaymentIntentExpiry()
  }, [clientSecret, orderId])

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

    // Auto-detect country based on browser/IP
    const detectCountry = async () => {
      try {
        // First try browser language
        const browserLang = navigator.language || navigator.languages?.[0]
        if (browserLang?.startsWith('nl-BE') || browserLang?.startsWith('fr-BE')) {
          setForm(prev => ({ ...prev, country: 'BE' }))
          return
        }
        if (browserLang?.startsWith('nl') || browserLang?.startsWith('nl-NL')) {
          setForm(prev => ({ ...prev, country: 'NL' }))
          return
        }

        // Fallback: Try IP geolocation (free service)
        const response = await fetch('https://ipapi.co/json/')
        if (response.ok) {
          const data = await response.json()
          if (data.country_code === 'BE') {
            setForm(prev => ({ ...prev, country: 'BE' }))
          } else if (data.country_code === 'NL') {
            setForm(prev => ({ ...prev, country: 'NL' }))
          }
        }
      } catch (error) {
        console.log('Country detection failed, using default (NL)')
        // Default stays NL
      }
    }

    detectCountry()

    // Check if user is already logged in and load data
    loadUserData()
  }, [])

  // Track analytics when cart values change (only once per session)
  const [hasTrackedCheckout, setHasTrackedCheckout] = useState(false)
  useEffect(() => {
    // Only track once and only if we have items
    if (!hasTrackedCheckout && items.length > 0 && total > 0) {
      trackPixelEvent('InitiateCheckout', {
        content_ids: items.map(item => item.variantId),
        value: total,
        currency: 'EUR',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0)
      })
      
      trackCheckoutStarted({
        items_count: items.reduce((sum, item) => sum + item.quantity, 0),
        total_value: total,
      })
      
      setHasTrackedCheckout(true)
      console.log('[Analytics] ✅ checkout_started', { items_count: items.reduce((sum, item) => sum + item.quantity, 0), value: total })
    }
  }, [items, total, hasTrackedCheckout])

  // Separate useEffect for recover parameter (runs when searchParams change)
  useEffect(() => {
    const recoverOrderId = searchParams.get('recover')
    if (recoverOrderId && !isRecovering) {
      recoverOrder(recoverOrderId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function loadUserData() {
    setIsLoadingUserData(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        setIsLoggedIn(true)
        await loadProfileAndAddress(user.id, user.email || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoadingUserData(false)
    }
  }

  async function loadProfileAndAddress(userId: string, userEmail: string) {
    try {
      // 1. Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // 2. Fetch default shipping address
      const { data: defaultAddress } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default_shipping', true)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid 406 error

      // 3. Parse address voor huisnummer en toevoeging (als adres al bestaat)
      let huisnummer = ''
      let toevoeging = ''
      let addressOnly = defaultAddress?.address || ''
      
      if (defaultAddress?.address) {
        // Probeer huisnummer en toevoeging te extraheren uit adres string
        // Format: "Straatnaam 123A", "Straatnaam 123 A", "Straatnaam 123", "Straatnaam 27a", "Straatnaam 27 a"
        // Regex: vang straatnaam, dan spatie, dan cijfers (huisnummer), dan optioneel spatie + letters/cijfers OF direct letters/cijfers (toevoeging)
        // Eerst proberen met spatie tussen nummer en toevoeging, dan zonder spatie
        let addressMatch = defaultAddress.address.match(/^(.+?)\s+(\d+)\s+([A-Za-z0-9]+)$/) // Met spatie: "Straatnaam 123 A"
        if (!addressMatch) {
          addressMatch = defaultAddress.address.match(/^(.+?)\s+(\d+)([A-Za-z0-9]+)$/) // Zonder spatie: "Straatnaam 123A"
        }
        if (!addressMatch) {
          addressMatch = defaultAddress.address.match(/^(.+?)\s+(\d+)$/) // Alleen nummer: "Straatnaam 123"
        }
        
        if (addressMatch) {
          addressOnly = addressMatch[1].trim()
          huisnummer = addressMatch[2]
          toevoeging = (addressMatch[3] || '').trim()
        }
      }

      // 4. Bouw volledig adres voor "Straat en huisnummer" veld
      let fullAddress = addressOnly
      if (huisnummer) {
        fullAddress += ` ${huisnummer}`
        if (toevoeging) {
          fullAddress += toevoeging
        }
      }

      // 5. Fill form with data
      setForm({
        email: userEmail || profile?.email || '',
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        address: fullAddress.trim(),
        city: defaultAddress?.city || '',
        postalCode: defaultAddress?.postal_code || '',
        phone: defaultAddress?.phone || '',
        country: defaultAddress?.country || 'NL',
        huisnummer: huisnummer,
        toevoeging: toevoeging,
      })

      // Als adres al compleet is, markeer als looked up
      if (defaultAddress?.address && defaultAddress?.city && defaultAddress?.postal_code) {
        setAddressLookup({ isLookingUp: false, isLookedUp: true, error: null })
      }
    } catch (error) {
      console.error('Error loading profile and address:', error)
      // Don't show error toast, just silently fail (user can still fill manually)
    }
  }

  async function recoverOrder(orderId: string) {
    if (isRecovering) return // Prevent multiple calls
    
    setIsRecovering(true)
    
    try {
      // Fetch order and items
      const response = await fetch(`/api/get-order?order_id=${orderId}`)
      
      if (!response.ok) {
        throw new Error('Order niet gevonden')
      }
      
      const { order, items: orderItems } = await response.json()
      
      // Validate order is recoverable
      if (order.payment_status === 'paid' || order.status === 'cancelled') {
        toast.error(t('messages.orderCannotRestore'))
        router.replace('/checkout')
        return
      }
      
      // Fetch product variants to get full cart item data
      const cartItems = await Promise.all(
        orderItems.map(async (item: any) => {
          // Fetch variant to get colorHex and stock
          const { data: variant } = await supabase
            .from('product_variants')
            .select('color_hex, stock_quantity')
            .eq('id', item.variant_id)
            .single()
          
          return {
            productId: item.product_id,
            variantId: item.variant_id,
            name: item.product_name,
            size: item.size,
            color: item.color,
            colorHex: variant?.color_hex || '#000000',
            quantity: item.quantity,
            price: item.price_at_purchase,
            image: item.image_url || '',
            stock: variant?.stock_quantity || 0,
            sku: item.sku || `${item.product_id}-${item.size}-${item.color}`,
          }
        })
      )
      
      // Set items in cart
      clearCart()
      setItems(cartItems)
      
      // Pre-fill form with order data
      const shippingAddress = order.shipping_address as any
      const nameParts = (shippingAddress?.name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      // Parse address voor huisnummer en toevoeging
      let huisnummer = ''
      let toevoeging = ''
      let addressOnly = shippingAddress?.address || ''
      
      if (shippingAddress?.address) {
        // Probeer huisnummer en toevoeging te extraheren uit adres string
        // Format: "Straatnaam 123A", "Straatnaam 123 A", "Straatnaam 123", "Straatnaam 27a", "Straatnaam 27 a"
        // Regex: vang straatnaam, dan spatie, dan cijfers (huisnummer), dan optioneel spatie + letters/cijfers OF direct letters/cijfers (toevoeging)
        // Eerst proberen met spatie tussen nummer en toevoeging, dan zonder spatie
        let addressMatch = shippingAddress.address.match(/^(.+?)\s+(\d+)\s+([A-Za-z0-9]+)$/) // Met spatie: "Straatnaam 123 A"
        if (!addressMatch) {
          addressMatch = shippingAddress.address.match(/^(.+?)\s+(\d+)([A-Za-z0-9]+)$/) // Zonder spatie: "Straatnaam 123A"
        }
        if (!addressMatch) {
          addressMatch = shippingAddress.address.match(/^(.+?)\s+(\d+)$/) // Alleen nummer: "Straatnaam 123"
        }
        
        if (addressMatch) {
          addressOnly = addressMatch[1].trim()
          huisnummer = addressMatch[2]
          toevoeging = (addressMatch[3] || '').trim()
        }
      }
      
      // Bouw volledig adres voor "Straat en huisnummer" veld
      let fullAddress = addressOnly
      if (huisnummer) {
        fullAddress += ` ${huisnummer}`
        if (toevoeging) {
          fullAddress += toevoeging
        }
      }
      
      setForm({
        email: order.email || '',
        firstName: firstName,
        lastName: lastName,
        address: fullAddress.trim(),
        city: shippingAddress?.city || '',
        postalCode: shippingAddress?.postalCode || shippingAddress?.postal_code || '',
        phone: shippingAddress?.phone || '',
        country: shippingAddress?.country || 'NL',
        huisnummer: huisnummer,
        toevoeging: toevoeging,
      })

      // Als adres compleet is, markeer als looked up
      if (shippingAddress?.address && shippingAddress?.city && shippingAddress?.postalCode) {
        setAddressLookup({ isLookingUp: false, isLookedUp: true, error: null })
      }
      
      // Set order ID
      setOrderId(order.id)
      
      // Go directly to payment step
      setCurrentStep('payment')
      
      // Show success toast
      toast.success(t('messages.cartRestored'))
      
      // Clean URL (remove ?recover parameter)
      router.replace('/checkout', { scroll: false })
      
    } catch (error: any) {
      console.error('Error recovering order:', error)
      toast.error(t('messages.orderRestoreFailed') + ': ' + (error.message || t('messages.unknownError')))
      router.replace('/checkout')
    } finally {
      setIsRecovering(false)
    }
  }

  useEffect(() => {
    // Redirect to cart if empty (but not when recovering)
    if (items.length === 0 && !isRecovering) {
      router.push('/cart')
    }
  }, [items, router, isRecovering])

  // Helper functies voor land-specifieke informatie
  const getPostcodeInfo = (country: string): { placeholder: string; format: string; help: string; example: string; showLookup: boolean; helpText: string } => {
    switch(country) {
      case 'NL': 
        return {
          placeholder: '1234AB',
          format: t('postcode.help.nl'),
          help: t('postcode.help.nl'),
          example: t('postcode.example.nl'),
          showLookup: true,
          helpText: t('postcode.help.nl')
        }
      case 'BE':
        return {
          placeholder: '2000',
          format: t('postcode.help.be'),
          help: t('postcode.help.be'),
          example: t('postcode.example.be'),
          showLookup: false,
          helpText: t('postcode.help.be')
        }
      case 'DE':
        return {
          placeholder: '12345',
          format: t('postcode.help.de'),
          help: t('postcode.help.de'),
          example: t('postcode.example.de'),
          showLookup: false,
          helpText: t('postcode.help.de')
        }
      case 'FR':
        return {
          placeholder: '75001',
          format: t('postcode.help.fr'),
          help: t('postcode.help.fr'),
          example: t('postcode.example.fr'),
          showLookup: false,
          helpText: t('postcode.help.fr')
        }
      case 'GB':
        return {
          placeholder: 'SW1A 1AA',
          format: t('postcode.help.gb'),
          help: t('postcode.help.gb'),
          example: t('postcode.example.gb'),
          showLookup: false,
          helpText: t('postcode.help.gb')
        }
      default:
        return {
          placeholder: t('field.postalCode'),
          format: t('field.postalCode'),
          help: t('field.postalCode'),
          example: t('field.postalCode'),
          showLookup: false,
          helpText: t('field.postalCode')
        }
    }
  }

  const getCountryName = (countryCode: string): string => {
    const countryMap: Record<string, string> = {
      'NL': t('country.nl'),
      'BE': t('country.be'),
      'DE': t('country.de'),
      'FR': t('country.fr'),
      'GB': t('country.gb'),
      'OTHER': t('country.other')
    }
    return countryMap[countryCode] || countryCode
  }

  const validateField = (field: keyof CheckoutForm, value: string): string | undefined => {
    switch (field) {
      case 'email':
        return !/\S+@\S+\.\S+/.test(value) ? tErrors('email.invalid') : undefined
      case 'firstName':
      case 'lastName':
        return !value.trim() ? tErrors('required') : undefined
      case 'address':
        return !value.trim() ? tErrors('required') : undefined
      case 'city':
        return !value.trim() ? tErrors('required') : undefined
      case 'postalCode':
        const normalizedPostcode = value.replace(/\s+/g, '').toUpperCase()
        if (!value.trim()) return tErrors('required')
        
        // Land-specifieke validatie op basis van gekozen land
        switch (form.country) {
          case 'NL':
            if (!/^\d{4}[A-Z]{2}$/.test(normalizedPostcode)) {
              return tErrors('postcode.nl')
            }
            break
          
          case 'BE':
            if (!/^\d{4}$/.test(normalizedPostcode)) {
              return tErrors('postcode.be')
            }
            break
          
          case 'DE':
            if (!/^\d{5}$/.test(normalizedPostcode)) {
              return tErrors('postcode.de')
            }
            break
          
          case 'FR':
            if (!/^\d{5}$/.test(normalizedPostcode)) {
              return tErrors('postcode.fr')
            }
            break
          
          case 'GB':
            // UK postcodes zijn complex: SW1A 1AA, EC1A 1BB, etc.
            if (!/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(value.toUpperCase())) {
              return tErrors('postcode.gb')
            }
            break
          
          default:
            // Voor OTHER: accepteer alles dat niet leeg is
            if (!value.trim()) return tErrors('required')
        }
        
        return undefined
      case 'huisnummer':
        if (!value.trim()) return tErrors('required')
        const huisnummerNum = parseInt(value, 10)
        if (isNaN(huisnummerNum) || huisnummerNum < 1 || huisnummerNum > 99999) {
          return tErrors('houseNumber.invalid')
        }
        return undefined
      case 'toevoeging':
        if (value.length > 10) return 'Maximaal 10 tekens'
        return undefined
      case 'phone':
        return !value.trim() ? tErrors('phone.required') : undefined
      case 'country':
        return !value.trim() ? tErrors('required') : undefined
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

    // Extra check: Ensure full name is at least 3 characters (Stripe requirement)
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
    if (fullName.length < 3) {
      if (form.firstName.trim().length < 2) {
        newErrors.firstName = tErrors('name.minLength', { field: t('field.firstName'), min: 2 })
      }
      if (form.lastName.trim().length < 2) {
        newErrors.lastName = tErrors('name.minLength', { field: t('field.lastName'), min: 2 })
      }
    }

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

      // Update user state
      setUser(data.user)
      setIsLoggedIn(true)

      // ============================================
      // MERGE GUEST CART WITH USER CART
      // ============================================
      const guestCartItems = items // Current cart (guest)
      
      if (guestCartItems.length > 0) {
        console.log('🛒 Merging guest cart with user cart...')
        console.log('   Guest cart items:', guestCartItems.length)
        
        // Fetch user's saved cart from database
        const { data: savedCartItems, error: cartError } = await supabase
          .from('cart_items')
          .select('*, product_variants(product_id, size, color)')
          .eq('user_id', data.user!.id)
        
        if (!cartError && savedCartItems && savedCartItems.length > 0) {
          console.log('   Saved cart items:', savedCartItems.length)
          
          // Merge logic: Add guest items that aren't in saved cart
          const mergedItems = [...guestCartItems]
          
          for (const savedItem of savedCartItems) {
            const variantInfo = savedItem.product_variants as any
            
            // Check if this variant is already in guest cart
            const existsInGuest = guestCartItems.find(
              item => item.variantId === savedItem.variant_id
            )
            
            if (!existsInGuest) {
              // Add saved item to merged cart
              const { data: variant } = await supabase
                .from('product_variants')
                .select('*, products(name, product_images(url))')
                .eq('id', savedItem.variant_id)
                .single()
              
              if (variant) {
                const product = variant.products as any
                const imageUrl = product.product_images?.[0]?.url || '/placeholder.png'
                
                mergedItems.push({
                  productId: variantInfo.product_id,
                  variantId: savedItem.variant_id,
                  name: product.name,
                  size: variant.size,
                  color: variant.color,
                  colorHex: variant.color_hex,
                  price: savedItem.price_at_add,
                  quantity: savedItem.quantity,
                  image: imageUrl,
                  sku: variant.sku,
                  stock: variant.stock_quantity,
                })
              }
            }
          }
          
          console.log('   Merged cart items:', mergedItems.length)
          setItems(mergedItems)
          
          // Update user's saved cart in database with merged items
          // Delete old cart items
          await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', data.user!.id)
          
          // Insert merged cart items
          const cartItemsToSave = mergedItems.map(item => ({
            user_id: data.user!.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            price_at_add: item.price,
          }))
          
          await supabase
            .from('cart_items')
            .insert(cartItemsToSave)
          
          console.log('✅ Cart merged and saved to database')
        } else {
          console.log('   No saved cart, keeping guest cart')
          
          // Save guest cart to database
          const cartItemsToSave = guestCartItems.map(item => ({
            user_id: data.user!.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            price_at_add: item.price,
          }))
          
          await supabase
            .from('cart_items')
            .insert(cartItemsToSave)
          
          console.log('✅ Guest cart saved to database')
        }
      }

      // Load profile and address data
      await loadProfileAndAddress(data.user!.id, loginForm.email)

      // Switch to guest mode with pre-filled form
      setCheckoutMode('guest')
    } catch (error: any) {
      setLoginError(error.message || t('messages.loginFailed'))
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
        setPromoType(data.discountType)
        setPromoValue(data.discountValue)
        setPromoCodeExpanded(false)
        
        // Save to localStorage
        localStorage.setItem('mose_promo_code', promoCode.toUpperCase())
        localStorage.setItem('mose_promo_discount', data.discountAmount.toString())
        localStorage.setItem('mose_promo_type', data.discountType)
        localStorage.setItem('mose_promo_value', data.discountValue.toString())
      } else {
        setPromoError(data.error || t('promo.codeInvalid', { ns: 'cart' }))
        setPromoDiscount(0)
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError(t('promo.validationFailed', { ns: 'cart' }))
      setPromoDiscount(0)
    }
  }

  const handleRemovePromo = () => {
    setPromoCode('')
    setPromoDiscount(0)
    setPromoError('')
    setPromoType('fixed')
    setPromoValue(0)
    setPromoCodeExpanded(false)
    
    // Clear from localStorage
    localStorage.removeItem('mose_promo_code')
    localStorage.removeItem('mose_promo_discount')
    localStorage.removeItem('mose_promo_type')
    localStorage.removeItem('mose_promo_value')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ============================================
    // PREVENT DUPLICATE SUBMISSIONS
    // ============================================
    if (isSubmitting) {
      console.log('⚠️ Submission already in progress, ignoring...')
      return
    }

    console.log('🚀 CHECKOUT STARTED')
    console.log('📋 Form data:', form)
    console.log('🛒 Cart items:', items)
    console.log('💰 Totals:', { subtotal, subtotalAfterDiscount, promoDiscount, shipping, total })
    console.log('🎟️ Promo code:', promoCode || 'None')

    // ✨ PROGRESSIVE VALIDATION: Mark alle velden als touched bij submit
    const allFields: (keyof CheckoutForm)[] = [
      'email', 'firstName', 'lastName', 'postalCode', 'huisnummer', 
      'toevoeging', 'address', 'city', 'phone', 'country'
    ]
    setTouchedFields(new Set(allFields))

    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors)
      const firstError = document.querySelector('.border-red-600')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    console.log('✅ Form validation passed')
    setLoading(true)
    setIsSubmitting(true) // Lock submissions ONLY after validation passes

    try {
      // Step 1: Create order via server-side API
      const orderData = {
        email: form.email.trim(),
        status: 'pending',
        total: total,
        subtotal: subtotal, // BEFORE discount - this is what subtotal should be!
        shipping_cost: shipping,
        tax_amount: 0,
        promo_code: promoCode || null,
        discount_amount: promoDiscount,
        locale: locale, // Save customer's language preference for emails
        shipping_address: {
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          phone: form.phone.trim(),
          country: form.country,
        },
        billing_address: {
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          phone: form.phone.trim(),
          country: form.country,
        },
        payment_status: 'pending',
        payment_method: null,
        checkout_started_at: new Date().toISOString(),
      }

      console.log('═════════════════════════════════════════')
      console.log('🛒 CHECKOUT - CREATING ORDER')
      console.log('═════════════════════════════════════════')
      console.log('📊 Cart Items Count:', items.length)
      console.log('💰 Total:', total)
      console.log('═════════════════════════════════════════')

      const orderItems = items.map((item, index) => {
        console.log(`📦 Item ${index + 1}:`, {
          name: item.name,
          isPresale: item.isPresale,
          presaleExpectedDate: item.presaleExpectedDate,
          quantity: item.quantity,
          price: item.price
        })
        
        return {
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
          is_presale: item.isPresale || false,  // PRESALE: Pass presale status
          presale_expected_date: item.presaleExpectedDate || null,  // PRESALE: Pass expected date
        }
      })

      console.log('═════════════════════════════════════════')
      console.log('📋 ORDER ITEMS MAPPED:', JSON.stringify(orderItems, null, 2))
      console.log('═════════════════════════════════════════')
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

      // Subscribe to newsletter if opted in (async, non-blocking)
      if (newsletterOptIn) {
        subscribeToNewsletter(form.email.trim())
      }

      // Go to payment step - Payment Intent will be created when user selects method
      setCurrentStep('payment')
      
      // Track Facebook Pixel AddPaymentInfo event (with user data for CAPI)
      trackPixelEvent('AddPaymentInfo', {
        value: total,
        currency: 'EUR',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0)
      }, {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        zip: form.postalCode.trim(),
        country: form.country
      })
      
      setLoading(false)
    } catch (error: any) {
      console.error('💥 CHECKOUT ERROR:', error)
      toast.error(`${t('messages.errorOccurred')}: ${error.message}`)
      setLoading(false)
      setIsSubmitting(false) // Unlock on error
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
          // Include promo code for server-side validation
          promoCode: promoCode || null,
          promoDiscount: promoDiscount,
          // Send expected total for validation
          expectedTotal: total,
        }),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.error('❌ Payment Intent error:', errorData)
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const { clientSecret: secret, paymentIntentId } = await paymentResponse.json()
      console.log('✅ Payment Intent created:', paymentIntentId)
      
      // Note: Order is already updated by create-payment-intent route
      // (stripe_payment_intent_id, payment_method, payment_status, checkout_started_at)
      
      setClientSecret(secret)
      setIsCreatingIntent(false)
    } catch (error: any) {
      console.error('💥 Payment Intent ERROR:', error)
      alert(`${t('messages.errorOccurred')}: ${error.message}`)
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
    toast.error(`${t('messages.paymentFailed')}: ${error}`)
  }

  const updateForm = (field: keyof CheckoutForm, value: string, forceValidate: boolean = false) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Clear postcode + adres velden als land wijzigt
      if (field === 'country' && value !== prev.country) {
        const hadPostcode = prev.postalCode.length > 0
        
        updated.postalCode = ''
        updated.huisnummer = ''
        updated.toevoeging = ''
        updated.address = ''
        updated.city = ''
        
        // Toon info melding als er al een postcode was ingevuld
        if (hadPostcode) {
          setCountryChangedInfo({
            show: true,
            oldCountry: prev.country,
            newCountry: value
          })
          // Auto-hide na 8 seconden
          setTimeout(() => {
            setCountryChangedInfo(null)
          }, 8000)
        }
        
        // Clear errors
        setErrors(prevErrors => ({
          ...prevErrors,
          postalCode: undefined,
          huisnummer: undefined,
          address: undefined,
          city: undefined,
        }))
        
        // Reset address lookup
        setAddressLookup({ isLookingUp: false, isLookedUp: false, error: null })
      }
      
      // Auto-format postcode (ZONDER auto-detect tijdens typen)
      if (field === 'postalCode') {
        const normalized = value.replace(/\s+/g, '').toUpperCase()
        
        // Alleen formatting voor Nederlandse postcode
        if (form.country === 'NL' && normalized.length > 4 && /^\d{4}[A-Z]{0,2}$/.test(normalized)) {
          // Add space after 4 digits for Dutch format
          updated.postalCode = normalized.slice(0, 4) + ' ' + normalized.slice(4)
        } else {
          updated.postalCode = normalized
        }
      }
      
      return updated
    })
    
    // ✨ PROGRESSIVE VALIDATION (OPTIE 3):
    // 1. Bij forceValidate (blur) → Altijd valideren en error tonen
    // 2. Als veld al touched → Alleen valideren om errors WEG te halen (instant positieve feedback)
    // 3. Als veld nog niet touched → Geen validatie (laat gebruiker rustig typen)
    
    if (forceValidate) {
      // Bij blur: valideer en toon error indien nodig
      const error = validateField(field, value)
      setErrors((prev) => ({ ...prev, [field]: error }))
    } else if (touchedFields.has(field)) {
      // Veld is al touched: geef instant positieve feedback
      const error = validateField(field, value)
      if (!error) {
        // Alleen error clearen als veld nu geldig is (positieve feedback)
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      // Als nog steeds error: laat staan (geen negatieve realtime feedback)
    }
    // Anders: pristine veld, geen validatie tijdens typen
    
    // Reset address lookup state als gebruiker handmatig wijzigt
    if (field === 'postalCode' || field === 'huisnummer' || field === 'toevoeging') {
      setAddressLookup({ isLookingUp: false, isLookedUp: false, error: null })
    }
  }

  const handleBlur = (field: keyof CheckoutForm) => {
    // Mark veld als touched
    setTouchedFields((prev) => new Set(prev).add(field))
    
    // Voor postcode: trigger auto-detect (via forceValidate flag)
    if (field === 'postalCode') {
      updateForm('postalCode', form.postalCode, true)
    } else {
      // Voor andere velden: gewoon valideren
      const error = validateField(field, form[field])
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  // Helper functie voor input border classes (progressive validation styling)
  const getInputBorderClass = (field: keyof CheckoutForm): string => {
    if (errors[field]) {
      return 'border-red-600' // Error state
    }
    if (touchedFields.has(field) && !errors[field] && form[field]) {
      return 'border-green-600' // Success state (alleen als touched + geen error + niet leeg)
    }
    return 'border-gray-300' // Default state
  }

  const handleAddressLookup = async () => {
    // Validatie
    const postcodeError = validateField('postalCode', form.postalCode)
    const huisnummerError = validateField('huisnummer', form.huisnummer)
    
    if (postcodeError || huisnummerError) {
      setErrors((prev) => ({
        ...prev,
        postalCode: postcodeError,
        huisnummer: huisnummerError,
      }))
      return
    }

    setAddressLookup({ isLookingUp: true, isLookedUp: false, error: null })

    try {
      const normalizedPostcode = form.postalCode.replace(/\s+/g, '').toUpperCase()
      
      const response = await fetch('/api/postcode-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postcode: normalizedPostcode,
          huisnummer: form.huisnummer.trim(),
          toevoeging: form.toevoeging.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!data.success) {
      setAddressLookup({
        isLookingUp: false,
        isLookedUp: false,
        error: data.error || 'Adres niet gevonden',
      })
      return
      }

      // Vul adres in
      setForm((prev) => ({
        ...prev,
        address: data.fullAddress,
        city: data.city,
      }))

      setAddressLookup({
        isLookingUp: false,
        isLookedUp: true,
        error: null,
      })
    } catch (error: any) {
      console.error('Address lookup error:', error)
      setAddressLookup({
        isLookingUp: false,
        isLookedUp: false,
        error: 'Kon adres niet ophalen. Probeer opnieuw of vul handmatig in.',
      })
    }
  }

  const handleEditAddress = () => {
    setAddressLookup({ isLookingUp: false, isLookedUp: false, error: null })
    // Optioneel: clear address/city voor fresh start
    // setForm((prev) => ({ ...prev, address: '', city: '' }))
  }

  if (items.length === 0 && !isRecovering) {
    return null // Will redirect in useEffect
  }

  // Show loading state while recovering
  if (isRecovering) {
    return (
      <div className="min-h-screen pt-20 md:pt-24 px-4 pb-16 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen pt-20 md:pt-24 px-4 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <span className="ml-2 text-sm font-semibold text-gray-700 hidden sm:inline">{t('progress.cart')}</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-brand-primary'}`}></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full ${currentStep === 'payment' ? 'bg-black' : 'bg-brand-primary'} text-white flex items-center justify-center font-bold text-sm transition-all`}>
                {currentStep === 'payment' ? '✓' : '2'}
              </div>
              <span className={`ml-2 text-sm font-semibold ${currentStep === 'payment' ? 'text-gray-700' : 'text-gray-900'} hidden sm:inline`}>{t('progress.details')}</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-gray-300'}`}></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full ${currentStep === 'payment' ? 'bg-brand-primary' : 'bg-gray-300'} text-${currentStep === 'payment' ? 'white' : 'gray-600'} flex items-center justify-center font-bold text-sm`}>
                3
              </div>
              <span className={`ml-2 text-sm ${currentStep === 'payment' ? 'text-gray-900 font-semibold' : 'text-gray-500'} hidden sm:inline`}>{t('progress.payment')}</span>
            </div>
          </div>
        </div>

        {/* Mobile Order Summary - Compact & Inline */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="w-full bg-white border-2 border-gray-300 p-4 flex items-center justify-between hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {showOrderSummary ? tCommon('close') : locale === 'nl' ? 'Toon' : 'Show'} {locale === 'nl' ? 'bestelling' : 'order'}
                </p>
                <p className="text-xs text-gray-500">
                  {t('items', { count: items.length, ns: 'cart' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-xl">€{total.toFixed(2)}</span>
              <ChevronDown 
                size={20} 
                className={`text-gray-600 transition-transform ${showOrderSummary ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Collapsible Order Details */}
          {showOrderSummary && (
            <div className="bg-white border-2 border-gray-300 border-t-0 p-4 space-y-4">
              {/* Cart Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <div className="relative w-14 h-16 bg-gray-100 flex-shrink-0 border border-gray-300">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover object-center"
                      />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md border border-white">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.size} • {item.color}
                      </p>
                      <p className="font-bold text-sm mt-0.5">€{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown - VOORSTEL 1 DESIGN */}
              <div className="space-y-2 border-t border-gray-200 pt-3">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="font-semibold uppercase tracking-wide">{tCart('subtotal')}</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                
                {/* Promo Discount - VOORSTEL 1: Clean & Transparent */}
                {promoDiscount > 0 && (
                  <>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-center py-2 px-3 bg-brand-primary/5 border-l-2 border-brand-primary -mx-3">
                      <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-brand-primary" />
                        <div>
                          <div className="font-semibold text-brand-primary uppercase tracking-wide text-sm">
                            {promoCode}
                          </div>
                          <div className="text-xs text-gray-600">
                            {promoType === 'percentage' ? `${promoValue}% korting` : 'Korting'} • 
                            <button
                              onClick={handleRemovePromo}
                              className="ml-1 text-gray-500 hover:text-black font-semibold underline"
                            >
                              {t('promo.remove', { ns: 'cart' })}
                            </button>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-brand-primary">-€{promoDiscount.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                  </>
                )}
                
                {/* Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="font-semibold uppercase tracking-wide">{tCart('shipping')}</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-brand-primary font-bold">{tCart('shippingFree')}</span>
                    ) : (
                      `€${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                {/* Total */}
                <div className="flex justify-between text-base border-t-2 border-black pt-3 mt-2">
                  <span className="font-display text-lg uppercase tracking-wide">TOTAAL</span>
                  <span className="font-display font-bold text-2xl">€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Checkout Form - 3/5 width */}
          <div className="lg:col-span-3" ref={checkoutContainerRef}>
            <div className="bg-white border-2 border-black p-6 md:p-8">
              {currentStep === 'details' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-display mb-6">{t('title')}</h1>
                  
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
                        <span className="hidden sm:inline">{t('mode.guest')}</span>
                        <span className="sm:hidden">{t('mode.guestShort')}</span>
                      </button>
                      <div className="w-px bg-black"></div>
                      {isLoggedIn ? (
                        <div className="flex-1 py-4 px-4 bg-gray-50 flex items-center justify-center gap-2">
                          <UserCircle2 size={20} className="text-brand-primary" />
                          <span className="text-sm font-semibold text-gray-700">
                            {t('mode.loggedIn')}
                          </span>
                        </div>
                      ) : (
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
                          <span className="hidden sm:inline">{t('mode.login')}</span>
                          <span className="sm:hidden">{t('mode.loginShort')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {checkoutMode === 'login' && !isLoggedIn ? (
                    /* LOGIN FORM */
                    <div className="bg-gray-50 border-2 border-gray-200 p-6 md:p-8">
                      <h2 className="text-2xl font-display mb-4">{t('login.title')}</h2>
                      <p className="text-gray-600 mb-6">
                        {t('login.description')}
                      </p>
                      
                      {loginError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-900 text-sm">
                          {loginError}
                        </div>
                      )}

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase tracking-wide">
                            {t('login.email')}
                          </label>
                          <input
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder={t('placeholder.email')}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 uppercase tracking-wide">
                            {t('login.password')}
                          </label>
                          <input
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder={t('placeholder.password')}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLoggingIn}
                          className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isLoggingIn ? t('login.submitting') : t('login.submit')}
                        </button>

                        <div className="text-center pt-4 border-t border-gray-300 mt-6">
                          <p className="text-sm text-gray-600">
                            {t('login.noAccount')}{' '}
                            <LocaleLink href="/login" className="text-brand-primary font-semibold hover:underline">
                              {t('login.register')}
                            </LocaleLink>
                          </p>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* GUEST CHECKOUT FORM */
                  <form onSubmit={handleSubmit} className="space-y-6">
                {/* Express Checkout (Apple Pay / Google Pay) - Direct bovenaan, compact */}
                <ExpressCheckout
                  cartItems={items}
                  subtotal={subtotal}
                  shippingCost={shipping}
                  discount={promoDiscount}
                  promoCode={promoCode}
                  userEmail={user?.email}
                />

                {/* Contact - Compact */}
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">1</span>
                    {t('section.contact')}
                  </h2>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    inputMode="email"
                    className={`w-full px-4 py-3 border-2 ${getInputBorderClass('email')} focus:border-brand-primary focus:outline-none transition-colors`}
                    placeholder="jouw@email.nl"
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  
                  {/* Newsletter Opt-in - Subtle & Compact */}
                  <label className="flex items-start gap-2.5 mt-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 border-2 border-gray-400 rounded text-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 cursor-pointer"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                      {t('newsletter.optIn')}
                    </span>
                  </label>
                </div>

                {/* Delivery - Compact */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">2</span>
                      {t('section.delivery')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-normal text-gray-600">
                      <Lock className="w-3.5 h-3.5 text-green-600" />
                      <span className="hidden sm:inline">{t('section.secure')}</span>
                    </div>
                  </h2>
                  <div className="space-y-4">
                    {/* Name - Single Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => updateForm('firstName', e.target.value)}
                          onBlur={() => handleBlur('firstName')}
                          className={`w-full px-4 py-3 border-2 ${getInputBorderClass('firstName')} focus:border-brand-primary focus:outline-none`}
                          placeholder={t('placeholder.firstName')}
                          autoComplete="given-name"
                        />
                        {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => updateForm('lastName', e.target.value)}
                          onBlur={() => handleBlur('lastName')}
                          className={`w-full px-4 py-3 border-2 ${getInputBorderClass('lastName')} focus:border-brand-primary focus:outline-none`}
                          placeholder={t('placeholder.lastName')}
                          autoComplete="family-name"
                        />
                        {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    {/* Country - BRUTALIST MINIMAL STYLE */}
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                        {t('field.country')} <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={form.country}
                        onChange={(e) => updateForm('country', e.target.value)}
                        onBlur={() => handleBlur('country')}
                        className={`w-full px-4 py-3 border-2 ${getInputBorderClass('country')} focus:border-brand-primary focus:outline-none bg-white`}
                        autoComplete="country"
                      >
                        <option value="NL">{t('country.nl')}</option>
                        <option value="BE">{t('country.be')}</option>
                        <option value="DE">{t('country.de')}</option>
                        <option value="FR">{t('country.fr')}</option>
                        <option value="GB">{t('country.gb')}</option>
                        <option value="OTHER">{t('country.other')}</option>
                      </select>
                      {errors.country && <p className="text-red-600 text-xs mt-1">{errors.country}</p>}
                    </div>

                    {/* Land gewijzigd melding - Zwart-wit */}
                    {countryChangedInfo?.show && (
                      <div className="p-4 bg-black text-white flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold uppercase tracking-wider">
                            {t('countryChanged.title', { country: getCountryName(countryChangedInfo.newCountry) })}
                          </p>
                          <p className="text-xs mt-1 text-gray-300">
                            {t('countryChanged.message', { format: getPostcodeInfo(countryChangedInfo.newCountry).format })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCountryChangedInfo(null)}
                          className="text-white hover:text-gray-300 transition-colors text-xl leading-none"
                          aria-label={tCommon('close')}
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Postcode + Huisnummer + Toevoeging (Voor NL en BE) + Lookup Button (ALLEEN VOOR NL) */}
                    {(form.country === 'NL' || form.country === 'BE') ? (
                      <div className="space-y-3">
                        {/* Desktop: Grid layout */}
                        <div className="hidden md:grid md:grid-cols-12 gap-3">
                        <div className="col-span-3 flex flex-col">
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center whitespace-nowrap">
                            {t('field.postalCode')} <span className="text-red-600 ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.postalCode}
                            onChange={(e) => updateForm('postalCode', e.target.value)}
                            onBlur={(e) => {
                              handleBlur('postalCode')
                              
                              // Auto-trigger lookup als postcode + huisnummer compleet zijn (ALLEEN NL)
                              if (form.country === 'NL' && form.postalCode && form.huisnummer && !addressLookup.isLookedUp) {
                                const postcodeValid = /^\d{4}\s?[A-Z]{2}$/i.test(form.postalCode.replace(/\s+/g, ''))
                                const huisnummerValid = /^\d+$/.test(form.huisnummer.trim())
                                if (postcodeValid && huisnummerValid) {
                                  // Debounce: kleine delay
                                  setTimeout(() => {
                                    if (form.postalCode && form.huisnummer) {
                                      handleAddressLookup()
                                    }
                                  }, 500)
                                }
                              }
                            }}
                            className={`w-full px-4 py-3 border-2 ${
                              getInputBorderClass('postalCode')
                            } focus:border-brand-primary focus:outline-none`}
                            placeholder={getPostcodeInfo(form.country).placeholder}
                            autoComplete="postal-code"
                            disabled={addressLookup.isLookingUp}
                            maxLength={form.country === 'BE' ? 4 : form.country === 'NL' ? 7 : 10}
                          />
                          <div className="min-h-[20px] mt-1">
                            {errors.postalCode ? (
                              <p className="text-red-600 text-xs">{errors.postalCode}</p>
                            ) : !form.postalCode && touchedFields.has('postalCode') ? (
                              <p className="text-xs text-gray-500">{getPostcodeInfo(form.country).format}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="col-span-3 flex flex-col">
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center whitespace-nowrap">
                            {t('field.houseNumber')} <span className="text-red-600 ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.huisnummer}
                            onChange={(e) => {
                              // Alleen cijfers toestaan
                              const value = e.target.value.replace(/\D/g, '')
                              updateForm('huisnummer', value)
                            }}
                            onBlur={(e) => {
                              handleBlur('huisnummer')
                              
                              // Auto-trigger lookup als postcode + huisnummer compleet zijn (ALLEEN NL)
                              if (form.country === 'NL' && form.postalCode && form.huisnummer && !addressLookup.isLookedUp) {
                                const postcodeValid = /^\d{4}\s?[A-Z]{2}$/i.test(form.postalCode.replace(/\s+/g, ''))
                                const huisnummerValid = /^\d+$/.test(form.huisnummer.trim())
                                if (postcodeValid && huisnummerValid) {
                                  setTimeout(() => {
                                    if (form.postalCode && form.huisnummer) {
                                      handleAddressLookup()
                                    }
                                  }, 500)
                                }
                              }
                            }}
                            className={`w-full px-4 py-3 border-2 ${
                              getInputBorderClass('huisnummer')
                            } focus:border-brand-primary focus:outline-none`}
                            placeholder={t('placeholder.houseNumber')}
                            autoComplete="off"
                            disabled={addressLookup.isLookingUp}
                            maxLength={5}
                          />
                          <div className="min-h-[20px] mt-1">
                            {errors.huisnummer && <p className="text-red-600 text-xs">{errors.huisnummer}</p>}
                          </div>
                        </div>
                        <div className="col-span-1 flex flex-col">
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center">
                            {t('field.addition')}
                          </label>
                          <input
                            type="text"
                            value={form.toevoeging}
                            onChange={(e) => {
                              const value = e.target.value.slice(0, 10)
                              updateForm('toevoeging', value)
                            }}
                            onBlur={() => handleBlur('toevoeging')}
                            className={`w-full px-4 py-3 border-2 ${
                              getInputBorderClass('toevoeging')
                            } focus:border-brand-primary focus:outline-none`}
                            placeholder="A"
                            autoComplete="off"
                            disabled={addressLookup.isLookingUp}
                            maxLength={10}
                          />
                          <div className="min-h-[20px] mt-1">
                            {errors.toevoeging && <p className="text-red-600 text-xs">{errors.toevoeging}</p>}
                          </div>
                        </div>
                        {/* Lookup button - ALLEEN voor Nederland */}
                        {form.country === 'NL' && (
                          <div className="col-span-5 flex flex-col">
                            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center opacity-0 pointer-events-none">
                              {/* Invisible label voor alignment */}
                              &nbsp;
                            </label>
                            <button
                              type="button"
                              onClick={handleAddressLookup}
                              disabled={addressLookup.isLookingUp || !form.postalCode || !form.huisnummer}
                              className="w-full px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {addressLookup.isLookingUp ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>{t('lookup.loading')}</span>
                                </>
                              ) : (
                                <>
                                  <Search size={18} />
                                  <span>{t('lookup.button')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mobile: Stacked layout */}
                      <div className="md:hidden space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-700 whitespace-nowrap">
                            {t('field.postalCode')} <span className="text-red-600 ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.postalCode}
                            onChange={(e) => updateForm('postalCode', e.target.value)}
                            onBlur={() => handleBlur('postalCode')}
                            className={`w-full px-4 py-3 border-2 ${
                              getInputBorderClass('postalCode')
                            } focus:border-brand-primary focus:outline-none`}
                            placeholder={getPostcodeInfo(form.country).placeholder}
                            autoComplete="postal-code"
                            disabled={addressLookup.isLookingUp}
                            maxLength={form.country === 'BE' ? 4 : form.country === 'NL' ? 7 : 10}
                          />
                          <div className="min-h-[20px] mt-1">
                            {errors.postalCode ? (
                              <p className="text-red-600 text-xs">{errors.postalCode}</p>
                            ) : !form.postalCode && touchedFields.has('postalCode') ? (
                              <p className="text-xs text-gray-500">{getPostcodeInfo(form.country).format}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-700 whitespace-nowrap">
                              {t('field.houseNumber')} <span className="text-red-600 ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              value={form.huisnummer}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '')
                                updateForm('huisnummer', value)
                              }}
                              onBlur={() => handleBlur('huisnummer')}
                              className={`w-full px-4 py-3 border-2 ${
                                getInputBorderClass('huisnummer')
                              } focus:border-brand-primary focus:outline-none`}
                              placeholder={t('placeholder.houseNumber')}
                              autoComplete="off"
                              disabled={addressLookup.isLookingUp}
                              maxLength={5}
                            />
                            <div className="min-h-[20px] mt-1">
                              {errors.huisnummer && <p className="text-red-600 text-xs">{errors.huisnummer}</p>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide text-gray-700">
                              {t('field.addition')}
                            </label>
                            <input
                              type="text"
                              value={form.toevoeging}
                              onChange={(e) => {
                                const value = e.target.value.slice(0, 10)
                                updateForm('toevoeging', value)
                              }}
                              onBlur={() => handleBlur('toevoeging')}
                              className={`w-full px-4 py-3 border-2 ${
                                getInputBorderClass('toevoeging')
                              } focus:border-brand-primary focus:outline-none`}
                              placeholder={t('placeholder.addition')}
                              autoComplete="off"
                              disabled={addressLookup.isLookingUp}
                              maxLength={10}
                            />
                            <div className="min-h-[20px] mt-1">
                              {errors.toevoeging && <p className="text-red-600 text-xs">{errors.toevoeging}</p>}
                            </div>
                          </div>
                        </div>
                        {/* Lookup button - ALLEEN voor Nederland */}
                        {form.country === 'NL' && (
                          <button
                            type="button"
                            onClick={handleAddressLookup}
                            disabled={addressLookup.isLookingUp || !form.postalCode || !form.huisnummer}
                            className="w-full px-4 py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {addressLookup.isLookingUp ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>{t('lookup.loading')}</span>
                              </>
                            ) : (
                              <>
                                <Search size={18} />
                                <span>{t('lookup.button')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Error message - ALLEEN voor NL (lookup feature) */}
                      {form.country === 'NL' && addressLookup.error && (
                        <div className="p-3 bg-red-50 border-2 border-red-600 text-red-900 text-sm rounded">
                          {addressLookup.error}
                        </div>
                      )}

                      {/* Success message - ALLEEN voor NL (lookup feature) */}
                      {form.country === 'NL' && addressLookup.isLookedUp && (
                        <div className="p-3 bg-green-50 border-2 border-green-600 text-green-900 text-sm rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check size={18} className="text-green-600" />
                            <span>{t('lookup.success')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleEditAddress}
                            className="text-green-700 hover:text-green-900 font-semibold flex items-center gap-1 text-xs"
                          >
                            <Edit2 size={14} />
                            {t('lookup.edit')}
                          </button>
                        </div>
                      )}
                    </div>
                    ) : (
                      /* Voor NIET-NL/BE landen: Gewone postcode + address velden ZONDER lookup */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700">
                            {t('field.postalCode')} <span className="text-red-600 ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.postalCode}
                            onChange={(e) => updateForm('postalCode', e.target.value)}
                            onBlur={() => handleBlur('postalCode')}
                            className={`w-full px-4 py-3 border-2 ${
                              getInputBorderClass('postalCode')
                            } focus:border-brand-primary focus:outline-none`}
                            placeholder={getPostcodeInfo(form.country).placeholder}
                            autoComplete="postal-code"
                          />
                          {errors.postalCode ? (
                            <p className="text-red-600 text-xs mt-1">{errors.postalCode}</p>
                          ) : !form.postalCode && touchedFields.has('postalCode') ? (
                            <p className="text-xs text-gray-500 mt-1">{getPostcodeInfo(form.country).format}</p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Address (lees-only na lookup voor NL, altijd bewerkbaar voor andere landen) */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center whitespace-nowrap">
                        {t('field.address')} <span className="text-red-600 ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => updateForm('address', e.target.value)}
                        onBlur={() => handleBlur('address')}
                        className={`w-full px-4 py-3 border-2 ${
                          getInputBorderClass('address')
                        } focus:border-brand-primary focus:outline-none ${
                          form.country === 'NL' && addressLookup.isLookedUp ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder={t('placeholder.address')}
                        autoComplete="street-address"
                        readOnly={form.country === 'NL' && addressLookup.isLookedUp}
                      />
                      {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
                    </div>

                    {/* City (lees-only na lookup voor NL, altijd bewerkbaar voor andere landen) */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-700 h-5 flex items-center whitespace-nowrap">
                        {t('field.city')} <span className="text-red-600 ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateForm('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        className={`w-full px-4 py-3 border-2 ${
                          getInputBorderClass('city')
                        } focus:border-brand-primary focus:outline-none ${
                          form.country === 'NL' && addressLookup.isLookedUp ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder={t('placeholder.city')}
                        autoComplete="address-level2"
                        readOnly={form.country === 'NL' && addressLookup.isLookedUp}
                      />
                      {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        onBlur={() => handleBlur('phone')}
                        className={`w-full px-4 py-3 min-h-[48px] border-2 ${
                          getInputBorderClass('phone')
                        } focus:border-brand-primary focus:outline-none`}
                        placeholder={t('placeholder.phone')}
                        autoComplete="tel"
                      />
                      {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Trust Signals - Compact inline */}
                <div className="border-t-2 border-gray-200 pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t('securePayment')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('daysReturn', { days: returnDays })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{t('sslSecured')}</span>
                  </div>
                </div>

                {/* Terms - Compact */}
                <div className="text-xs text-gray-600 border-t-2 border-gray-200 pt-6">
                  {t('terms.text')}{' '}
                  <Link href="/algemene-voorwaarden" className="text-brand-primary underline" target="_blank">
                    {t('terms.terms')}
                  </Link>{' '}
                  {t('terms.and')}{' '}
                  <Link href="/privacy" className="text-brand-primary underline" target="_blank">
                    {t('terms.privacy')}
                  </Link>
                  .
                </div>

                {/* Submit Button - Mobile */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full lg:hidden py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? t('submitting') : (
                    <>
                      <span className="hidden min-[400px]:inline">{t('submit')}</span>
                      <span className="min-[400px]:hidden">{t('progress.payment')}</span>
                    </>
                  )}
                </button>
              </form>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl md:text-4xl font-display">{t('progress.payment').toUpperCase()}</h1>
                <button
                  onClick={() => {
                    setCurrentStep('details')
                    setIsSubmitting(false) // Reset submission lock when going back
                  }}
                  className="text-sm text-brand-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {tCommon('back')}
                </button>
              </div>

              {/* Payment Cancelled Warning */}
              {paymentCancelled && (
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 flex items-start gap-3 animate-fadeIn">
                  <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 mb-1">{t('messages.paymentCancelled')}</h3>
                    <p className="text-sm text-amber-800">
                      {t('messages.paymentCancelledDesc')}
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
                  {getCountryName(form.country)}
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
                  name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || 'Klant', // Stripe requires min 3 chars
                  email: form.email.trim(),
                  phone: form.phone.trim(),
                  address: {
                    line1: form.address.trim(),
                    city: form.city.trim(),
                    postal_code: form.postalCode.trim(),
                    country: form.country,
                    state: null, // Not required for NL/EU countries
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

          {/* Order Summary - 2/5 width - Sticky (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="bg-white border-2 border-black p-6 lg:sticky lg:top-24 space-y-6">
              <h2 className="text-xl font-display">{t('title')} ({items.length})</h2>

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
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white">
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
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="font-semibold uppercase tracking-wide">{tCart('subtotal')}</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    {locale === 'nl' ? 'Waarvan BTW (21%)' : 'Including VAT (21%)'}
                  </span>
                  <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
                </div>
                
                {/* Promo Discount - VOORSTEL 1: Clean & Transparent */}
                {promoDiscount > 0 && (
                  <>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-center py-2 px-3 bg-brand-primary/5 border-l-2 border-brand-primary -mx-3">
                      <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-brand-primary" />
                        <div>
                          <div className="font-semibold text-brand-primary uppercase tracking-wide text-sm">
                            {promoCode}
                          </div>
                          <div className="text-xs text-gray-600">
                            {promoType === 'percentage' ? `${promoValue}% korting` : 'Korting'} • 
                            <button
                              onClick={handleRemovePromo}
                              className="ml-1 text-gray-500 hover:text-black font-semibold underline"
                            >
                              {t('promo.remove', { ns: 'cart' })}
                            </button>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-brand-primary">-€{promoDiscount.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                  </>
                )}
                
                {/* Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="font-semibold uppercase tracking-wide">{tCart('shipping')}</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-brand-primary font-bold">{tCart('shippingFree')}</span>
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
                      <span>{t('promo.title')}</span>
                    </div>
                    <ChevronDown size={16} />
                  </button>
                ) : promoDiscount === 0 ? (
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Ticket size={16} />
                        <span>{t('promo.title')}</span>
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
                        placeholder={t('placeholder.promoCode')}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoCode}
                        className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {t('promo.apply')}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                    )}
                  </div>
                ) : null}
                
                {subtotalAfterDiscount < freeShippingThreshold && subtotalAfterDiscount > 0 && (
                  <div className="bg-gray-100 border border-gray-300 p-2 text-xs text-gray-900 font-semibold">
                    {t('freeShippingProgress', { amount: (freeShippingThreshold - subtotalAfterDiscount).toFixed(2), ns: 'cart' })}
                  </div>
                )}
              </div>

              {/* Total - Prominent */}
              <div className="flex justify-between items-center border-t-2 border-black pt-4">
                <span className="text-lg font-bold">{t('total')}</span>
                <span className="text-2xl font-display">€{total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 text-right mt-1">
                {locale === 'nl' ? `Incl. €${totalBtw.toFixed(2)} BTW` : `Incl. €${totalBtw.toFixed(2)} VAT`}
              </p>

              {/* Submit Button - Desktop */}
              {currentStep === 'details' && (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="hidden lg:block w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? t('submitting') : t('submit')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </Elements>
  )
}
