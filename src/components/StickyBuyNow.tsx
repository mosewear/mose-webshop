'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/store/cart'
import { trackAddToCart } from '@/lib/analytics'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import toast from 'react-hot-toast'

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
  } | null | undefined
  quantity: number
  cartImage: string
  inStock: boolean
  onVariantRequired: () => void
}

export default function StickyBuyNow({
  product,
  selectedVariant,
  quantity,
  cartImage,
  inStock,
  onVariantRequired,
}: StickyBuyNowProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const router = useRouter()
  const addItem = useCart((state) => state.addItem)

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

    try {
      addItem({
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
      })

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

      toast.success('Toegevoegd aan winkelwagen!')
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

    try {
      // Add to cart first
      addItem({
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
      })

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

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50 shadow-2xl md:shadow-none">
      <div className="max-w-7xl mx-auto px-3 py-3">
        {/* Product naam - altijd zichtbaar */}
        <p className="text-xs md:text-sm text-gray-700 mb-2 line-clamp-1">
          {product.name}
        </p>

        {/* Prijs + Buttons row */}
        <div className="flex items-center gap-3">
          {/* Prijs - prominent */}
          <div className="flex-shrink-0">
            <p className="text-lg md:text-xl font-bold">
              €{(finalPrice * quantity).toFixed(2)}
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Toevoegen button met icon */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock || isAdding || isBuying}
            className="flex items-center gap-2 px-4 py-3 md:py-3.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs md:text-sm whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">TOEVOEGEN</span>
          </button>

          {/* Nu Kopen button met pijl */}
          <button
            onClick={handleBuyNow}
            disabled={!inStock || isAdding || isBuying}
            className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-3.5 bg-black text-white border-2 border-black hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide text-xs md:text-sm whitespace-nowrap"
          >
            {isBuying ? 'BEZIG...' : (
              <>
                <span>NU KOPEN</span>
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

