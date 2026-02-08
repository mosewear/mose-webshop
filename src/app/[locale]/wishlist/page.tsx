'use client'

import { useEffect, useState } from 'react'
import { useWishlist } from '@/store/wishlist'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { formatPrice } from '@/lib/format-price'
import { Heart } from 'lucide-react'

interface Product {
  id: string
  name: string
  name_en?: string
  slug: string
  base_price: number
  sale_price: number | null
  description: string
  description_en?: string
  product_images: Array<{
    url: string
    alt_text: string
    position: number
    is_primary: boolean
  }>
}

// Helper function to format text with **bold** markers
function formatBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function WishlistPage() {
  const { items, loadWishlist, removeFromWishlist, isLoading } = useWishlist()
  const { addItem } = useCart()
  const t = useTranslations('wishlist')
  const locale = useLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWishlist()
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    fetchProducts()
  }, [items])

  const fetchProducts = async () => {
    const supabase = createClient()
    const productIds = items.map((item) => item.product_id)

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        name_en,
        slug,
        base_price,
        sale_price,
        description,
        description_en,
        product_images (
          url,
          alt_text,
          position,
          is_primary,
          media_type
        )
      `)
      .in('id', productIds)

    if (error) {
      console.error('Error fetching wishlist products:', error)
    } else {
      // Filter out videos, only keep images, and sort by position
      const productsWithImages = (data || []).map((product: any) => ({
        ...product,
        product_images: (product.product_images || [])
          .filter((img: any) => img.media_type === 'image' || !img.media_type)
          .sort((a: any, b: any) => a.position - b.position)
      }))
      setProducts(productsWithImages)
    }

    setLoading(false)
  }

  const handleAddToCart = async (product: Product) => {
    // Get first available variant
    const supabase = createClient()
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_available', true)
      .limit(1)

    if (!variants || variants.length === 0) {
      toast.error(t('outOfStock'))
      return
    }

    const variant = variants[0]
    const hasStock = (variant.stock_quantity || 0) + (variant.presale_stock_quantity || 0) > 0
    
    if (!hasStock) {
      toast.error(t('outOfStock'))
      return
    }

    // Calculate final price (base_price or sale_price + variant adjustment)
    const finalPrice = (product.sale_price || product.base_price) + (variant.price_adjustment || 0)
    const isPresaleItem = variant.presale_enabled && (variant.presale_stock_quantity || 0) > 0

    // Get first product image
    const productImage = product.product_images && product.product_images.length > 0 
      ? product.product_images[0].url 
      : '/placeholder.png'

    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      price: finalPrice,
      size: variant.size,
      color: variant.color,
      colorHex: variant.color_hex || '#000000',
      image: productImage,
      quantity: 1,
      stock: variant.stock_quantity || 0,
      sku: variant.sku,
      isPresale: isPresaleItem,
      presaleExpectedDate: variant.presale_enabled ? (variant.presale_expected_date ?? undefined) : undefined,
      presaleStock: variant.presale_stock_quantity || 0,
    })

    toast.success(t('addedToCart'))
  }

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-12 min-h-[60vh]">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6 md:mb-8 uppercase tracking-wide">{t('title')}</h1>
          <div className="flex flex-col items-center justify-center py-16 md:py-24">
            <div className="inline-block animate-spin w-12 h-12 md:w-16 md:h-16 border-4 border-black border-t-brand-primary mb-4"></div>
            <p className="text-gray-600 font-bold uppercase tracking-wide text-sm">{t('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-12 min-h-[60vh]">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6 md:mb-8 uppercase tracking-wide">{t('title')}</h1>
          
          {/* MOSE Brutalist Empty State */}
          <div className="bg-white border-4 border-black p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 border-4 border-black bg-gray-50 mb-6">
              <Heart className="w-10 h-10 md:w-12 md:h-12 text-gray-400" strokeWidth={2} />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 uppercase tracking-wide">{t('empty.title')}</h2>
            <p className="text-gray-600 mb-8 text-sm md:text-base max-w-md mx-auto">
              {t('empty.description')}
            </p>
            <LocaleLink
              href="/shop"
              className="inline-block bg-brand-primary hover:bg-black text-white border-2 border-black font-bold py-3 md:py-4 px-6 md:px-8 uppercase tracking-wider text-sm md:text-base transition-colors"
            >
              {t('empty.cta')}
            </LocaleLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header - MOSE Style */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8 gap-3">
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wide">{t('title')}</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white">
            <Heart className="w-5 h-5" strokeWidth={2} />
            <span className="font-bold text-sm md:text-base">{t('itemCount', { count: items.length })}</span>
          </div>
        </div>

        {/* Product Grid - MOSE Brutalist Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {products.map((product) => {
            const displayName = locale === 'en' && product.name_en ? product.name_en : product.name
            const displayDescription = locale === 'en' && product.description_en ? product.description_en : product.description
            const hasDiscount = product.sale_price && product.sale_price < product.base_price
            const displayPrice = hasDiscount ? product.sale_price! : product.base_price
            const discountPercentage = hasDiscount 
              ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
              : 0

            return (
              <div key={product.id} className="bg-white border-2 border-black hover:border-brand-primary transition-all group relative">
                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute top-2 right-2 z-10 bg-black text-white px-1.5 py-0.5 text-[9px] md:px-3 md:py-1 md:text-[11px] font-bold uppercase tracking-wider border-2 border-black">
                    -{discountPercentage}%
                  </div>
                )}

                {/* Product Image */}
                <LocaleLink href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden border-b-2 border-black">
                  {product.product_images && product.product_images.length > 0 ? (
                    <Image
                      src={product.product_images[0].url}
                      alt={product.product_images[0].alt_text || displayName}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">{t('noImage')}</span>
                    </div>
                  )}
                </LocaleLink>

                {/* Product Info */}
                <div className="p-4">
                  <LocaleLink href={`/product/${product.slug}`}>
                    <h3 className="font-bold text-base md:text-lg mb-2 hover:text-brand-primary transition-colors line-clamp-1">
                      {displayName}
                    </h3>
                  </LocaleLink>
                  <p className="text-gray-600 text-xs md:text-sm mb-4 line-clamp-2">
                    {formatBoldText(displayDescription)}
                  </p>

                  {/* Price Display */}
                  <div className="flex items-center gap-2 mb-4">
                    {hasDiscount ? (
                      <>
                        <span className="text-xl md:text-2xl font-bold text-brand-primary">
                          {formatPrice(displayPrice, locale)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.base_price, locale)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl md:text-2xl font-bold text-brand-primary">
                        {formatPrice(displayPrice, locale)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons - MOSE Brutalist */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 bg-brand-primary hover:bg-black text-white border-2 border-black font-bold py-2.5 md:py-3 px-4 uppercase text-xs md:text-sm tracking-wider transition-colors"
                    >
                      {t('addToCart')}
                    </button>
                    <button
                      onClick={() => removeFromWishlist(product.id)}
                      className="bg-white hover:bg-red-50 text-black hover:text-red-600 border-2 border-black hover:border-red-600 font-bold py-2.5 md:py-3 px-3 md:px-4 transition-colors"
                      title={t('removeTitle')}
                      aria-label={t('removeTitle')}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
