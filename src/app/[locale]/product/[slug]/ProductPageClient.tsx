'use client'

import { use, useState, useEffect, useRef, ReactElement } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'
import { useCartDrawer } from '@/store/cartDrawer'
import { useWishlist } from '@/store/wishlist'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/ProductReviews'
import StickyBuyNow from '@/components/StickyBuyNow'
import WatchSpecsModal from '@/components/WatchSpecsModal'
import DynamicSizeGuideModal from '@/components/DynamicSizeGuideModal'
import RecentlyViewed from '@/components/RecentlyViewed'
import { Truck, RotateCcw, MapPin, Video, Shield, Package, Lock, AlertCircle } from 'lucide-react'
import { getSiteSettings } from '@/lib/settings'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import { trackProductView, trackAddToCart } from '@/lib/analytics'
import { addToRecentlyViewed } from '@/lib/recentlyViewed'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { formatPrice } from '@/lib/format-price'

const supabase = createClient()

interface Product {
  id: string
  name: string
  name_en?: string
  slug: string
  description: string
  description_en?: string
  base_price: number
  sale_price: number | null
  category_id: string
  meta_title: string
  meta_description: string
  size_guide_content?: any | null
  size_guide_content_en?: any | null
  product_images: ProductImage[]
  product_variants: ProductVariant[]
  categories: {
    name: string
    name_en?: string
    slug: string
    size_guide_type?: string | null
    size_guide_content?: any | null
    size_guide_content_en?: any | null
    default_product_details?: string | null
    default_product_details_en?: string | null
    default_materials_care?: string | null
    default_materials_care_en?: string | null
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
  presale_stock_quantity: number
  presale_enabled: boolean
  presale_expected_date: string | null
  presale_expected_date_en: string | null
  price_adjustment: number
  is_available: boolean
  display_order: number
}

// Helper functie om ** te vervangen door <strong> tags (met <p> wrapper voor accordions)
function formatTemplateText(text: string): ReactElement[] {
  const lines = text.split('\n')
  return lines.map((line, index) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={index}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>
          }
          return part
        })}
      </p>
    )
  })
}

// Helper functie om HTML content te renderen (voor database content)
function renderHTMLContent(html: string): ReactElement {
  // Convert **text** to <strong>text</strong> and \n to <br> before rendering
  const processedHTML = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\n/g, '<br>') // Newlines to line breaks
  return <div dangerouslySetInnerHTML={{ __html: processedHTML }} />
}

