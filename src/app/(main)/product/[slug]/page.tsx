'use client'

import { use, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'
import { useWishlist } from '@/store/wishlist'
import ProductReviews from '@/components/ProductReviews'

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
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'materials' | 'shipping'>('details')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)

  const addItem = useCart((state) => state.addItem)
  const { addToWishlist, removeFromWishlist, isInWishlist, loadWishlist } = useWishlist()
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    loadWishlist()
  }, [])

  useEffect(() => {
    fetchProduct()
  }, [slug])

  useEffect(() => {
    if (product) {
      setIsWishlisted(isInWishlist(product.id))
    }
  }, [product, isInWishlist])

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

      // Fetch related products from same category
      const { data: related } = await supabase
        .from('products')
        .select(`
          *,
          product_images(*),
          product_variants(*),
          categories(name, slug)
        `)
        .eq('category_id', data.category_id)
        .neq('id', data.id)
        .limit(4)

      if (related) {
        const productsWithSortedImages = related.map((p: any) => ({
          ...p,
          product_images: p.product_images.sort((a: ProductImage, b: ProductImage) => a.position - b.position)
        }))
        setRelatedProducts(productsWithSortedImages)
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

  const handleNotifyMe = async () => {
    if (!notifyEmail || !product || !selectedVariant) return
    // TODO: Save to database
    setNotifySubmitted(true)
    setTimeout(() => {
      setNotifySubmitted(false)
      setNotifyEmail('')
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-6 md:pt-8 px-4">
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
      <div className="min-h-screen pt-6 md:pt-8 px-4">
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
    <>
      <div className="min-h-screen pt-6 md:pt-8 px-4 pb-24 md:pb-16">
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
              {/* Main Image - Clickable for zoom */}
              <div
                onClick={() => setShowLightbox(true)}
                className="relative aspect-[3/4] bg-gray-100 border-2 border-black overflow-hidden group cursor-zoom-in"
              >
                <Image
                  src={product.product_images[selectedImage]?.url || '/placeholder.png'}
                  alt={product.product_images[selectedImage]?.alt_text || product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center"
                  priority
                />
                {/* Zoom hint */}
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </div>
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

              {/* Trust Badges - PROMINENT (Feature 6) */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-green-800">Gratis verzending €50+</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800">14 dagen retour</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-2 rounded">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0L6.343 16.657m10.314-10.314L13.414 3.1a1.998 1.998 0 00-2.828 0L6.343 6.343m10.314 0l-7.682 7.682m7.682-7.682A4.5 4.5 0 0118 9.5a4.5 4.5 0 01-4.5 4.5m-9.164-9.164A4.5 4.5 0 016 9.5a4.5 4.5 0 014.5 4.5" />
                  </svg>
                  <span className="text-sm font-semibold text-purple-800">Lokaal gemaakt</span>
                </div>
              </div>

              {/* Description */}
              <div className="border-t-2 border-b-2 border-gray-200 py-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>

              {/* Size Selector with Size Guide (Feature 2) */}
              {availableSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold uppercase tracking-wider">
                      Maat: {selectedSize}
                    </label>
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="text-sm text-brand-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Maattabel
                    </button>
                  </div>
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

              {/* Back in Stock Notification (Feature 7) */}
              {!inStock && selectedVariant && (
                <div className="bg-gray-50 border-2 border-gray-300 p-4 rounded">
                  <h3 className="font-bold mb-2">Mis dit product niet!</h3>
                  <p className="text-sm text-gray-600 mb-3">Ontvang een email als dit product weer op voorraad is.</p>
                  {notifySubmitted ? (
                    <div className="text-green-600 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Je ontvangt een email zodra het op voorraad is!
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="jouw@email.nl"
                        className="flex-1 px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                      <button
                        onClick={handleNotifyMe}
                        className="px-6 py-2 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                      >
                        Stuur
                      </button>
                    </div>
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

              {/* Add to Cart Button - Desktop */}
              <div className="hidden md:flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock || !selectedVariant || addedToCart}
                  className={`flex-1 py-4 md:py-5 text-lg md:text-xl font-bold uppercase tracking-wider transition-all ${
                    addedToCart
                      ? 'bg-green-600 text-white cursor-default'
                      : inStock && selectedVariant
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {addedToCart ? '✓ TOEGEVOEGD AAN WINKELWAGEN' : inStock ? 'TOEVOEGEN AAN WINKELWAGEN' : 'UITVERKOCHT'}
                </button>
                <button
                  onClick={async () => {
                    if (!product) return
                    if (isWishlisted) {
                      await removeFromWishlist(product.id)
                      setIsWishlisted(false)
                    } else {
                      await addToWishlist(product.id)
                      setIsWishlisted(true)
                    }
                  }}
                  className={`p-4 border-2 transition-all ${
                    isWishlisted
                      ? 'bg-red-50 border-red-500 text-red-600'
                      : 'border-gray-300 hover:border-brand-primary'
                  }`}
                  title={isWishlisted ? 'Verwijderen uit wishlist' : 'Toevoegen aan wishlist'}
                >
                  <svg className="w-6 h-6" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Product Tabs / Accordion (Feature 5) */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="space-y-4">
                  {/* Details Tab */}
                  <div className="border-2 border-black">
                    <button
                      onClick={() => setActiveTab(activeTab === 'details' ? '' as any : 'details')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>Product details</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'details' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'details' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        <p><span className="font-semibold">Premium kwaliteit:</span> Hoogwaardige materialen die lang meegaan</p>
                        <p><span className="font-semibold">Perfect fit:</span> Ontworpen voor comfort en stijl</p>
                        <p><span className="font-semibold">Lokaal gemaakt:</span> Met liefde geproduceerd in Groningen</p>
                      </div>
                    )}
                  </div>

                  {/* Materials Tab */}
                  <div className="border-2 border-black">
                    <button
                      onClick={() => setActiveTab(activeTab === 'materials' ? '' as any : 'materials')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>Materiaal & verzorging</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'materials' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'materials' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        <p><span className="font-semibold">Materiaal:</span> 100% biologisch katoen, 300gsm</p>
                        <p><span className="font-semibold">Was instructies:</span> Machinewasbaar op 30°C</p>
                        <p><span className="font-semibold">Strijken:</span> Op lage temperatuur, binnenstebuiten</p>
                        <p><span className="font-semibold">Drogen:</span> Niet in de droger, ophangen</p>
                      </div>
                    )}
                  </div>

                  {/* Shipping Tab */}
                  <div className="border-2 border-black">
                    <button
                      onClick={() => setActiveTab(activeTab === 'shipping' ? '' as any : 'shipping')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>Verzending & retour</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'shipping' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'shipping' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-2 text-sm">
                        <p><span className="font-semibold">Verzending:</span> Gratis verzending vanaf €50</p>
                        <p><span className="font-semibold">Levertijd:</span> 2-3 werkdagen binnen Nederland</p>
                        <p><span className="font-semibold">Retour:</span> 14 dagen bedenktijd</p>
                        <p><span className="font-semibold">Retourkosten:</span> Gratis retourneren</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products (Feature 4) */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 md:mt-24 border-t-2 border-gray-200 pt-16">
              <h2 className="text-3xl md:text-4xl font-display mb-8 text-center">DIT VIND JE MISSCHIEN OOK LEUK</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((relProd) => {
                  const primaryImage = relProd.product_images.find((img: ProductImage) => img.is_primary) || relProd.product_images[0]
                  const hasStock = relProd.product_variants.some((v: ProductVariant) => v.stock_quantity > 0)
                  
                  return (
                    <Link
                      key={relProd.id}
                      href={`/product/${relProd.slug}`}
                      className="group block"
                    >
                      <div className="bg-white border-2 border-black overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                        <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                          {primaryImage && (
                            <Image
                              src={primaryImage.url}
                              alt={relProd.name}
                              fill
                              sizes="(max-width: 640px) 50vw, 25vw"
                              className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                            />
                          )}
                          {!hasStock && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold uppercase">
                              UITVERKOCHT
                            </div>
                          )}
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{relProd.name}</h3>
                          <p className="text-lg font-bold">€{relProd.base_price.toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Product Reviews */}
          <ProductReviews productId={product.id} />
        </div>
      </div>

      {/* Sticky Add to Cart Bar - Mobile (Feature 1) */}
      {inStock && selectedVariant && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 z-40 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-600">Prijs</p>
              <p className="text-xl font-bold">€{(finalPrice * quantity).toFixed(2)}</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={addedToCart}
              className={`flex-1 py-4 text-base font-bold uppercase tracking-wider transition-all ${
                addedToCart
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-brand-primary text-white active:scale-95'
              }`}
            >
              {addedToCart ? '✓ TOEGEVOEGD' : 'IN WINKELWAGEN'}
            </button>
            <button
              onClick={async () => {
                if (!product) return
                if (isWishlisted) {
                  await removeFromWishlist(product.id)
                  setIsWishlisted(false)
                } else {
                  await addToWishlist(product.id)
                  setIsWishlisted(true)
                }
              }}
              className={`p-4 border-2 transition-all ${
                isWishlisted
                  ? 'bg-red-50 border-red-500 text-red-600'
                  : 'border-gray-300'
              }`}
            >
              <svg className="w-5 h-5" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Image Lightbox (Feature 3) */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
            <Image
              src={product.product_images[selectedImage]?.url || '/placeholder.png'}
              alt={product.product_images[selectedImage]?.alt_text || product.name}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          {/* Image Navigation */}
          {product.product_images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {product.product_images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-2 h-2 rounded-full ${
                    selectedImage === index ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Size Guide Modal (Feature 2) */}
      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-display">MAATTABEL</h2>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="text-gray-600 hover:text-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-black">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left font-bold">Maat</th>
                    <th className="px-4 py-3 text-left font-bold">Borst (cm)</th>
                    <th className="px-4 py-3 text-left font-bold">Lengte (cm)</th>
                    <th className="px-4 py-3 text-left font-bold">Schouders (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-black">
                    <td className="px-4 py-3 font-bold">S</td>
                    <td className="px-4 py-3">100-104</td>
                    <td className="px-4 py-3">68-70</td>
                    <td className="px-4 py-3">44-46</td>
                  </tr>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <td className="px-4 py-3 font-bold">M</td>
                    <td className="px-4 py-3">104-108</td>
                    <td className="px-4 py-3">70-72</td>
                    <td className="px-4 py-3">46-48</td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <td className="px-4 py-3 font-bold">L</td>
                    <td className="px-4 py-3">108-112</td>
                    <td className="px-4 py-3">72-74</td>
                    <td className="px-4 py-3">48-50</td>
                  </tr>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <td className="px-4 py-3 font-bold">XL</td>
                    <td className="px-4 py-3">112-116</td>
                    <td className="px-4 py-3">74-76</td>
                    <td className="px-4 py-3">50-52</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">XXL</td>
                    <td className="px-4 py-3">116-120</td>
                    <td className="px-4 py-3">76-78</td>
                    <td className="px-4 py-3">52-54</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-gray-50 border-2 border-gray-300 p-4 text-sm space-y-2">
              <h3 className="font-bold">Hoe meet je?</h3>
              <p><span className="font-semibold">Borst:</span> Meet rond de breedste punt van je borst</p>
              <p><span className="font-semibold">Lengte:</span> Meet vanaf de halsnaad tot aan de onderkant</p>
              <p><span className="font-semibold">Schouders:</span> Meet van schouder tot schouder over de rug</p>
            </div>

            <button
              onClick={() => setShowSizeGuide(false)}
              className="mt-6 w-full py-3 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  )
}
