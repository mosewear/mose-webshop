'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  base_price: number
  category_id: string
  meta_title: string
  meta_description: string
  product_images: ProductImage[]
  product_variants: ProductVariant[]
  categories: {
    name: string
    slug: string
  }
}

interface ProductImage {
  id: string
  url: string
  alt_text: string
  position: number
  is_primary: boolean
}

interface ProductVariant {
  id: string
  size: string
  color: string
  color_hex: string
  sku: string
  stock_quantity: number
  price_adjustment: number
  is_available: boolean
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  const addItem = useCart((state) => state.addItem)

  useEffect(() => {
    fetchProduct()
  }, [slug])

  async function fetchProduct() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(*),
        product_variants(*),
        categories(name, slug)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching product:', error)
      setLoading(false)
      return
    }

    if (data) {
      // Sort images by position
      data.product_images.sort((a: ProductImage, b: ProductImage) => a.position - b.position)
      setProduct(data)

      // Auto-select first available variant
      if (data.product_variants.length > 0) {
        const firstAvailable = data.product_variants.find((v: ProductVariant) => v.is_available && v.stock_quantity > 0)
        if (firstAvailable) {
          setSelectedSize(firstAvailable.size)
          setSelectedColor(firstAvailable.color)
        }
      }
    }
    setLoading(false)
  }

  const selectedVariant = product?.product_variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )

  const finalPrice = product ? product.base_price + (selectedVariant?.price_adjustment || 0) : 0

  const availableSizes = product ? [...new Set(product.product_variants.map((v) => v.size))] : []
  const availableColors = product
    ? product.product_variants
        .filter((v) => v.size === selectedSize)
        .map((v) => ({ color: v.color, hex: v.color_hex }))
    : []

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      size: selectedVariant.size,
      color: selectedVariant.color,
      colorHex: selectedVariant.color_hex,
      price: finalPrice,
      quantity: quantity,
      image: product.product_images[0]?.url || '/placeholder.png',
      sku: selectedVariant.sku,
      stock: selectedVariant.stock_quantity,
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 md:pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16">
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-gray-200 animate-pulse"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-gray-200 animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-12 bg-gray-200 animate-pulse w-3/4"></div>
              <div className="h-8 bg-gray-200 animate-pulse w-1/4"></div>
              <div className="h-24 bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-20 md:pt-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-display mb-6">PRODUCT NIET GEVONDEN</h1>
          <Link
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            Terug naar shop
          </Link>
        </div>
      </div>
    )
  }

  const inStock = selectedVariant ? selectedVariant.stock_quantity > 0 : false
  const lowStock = selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 5

  return (
    <div className="min-h-screen pt-20 md:pt-24 px-4 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 md:mb-8 text-sm">
          <Link href="/" className="text-gray-600 hover:text-brand-primary transition-colors">
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
            Shop
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link
            href={`/shop?category=${product.categories.slug}`}
            className="text-gray-600 hover:text-brand-primary transition-colors"
          >
            {product.categories.name}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-black font-semibold">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-16">
          {/* LEFT: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-100 border-2 border-black overflow-hidden">
              <Image
                src={product.product_images[selectedImage]?.url || '/placeholder.png'}
                alt={product.product_images[selectedImage]?.alt_text || product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
                priority
              />
              {!inStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl md:text-4xl font-display">UITVERKOCHT</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.product_images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 md:gap-4">
                {product.product_images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
                      selectedImage === index
                        ? 'border-brand-primary scale-95'
                        : 'border-gray-300 hover:border-black'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt_text || product.name}
                      fill
                      sizes="(max-width: 768px) 25vw, 12vw"
                      className="object-cover object-center"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="space-y-6">
            {/* Title & Category */}
            <div>
              <Link
                href={`/shop?category=${product.categories.slug}`}
                className="text-sm uppercase tracking-wider text-brand-primary hover:underline mb-2 block"
              >
                {product.categories.name}
              </Link>
              <h1 className="text-3xl md:text-5xl font-display mb-4">{product.name}</h1>
              <p className="text-2xl md:text-3xl font-bold">€{finalPrice.toFixed(2)}</p>
            </div>

            {/* Description */}
            <div className="border-t-2 border-b-2 border-gray-200 py-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>

            {/* Size Selector */}
            {availableSizes.length > 0 && (
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                  Maat: {selectedSize}
                </label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {availableSizes.map((size) => {
                    const sizeVariants = product.product_variants.filter((v) => v.size === size)
                    const sizeAvailable = sizeVariants.some((v) => v.is_available && v.stock_quantity > 0)
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setSelectedSize(size)
                          const firstColorForSize = sizeVariants.find((v) => v.is_available && v.stock_quantity > 0)
                          if (firstColorForSize) {
                            setSelectedColor(firstColorForSize.color)
                          }
                        }}
                        disabled={!sizeAvailable}
                        className={`px-4 md:px-6 py-2 md:py-3 border-2 font-bold uppercase tracking-wider transition-all text-sm md:text-base ${
                          selectedSize === size
                            ? 'border-brand-primary bg-brand-primary text-white'
                            : sizeAvailable
                            ? 'border-black hover:bg-black hover:text-white'
                            : 'border-gray-300 text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {availableColors.length > 0 && (
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                  Kleur: {selectedColor}
                </label>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map(({ color, hex }) => {
                    const colorVariant = product.product_variants.find(
                      (v) => v.size === selectedSize && v.color === color
                    )
                    const colorAvailable = colorVariant && colorVariant.is_available && colorVariant.stock_quantity > 0
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        disabled={!colorAvailable}
                        className={`relative w-12 h-12 md:w-14 md:h-14 border-2 transition-all ${
                          selectedColor === color
                            ? 'border-brand-primary scale-110'
                            : colorAvailable
                            ? 'border-gray-400 hover:border-black'
                            : 'border-gray-300 cursor-not-allowed opacity-50'
                        }`}
                        title={color}
                      >
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: hex }}
                        />
                        {!colorAvailable && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <span className="text-red-600 text-2xl font-bold">✕</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stock Indicator */}
            {selectedVariant && (
              <div className="flex items-center gap-2">
                {inStock ? (
                  <>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600 font-semibold">
                      {lowStock ? `Nog maar ${selectedVariant.stock_quantity} op voorraad!` : 'Op voorraad'}
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-red-600 font-semibold">Uitverkocht</span>
                  </>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            {inStock && (
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-3">Aantal</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 md:w-12 md:h-12 border-2 border-black font-bold text-xl hover:bg-black hover:text-white transition-colors"
                  >
                    −
                  </button>
                  <span className="text-xl md:text-2xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(selectedVariant?.stock_quantity || 1, quantity + 1))
                    }
                    className="w-10 h-10 md:w-12 md:h-12 border-2 border-black font-bold text-xl hover:bg-black hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!inStock || !selectedVariant || addedToCart}
              className={`w-full py-4 md:py-5 text-lg md:text-xl font-bold uppercase tracking-wider transition-all ${
                addedToCart
                  ? 'bg-green-600 text-white cursor-default'
                  : inStock && selectedVariant
                  ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {addedToCart ? '✓ TOEGEVOEGD AAN WINKELWAGEN' : inStock ? 'TOEVOEGEN AAN WINKELWAGEN' : 'UITVERKOCHT'}
            </button>

            {/* Product Features */}
            <div className="border-t-2 border-gray-200 pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-brand-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="font-bold">Premium kwaliteit</h3>
                  <p className="text-sm text-gray-600">Hoogwaardige materialen die lang meegaan</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-brand-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-bold">Gratis verzending vanaf €50</h3>
                  <p className="text-sm text-gray-600">Binnen 2-3 werkdagen geleverd</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-brand-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <h3 className="font-bold">14 dagen retour</h3>
                  <p className="text-sm text-gray-600">Niet tevreden? Geld terug garantie</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-brand-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0L6.343 16.657m10.314-10.314L13.414 3.1a1.998 1.998 0 00-2.828 0L6.343 6.343m10.314 0l-7.682 7.682m7.682-7.682A4.5 4.5 0 0118 9.5a4.5 4.5 0 01-4.5 4.5m-9.164-9.164A4.5 4.5 0 016 9.5a4.5 4.5 0 014.5 4.5" />
                </svg>
                <div>
                  <h3 className="font-bold">Lokaal gemaakt</h3>
                  <p className="text-sm text-gray-600">Met liefde geproduceerd in Groningen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