// Helper functie om ** te vervangen door <strong> tags (inline, voor description)
function formatBoldText(text: string): (string | ReactElement)[] {
  const lines = text.split('\n')
  return lines.flatMap((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const elements = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${lineIndex}-${i}`} className="font-bold">{part.slice(2, -2)}</strong>
      }
      return part
    })
    // Add line break between lines (except for the last one)
    if (lineIndex < lines.length - 1) {
      return [...elements, <br key={`br-${lineIndex}`} />]
    }
    return elements
  })
}

// Main Video Component met autoplay (voor grote display)
function MainVideo({ 
  videoUrl, 
  posterUrl 
}: { 
  videoUrl: string
  posterUrl?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      console.log('❌ MainVideo: No video ref')
      return
    }

    console.log('🎬 MainVideo SETUP:', videoUrl.substring(videoUrl.length - 30))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio
          
          console.log('👁️ MainVideo INTERSECTION:', {
            videoUrl: videoUrl.substring(videoUrl.length - 30),
            isIntersecting: entry.isIntersecting,
            intersectionRatio: ratio.toFixed(2),
            shouldPlay: entry.isIntersecting && ratio >= 0.25
          })
          
          if (entry.isIntersecting && ratio >= 0.25) {
            console.log('🎬 MainVideo: Attempting AUTOPLAY...')
            video.play()
              .then(() => {
                console.log('✅ MainVideo: Autoplay SUCCESS!')
                setIsPlaying(true)
              })
              .catch((err) => console.error('❌ MainVideo: Autoplay BLOCKED:', err.message))
          } else {
            console.log('⏸️ MainVideo: Pausing (not visible)')
            video.pause()
            setIsPlaying(false)
          }
        })
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    console.log('👀 MainVideo: Observer ACTIVE')
    
    return () => {
      console.log('🛑 MainVideo: Disconnecting observer')
      observer.disconnect()
    }
  }, [videoUrl])

  // Toggle play/pause on click
  const handleVideoClick = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleVideoClick}>
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        muted
        loop
        className="w-full h-full object-contain bg-gray-100"
        poster={posterUrl || undefined}
        preload="metadata"
      />
      {/* Optional: Show pause icon overlay when paused (fades out quickly) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-black/60 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

// Video Thumbnail Component ZONDER autoplay (alleen statische poster)
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
  return (
    <button
      onClick={onClick}
      className={`relative aspect-[3/4] border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-brand-primary scale-95'
          : 'border-gray-300 hover:border-black'
      }`}
    >
      {/* Video first frame as thumbnail OR saved poster image */}
      {posterUrl ? (
        // Use saved poster/thumbnail if available
        <Image
          src={posterUrl}
          alt="Video thumbnail"
          fill
          className="object-cover object-center"
        />
      ) : (
        // Use first frame of video as thumbnail
        <video
          src={videoUrl}
          preload="metadata"
          className="w-full h-full object-cover object-center"
          playsInline
          muted
        />
      )}
      {/* Play icon overlay - always visible */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <svg 
          className="w-12 h-12 text-white/90" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  )
}

export default function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const t = useTranslations('product')
  const locale = useLocale()
  const { slug } = use(params)
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  // Helper to get localized product fields
  const getLocalizedName = (product: Product) => 
    locale === 'en' && product.name_en ? product.name_en : product.name
  const getLocalizedDescription = (product: Product) => 
    locale === 'en' && product.description_en ? product.description_en : product.description
  const getLocalizedCategoryName = (product: Product) => 
    locale === 'en' && product.categories.name_en ? product.categories.name_en : product.categories.name
  
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
  const [activeTab, setActiveTab] = useState<'description' | 'trust' | 'details' | 'materials' | 'shipping'>('description')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [mobileDescriptionExpanded, setMobileDescriptionExpanded] = useState(false)

  // Handle tab change with smart scroll positioning
  const handleTabChange = (newTab: 'description' | 'trust' | 'details' | 'materials' | 'shipping' | '') => {
    // If closing a tab, just close it
    if (!newTab) {
      setActiveTab('' as any)
      return
    }

    // Get the button element that was clicked
    const buttonMap: Record<string, string> = {
      description: '[data-tab="description"]',
      trust: '[data-tab="trust"]',
      details: '[data-tab="details"]',
      materials: '[data-tab="materials"]',
      shipping: '[data-tab="shipping"]',
    }

    const buttonSelector = buttonMap[newTab]
    const buttonElement = buttonSelector ? document.querySelector(buttonSelector) as HTMLElement : null

    // Save current scroll position and button position before state change
    const currentScrollY = window.scrollY
    const buttonRect = buttonElement?.getBoundingClientRect()
    const buttonTopRelative = buttonRect ? buttonRect.top : null // Position relative to viewport

    // Update tab state
    setActiveTab(newTab as any)

    // After DOM updates, scroll to keep the opened accordion button in view
    // Use setTimeout to ensure all DOM updates (collapsing/expanding) are complete
    setTimeout(() => {
      if (buttonElement) {
        const newButtonRect = buttonElement.getBoundingClientRect()
        const newButtonTop = newButtonRect.top + window.scrollY
        
        // Check if button is currently visible in viewport
        const isButtonVisible = newButtonRect.top >= 0 && newButtonRect.bottom <= window.innerHeight
        
        // If button is not fully visible, scroll it into view
        if (!isButtonVisible) {
          // Scroll to button with offset from top for better UX
          const offset = 20 // 20px breathing room from top
          const targetScroll = newButtonTop - offset
          
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          })
        } else {
          // Button is visible, but we need to compensate for content collapsing above
          // Calculate how much content collapsed above the button
          const scrollAdjustment = (buttonTopRelative || 0) - newButtonRect.top
          
          // Only adjust if there's a significant change (more than 10px)
          if (Math.abs(scrollAdjustment) > 10) {
            window.scrollTo({
              top: currentScrollY + scrollAdjustment,
              behavior: 'smooth'
            })
          }
        }
      }
    }, 100) // Small delay to ensure DOM has fully updated
  }
  const [settings, setSettings] = useState({
    free_shipping_threshold: 100,
    return_days: 14,
    shipping_cost: 6.95,
    show_preview_images_notice: false,
  })

  // Ref for scroll container (CSS scroll-snap)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
        shipping_cost: siteSettings.shipping_cost,
        show_preview_images_notice: siteSettings.show_preview_images_notice || false,
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
      
      // Add to recently viewed
      addToRecentlyViewed(product.id, product.slug)
      
      // Track product view in custom analytics
      trackProductView({
        id: product.id,
        name: product.name,
        category: product.categories?.name || 'uncategorized',
        price: product.sale_price || product.base_price,
      })
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
        name_en,
        description_en,
        size_guide_content_en,
        product_images(*),
        product_variants(
          id,
          product_id,
          size,
          color,
          color_hex,
          sku,
          stock_quantity,
          presale_stock_quantity,
          presale_enabled,
          presale_expected_date,
          presale_expected_date_en,
          price_adjustment,
          is_available,
          display_order,
          created_at
        ),
        categories(name, name_en, slug, size_guide_type, size_guide_content, size_guide_content_en, default_product_details, default_product_details_en, default_materials_care, default_materials_care_en)
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
      data.product_variants.sort((a: ProductVariant, b: ProductVariant) => a.display_order - b.display_order)
      setProduct(data)

      // Set page title
      document.title = `${data.name} - MOSE`

      // Track Facebook Pixel ViewContent event
      const price = data.sale_price || data.base_price
      trackPixelEvent('ViewContent', {
        content_ids: [data.id],
        content_name: data.name,
        content_type: 'product',
        content_category: data.categories?.name,
        value: price,
        currency: 'EUR'
      })

      // Auto-select first available variant (including presale)
      if (data.product_variants.length > 0) {
        const firstAvailable = data.product_variants.find((v: ProductVariant) => {
          const totalStock = v.stock_quantity + (v.presale_stock_quantity || 0)
          return v.is_available && totalStock > 0
        })
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
          name_en,
          product_images(*),
          product_variants(
            id,
            product_id,
            size,
            color,
            color_hex,
            sku,
            stock_quantity,
            presale_stock_quantity,
            presale_enabled,
            presale_expected_date,
            presale_expected_date_en,
            price_adjustment,
            is_available,
            display_order,
            created_at
          ),
          categories(name, name_en, slug)
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

  // Helper function to translate color names
  const getTranslatedColor = (color: string) => {
    const colorMap: { [key: string]: { nl: string; en: string } } = {
      'zwart': { nl: 'ZWART', en: 'BLACK' },
      'wit': { nl: 'WIT', en: 'WHITE' },
      'grijs': { nl: 'GRIJS', en: 'GREY' },
      'blauw': { nl: 'BLAUW', en: 'BLUE' },
      'rood': { nl: 'ROOD', en: 'RED' },
      'groen': { nl: 'GROEN', en: 'GREEN' },
      'geel': { nl: 'GEEL', en: 'YELLOW' },
      'bruin': { nl: 'BRUIN', en: 'BROWN' },
      'beige': { nl: 'BEIGE', en: 'BEIGE' },
      'roze': { nl: 'ROZE', en: 'PINK' },
      'paars': { nl: 'PAARS', en: 'PURPLE' },
      'oranje': { nl: 'ORANJE', en: 'ORANGE' },
    }
    
    const colorLower = color.toLowerCase()
    if (colorMap[colorLower]) {
      return locale === 'en' ? colorMap[colorLower].en : colorMap[colorLower].nl
    }
    
    // Fallback to uppercase if no translation
    return color.toUpperCase()
  }

  const selectedVariant = product?.product_variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  )

  // Calculate final price with sale price support
  const finalPrice = product 
    ? (product.sale_price || product.base_price) + (selectedVariant?.price_adjustment || 0) 
    : 0

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

  // Responsive image navigation: scroll on mobile, state on desktop
  const scrollToImage = (index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    // Check viewport: mobile uses scroll-snap, desktop uses state
    const isMobile = window.innerWidth < 768
    
    if (isMobile) {
      // Mobile: Scroll to image (triggers scroll event → updates state)
      const imageWidth = container.clientWidth
      container.scrollTo({
        left: index * imageWidth,
        behavior: 'smooth'
      })
    } else {
      // Desktop: Direct state update (instant feedback, no scroll)
      setSelectedImage(index)
    }
  }

  // Sync dots with scroll position (CSS scroll-snap)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const imageWidth = container.clientWidth
      const newIndex = Math.round(scrollLeft / imageWidth)
      
      if (newIndex !== selectedImage && newIndex >= 0 && newIndex < displayImages.length) {
        setSelectedImage(newIndex)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [displayImages.length, selectedImage])

  const handleVariantRequired = () => {
    // Scroll to variant selector
    const variantSection = document.querySelector('[data-variant-section]')
    if (variantSection) {
      variantSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Add pulse animation
      variantSection.classList.add('animate-pulse')
      setTimeout(() => {
        variantSection.classList.remove('animate-pulse')
      }, 2000)
    }
    
    toast.error('Selecteer eerst een maat en kleur')
  }

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return

    // Get first IMAGE (not video) for cart thumbnail
    const firstImage = displayImages.find(img => img.media_type === 'image')
    const cartImage = firstImage?.url || displayImages[0]?.url || '/placeholder.png'

    const isPresaleItem = selectedVariant.presale_enabled && selectedVariant.presale_stock_quantity > 0
    
    console.log('═════════════════════════════════════════')
    console.log('🛒 ADD TO CART - PRODUCT PAGE')
    console.log('═════════════════════════════════════════')
    console.log('📦 Product:', product.name)
    console.log('🎨 Variant ID:', selectedVariant.id)
    console.log('📏 Size:', selectedVariant.size)
    console.log('🎨 Color:', selectedVariant.color)
    console.log('💰 Final Price:', finalPrice)
    console.log('📊 Quantity:', quantity)
    console.log('═════════════════════════════════════════')
    console.log('🔍 PRESALE CHECK:')
    console.log('   - presale_enabled:', selectedVariant.presale_enabled)
    console.log('   - stock_quantity:', selectedVariant.stock_quantity)
    console.log('   - presale_stock_quantity:', selectedVariant.presale_stock_quantity)
    console.log('   - presale_expected_date:', selectedVariant.presale_expected_date)
    console.log('   - CALCULATED isPresale:', isPresaleItem)
    console.log('═════════════════════════════════════════')

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
      // PRESALE INFO: Detect if item is from presale stock
      isPresale: isPresaleItem,
      presaleExpectedDate: selectedVariant.presale_enabled ? (selectedVariant.presale_expected_date ?? undefined) : undefined,
      presaleStock: selectedVariant.presale_stock_quantity,  // Pass presale stock for quantity limits
    }

    console.log('📦 CART ITEM:', JSON.stringify(cartItem, null, 2))
    console.log('═════════════════════════════════════════')
    
    addItem(cartItem)
    
    // Reset quantity to 1 after successful add
    setQuantity(1)

    // Track Facebook Pixel AddToCart event with user data if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      trackPixelEvent('AddToCart', {
        content_ids: [selectedVariant.id],
        content_name: `${getLocalizedName(product)} - ${selectedVariant.size} - ${selectedVariant.color}`,
        content_type: 'product',
        content_category: product.categories?.name,
        value: finalPrice * quantity,
        currency: 'EUR',
        num_items: quantity
      }, user ? {
        email: user.email || undefined,
        firstName: user.user_metadata?.first_name || undefined,
        lastName: user.user_metadata?.last_name || undefined,
        phone: user.phone || undefined
      } : undefined)
    } catch (error) {
      // If user check fails, still track without userData
      trackPixelEvent('AddToCart', {
        content_ids: [selectedVariant.id],
        content_name: `${getLocalizedName(product)} - ${selectedVariant.size} - ${selectedVariant.color}`,
        content_type: 'product',
        content_category: product.categories?.name,
        value: finalPrice * quantity,
        currency: 'EUR',
        num_items: quantity
      })
    }
    
    // Track custom analytics AddToCart event
    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.categories?.name || 'uncategorized',
      price: finalPrice,
      quantity: quantity,
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
          <h1 className="text-4xl md:text-5xl font-display mb-6">{t('notFound')}</h1>
          <LocaleLink
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
          >
            {t('backToShop')}
          </LocaleLink>
        </div>
      </div>
    )
  }

  const inStock = selectedVariant ? selectedVariant.stock_quantity > 0 : false
  const lowStock = selectedVariant && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 5
  const isPresale = selectedVariant && selectedVariant.presale_enabled && selectedVariant.stock_quantity === 0 && selectedVariant.presale_stock_quantity > 0
  const totalStock = selectedVariant ? selectedVariant.stock_quantity + selectedVariant.presale_stock_quantity : 0
  const hasAnyStock = totalStock > 0

  return (
    <>
      <div className="min-h-screen pt-20 md:pt-24 px-4 pb-24 md:pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 md:mb-8 text-sm">
            <LocaleLink href="/" className="text-gray-600 hover:text-brand-primary transition-colors">
              {t('breadcrumb.home', { ns: 'common' })}
            </LocaleLink>
            <span className="mx-2 text-gray-400">/</span>
            <LocaleLink href="/shop" className="text-gray-600 hover:text-brand-primary transition-colors">
              {t('breadcrumb.shop', { ns: 'common' })}
            </LocaleLink>
            <span className="mx-2 text-gray-400">/</span>
            <LocaleLink
              href={`/shop?category=${product.categories.slug}`}
              className="text-gray-600 hover:text-brand-primary transition-colors"
            >
              {product.categories.name}
            </LocaleLink>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-black font-semibold">{product && getLocalizedName(product)}</span>
          </div>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-12">
            {/* LEFT: Image Gallery (55% width) */}
            <div className="space-y-4">
              {/* Main Media Display - Native CSS Scroll-Snap Gallery */}
              <div className="relative">
                {/* Scroll Container with CSS Scroll-Snap */}
                <div
                  ref={scrollContainerRef}
                  className="relative aspect-[3/4] md:aspect-[3/3] bg-gray-100 border-2 border-black overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide md:overflow-hidden group"
                  style={{
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {/* Images Container */}
                  <div className="flex h-full md:block md:relative">
                    {displayImages.map((media, index) => (
                      <div
                        key={media.id}
                        className="relative w-full h-full flex-shrink-0 snap-start snap-always md:absolute md:inset-0 md:opacity-0 md:pointer-events-none"
                        style={{
                          // Desktop: only show selected image
                          ...(typeof window !== 'undefined' && window.innerWidth >= 768 ? {
                            opacity: index === selectedImage ? 1 : 0,
                            pointerEvents: index === selectedImage ? 'auto' : 'none',
                            transition: 'opacity 300ms ease-out'
                          } : {})
                        }}
                      >
                        {media.media_type === 'video' ? (
                          <MainVideo 
                            videoUrl={media.url}
                            posterUrl={media.video_thumbnail_url}
                          />
                        ) : (
                          <div
                            onClick={() => index === selectedImage && setShowLightbox(true)}
                            className={`relative w-full h-full ${index === selectedImage ? 'cursor-zoom-in' : ''}`}
                          >
                            <Image
                              src={media.url || '/placeholder.png'}
                              alt={media.alt_text || product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-contain object-center"
                              priority={index === 0}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Zoom hint - only for images, desktop only */}
                  {displayImages[selectedImage]?.media_type === 'image' && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity hidden md:block pointer-events-none z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  )}

                  {/* Out of Stock OR Presale Overlay */}
                  {!hasAnyStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10">
                      <span className="text-white text-2xl md:text-4xl font-display">{t('stock.outOfStock').toUpperCase()}</span>
                    </div>
                  )}

                  {/* Dots Indicator - Mobile only, only if multiple images */}
                  {displayImages.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 md:hidden pointer-events-none z-10">
                      {displayImages.map((_, index) => (
                        <div
                          key={index}
                          className={`rounded-full transition-all duration-300 ${
                            index === selectedImage
                              ? 'bg-brand-primary w-6 h-1.5'
                              : 'bg-white/60 w-1.5 h-1.5'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
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
                        onClick={() => scrollToImage(index)}
                      />
                    ) : (
                      <button
                        key={media.id}
                        onClick={() => scrollToImage(index)}
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

              {/* Preview Images Notice - Only show if setting is enabled */}
              {settings?.show_preview_images_notice && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 md:p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-700">
                      {t('presale.previewNotice')}
                    </p>
                  </div>
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
                <h1 className="text-2xl md:text-3xl font-display mb-2 md:mb-3 transition-all duration-300">
                  {product && getLocalizedName(product)}
                  {selectedVariant && selectedColor && (
                    <span className="text-brand-primary"> - {getTranslatedColor(selectedColor)}</span>
                  )}
                </h1>
                
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
                            <p className="text-xl md:text-2xl font-bold text-brand-primary">
                              {formatPrice(salePrice, locale)}
                            </p>
                            <span className="inline-flex items-center px-3 py-1 text-sm font-bold bg-black text-white border-2 border-black">
                              -{discountPercentage}% KORTING
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-base text-gray-500 line-through">
                              {formatPrice(basePrice, locale)}
                            </p>
                            <p className="text-sm text-brand-primary font-semibold">
                              Je bespaart {formatPrice(basePrice - salePrice, locale)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{t('inclVat')}</p>
                        </>
                      )
                    }

                    return (
                      <>
                        <p className="text-xl md:text-2xl font-bold">{formatPrice(basePrice, locale)}</p>
                        <p className="text-xs text-gray-500">{t('inclVat')}</p>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* 🎯 COMPACT PRESALE CARD */}
              {isPresale && selectedVariant && (
                <div className="bg-gradient-to-r from-[#f0f4e8] to-[#e8f0e4] border-l-4 border-[#86A35A] p-3 md:p-4 rounded-r">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-[#86A35A] flex-shrink-0" />
                    <p className="text-sm font-bold text-[#4a5c2a] uppercase tracking-wide">
                      {t('presale.available', { ns: 'product' })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>{t('presale.expected', { ns: 'product' })}:</strong> {(locale === 'en' ? selectedVariant.presale_expected_date_en : selectedVariant.presale_expected_date) || t('presale.comingSoon', { ns: 'product' })} • {t('presale.limitedEdition', { ns: 'product' })}
                  </p>
                  <p className="text-xs text-gray-600">
                    ✓ {t('presale.payNowReceiveLater', { ns: 'product' })}  •  ✓ {t('presale.shippedImmediately', { ns: 'product' })}
                  </p>
                </div>
              )}

              {/* Description - Desktop: Expandable with line-clamp */}
              <div className="hidden md:block border-t border-b border-gray-200 py-3">
                <div className={`text-sm text-gray-700 leading-relaxed ${descriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {formatBoldText(getLocalizedDescription(product))}
                </div>
                {/* Only show button if text is actually clamped (more than 3 lines worth of text) */}
                {getLocalizedDescription(product) && getLocalizedDescription(product).split('\n').length > 3 && (
                  <button 
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-xs text-brand-primary hover:underline font-semibold mt-2 inline-flex items-center gap-1"
                  >
                    {descriptionExpanded ? t('showLess') : t('showMore')}
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

              {/* 🎯 SMART AVAILABILITY & TRUST BANNER - Desktop: Boven keuzes / Mobile: Onder keuzes */}
              {selectedVariant && !isPresale && (
                <div className={`hidden md:block border-l-4 p-3 md:p-4 rounded-r space-y-2.5 ${
                  inStock 
                    ? lowStock 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500' 
                      : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-500'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400'
                }`}>
                  {/* Row 1: Stock Status (Dynamic: Urgency OR Availability OR Out of Stock) */}
                  <div className="flex items-center gap-2">
                    {inStock ? (
                      lowStock ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {t('stock.lowStock', { count: selectedVariant.stock_quantity })}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {t('stock.inStock')}
                            </p>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-600">
                            {t('outOfStock')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Row 2: Trust Badges (Always show, using dynamic settings) */}
                  {inStock && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 pl-7">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.returns', { days: settings.return_days })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.freeShipping', { threshold: settings.free_shipping_threshold })}
                      </span>
                      {/* Only show warranty for watches */}
                      {product.categories.size_guide_type === 'watch' && (
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.warranty')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Color Selector - Enhanced (Minimal) */}
              {availableColors.length > 0 && (
                <div>
                  <label className="block text-xs md:text-sm font-bold uppercase tracking-wider mb-2 md:mb-3">
                    {t('color')}: <span className="text-brand-primary font-bold">{getTranslatedColor(selectedColor)}</span>
                  </label>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {availableColors.map(({ color, hex }) => {
                      const colorVariant = product.product_variants.find(
                        (v) => v.size === selectedSize && v.color === color
                      )
                      const totalStock = colorVariant ? colorVariant.stock_quantity + (colorVariant.presale_stock_quantity || 0) : 0
                      const colorAvailable = colorVariant && colorVariant.is_available && totalStock > 0
                      const isSelected = selectedColor === color
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedColor(color)
                            setSelectedImage(0) // Reset to first image when color changes
                            setQuantity(1) // Reset quantity when changing color
                          }}
                          disabled={!colorAvailable}
                          className={`relative border-2 transition-all ${
                            isSelected
                              ? 'w-14 h-14 md:w-16 md:h-16 border-4 border-brand-primary'
                              : 'w-10 h-10 md:w-12 md:h-12'
                          } ${
                            colorAvailable
                              ? 'border-gray-400 hover:border-black'
                              : 'border-gray-300 cursor-not-allowed opacity-50'
                          }`}
                          aria-label={t('selectColor', { color })}
                        >
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: hex }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            </div>
                          )}
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

              {/* Size Selector with Size Guide */}
              {availableSizes.length > 0 && (
                <div data-variant-section>
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <label className="block text-xs md:text-sm font-bold uppercase tracking-wider">
                      {t('size')}: {selectedSize}
                    </label>
                    {/* Dynamic Size Guide Button - only show if not 'none' */}
                    {product.categories.size_guide_type !== 'none' && (
                      <button
                        onClick={() => setShowSizeGuide(true)}
                        className="text-xs text-brand-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {product.categories.size_guide_type === 'watch' ? t('sizeGuide.specs') : 
                         product.categories.size_guide_type === 'accessory' ? t('sizeGuide.info') :
                         product.categories.size_guide_type === 'shoes' ? t('sizeGuide.shoes') :
                         product.categories.size_guide_type === 'jewelry' ? t('sizeGuide.jewelry') :
                         t('sizeGuide.default')}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => {
                      const sizeVariants = product.product_variants.filter((v) => v.size === size)
                      const sizeAvailable = sizeVariants.some((v) => {
                        const totalStock = v.stock_quantity + (v.presale_stock_quantity || 0)
                        return v.is_available && totalStock > 0
                      })
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size)
                            setQuantity(1) // Reset quantity when changing size
                            // Optie 1: Behoud kleurkeuze, laat beschikbaarheid zien
                            // Geen automatische kleurwijziging meer
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

              {/* Back in Stock Notification (Feature 7) */}
              {!hasAnyStock && selectedVariant && (
                <div className="bg-gray-50 border-2 border-gray-300 p-4 rounded">
                  <h3 className="font-bold mb-2">{t('notify.title')}</h3>
                  <p className="text-sm text-gray-600 mb-3">{t('notify.description')}</p>
                  {notifySubmitted ? (
                    <div className="text-black font-bold flex items-center gap-2 animate-fadeIn">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('notify.success')}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder={t('placeholder.email', { ns: 'checkout' })}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                      />
                      <button
                        onClick={handleNotifyMe}
                        className="px-6 py-2 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                      >
                        {t('notify.submit')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Add to Cart Buttons - Mobile & Desktop */}
              <div className="flex gap-2 md:gap-3">
                {/* QUANTITY SELECTOR - Brutalist Stepper (MOSE Style) */}
                <div className="flex border-2 border-black">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || !hasAnyStock || !selectedVariant}
                    className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-bold text-xl transition-colors ${
                      quantity <= 1 || !hasAnyStock || !selectedVariant
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <div className="w-10 h-12 md:w-12 md:h-14 flex items-center justify-center border-x-2 border-black bg-white font-bold text-base md:text-lg">
                    {quantity}
                  </div>
                  <button
                    onClick={() => {
                      const maxQty = selectedVariant?.presale_enabled 
                        ? selectedVariant.presale_stock_quantity 
                        : selectedVariant?.stock_quantity || 10
                      setQuantity(Math.min(maxQty, quantity + 1))
                    }}
                    disabled={!hasAnyStock || !selectedVariant || quantity >= (selectedVariant?.presale_enabled ? selectedVariant.presale_stock_quantity : selectedVariant?.stock_quantity || 10)}
                    className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-bold text-xl transition-colors ${
                      !hasAnyStock || !selectedVariant || quantity >= (selectedVariant?.presale_enabled ? selectedVariant.presale_stock_quantity : selectedVariant?.stock_quantity || 10)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* IN WINKELWAGEN button - primary action */}
                <button
                  onClick={handleAddToCart}
                  disabled={!hasAnyStock || !selectedVariant || addedToCart}
                  className={`flex-1 py-3 md:py-4 text-base md:text-lg font-bold uppercase tracking-wider transition-all ${
                    addedToCart
                      ? 'bg-black text-white cursor-default animate-success'
                      : hasAnyStock && selectedVariant
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-95'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {addedToCart ? t('added') : hasAnyStock ? t('addToCart') : t('outOfStock')}
                </button>
                
                {/* Wishlist button - secondary - MOSE Brutalist - Hidden on mobile */}
                <button
                  onClick={async () => {
                    if (!product) return
                    if (isWishlisted) {
                      await removeFromWishlist(product.id)
                      setIsWishlisted(false)
                      toast.success(t('wishlist.removed'))
                    } else {
                      await addToWishlist(product.id)
                      setIsWishlisted(true)
                      toast.success(t('wishlist.added'))
                    }
                  }}
                  className={`hidden md:flex md:w-auto md:p-4 border-2 border-black transition-all items-center justify-center ${
                    isWishlisted
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-white text-black hover:bg-brand-primary hover:text-white'
                  }`}
                  title={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
                  aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* 🎯 SMART AVAILABILITY & TRUST BANNER - Mobile only (na keuzes) */}
              {selectedVariant && !isPresale && (
                <div className={`md:hidden border-l-4 p-3 rounded-r space-y-2.5 ${
                  inStock 
                    ? lowStock 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-500' 
                      : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-500'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400'
                }`}>
                  {/* Row 1: Stock Status (Dynamic: Urgency OR Availability OR Out of Stock) */}
                  <div className="flex items-center gap-2">
                    {inStock ? (
                      lowStock ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {t('stock.lowStock', { count: selectedVariant.stock_quantity })}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {t('stock.inStock')}
                            </p>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-600">
                            {t('outOfStock')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Row 2: Trust Badges (Always show, using dynamic settings) */}
                  {inStock && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 pl-7">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.returns', { days: settings.return_days })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.freeShipping', { threshold: settings.free_shipping_threshold })}
                      </span>
                      {/* Only show warranty for watches */}
                      {product.categories.size_guide_type === 'watch' && (
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        {t('trust.warranty')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* MOSE-Style Trust Section - CORRECT DATA */}
              <div className="mt-4 border-2 border-black hidden md:block">
                {/* Verzending Info */}
                <div className="p-3 border-b-2 border-black">
                  <div className="flex items-start gap-2">
                    <Truck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">{t('tabs.shipping')}</p>
                      <p className="text-gray-700">
                        {t('shipping.info', { cost: settings.shipping_cost.toFixed(2), threshold: settings.free_shipping_threshold })}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Retour Info */}
                <div className="p-3 border-b-2 border-black">
                  <div className="flex items-start gap-2">
                    <RotateCcw className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">{t('tabs.returns')}</p>
                      <p className="text-gray-700">{t('returns.info', { days: settings.return_days })}</p>
                    </div>
                  </div>
                </div>

                {/* Garantie Info */}
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold uppercase tracking-wide mb-1">{t('tabs.warranty')}</p>
                      <p className="text-gray-700">{t('warranty.info')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Tabs / Accordion */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="space-y-4">
                  {/* Product Description Tab - Mobile only */}
                  <div className="md:hidden border-2 border-black">
                    <button
                      data-tab="description"
                      onClick={() => handleTabChange(activeTab === 'description' ? '' : 'description')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.description')}</span>
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
                        <div className={`text-gray-700 leading-relaxed text-sm ${mobileDescriptionExpanded ? '' : 'line-clamp-6'}`}>
                          {formatBoldText(getLocalizedDescription(product))}
                        </div>
                        {/* Show "lees meer" button if description is long enough */}
                        {getLocalizedDescription(product) && getLocalizedDescription(product).length > 300 && (
                          <button
                            onClick={() => setMobileDescriptionExpanded(!mobileDescriptionExpanded)}
                            className="text-xs text-brand-primary hover:underline font-semibold mt-3 inline-flex items-center gap-1"
                          >
                            {mobileDescriptionExpanded ? t('showLess') : t('showMore')}
                            <svg
                              className={`w-3 h-3 transition-transform ${mobileDescriptionExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trust Badges Tab - Mobile only */}
                  <div className="md:hidden border-2 border-black">
                    <button
                      data-tab="trust"
                      onClick={() => handleTabChange(activeTab === 'trust' ? '' : 'trust')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.shippingReturns')}</span>
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
                          <span className="text-sm font-semibold text-gray-900">{t('trust.freeShipping', { threshold: settings.free_shipping_threshold })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <RotateCcw className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{t('returns.info', { days: settings.return_days })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-brand-primary flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{t('madeLocally')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details Tab */}
                  <div className="border-2 border-black">
                    <button
                      data-tab="details"
                      onClick={() => handleTabChange(activeTab === 'details' ? '' : 'details')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.details')}</span>
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
                        {product.categories?.default_product_details || product.categories?.default_product_details_en ? (
                          renderHTMLContent(
                            locale === 'en' && product.categories?.default_product_details_en 
                              ? product.categories.default_product_details_en 
                              : product.categories?.default_product_details || ''
                          )
                        ) : (
                          <>
                            <p><span className="font-semibold">{locale === 'en' ? 'Premium quality:' : 'Premium kwaliteit:'}</span> {locale === 'en' ? 'High-quality materials that last' : 'Hoogwaardige materialen die lang meegaan'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Perfect fit:' : 'Perfect fit:'}</span> {locale === 'en' ? 'Designed for comfort and style' : 'Ontworpen voor comfort en stijl'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Locally made:' : 'Lokaal gemaakt:'}</span> {locale === 'en' ? 'Produced with love in Groningen' : 'Met liefde geproduceerd in Groningen'}</p>
                          </>
                        )}
                        
                        {/* Preview Images Notice - Only show if setting is enabled */}
                        {settings?.show_preview_images_notice && (
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <p>{t('presale.previewNotice')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Materials Tab */}
                  <div className="border-2 border-black">
                    <button
                      data-tab="materials"
                      onClick={() => handleTabChange(activeTab === 'materials' ? '' : 'materials')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.materials')}</span>
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
                        {product.categories?.default_materials_care || product.categories?.default_materials_care_en ? (
                          renderHTMLContent(
                            locale === 'en' && product.categories?.default_materials_care_en 
                              ? product.categories.default_materials_care_en 
                              : product.categories?.default_materials_care || ''
                          )
                        ) : (
                          <>
                            <p><span className="font-semibold">{locale === 'en' ? 'Material:' : 'Materiaal:'}</span> {locale === 'en' ? '100% organic cotton, 300gsm' : '100% biologisch katoen, 300gsm'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Washing instructions:' : 'Was instructies:'}</span> {locale === 'en' ? 'Machine washable at 30°C' : 'Machinewasbaar op 30°C'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Ironing:' : 'Strijken:'}</span> {locale === 'en' ? 'Low temperature, inside out' : 'Op lage temperatuur, binnenstebuiten'}</p>
                            <p><span className="font-semibold">{locale === 'en' ? 'Drying:' : 'Drogen:'}</span> {locale === 'en' ? 'Do not tumble dry, hang to dry' : 'Niet in de droger, ophangen'}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shipping Tab - Desktop only (mobile has it in Trust tab) */}
                  <div className="hidden md:block border-2 border-black">
                    <button
                      data-tab="shipping"
                      onClick={() => handleTabChange(activeTab === 'shipping' ? '' : 'shipping')}
                      className="w-full px-4 py-3 flex items-center justify-between font-bold hover:bg-gray-50 transition-colors"
                    >
                      <span>{t('tabs.shippingReturns')}</span>
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
                        <p><span className="font-semibold">{t('shipping.label')}:</span> {t('trust.freeShipping', { threshold: settings.free_shipping_threshold })}</p>
                        <p><span className="font-semibold">{t('shipping.deliveryTime')}:</span> {t('shipping.deliveryTimeValue')}</p>
                        <p><span className="font-semibold">{t('returns.label')}:</span> {t('returns.info', { days: settings.return_days })}</p>
                        <p><span className="font-semibold">{t('returns.cost')}:</span> {t('returns.costValue')}</p>
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
              <h2 className="text-3xl md:text-4xl font-display mb-8 text-center">{t('related.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((relProd) => {
                  const primaryImage = relProd.product_images.find((img: ProductImage) => img.is_primary) || relProd.product_images[0]
                  const hasStock = relProd.product_variants.some((v: ProductVariant) => v.stock_quantity > 0)
                  
                  return (
                    <LocaleLink
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
                              {t('outOfStock')}
                            </div>
                          )}
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{relProd.name}</h3>
                          {(() => {
                            const hasDiscount = relProd.sale_price && relProd.sale_price < relProd.base_price
                            if (hasDiscount && relProd.sale_price) {
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-lg font-bold text-brand-primary">€{relProd.sale_price.toFixed(2)}</p>
                                  <p className="text-sm text-gray-500 line-through">€{relProd.base_price.toFixed(2)}</p>
                                </div>
                              )
                            }
                            return <p className="text-lg font-bold">€{relProd.base_price.toFixed(2)}</p>
                          })()}
                        </div>
                      </div>
                    </LocaleLink>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recently Viewed Products */}
          <RecentlyViewed currentProductId={product.id} />

          {/* Product Reviews */}
          <ProductReviews productId={product.id} />
        </div>
      </div>

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

      {/* Hybrid Size Guide Modal: Product Override OR Category Template */}
      {showSizeGuide && (() => {
        // Priority 1: Product-specific content (override)
        // Select locale-specific content: EN if locale is 'en', otherwise NL
        const sizeGuideContent = locale === 'en' 
          ? (product.size_guide_content_en || product.categories.size_guide_content_en || product.size_guide_content || product.categories.size_guide_content)
          : (product.size_guide_content || product.categories.size_guide_content)
        
        // If we have JSON content, use DynamicSizeGuideModal
        if (sizeGuideContent) {
          return (
            <DynamicSizeGuideModal
              content={sizeGuideContent}
              onClose={() => setShowSizeGuide(false)}
            />
          )
        }
        
        // Fallback: Hardcoded modals for backward compatibility
        if (product.categories.size_guide_type === 'watch') {
          return <WatchSpecsModal onClose={() => setShowSizeGuide(false)} />
        }
        
        // Fallback: Default clothing size guide
        return (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
            onClick={() => setShowSizeGuide(false)}
            aria-label={t('sizeGuide.close')}
          >
            <div 
              className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">{t('sizeGuide.title')}</h2>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label={t('sizeGuide.close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
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
                      <td className="px-3 sm:px-4 py-2 sm:py-3">88-96</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">68-70</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">44-46</td>
                    </tr>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">M</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">96-104</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">70-72</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">46-48</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">L</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">104-112</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">72-74</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">48-50</td>
                    </tr>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XL</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">112-120</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">74-76</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">50-52</td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold">XXL</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">120-128</td>
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
        )
      })()}

      {/* Sticky Buy Now Bar */}
      {product && (
        <StickyBuyNow
          product={product}
          selectedVariant={selectedVariant}
          quantity={quantity}
          cartImage={displayImages.find(img => img.media_type === 'image')?.url || displayImages[0]?.url || '/placeholder.png'}
          inStock={hasAnyStock}
          onVariantRequired={handleVariantRequired}
        />
      )}
    </>
  )
}
