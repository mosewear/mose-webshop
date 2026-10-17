'use client'

import { useEffect, useMemo, useRef } from 'react'
import { formatPrice, formatBedrag, formatBedragKaal } from '@/lib/format-price'
import { trackAddToCart } from '@/lib/analytics'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { catalogContentId } from '@/lib/catalog-ids'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import { X, Minus, Plus, Trash2, ShoppingBag, Ticket, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { getSiteSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import {
  computeCartStaffelBreakdown,
  type ProductQtyTierRow,
} from '@/lib/cart-staffel-display'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { vertaalKleur } from '@/lib/kleurnaam'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const t = useTranslations('cart')
  const locale = useLocale()
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  // Helper to get localized product name
  const getProductName = (product: any) => 
    locale === 'en' && product.name_en ? product.name_en : product.name
  
  // Zie src/lib/kleurnaam.ts. Dezelfde omzettabel stond hier en in de
  // productpagina, met verschillende uitkomsten, en de terugval maakte van
  // "Off White" nog eens "Off white".
  const getTranslatedColor = (color: string) => vertaalKleur(color, locale)
  
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount, addItem } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  // 30, niet 14: dat is wat de winkel belooft. Tot de instellingen
  // binnen zijn, stond hier een termijn die we niet meer hanteren.
  const [returnDays, setReturnDays] = useState(30)
  const [promoCodeExpanded, setPromoCodeExpanded] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('fixed')
  const [promoValue, setPromoValue] = useState(0)
  const [upsellProducts, setUpsellProducts] = useState<any[]>([])
  const [addingProduct, setAddingProduct] = useState<string | null>(null)
  const [selectedUpsellSizes, setSelectedUpsellSizes] = useState<Record<string, string>>({})
  const [quantityDiscountTiers, setQuantityDiscountTiers] = useState<
    Record<string, ProductQtyTierRow[]>
  >({})
  const [productSalePrices, setProductSalePrices] = useState<Record<string, number | null>>({})

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
  const staffelBreakdown = useMemo(() => {
    if (items.length === 0) {
      return { totalSavings: 0, lineSavingByVariantId: {} as Record<string, number>, hints: [] }
    }
    const flatTiers = Object.values(quantityDiscountTiers).flat()
    const saleByProductId: Record<string, boolean> = {}
    Object.entries(productSalePrices).forEach(([pid, sp]) => {
      if (sp != null) saleByProductId[pid] = true
    })
    return computeCartStaffelBreakdown(items, flatTiers, saleByProductId)
  }, [items, quantityDiscountTiers, productSalePrices])

  const subtotalAfterDiscount = subtotal - promoDiscount - staffelBreakdown.totalSavings
  const shipping = subtotalAfterDiscount >= freeShippingThreshold ? 0 : shippingCost
  
  // BTW berekening (21% is al inbegrepen in de prijzen)
  const vatRate = 0.21
  const subtotalExclBtw = subtotalAfterDiscount / (1 + vatRate)
  const btwAmount = subtotalAfterDiscount - subtotalExclBtw
  const totalBtw = btwAmount + (shipping / (1 + vatRate) * vatRate)
  
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

    // Only revalidate if we have items and a saved promo code
    if (isOpen) {
      revalidatePromo()
    }
  }, [subtotal, items.length, isOpen]) // Revalidate when subtotal or item count changes

  // Debug logging
  useEffect(() => {
    if (isOpen && items.length > 0) {
      console.log('═════════════════════════════════════════')
      console.log('🛒 CART DRAWER - ITEMS')
      console.log('═════════════════════════════════════════')
      items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          isPresale: item.isPresale,
        })
      })
      console.log('Subtotal:', subtotal)
      console.log('═════════════════════════════════════════')
    }
  }, [isOpen, items, subtotal])

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
      setReturnDays(settings.return_days)
    })
  }, [])

  /**
   * Hoeveel er nog van deze regel bij kan. `null` betekent onbeperkt
   * (cadeaubonnen hebben geen voorraad).
   */
  const maxAantal = (item: { stock: number; isPresale?: boolean; presaleStock?: number; isGiftCard?: boolean }) => {
    if (item.isGiftCard) return null
    const max = item.isPresale ? (item.presaleStock ?? 0) : item.stock
    return Number.isFinite(max) && max > 0 ? max : null
  }

  /** Bestanden die in product_images staan maar geen afbeelding zijn. Een
   *  <Image> kan ze niet tonen en levert een leeg grijs vlak op: dat gebeurde
   *  met het horloge, waarvan de primaire "afbeelding" een .mp4 was. */
  const isVideoBestand = (url?: string | null) => !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)

  /** Eerste bruikbare miniatuur van een product. */
  const miniatuur = (product: { product_images?: { url: string }[] }) =>
    product.product_images?.find((b) => !isVideoBestand(b?.url))?.url || '/placeholder-product.svg'

  // Suggesties ophalen.
  //
  // Dit liep alleen bij een gevulde mand. Een lege mand toonde dus een leeg
  // scherm met één knop "verder shoppen" en verder niets: precies het moment
  // waarop iemand wél wil kijken, en precies het moment waarop de winkel niets
  // laat zien. Nu halen we ze ook op als de mand leeg is, zonder uitsluitingen.
  useEffect(() => {
    if (!isOpen) {
      setUpsellProducts([])
      return
    }

    const fetchUpsellProducts = async () => {
      const supabase = createClient()
      
      // Get product IDs already in cart
      const cartProductIds = items.map(item => item.productId)
      
      // Fetch 3 random products not in cart with all variants
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          name_en,
          slug,
          base_price,
          product_images!inner(url, is_primary),
          product_variants!inner(id, sku, size, color, color_hex, stock_quantity, is_available)
        `)
        .gt('product_variants.stock_quantity', 0)
        .eq('product_images.is_primary', true)
        .eq('product_variants.is_available', true)
        // Was `.limit(3)` zonder ordening, dus de volgorde was willekeurig. Bij
        // een mand van €50 verscheen het horloge als eerste
        // suggestie: vier keer de mandwaarde, en geen kledingstuk. Dat breekt de
        // belofte "maak je look compleet".
        .order('base_price', { ascending: true })
        .limit(6)

      // `in ()` met een lege lijst is geen geldige sql, dus alleen uitsluiten
      // als er daadwerkelijk iets in de mand zit.
      if (cartProductIds.length > 0) {
        query = query.not('id', 'in', `(${cartProductIds.join(',')})`)
      }

      const { data, error } = await query

      if (!error && data) {
        // Plafond op het dubbele van de mandwaarde: bij €50 in de mand zie je
        // de sweater en de hoodie, niet het duurste stuk. Omgekeerd,
        // vanaf een gevulde mand, mag duurder wel. Daarna de drie goedkoopste,
        // want dat zijn de meest waarschijnlijke bijkopen richting de drempel.
        const mandwaarde = getTotal()
        const plafond = mandwaarde > 0 ? mandwaarde * 2 : Infinity
        const passend = (data as any[]).filter(
          (p) => Number(p.sale_price ?? p.base_price ?? 0) <= plafond
        )
        setUpsellProducts((passend.length > 0 ? passend : (data as any[])).slice(0, 3))
        
        // Set default selected size for each product (first available size)
        const defaultSizes: Record<string, string> = {}
        data.forEach(product => {
          if (product.product_variants && product.product_variants.length > 0) {
            // Get unique sizes and select first one
            const sizes = [...new Set(product.product_variants.map((v: any) => v.size))].sort()
            defaultSizes[product.id] = sizes[0] || ''
          }
        })
        setSelectedUpsellSizes(defaultSizes)
      }
    }

    fetchUpsellProducts()
  }, [isOpen, items])

  // Fetch quantity discount tiers for products in cart
  useEffect(() => {
    if (!isOpen || items.length === 0) return

    const fetchTiers = async () => {
      const supabase = createClient()
      const productIds = [...new Set(items.map(i => i.productId))]

      const { data: tiers } = await supabase
        .from('product_quantity_discounts')
        .select('product_id, min_quantity, discount_type, discount_value, is_active')
        .in('product_id', productIds)
        .eq('is_active', true)
        .order('min_quantity')

      const { data: products } = await supabase
        .from('products')
        .select('id, sale_price, base_price')
        .in('id', productIds)

      if (tiers) {
        const grouped: Record<string, ProductQtyTierRow[]> = {}
        tiers.forEach((t) => {
          if (!grouped[t.product_id]) grouped[t.product_id] = []
          grouped[t.product_id].push({
            product_id: t.product_id,
            min_quantity: t.min_quantity,
            discount_type: t.discount_type,
            discount_value: t.discount_value,
            is_active: t.is_active,
          })
        })
        setQuantityDiscountTiers(grouped)
      }

      if (products) {
        const salePrices: Record<string, number | null> = {}
        products.forEach(p => {
          salePrices[p.id] = (p.sale_price && p.sale_price < p.base_price) ? p.sale_price : null
        })
        setProductSalePrices(salePrices)
      }
    }

    fetchTiers()
  }, [isOpen, items.length])


  // Disable body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Wat er in de mand verandert, wordt hardop gemeld.
  //
  // De lade had geen enkel meldingsgebied. Wie met een schermlezer een maat
  // toevoegde of een regel verwijderde, hoorde niets: de knop werd ingedrukt en
  // daarna bleef het stil, terwijl het totaal en het aantal wel veranderden.
  const [melding, setMelding] = useState('')
  const vorigAantal = useRef<number | null>(null)
  useEffect(() => {
    const aantal = getItemCount()
    if (!isOpen) {
      vorigAantal.current = null
      setMelding('')
      return
    }
    if (vorigAantal.current === null) {
      vorigAantal.current = aantal
      return
    }
    if (aantal !== vorigAantal.current) {
      vorigAantal.current = aantal
      setMelding(
        aantal === 0
          // Eigen zin voor de voorlezer. `empty.message` nodigt uit om iets uit
          // te kiezen en is daarmee geen melding van wat er zojuist gebeurde.
          ? t('empty.announce')
          : `${t('items', { count: aantal })}. ${t('subtotal')} ${formatBedrag(getTotal(), locale)}`
      )
    }
  }, [isOpen, items, getItemCount, getTotal, locale, t])

  // Escape sluit, en de focus blijft binnen de lade.
  //
  // Dat laatste ontbrak: na het toevoegen van een artikel bleef de focus op de
  // knop "In winkelmand" op de pagina eróchter staan. Wie met het toetsenbord
  // verder tabte, liep zo de onzichtbare pagina in terwijl de lade open stond.
  const ladeRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!isOpen) return

    const vorigeFocus = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      const paneel = ladeRef.current
      const eerste = paneel?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      eerste?.focus({ preventScroll: true })
    })

    const bijToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const paneel = ladeRef.current
      if (!paneel) return
      const focusbaar = paneel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusbaar.length === 0) return
      const eerste = focusbaar[0]
      const laatste = focusbaar[focusbaar.length - 1]
      if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }

    document.addEventListener('keydown', bijToets)
    return () => {
      document.removeEventListener('keydown', bijToets)
      vorigeFocus?.focus({ preventScroll: true })
    }
  }, [isOpen, onClose])

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
          items: items, // ✅ NEW: Send items for no-stacking discount check
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
        setPromoError(data.error || t('promo.error'))
        setPromoDiscount(0)
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError(t('promo.validationFailed'))
      setPromoDiscount(0)
    }
  }

  const handleRemovePromo = () => {
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

  // Handle quick add from upsell
  const handleQuickAdd = async (product: any) => {
    const selectedSize = selectedUpsellSizes[product.id]
    
    if (!selectedSize) {
      console.error('No size selected')
      return
    }
    
    setAddingProduct(product.id)
    
    // Find the variant that matches the selected size
    const variant = product.product_variants.find((v: any) => v.size === selectedSize)
    
    if (!variant) {
      console.error('Variant not found for selected size')
      setAddingProduct(null)
      return
    }
    
    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: getProductName(product),
      size: variant.size,
      color: variant.color || 'Zwart',
      colorHex: variant.color_hex || '#000000',
      price: product.base_price,
      quantity: 1,
      image: miniatuur(product),
      sku: variant.sku,
      stock: variant.stock_quantity,
    })

    // Dit toevoegen werd nergens gemeld: niet aan Meta en niet aan onze eigen
    // meting. Wie via "maak je look compleet" een tweede stuk in de mand legde,
    // bestond in de cijfers niet. Dat kost twee dingen: je ziet niet of de
    // kruisverkoop werkt, en Meta krijgt minder signaal om op te sturen.
    const contentId = catalogContentId(product.id, variant.color)
    trackPixelEvent('AddToCart', {
      content_ids: [contentId],
      contents: [{ id: contentId, quantity: 1, item_price: Number(product.base_price) }],
      content_name: `${getProductName(product)} - ${variant.size} - ${variant.color}`,
      content_type: 'product',
      value: Number(product.base_price),
      currency: 'EUR',
      num_items: 1,
    })

    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.categories?.name || 'uncategorized',
      price: Number(product.base_price),
      quantity: 1,
      color: variant.color,
      size: variant.size,
      variantId: variant.id,
      sku: variant.sku,
      source: 'cart_upsell',
      sizeChosenByUser: true,
      colorChosenByUser: false,
    })

    // Remove from upsell list
    setUpsellProducts(prev => prev.filter(p => p.id !== product.id))
    
    // Remove from selected sizes
    setSelectedUpsellSizes(prev => {
      const newSizes = { ...prev }
      delete newSizes[product.id]
      return newSizes
    })
    
    setTimeout(() => setAddingProduct(null), 1000)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={ladeRef}
        data-cart-drawer
        className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-white border-l-4 border-black z-50 flex flex-col animate-slideInRight"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-black bg-white sticky top-0 z-10">
          <div>
            <h2 id="cart-drawer-title" className="font-display text-2xl md:text-3xl uppercase">
              {t('title')}
            </h2>
            <p className="text-sm text-gray-600 uppercase tracking-wider mt-1">
              {t('items', { count: getItemCount() })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            aria-label={t('close')}
          >
            <X size={24} />
          </button>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {melding}
        </div>

        {items.length === 0 ? (
          /* Lege mand: niet alleen een melding, maar ook een weg verder. */
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center p-8 pb-6 text-center">
              <div className="w-20 h-20 border-4 border-gray-300 flex items-center justify-center mb-6">
                <ShoppingBag size={40} className="text-gray-300" />
              </div>
              <h3 className="font-display text-2xl uppercase mb-2">{t('empty.title')}</h3>
              <p className="text-gray-600 mb-6">{t('empty.message')}</p>
              <button
                onClick={onClose}
                className="min-h-[44px] px-8 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                {t('empty.continue')}
              </button>
            </div>

            {upsellProducts.length > 0 && (
              <div className="border-t-2 border-gray-200 px-4 py-4 md:px-6">
                <h4 className="font-display text-base uppercase tracking-wide mb-3">
                  {t('empty.popular')}
                </h4>
                <ul className="space-y-2">
                  {upsellProducts.map((product: any) => (
                    <li key={product.id}>
                      <LocaleLink
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 border-2 border-gray-200 p-2 hover:border-black transition-colors"
                      >
                        <div className="relative h-16 w-14 flex-shrink-0 bg-gray-100">
                          <Image
                            src={miniatuur(product)}
                            alt=""
                            fill
                            sizes="56px"
                            quality={90}
                            className="object-cover"
                          />
                        </div>
                        <span className="flex-1 text-sm font-semibold leading-snug">
                          {locale === 'en' && product.name_en ? product.name_en : product.name}
                        </span>
                        <span className="text-sm font-bold text-brand-primary">
                          {formatPrice(product.base_price, locale)}
                        </span>
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Items Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-6">
              <div className="p-4 md:p-6 space-y-0">
                {items.map((item, index) => (
                  <div key={item.variantId}>
                    {index > 0 && <div className="border-t-2 border-gray-200" />}
                    
                    <div className="py-4 md:py-6 group">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <LocaleLink
                          href={`/product/${item.slug || item.productId}`}
                          onClick={onClose}
                          className="relative w-20 h-[104px] md:w-[100px] md:h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden"
                        >
                          <Image
                            src={item.image || '/placeholder-product.svg'}
                            alt={item.name}
                            fill
                            sizes="100px"
                            quality={90}
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.svg' }}
                          />
                        </LocaleLink>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          {/* Top Section */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <LocaleLink
                                href={`/product/${item.slug || item.productId}`}
                                onClick={onClose}
                                className="font-display text-lg md:text-xl uppercase hover:text-brand-primary transition-colors leading-tight"
                              >
                                {item.name}
                              </LocaleLink>
                              <button
                                onClick={() => removeItem(item.variantId)}
                                className="flex-shrink-0 w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label={t('remove')}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            {item.isGiftCard ? (
                              <div className="text-gray-600 text-sm space-y-0.5">
                                <div>
                                  <span className="uppercase tracking-[0.15em] text-[11px] text-gray-500 mr-1.5">
                                    {t('giftCard.value', { defaultValue: 'Waarde' })}
                                  </span>
                                  <span className="font-medium">{formatPrice(Number(item.giftCardAmount ?? item.price), locale)}</span>
                                </div>
                                {item.giftCardRecipient?.recipientName ? (
                                  <div className="text-xs text-gray-600">
                                    {t('giftCard.for', { defaultValue: 'Voor' })}{' '}
                                    <span className="font-medium">{item.giftCardRecipient.recipientName}</span>
                                    {item.giftCardRecipient.recipientEmail ? ` · ${item.giftCardRecipient.recipientEmail}` : ''}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    {t('giftCard.selfDelivery', { defaultValue: 'Code wordt naar jou verstuurd' })}
                                  </div>
                                )}
                                {item.giftCardRecipient?.scheduledSendAt ? (
                                  <div className="text-[11px] text-gray-500">
                                    {t('giftCard.scheduled', { defaultValue: 'Verzending op' })}{' '}
                                    {new Date(item.giftCardRecipient.scheduledSendAt).toLocaleString(
                                      undefined,
                                      { dateStyle: 'medium', timeStyle: 'short' }
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-gray-600 text-sm space-x-2">
                                <span>{getTranslatedColor(item.color)}</span>
                                <span>•</span>
                                <span>{t('size')} {item.size}</span>
                              </div>
                            )}
                          </div>

                          {/* Bottom Section - Quantity & Price */}
                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity Controls */}
                            {/* De plusknop faalde stil zodra de voorraad bereikt
                                was: updateQuantity doet Math.min(aantal, voorraad),
                                dus bij een artikel met voorraad 1 gebeurde er
                                niets en kreeg de klant geen enkele uitleg. Precies
                                op het moment dat hij méér wilde kopen. De knop is
                                nu zichtbaar uitgeschakeld met de reden eronder.
                                De minknop op 1 deed ook niets; die verwijdert nu. */}
                            <div className="flex items-center border border-black">
                              <button
                                onClick={() =>
                                  item.quantity <= 1
                                    ? removeItem(item.variantId)
                                    : updateQuantity(item.variantId, item.quantity - 1)
                                }
                                className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label={item.quantity <= 1 ? t('remove') : t('decrease')}
                              >
                                {item.quantity <= 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                              </button>
                              <span className="w-11 text-center font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                disabled={maxAantal(item) !== null && item.quantity >= maxAantal(item)!}
                                className={`w-11 h-11 flex items-center justify-center transition-colors ${
                                  maxAantal(item) !== null && item.quantity >= maxAantal(item)!
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                    : 'hover:bg-black hover:text-white'
                                }`}
                                aria-label={t('increase')}
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="font-bold text-lg">{formatBedrag((item.price * item.quantity), locale)}</div>
                              {(staffelBreakdown.lineSavingByVariantId[item.variantId] ?? 0) > 0 && (
                                <p className="text-xs text-gray-600 mt-1 max-w-[200px] ml-auto leading-snug">
                                  {t('staffel.lineSaving', {
                                    amount: formatBedragKaal(staffelBreakdown.lineSavingByVariantId[item.variantId], locale),
                                  })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Zegt waaróm de plusknop uitstaat. Vier varianten
                              staan op nul en drie op één, dus dit is geen
                              theoretisch geval. Op een eigen regel onder de
                              knoppen: ingeklemd tussen het aantal en de prijs
                              brak "Laatste exemplaar" over twee regels en liep
                              het tegen het bedrag aan. */}
                          {maxAantal(item) !== null && maxAantal(item)! <= 3 && (
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              {maxAantal(item) === 1
                                ? t('lastOne')
                                : t('onlyLeft', { count: maxAantal(item)! })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear Cart Button - Desktop Only */}
              <div className="hidden md:block px-4 md:px-6 pb-4">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex min-h-[44px] items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm uppercase tracking-wider font-semibold"
                >
                  <Trash2 size={16} />
                  <span>{t('clearCart')}</span>
                </button>
              </div>

              {/* Upsell Products - "Maak je Look Compleet" */}
              {upsellProducts.length > 0 && (
                <div className="px-4 md:px-6 pb-4 border-t-2 border-gray-200 pt-4">
                  <h3 className="font-display text-base uppercase mb-3 tracking-wide">
                    {t('upsell.completeLook')}
                  </h3>
                  {/* Snappen per kaart, en de derde kaart loopt zichtbaar het
                      beeld uit zodat je ziet dat er meer naast staat. Zonder die
                      aanzet eindigt de rij precies op de rand en lijkt het één
                      suggestie. */}
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:-mx-6 md:px-6">
                    {upsellProducts.map((product) => {
                      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
                      const availableSizes = [...new Set(product.product_variants.map((v: any) => v.size))] as string[]
                      availableSizes.sort((a: string, b: string) => {
                        const indexA = sizeOrder.indexOf(a.toUpperCase())
                        const indexB = sizeOrder.indexOf(b.toUpperCase())
                        
                        // Both sizes in predefined order - sort by index
                        if (indexA !== -1 && indexB !== -1) {
                          return indexA - indexB
                        }
                        
                        // Only A is in predefined order - A comes first
                        if (indexA !== -1) return -1
                        
                        // Only B is in predefined order - B comes first
                        if (indexB !== -1) return 1
                        
                        // Neither in predefined order - sort alphabetically
                        return a.localeCompare(b)
                      })
                      const selectedSize = selectedUpsellSizes[product.id]
                      
                      return (
                        <div
                          key={product.id}
                          className="flex-shrink-0 snap-start w-[280px] md:w-[320px] border-2 border-gray-200 hover:border-black transition-all p-2 group"
                        >
                          {/* Top Row: Image + Info */}
                          <div className="flex items-start gap-3 mb-2">
                            {/* Image */}
                            <LocaleLink
                              href={`/product/${product.slug}`}
                              onClick={onClose}
                              className="relative w-[60px] h-[80px] bg-gray-100 flex-shrink-0 overflow-hidden"
                            >
                              <Image
                                src={miniatuur(product)}
                                alt={getProductName(product)}
                                fill
                                sizes="60px"
                                quality={90}
                                className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.svg' }}
                              />
                            </LocaleLink>
                            
                            {/* Product Info + Price */}
                            <div className="flex-1 min-w-0">
                              <LocaleLink
                                href={`/product/${product.slug}`}
                                onClick={onClose}
                                className="block text-xs font-semibold uppercase leading-tight mb-1 hover:text-brand-primary transition-colors line-clamp-2"
                              >
                                {getProductName(product)}
                              </LocaleLink>
                              <span className="text-brand-primary font-bold text-sm">
                                {formatPrice(product.base_price, locale)}
                              </span>
                            </div>
                          </div>

                          {/* Inline: Size Selector + Add Button */}
                          <div className="flex items-center gap-2">
                            {/* Size Buttons */}
                            <div className="flex gap-1 flex-1">
                              {availableSizes.map((size: string) => (
                                <button
                                  key={size}
                                  onClick={() => setSelectedUpsellSizes(prev => ({ ...prev, [product.id]: size }))}
                                  className={`
                                    flex-1 min-h-[44px] px-2 text-[11px] font-bold uppercase border-2 transition-all
                                    ${selectedSize === size
                                      ? 'border-black bg-black text-white'
                                      : 'border-gray-300 hover:border-black'
                                    }
                                  `}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>

                            {/* Add to Cart Button */}
                            <button
                              onClick={() => handleQuickAdd(product)}
                              disabled={addingProduct === product.id || !selectedSize}
                              className={`
                                flex-shrink-0 min-h-[44px] px-4 text-[11px] font-bold uppercase transition-all whitespace-nowrap
                                ${addingProduct === product.id
                                  ? 'bg-brand-primary text-white'
                                  : !selectedSize
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-brand-primary text-white hover:bg-green-600'
                                }
                              `}
                            >
                              {addingProduct === product.id ? (
                                <span className="flex items-center gap-1">
                                  <span className="text-sm">✓</span>
                                  OK
                                </span>
                              ) : !selectedSize ? (
                                t('size')
                              ) : (
                                t('upsell.quickAdd')
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Summary - Sticky Bottom (Desktop) / Fixed Bottom (Mobile) */}
            <div className="flex-shrink-0 border-t-2 border-black bg-gray-50 sticky bottom-0">
              {/* Desktop Summary */}
              <div className="hidden md:block p-3 space-y-2">
                {/* Progress to Free Shipping - Enhanced with Progress Bar */}
                {freeShippingThreshold > 0 && subtotalAfterDiscount < freeShippingThreshold && (
                  <div className="bg-white border-l-2 border-brand-primary px-2 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-600">
                        {t('freeShippingProgress', { amount: formatBedragKaal(freeShippingThreshold - subtotalAfterDiscount, locale) })}
                      </p>
                      <span className="text-xs font-bold text-brand-primary">
                        {Math.round((subtotalAfterDiscount / freeShippingThreshold) * 100)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-gray-200 overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary transition-all duration-300"
                        style={{ width: `${Math.min((subtotalAfterDiscount / freeShippingThreshold) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Free Shipping Achieved Message */}
                {subtotalAfterDiscount >= freeShippingThreshold && (
                  <div className="bg-green-50 border-l-2 border-green-600 px-2 py-1.5">
                    <p className="text-xs text-green-800 font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('freeShippingReached')}
                    </p>
                  </div>
                )}

                {/* Promo Code Section */}
                <div className="border-t border-gray-300 pt-2">
                  {!promoCodeExpanded && promoDiscount === 0 ? (
                    <button
                      onClick={() => setPromoCodeExpanded(true)}
                      className="w-full flex min-h-[44px] items-center justify-between text-sm font-semibold text-gray-700 hover:text-black transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket size={16} />
                        <span>{t('promo.title')}</span>
                      </div>
                      <ChevronDown size={16} />
                    </button>
                  ) : promoDiscount === 0 ? (
                    <div className="space-y-2">
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
                          className="p-1 hover:bg-gray-200 transition-colors"
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
                          placeholder={t('placeholder.promoCode', { ns: 'checkout' })}
                          className="flex-1 min-h-[44px] px-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoCode}
                          className="min-h-[44px] px-4 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {t('promo.apply')}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Totals Section - VOORSTEL 1 DESIGN */}
                <div className="border-t-2 border-black pt-3 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold uppercase tracking-wide">{t('subtotal')}</span>
                    <span className="font-bold">{formatBedrag(subtotal, locale)}</span>
                  </div>

                  {/* Staffelkorting */}
                  {staffelBreakdown.totalSavings > 0 && (
                    <div className="flex justify-between items-center text-sm px-2 py-1.5 bg-gray-50 border-l-2 border-black">
                      <span className="font-semibold text-gray-800 uppercase tracking-wide text-xs">{t('staffel.label')}</span>
                      <span className="font-bold text-black">-{formatBedrag(staffelBreakdown.totalSavings, locale)}</span>
                    </div>
                  )}

                  {/* Staffelkorting hint */}
                  {staffelBreakdown.hints.length > 0 && (
                    <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 border-l-2 border-gray-300 space-y-1">
                      {staffelBreakdown.hints.map((h, i) => (
                        <p key={`${h.productId}-${i}`} className="font-medium leading-snug">
                          {t('staffel.nextTier', {
                            product: h.productName,
                            needed: h.needed,
                            discount: h.discountLabel,
                          })}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Promo Discount */}
                  {promoDiscount > 0 && (
                    <>
                      <div className="h-px bg-gray-300"></div>
                      <div className="flex justify-between items-center py-1 px-2 bg-brand-primary/5 border-l-2 border-brand-primary">
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
                                {t('promo.remove')}
                              </button>
                            </div>
                          </div>
                        </div>
                        <span className="font-bold text-black">-{formatBedrag(promoDiscount, locale)}</span>
                      </div>
                      <div className="h-px bg-gray-300"></div>
                    </>
                  )}

                  {/* Shipping */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold uppercase tracking-wide">{t('shipping')}</span>
                    <span className="font-bold text-brand-primary">
                      {shipping === 0 ? t('shippingFree') : formatBedrag(shipping, locale)}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="border-t-2 border-black pt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-display text-xl uppercase tracking-wide">{t('total')}</span>
                      <span className="font-display text-4xl">{formatBedrag(total, locale)}</span>
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      {t('totalInclusive')}
                    </p>
                  </div>
                </div>

                {/* CTA Button - GREEN! */}
                <LocaleLink
                  href="/checkout"
                  onClick={onClose}
                  className={buttonVariants({ variant: 'primary', size: 'md', fullWidth: true })}
                >
                  {t('checkout')}
                </LocaleLink>
              </div>

              {/* Mobile Fixed Bottom Bar */}
              <div className="md:hidden bg-white border-t-2 border-black">
                {/* Promo Code Section - Mobile */}
                <div className="p-3 border-b border-gray-200">
                  {!promoCodeExpanded && promoDiscount === 0 ? (
                    <button
                      onClick={() => setPromoCodeExpanded(true)}
                      className="w-full flex min-h-[44px] items-center justify-between text-sm font-semibold text-gray-700 hover:text-black transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket size={16} />
                        <span>{t('promo.title')}</span>
                      </div>
                      <ChevronDown size={16} />
                    </button>
                  ) : promoDiscount === 0 ? (
                    <div className="space-y-2">
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
                          className="p-1 hover:bg-gray-200 transition-colors"
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
                          placeholder={t('placeholder.promoCode', { ns: 'checkout' })}
                          className="flex-1 min-h-[44px] px-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoCode}
                          className="min-h-[44px] px-4 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {t('promo.apply')}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                      )}
                    </div>
                  ) : null}

                  {/* Applied Promo Display - Mobile */}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-center py-1 px-2 bg-brand-primary/5 border-l-2 border-brand-primary">
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
                              className="text-gray-700 hover:text-black font-semibold ml-1 underline"
                            >
                              {t('promo.remove')}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-black">
                          -{formatBedrag(promoDiscount, locale)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Staffelkorting hint - Mobile */}
                {staffelBreakdown.hints.length > 0 && (
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 space-y-1">
                    {staffelBreakdown.hints.map((h, i) => (
                      <p key={`${h.productId}-m-${i}`} className="text-xs text-gray-600 font-medium leading-snug">
                        {t('staffel.nextTier', {
                          product: h.productName,
                          needed: h.needed,
                          discount: h.discountLabel,
                        })}
                      </p>
                    ))}
                  </div>
                )}

                {staffelBreakdown.totalSavings > 0 && (
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">{t('staffel.label')}</span>
                    <span className="text-xs font-bold text-black">-{formatBedrag(staffelBreakdown.totalSavings, locale)}</span>
                  </div>
                )}

                {/* Total & Checkout - Mobile */}
                <div className="p-4 bg-black text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('total')}</div>
                      <div className="font-display text-3xl">{formatBedrag(total, locale)}</div>
                      <div className="text-xs text-gray-400">
                        {t('totalInclusive')}
                      </div>
                    </div>
                    <LocaleLink
                      href="/checkout"
                      onClick={onClose}
                      className="px-6 py-3 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                    >
                      {t('checkout')}
                    </LocaleLink>
                  </div>
                  {/* Enhanced shipping progress for mobile */}
                  {freeShippingThreshold > 0 && subtotalAfterDiscount < freeShippingThreshold ? (
                    <div className="border-t border-gray-700 pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-400">
                          {t('freeShippingProgressMobile', { amount: formatBedragKaal(freeShippingThreshold - subtotalAfterDiscount, locale) })}
                        </p>
                        <span className="text-xs font-bold text-brand-primary">
                          {Math.round((subtotalAfterDiscount / freeShippingThreshold) * 100)}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1 bg-gray-700 overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary transition-all duration-300"
                          style={{ width: `${Math.min((subtotalAfterDiscount / freeShippingThreshold) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-700 pt-2">
                      <p className="text-xs text-green-400 font-semibold flex items-center gap-1 justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('freeShippingReached')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-md w-full">
            <h3 className="font-display text-2xl md:text-3xl mb-4 uppercase">{t('clearConfirm.title')}</h3>
            <p className="text-gray-600 mb-6">
              {t('clearConfirm.message')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
              >
                {t('clearConfirm.cancel')}
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className={cn(buttonVariants({ variant: 'danger' }), 'flex-1')}
              >
                {t('clearConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

