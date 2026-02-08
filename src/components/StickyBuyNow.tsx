'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { trackAddToCart } from '@/lib/analytics'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { formatPrice } from '@/lib/format-price'

interface StickyBuyNowProps {
  product: {
    id: string
    name: string
    base_price: number
    sale_price: number | null
  }
  selectedVariant: {
    id: string
    size: string
    color: string
    color_hex: string
    price_adjustment: number
    stock_quantity: number
    sku: string
    presale_enabled?: boolean
    presale_stock_quantity?: number
    presale_expected_date?: string | null
  } | null | undefined
  quantity: number
  setQuantity: (qty: number) => void
  cartImage: string
  inStock: boolean
  onVariantRequired: () => void
}

export default function StickyBuyNow({
  product,
  selectedVariant,
  quantity,
  setQuantity,
  cartImage,
  inStock,
  onVariantRequired,
}: StickyBuyNowProps) {
  const t = useTranslations('product.sticky')
  const locale = useLocale()
  const [isVisible, setIsVisible] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const router = useRouter()
  const addItem = useCart((state) => state.addItem)
  const { openDrawer, isOpen: isCartOpen } = useCartDrawer()

  // Scroll detection - show on mobile always, on desktop after scrolling past add to cart button
  useEffect(() => {
    const handleScroll = () => {
      // Mobile: always show (except on cart/checkout pages)
      if (window.innerWidth < 768) {
        setIsVisible(true)
        return
      }

      // Desktop: show after scrolling 600px (past the add to cart button)
      if (window.scrollY > 600) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Initial check
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // Hide on cart/checkout pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.includes('/cart') || path.includes('/checkout')) {
        setIsVisible(false)
      }
    }
  }, [])

  const finalPrice = product.sale_price 
    ? product.sale_price + (selectedVariant?.price_adjustment || 0)
    : product.base_price + (selectedVariant?.price_adjustment || 0)

  const originalPrice = product.base_price + (selectedVariant?.price_adjustment || 0)
  const hasDiscount = product.sale_price !== null && product.sale_price < product.base_price
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    : 0

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      onVariantRequired()
      return
    }

    if (!inStock) {
      toast.error('Dit product is niet op voorraad')
      return
    }

    setIsAdding(true)

    // PRESALE: Calculate if item is presale
    const isPresaleItem = selectedVariant.presale_enabled && selectedVariant.presale_stock_quantity && selectedVariant.presale_stock_quantity > 0

    console.log('═════════════════════════════════════════')
    console.log('🛒 STICKY BAR - ADD TO CART')
    console.log('═════════════════════════════════════════')
    console.log('📦 Product:', product.name)
    console.log('🎨 Variant ID:', selectedVariant.id)
    console.log('═════════════════════════════════════════')
    console.log('🔍 PRESALE CHECK:')
    console.log('   - presale_enabled:', selectedVariant.presale_enabled)
    console.log('   - stock_quantity:', selectedVariant.stock_quantity)
    console.log('   - presale_stock_quantity:', selectedVariant.presale_stock_quantity)
    console.log('   - presale_expected_date:', selectedVariant.presale_expected_date)
    console.log('   - CALCULATED isPresale:', isPresaleItem)
    console.log('═════════════════════════════════════════')

    try {
      const cartItem = {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        colorHex: selectedVariant.color_hex,
        price: finalPrice,
        quantity: quantity,
        image: cartImage,
        sku: selectedVariant.sku,
        stock: selectedVariant.stock_quantity,
        isPresale: isPresaleItem || false,
        presaleExpectedDate: selectedVariant.presale_enabled ? (selectedVariant.presale_expected_date ?? undefined) : undefined,
        presaleStock: selectedVariant.presale_stock_quantity,  // Pass presale stock for quantity limits
      }

      console.log('📦 STICKY CART ITEM:', JSON.stringify(cartItem, null, 2))
      console.log('═════════════════════════════════════════')

      addItem(cartItem)

      // Track analytics
      trackAddToCart({
        id: product.id,
        name: product.name,
        category: 'product',
        price: finalPrice,
        quantity: quantity,
      })

      trackPixelEvent('AddToCart', {
        content_ids: [selectedVariant.id],
        content_name: `${product.name} - ${selectedVariant.size} - ${selectedVariant.color}`,
        content_type: 'product',
        value: finalPrice * quantity,
        currency: 'EUR',
      })

      // Open cart drawer automatically (consistent met desktop)
      openDrawer()
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Er is iets misgegaan')
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = async () => {
    if (!selectedVariant) {
      onVariantRequired()
      return
    }

    if (!inStock) {
      toast.error('Dit product is niet op voorraad')
      return
    }

    setIsBuying(true)

    // PRESALE: Calculate if item is presale
    const isPresaleItem = selectedVariant.presale_enabled && selectedVariant.presale_stock_quantity && selectedVariant.presale_stock_quantity > 0

    console.log('═════════════════════════════════════════')
    console.log('🚀 STICKY BAR - BUY NOW (Direct Checkout)')
    console.log('═════════════════════════════════════════')
    console.log('📦 Product:', product.name)
    console.log('🎨 Variant ID:', selectedVariant.id)
    console.log('═════════════════════════════════════════')
    console.log('🔍 PRESALE CHECK:')
    console.log('   - presale_enabled:', selectedVariant.presale_enabled)
    console.log('   - stock_quantity:', selectedVariant.stock_quantity)
    console.log('   - presale_stock_quantity:', selectedVariant.presale_stock_quantity)
    console.log('   - presale_expected_date:', selectedVariant.presale_expected_date)
    console.log('   - CALCULATED isPresale:', isPresaleItem)
    console.log('═════════════════════════════════════════')

    try {
      // Add to cart first
      const cartItem = {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        colorHex: selectedVariant.color_hex,
        price: finalPrice,
        quantity: quantity,
        image: cartImage,
        sku: selectedVariant.sku,
        stock: selectedVariant.stock_quantity,
        isPresale: isPresaleItem || false,
        presaleExpectedDate: selectedVariant.presale_enabled ? (selectedVariant.presale_expected_date ?? undefined) : undefined,
        presaleStock: selectedVariant.presale_stock_quantity,  // Pass presale stock for quantity limits
      }

      console.log('📦 STICKY BUY NOW CART ITEM:', JSON.stringify(cartItem, null, 2))
      console.log('═════════════════════════════════════════')

      addItem(cartItem)

      // Track analytics
      trackAddToCart({
        id: product.id,
        name: product.name,
        category: 'product',
        price: finalPrice,
        quantity: quantity,
      })

      trackPixelEvent('AddToCart', {
        content_ids: [selectedVariant.id],
        content_name: `${product.name} - ${selectedVariant.size} - ${selectedVariant.color}`,
        content_type: 'product',
        value: finalPrice * quantity,
        currency: 'EUR',
      })

      // Redirect to checkout immediately
      router.push('/checkout')
    } catch (error) {
      console.error('Error during buy now:', error)
      toast.error('Er is iets misgegaan')
      setIsBuying(false)
    }
  }

  // Hide sticky bar if cart drawer is open or not visible
  if (!isVisible || isCartOpen) return null

  return (
    <>
      {/* CSS voor pulse animatie */}
      <style jsx>{`
        @keyframes gentle-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(0, 182, 122, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 8px rgba(0, 182, 122, 0);
          }
        }

        .pulse-button {
          animation: gentle-pulse 3s ease-in-out infinite;
        }

        /* Hover bounce - alleen desktop */
        @media (min-width: 768px) {
          .pulse-button:hover:not(:disabled) {
            transform: translateY(-2px);
          }
        }

        .pulse-button {
          transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
        }
      `}</style>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-white z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 md:gap-3">
            {/* QUANTITY SELECTOR - Brutalist Stepper (COMPACT voor Sticky Bar) */}
            <div className="flex border-2 border-white">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || !inStock}
                className={`w-9 h-11 md:w-10 md:h-12 flex items-center justify-center font-bold text-lg transition-colors ${
                  quantity <= 1 || !inStock
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="w-9 h-11 md:w-10 md:h-12 flex items-center justify-center border-x-2 border-white bg-black text-white font-bold text-sm md:text-base">
                {quantity}
              </div>
              <button
                onClick={() => {
                  const maxQty = selectedVariant?.presale_enabled 
                    ? selectedVariant.presale_stock_quantity || 10
                    : selectedVariant?.stock_quantity || 10
                  setQuantity(Math.min(maxQty, quantity + 1))
                }}
                disabled={!inStock || quantity >= (selectedVariant?.presale_enabled ? selectedVariant.presale_stock_quantity || 10 : selectedVariant?.stock_quantity || 10)}
                className={`w-9 h-11 md:w-10 md:h-12 flex items-center justify-center font-bold text-lg transition-colors ${
                  !inStock || quantity >= (selectedVariant?.presale_enabled ? selectedVariant.presale_stock_quantity || 10 : selectedVariant?.stock_quantity || 10)
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {/* IN WAGEN button - WIT met zwarte tekst */}
            <button
              onClick={handleAddToCart}
              disabled={!inStock || isAdding || isBuying}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-3 md:py-3.5 border-2 border-white bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs md:text-sm"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              <span>{t('addToCart')}</span>
            </button>

            {/* BESTEL NU button - GROEN met PULSE! */}
            <button
              onClick={handleBuyNow}
              disabled={!inStock || isAdding || isBuying}
              className="pulse-button flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-3 md:py-3.5 bg-[#00B67A] border-2 border-[#00B67A] text-white hover:bg-[#009966] hover:border-[#009966] disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs md:text-sm"
            >
              {isBuying ? (
                <span>{t('adding')}</span>
              ) : (
                <>
                  <span className="min-[400px]:hidden">{t('buyNowMobile')}</span>
                  <span className="hidden min-[400px]:inline">{t('buyNow')}</span>
                  <svg className="w-4 h-4 md:w-5 md:h-5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

