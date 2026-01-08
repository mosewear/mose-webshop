'use client'

import { use, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { useWishlist } from '@/store/wishlist'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/ProductReviews'
import { Truck, RotateCcw, MapPin } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  base_price: number
  sale_price: number | null
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
  color: string | null
  media_type: 'image' | 'video'
  video_thumbnail_url?: string | null
  video_duration?: number | null
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

// Video Thumbnail Component met autoplay on hover
function VideoThumbnail({ 
  videoUrl, 
  posterUrl, 
  isSelected, 
  onClick 
}: { 
  videoUrl: string
  posterUrl?: string | null
  isSelected: boolean
  onClick: () => void 
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // Detecteer mobiel
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Event listeners om te tracken of video speelt
    // Gebruik 'playing' in plaats van 'play' voor betrouwbaarder detection
    const handlePlaying = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    const handleWaiting = () => setIsPlaying(false)

    video.addEventListener('playing', handlePlaying)  // Wordt gefired zodra video echt speelt
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('waiting', handleWaiting)  // Buffering

    return () => {
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [])

  // Intersection Observer voor mobiel autoplay (alleen als 50%+ zichtbaar)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isMobile || isSelected) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Video is 50%+ zichtbaar = autoplay
            video.play().catch(() => {
              // Silent fail als autoplay geblokkeerd is
            })
          } else {
            // Video is <50% zichtbaar of uit beeld = pause
            video.pause()
          }
        })
      },
      { 
        threshold: 0.5, // Trigger bij 50% visibility
        rootMargin: '0px' // Geen buffer
      }
    )

    observer.observe(video)
    
    return () => {
      observer.disconnect()
    }
  }, [isMobile, isSelected])

  // Desktop hover autoplay
  useEffect(() => {
    if (!videoRef.current || isMobile) return

    if (isHovering && !isSelected) {
      // Start autoplay on hover (alleen desktop)
      videoRef.current.play().catch(() => {
        // Silent fail als autoplay geblokkeerd is
      })
    } else {
      // Pause en reset
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isHovering, isSelected, isMobile])

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => !isMobile && setIsHovering(true)}
      onMouseLeave={() => !isMobile && setIsHovering(false)}
      className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-brand-primary scale-95'
          : 'border-gray-300 hover:border-black'
      }`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl || undefined}
        className="w-full h-full object-cover object-center"
        preload="metadata"
        muted
        playsInline
        loop
      />
      {/* Play icon - verdwijnt als video speelt */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <svg 
            className="w-8 h-8 text-white/80" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </button>
  )
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
  const [activeTab, setActiveTab] = useState<'description' | 'trust' | 'details' | 'materials' | 'shipping'>('details')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const mainVideoRef = useRef<HTMLVideoElement>(null)
  const [settings, setSettings] = useState({
    free_shipping_threshold: 100,
    return_days: 14,
  })

  const addItem = useCart((state) => state.addItem)
  const { openDrawer } = useCartDrawer()
  const { addToWishlist, removeFromWishlist, isInWishlist, loadWishlist } = useWishlist()
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    loadWishlist()
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const siteSettings = await getSiteSettings()
      setSettings({
        free_shipping_threshold: siteSettings.free_shipping_threshold,
        return_days: siteSettings.return_days,
      })
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [slug])

  useEffect(() => {
    if (product) {
      setIsWishlisted(isInWishlist(product.id))
    }
  }, [product, isInWishlist])

  // Size guide modal: body scroll lock & ESC key
  useEffect(() => {
    if (showSizeGuide) {
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      
      // ESC key handler
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowSizeGuide(false)
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [showSizeGuide])

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

  // Smart size sorting: XS, S, M, L, XL, XXL, XXXL, etc.
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
  const availableSizes = product 
    ? [...new Set(product.product_variants.map((v) => v.size))].sort((a, b) => {
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
    : []
  const availableColors = product
    ? product.product_variants
        .filter((v) => v.size === selectedSize)
        .map((v) => ({ color: v.color, hex: v.color_hex }))
    : []

  // Get images for selected color (with fallback to general images)
  const getDisplayImages = () => {
    if (!product) return []
    
    // Get color-specific images
    const colorImages = product.product_images.filter(img => img.color === selectedColor)
    
    // Get general images/videos (no color assigned) - these should ALWAYS show
    const generalImages = product.product_images.filter(img => !img.color)
    
    // If we have color-specific images, combine them with general media
    if (colorImages.length > 0) {
      // Merge: general media first (like videos), then color-specific images
      return [...generalImages, ...colorImages].sort((a, b) => a.position - b.position)
    }
    
    // Otherwise, just show general images
    return generalImages.sort((a, b) => a.position - b.position)
  }
  
  const displayImages = getDisplayImages()

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
      image: displayImages[0]?.url || '/placeholder.png',
      sku: selectedVariant.sku,
      stock: selectedVariant.stock_quantity,
    })

    // Open cart drawer immediately
    openDrawer()
  }

  const handleNotifyMe = async () => {
    if (!notifyEmail || !product || !selectedVariant) return

    try {
      const response = await fetch('/api/back-in-stock/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: notifyEmail,
          productId: product.id,
          variantId: selectedVariant.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Er ging iets mis bij het aanmelden')
        return
      }

      toast.success('Je bent aangemeld! We sturen je een email wanneer het product weer op voorraad is.')
      setNotifySubmitted(true)
      setTimeout(() => {
        setNotifySubmitted(false)
        setNotifyEmail('')
      }, 5000)
    } catch (error) {
      console.error('Error notifying:', error)
      toast.error('Er ging iets mis bij het aanmelden')
    }
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

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-12">
            {/* LEFT: Image Gallery (55% width) */}
            <div className="space-y-4">
              {/* Main Media Display - Image or Video */}
              <div
                onClick={() => displayImages[selectedImage]?.media_type === 'image' && setShowLightbox(true)}
                className={`relative aspect-[3/4] md:aspect-[3/3] bg-gray-100 border-2 border-black overflow-hidden group ${
                  displayImages[selectedImage]?.media_type === 'image' ? 'cursor-zoom-in' : ''
                }`}
              >
                {displayImages[selectedImage]?.media_type === 'video' ? (
                  <video
                    ref={mainVideoRef}
                    src={displayImages[selectedImage]?.url}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    poster={displayImages[selectedImage]?.video_thumbnail_url || undefined}
                    preload="metadata"
                  />
                ) : (
                  <>
                    <Image
                      src={displayImages[selectedImage]?.url || '/placeholder.png'}
                      alt={displayImages[selectedImage]?.alt_text || product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-center"
                      priority
                    />
                    {/* Zoom hint - only for images */}
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </>
                )}
                {!inStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-2xl md:text-4xl font-display">UITVERKOCHT</span>
                  </div>
                )}
              </div>

              {/* Thumbnails - 4 on mobile, 5 on desktop */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                  {displayImages.map((media, index) => (
                    media.media_type === 'video' ? (
                      <VideoThumbnail
                        key={media.id}
                        videoUrl={media.url}
                        posterUrl={media.video_thumbnail_url}
                        isSelected={selectedImage === index}
                        onClick={() => setSelectedImage(index)}
                      />
                    ) : (
                      <button
                        key={media.id}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
                          selectedImage === index
                            ? 'border-brand-primary scale-95'
                            : 'border-gray-300 hover:border-black'
                        }`}
                      >
                        <Image
                          src={media.url}
                          alt={media.alt_text || product.name}
                          fill
                          sizes="(max-width: 768px) 25vw, 12vw"
                          className="object-cover object-center"
                        />
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Product Info (45% width, sticky) */}
            <div className="space-y-4 md:sticky md:top-24 md:self-start">
              {/* Title & Category */}
              <div>
                <Link
                  href={`/shop?category=${product.categories.slug}`}
                  className="text-xs md:text-sm uppercase tracking-wider text-brand-primary hover:underline mb-1 md:mb-2 block"
                >
                  {product.categories.name}
                </Link>
                <h1 className="text-2xl md:text-3xl font-display mb-2 md:mb-3">{product.name}</h1>
                
                {/* Price Display met Korting */}
                <div className="mb-2">
                  {(() => {
                    const basePrice = product.base_price + (selectedVariant?.price_adjustment || 0)
                    const salePrice = product.sale_price ? product.sale_price + (selectedVariant?.price_adjustment || 0) : null
                    const hasDiscount = salePrice && salePrice < basePrice
                    const discountPercentage = hasDiscount 
                      ? Math.round(((basePrice - salePrice) / basePrice) * 100) 
                      : 0

                    if (hasDiscount) {
                      return (
                        <>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-xl md:text-2xl font-bold text-red-600">
                              €{salePrice.toFixed(2)}
                            </p>
                            <span className="inline-flex items-center px-3 py-1 text-sm font-bold bg-red-600 text-white">
                              -{discountPercentage}% KORTING
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-base text-gray-500 line-through">
                              €{basePrice.toFixed(2)}
                            </p>
                            <p className="text-sm text-green-600 font-semibold">
                              Je bespaart €{(basePrice - salePrice).toFixed(2)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Incl. BTW</p>
                        </>
                      )
                    }

                    return (
                      <>
                        <p className="text-xl md:text-2xl font-bold">€{basePrice.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Incl. BTW</p>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Trust Badges - Desktop: Ultra compact inline, Mobile: Accordion */}
              <div className="hidden md:flex items-center justify-start gap-3 text-xs text-gray-600 py-2">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Gratis verzending &gt;€{settings.free_shipping_threshold}</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">{settings.return_days} dagen retour</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Lokaal gemaakt</span>
                </div>
              </div>

              {/* Description - Desktop: Expandable with line-clamp */}
              <div className="hidden md:block border-t border-b border-gray-200 py-3">
                <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-line ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {product.description}
                </p>
                {/* Only show button if text is actually clamped (more than 3 lines worth of text) */}
                {product.description && product.description.split('\n').length > 3 && (
                  <button 
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-xs text-brand-primary hover:underline font-semibold mt-2 inline-flex items-center gap-1"
                  >
                    {descriptionExpanded ? 'Toon minder' : 'Lees meer'}
                    <svg 
                      className={`w-3 h-3 transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Size Selector with Size Guide */}
              {availableSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <label className="block text-xs md:text-sm font-bold uppercase tracking-wider">
                      Maat: {selectedSize}
                    </label>
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs text-brand-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Maattabel
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                          className={`px-4 md:px-5 py-2 border-2 font-bold uppercase tracking-wider transition-all text-sm ${
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
                  <label className="block text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">
                    Kleur: {selectedColor}
                  </label>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {availableColors.map(({ color, hex }) => {
                      const colorVariant = product.product_variants.find(
                        (v) => v.size === selectedSize && v.color === color
                      )
                      const colorAvailable = colorVariant && colorVariant.is_available && colorVariant.stock_quantity > 0
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedColor(color)
                            setSelectedImage(0) // Reset to first image when color changes
                          }}
                          disabled={!colorAvailable}
                          className={`relative w-10 h-10 md:w-12 md:h-12 border-2 transition-all ${
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
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-black font-bold">
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
                    <div className="text-black font-bold flex items-center gap-2 animate-fadeIn">
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
                  <label className="block text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">Aantal</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border-2 border-black font-bold text-xl hover:bg-black hover:text-white transition-colors"
                    >
                      −
                    </button>
                    <span className="text-lg md:text-xl font-bold w-10 text-center">{quantity}</span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(selectedVariant?.stock_quantity || 1, quantity + 1))
                      }
                      className="w-10 h-10 border-2 border-black font-bold text-xl hover:bg-black hover:text-white transition-colors"
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
                  className={`flex-1 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-wider transition-all ${
                    addedToCart
                      ? 'bg-black text-white cursor-default animate-success'
                      : inStock && selectedVariant
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {addedToCart ? '✓ TOEGEVOEGD' : inStock ? 'TOEVOEGEN' : 'UITVERKOCHT'}
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

              {/* Product Tabs / Accordion */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="space-y-4">
                  {/* Product Description Tab - Mobile only */}
                  <div className="md:hidden border-2 border-black">
                    <button
                      data-tab="description"
                      onClick={() => setActiveTab(activeTab === 'description' ? '' as any : 'description')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>Product beschrijving</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'description' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'description' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{product.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Trust Badges Tab - Mobile only */}
                  <div className="md:hidden border-2 border-black">
                    <button
                      onClick={() => setActiveTab(activeTab === 'trust' ? '' as any : 'trust')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>Verzending & Retour</span>
                      <svg
                        className={`w-5 h-5 transition-transform ${activeTab === 'trust' ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {activeTab === 'trust' && (
                      <div className="px-4 py-4 border-t-2 border-black bg-gray-50 space-y-3">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">Gratis verzending vanaf €{settings.free_shipping_threshold}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <RotateCcw className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{settings.return_days} dagen bedenktijd</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">Lokaal gemaakt in Nederland</span>
                        </div>
                      </div>
                    )}
                  </div>

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

                  {/* Shipping Tab - Desktop only (mobile has it in Trust tab) */}
                  <div className="hidden md:block border-2 border-black">
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
                        <p><span className="font-semibold">Verzending:</span> Gratis verzending vanaf €{settings.free_shipping_threshold}</p>
                        <p><span className="font-semibold">Levertijd:</span> 2-3 werkdagen binnen Nederland</p>
                        <p><span className="font-semibold">Retour:</span> {settings.return_days} dagen bedenktijd</p>
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
                          {(() => {
                            const hasDiscount = relProd.sale_price && relProd.sale_price < relProd.base_price
                            if (hasDiscount) {
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-lg font-bold text-red-600">€{relProd.sale_price.toFixed(2)}</p>
                                  <p className="text-sm text-gray-500 line-through">€{relProd.base_price.toFixed(2)}</p>
                                </div>
                              )
                            }
                            return <p className="text-lg font-bold">€{relProd.base_price.toFixed(2)}</p>
                          })()}
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
                  ? 'bg-black text-white cursor-default animate-success'
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

      {/* Image/Video Lightbox */}
      {showLightbox && displayImages[selectedImage]?.media_type === 'image' && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
            <Image
              src={displayImages[selectedImage]?.url || '/placeholder.png'}
              alt={displayImages[selectedImage]?.alt_text || product.name}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          {/* Image Navigation */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {displayImages.map((_, index) => (
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

      {/* Size Guide Modal - IMPROVED (All 7 fixes!) */}
      {showSizeGuide && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
          onClick={() => setShowSizeGuide(false)}
          aria-label="Sluit maattabel"
        >
          <div 
            className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">MAATTABEL</h2>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Sluit maattabel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scroll hint for mobile */}
            <div className="sm:hidden mb-2 text-xs text-gray-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Swipe naar links voor meer →</span>
            </div>
            
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full border-2 border-black min-w-[500px]">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Maat</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Borst (cm)</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Lengte (cm)</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">Schouders (cm)</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm">
                  <tr className="border-b-2 border-black">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">S</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">100-104</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">68-70</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">44-46</td>
                  </tr>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">M</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">104-108</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">70-72</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">46-48</td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">L</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">108-112</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">72-74</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">48-50</td>
                  </tr>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XL</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">112-116</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">74-76</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">50-52</td>
                  </tr>
                  <tr>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XXL</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">116-120</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">76-78</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">52-54</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 sm:mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
              <h3 className="font-bold text-sm sm:text-base">Hoe meet je?</h3>
              <p><span className="font-semibold">Borst:</span> Meet rond de breedste punt van je borst</p>
              <p><span className="font-semibold">Lengte:</span> Meet vanaf de halsnaad tot aan de onderkant</p>
              <p><span className="font-semibold">Schouders:</span> Meet van schouder tot schouder over de rug</p>
            </div>

            <button
              onClick={() => setShowSizeGuide(false)}
              className="mt-4 sm:mt-6 w-full py-3 sm:py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-sm sm:text-base"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  )
}
