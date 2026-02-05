'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { X, SlidersHorizontal, Search } from 'lucide-react'
import { trackPixelEvent } from '@/lib/facebook-pixel'
import RecentlyViewed from '@/components/RecentlyViewed'
import DualRangeSlider from '@/components/DualRangeSlider'
import PresaleBadge from '@/components/PresaleBadge'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { mapLocalizedProduct, mapLocalizedCategory } from '@/lib/i18n-db'
import { formatPrice } from '@/lib/format-price'
import { useRouter } from '@/i18n/routing'

interface Product {
  id: string
  name: string
  name_en?: string
  slug: string
  base_price: number
  sale_price: number | null
  category_id: string | null
  created_at: string
  category?: {
    name: string
    name_en?: string
    slug: string
  } | null
  images?: Array<{
    url: string
    alt_text: string | null
    is_primary: boolean
    media_type?: 'image' | 'video'
    color?: string | null
  }>
  variants?: Array<{
    color?: string
    color_hex?: string
    stock_quantity: number
    presale_stock_quantity: number
    presale_enabled: boolean
    presale_expected_date?: string | null
    is_available: boolean
  }>
}

interface Category {
  id: string
  name: string
  name_en?: string
  slug: string
}

// Product Card Component - for hover state management
function ProductCard({ 
  product, 
  index,
  locale,
  getProductName,
  getCategoryName,
  isInStock,
  getTotalStock,
  getPrimaryImage,
  t
}: {
  product: Product
  index: number
  locale: string
  getProductName: (p: Product) => string
  getCategoryName: (c: Category | { name: string; name_en?: string }) => string
  isInStock: (p: Product) => boolean
  getTotalStock: (p: Product) => number
  getPrimaryImage: (p: Product) => string
  t: (key: string) => string
}) {
  const router = useRouter()
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  
  const inStock = isInStock(product)
  const totalStock = getTotalStock(product)
  const hasPresale = product.variants?.some(v => 
    v.presale_enabled && v.stock_quantity === 0 && v.presale_stock_quantity > 0
  ) || false
  const presaleExpected = hasPresale 
    ? product.variants?.find(v => v.presale_enabled && v.presale_expected_date)?.presale_expected_date 
    : null
  
  const isPriority = index < 6
  
  // Get unique colors
  const uniqueColors = Array.from(
    new Set(
      product.variants
        ?.map(v => v.color)
        .filter(Boolean) as string[]
    )
  )
  
  // Get current display image (based on hover or primary)
  const currentImage = hoveredColor 
    ? product.images?.find(img => img.color === hoveredColor)?.url || getPrimaryImage(product)
    : getPrimaryImage(product)
  
  // Handle color dot click (desktop only)
  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/product/${product.slug}?color=${encodeURIComponent(color)}`)
  }
  
  return (
    <LocaleLink
      href={`/product/${product.slug}`}
      className="group block h-full"
      style={{ 
        contain: 'layout style paint',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as const,
        perspective: 1000,
        visibility: 'visible',
        opacity: 1
      }}
    >
      <div className="bg-white border-2 border-black overflow-hidden transition-all duration-300 md:hover:-translate-y-2 h-full flex flex-col">
        {/* Image - Larger on mobile */}
        <div className="relative aspect-[3/4.2] md:aspect-[3/4] bg-gray-100 overflow-hidden flex-shrink-0">
          <Image
            src={currentImage}
            alt={getProductName(product)}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center transition-opacity duration-300"
            priority={isPriority}
            loading={isPriority ? 'eager' : 'lazy'}
          />
          
          {/* Stock Badge */}
          {hasPresale && !inStock && (
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-10">
              <PresaleBadge variant="compact" />
            </div>
          )}
          {!hasPresale && !inStock && (
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-red-600 text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider z-10">
              {t('outOfStock')}
            </div>
          )}
          {inStock && totalStock < 5 && (
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-orange-500 text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider z-10">
              {t('lastItems')}
            </div>
          )}

          {/* Discount Badge */}
          {(() => {
            const hasDiscount = product.sale_price && product.sale_price < product.base_price
            if (!hasDiscount || !product.sale_price) return null
            
            const discountPercentage = Math.round(
              ((product.base_price - product.sale_price) / product.base_price) * 100
            )
            
            return (
              <div className={`absolute ${!inStock || (inStock && totalStock < 5) ? 'top-14' : 'top-2'} left-2 md:${!inStock || (inStock && totalStock < 5) ? 'top-16' : 'top-4'} md:left-4 bg-brand-primary text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider`}>
                -{discountPercentage}% {t('discount')}
              </div>
            )
          })()}

          {/* Category Badge - Hidden on mobile */}
          {product.category && (
            <div className="hidden md:block absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider border-2 border-black">
              {product.category && getCategoryName(product.category)}
            </div>
          )}

          {/* Wishlist Button - Hidden on mobile, shown on hover on desktop */}
          <button className="hidden md:flex absolute bottom-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm items-center justify-center transition-all duration-300 hover:bg-brand-primary hover:text-white border-2 border-black opacity-0 group-hover:opacity-100 active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Product Info - Smaller padding on mobile */}
        <div className="p-2 md:p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-xs md:text-lg uppercase tracking-wide mb-1 md:mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">
            {getProductName(product)}
          </h3>
          
          {/* Color Dots - MOSE Style with Desktop Hover + Click */}
          {uniqueColors.length > 1 && (
            <div className="flex items-center gap-1.5 mb-2">
              {uniqueColors.map(color => {
                const variant = product.variants?.find(v => v.color === color)
                const colorHex = variant?.color_hex || '#000000'
                
                return (
                  <div
                    key={color}
                    className="w-3 h-3 md:w-4 md:h-4 border-2 border-black md:cursor-pointer md:hover:scale-125 md:hover:border-brand-primary transition-all"
                    style={{ backgroundColor: colorHex }}
                    title={color}
                    onMouseEnter={() => setHoveredColor(color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    onClick={(e) => handleColorClick(e, color)}
                  />
                )
              })}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-auto">
            {(() => {
              const hasDiscount = product.sale_price && product.sale_price < product.base_price
              
              if (hasDiscount && product.sale_price) {
                return (
                  <div className="flex flex-col gap-1">
                    <span className="text-base md:text-2xl font-bold text-red-600">
                      {formatPrice(product.sale_price, locale)}
                    </span>
                    <span className="text-xs md:text-sm text-gray-500 line-through">
                      {formatPrice(product.base_price, locale)}
                    </span>
                  </div>
                )
              }
              
              return (
                <span className="text-base md:text-2xl font-bold text-brand-primary">
                  {formatPrice(product.base_price, locale)}
                </span>
              )
            })()}
          </div>
        </div>
      </div>
    </LocaleLink>
  )
}

export default function ShopPageClient() {
  const t = useTranslations('shop')
  const locale = useLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`
  
  // Helper to get localized names
  const getProductName = (product: Product) => 
    locale === 'en' && product.name_en ? product.name_en : product.name
  const getCategoryName = (category: Category | { name: string; name_en?: string }) => 
    locale === 'en' && category.name_en ? category.name_en : category.name
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(500)
  const [showInStockOnly, setShowInStockOnly] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const supabase = createClient()

  // Body scroll lock when drawer is open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileFiltersOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileFiltersOpen) {
        setMobileFiltersOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileFiltersOpen])

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  // Set page title based on selected category
  useEffect(() => {
    if (selectedCategory === 'all') {
      document.title = 'Shop - MOSE'
    } else {
      const category = categories.find(c => c.slug === selectedCategory)
      if (category) {
        document.title = `${getCategoryName(category)} - MOSE`
      }
    }
  }, [selectedCategory, categories])

  // Auto-select category from URL parameter (from homepage category links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const categorySlug = params.get('category')
    if (categorySlug) {
      setSelectedCategory(categorySlug)
    } else {
      // Reset to 'all' when no category parameter is present
      setSelectedCategory('all')
    }
  }, [])

  // Track search event (debounced to avoid tracking every keystroke)
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        trackPixelEvent('Search', {
          search_string: searchQuery.trim()
        })
      }, 1000) // Wait 1 second after user stops typing
      
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, name_en, slug')
      .order('name')
    
    if (data) setCategories(data)
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          name_en,
          description_en,
          category:categories(name, name_en, slug),
          images:product_images(url, alt_text, is_primary, media_type, color),
          variants:product_variants(color, color_hex, stock_quantity, presale_stock_quantity, presale_enabled, presale_expected_date, is_available)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Calculate min/max prices from products
      if (data && data.length > 0) {
        const prices = data.map(p => p.sale_price || p.base_price)
        const calculatedMin = Math.floor(Math.min(...prices) / 10) * 10
        const calculatedMax = Math.ceil(Math.max(...prices) / 10) * 10
        
        // Update products first
        setProducts(data)
        
        // Only update price range if it's different (prevent re-render)
        setMinPrice(prev => prev === calculatedMin ? prev : calculatedMin)
        setMaxPrice(prev => prev === calculatedMax ? prev : calculatedMax)
        
        // CRITICAL: Only update if currently at default [0, 500]
        // This prevents the re-render that causes layout shift
        setPriceRange(prev => {
          if (prev[0] === 0 && prev[1] === 500) {
            return [calculatedMin, calculatedMax]
          }
          return prev
        })
      } else {
        setProducts(data || [])
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered and sorted products to prevent re-sorts
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.slug === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by price range
    const isPriceFiltered = priceRange[0] !== minPrice || priceRange[1] !== maxPrice
    if (isPriceFiltered) {
      filtered = filtered.filter(p => {
        const price = p.sale_price || p.base_price
        return price >= priceRange[0] && price <= priceRange[1]
      })
    }

    // Filter by stock availability
    if (showInStockOnly) {
      filtered = filtered.filter(p => {
        const totalStock = p.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0
        return totalStock > 0
      })
    }

    // Sort - STABLE SORT with fallback to ID
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => {
          const priceDiff = a.base_price - b.base_price
          return priceDiff !== 0 ? priceDiff : a.id.localeCompare(b.id)
        })
        break
      case 'price-desc':
        filtered.sort((a, b) => {
          const priceDiff = b.base_price - a.base_price
          return priceDiff !== 0 ? priceDiff : a.id.localeCompare(b.id)
        })
        break
      case 'name':
        filtered.sort((a, b) => {
          const nameDiff = a.name.localeCompare(b.name)
          return nameDiff !== 0 ? nameDiff : a.id.localeCompare(b.id)
        })
        break
      case 'newest':
      default:
        filtered.sort((a, b) => {
          const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id)
        })
    }

    return filtered
  }, [products, selectedCategory, searchQuery, priceRange, minPrice, maxPrice, showInStockOnly, sortBy])

  // 🔍 DEEP DEBUG: Track what causes layout shifts
  useEffect(() => {
    console.log('🚨 [SHIFT DEBUG] ========== MOUNT ==========')
    
    // Track layout shifts with FULL details
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            const sources = (entry as any).sources || []
            console.log('🚨 [SHIFT DEBUG] LAYOUT SHIFT!', {
              value: (entry as any).value,
              time: entry.startTime,
              sourceCount: sources.length,
              sources: sources.map((s: any) => ({
                className: s.node?.className,
                tagName: s.node?.tagName,
                id: s.node?.id,
                textContent: s.node?.textContent?.substring(0, 50),
                previousRect: {
                  x: s.previousRect?.x,
                  y: s.previousRect?.y,
                  width: s.previousRect?.width,
                  height: s.previousRect?.height
                },
                currentRect: {
                  x: s.currentRect?.x,
                  y: s.currentRect?.y,
                  width: s.currentRect?.width,
                  height: s.currentRect?.height
                },
                movement: {
                  deltaX: (s.currentRect?.x || 0) - (s.previousRect?.x || 0),
                  deltaY: (s.currentRect?.y || 0) - (s.previousRect?.y || 0),
                  deltaHeight: (s.currentRect?.height || 0) - (s.previousRect?.height || 0)
                }
              }))
            })
          }
        }
      })
      observer.observe({ entryTypes: ['layout-shift'] })
      
      return () => observer.disconnect()
    }
  }, [])

  // Track state changes
  useEffect(() => {
    console.log('📦 [SHIFT DEBUG] Products state:', {
      count: products.length,
      loading,
      timestamp: performance.now()
    })
  }, [products, loading])

  useEffect(() => {
    console.log('🔍 [SHIFT DEBUG] FilteredProducts changed:', {
      count: filteredProducts.length,
      timestamp: performance.now()
    })
  }, [filteredProducts])

  useEffect(() => {
    console.log('🎯 [SHIFT DEBUG] Selected category changed:', selectedCategory)
  }, [selectedCategory])

  useEffect(() => {
    console.log('💰 [SHIFT DEBUG] Price range changed:', priceRange)
  }, [priceRange])

  // Track when images load
  useEffect(() => {
    if (!loading && filteredProducts.length > 0) {
      console.log('📸 [SHIFT DEBUG] Products rendered, waiting for images...')
      
      const images = document.querySelectorAll('img[src*="supabase"]')
      console.log(`📸 [SHIFT DEBUG] Found ${images.length} product images`)
      
      let loadedCount = 0
      images.forEach((img, index) => {
        if ((img as HTMLImageElement).complete) {
          loadedCount++
        } else {
          img.addEventListener('load', () => {
            loadedCount++
            console.log(`📸 [SHIFT DEBUG] Image ${loadedCount}/${images.length} loaded at ${performance.now()}ms`)
          }, { once: true })
        }
      })
      
      console.log(`📸 [SHIFT DEBUG] ${loadedCount}/${images.length} images already loaded`)
    }
  }, [loading, filteredProducts.length])

  const getTotalStock = (product: Product) => {
    return product.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0
  }

  const isInStock = (product: Product) => {
    return getTotalStock(product) > 0
  }

  const getPrimaryImage = (product: Product) => {
    // Eerst proberen primary te vinden (image OF video)
    const primaryMedia = product.images?.find(img => img.is_primary)
    
    // Als primary een video is, gebruik de eerste image als fallback voor thumbnail
    if (primaryMedia?.url) {
      // Als het een video is, zoek eerste image als thumbnail
      if (primaryMedia.media_type === 'video') {
        const firstImage = product.images?.find(img => img.media_type === 'image')
        return firstImage?.url || primaryMedia.url  // Fallback to video URL if no images
      }
      return primaryMedia.url
    }
    
    // Geen primary? Probeer fallback logic:
    // 1. Eerst algemene afbeelding (color = null, image type)
    const generalImage = product.images?.find(img => 
      img.media_type === 'image' && (img.color === null || img.color === undefined)
    )
    if (generalImage?.url) return generalImage.url
    
    // 2. Anders eerste afbeelding van eerste variant (color !== null, image type)
    const variantImage = product.images?.find(img => 
      img.media_type === 'image' && img.color
    )
    if (variantImage?.url) return variantImage.url
    
    // 3. Ultieme fallback: eerste media item (ook video) of placeholder
    return product.images?.[0]?.url || '/placeholder-product.png'
  }

  const handleApplyFilters = () => {
    setMobileFiltersOpen(false)
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetFilters = () => {
    setSelectedCategory('all')
    setSearchQuery('')
    setPriceRange([minPrice, maxPrice])
    setShowInStockOnly(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Minimal Banner with Image */}
      <section className="relative h-48 md:h-80 overflow-hidden border-b-4 border-brand-primary">
        {/* Background Image */}
        <Image
          src="/hero_mose.png"
          alt="MOSE Shop"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
        {/* Text */}
        <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="font-display text-7xl md:text-9xl tracking-tight">SHOP</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Mobile Filter Button - Inline (bold & brutalist) */}
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden w-full mb-6 bg-black text-white font-bold py-4 px-6 border-2 border-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors relative z-20 cursor-pointer"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>{t('filters.title')} & {t('sort.title')}</span>
          {(selectedCategory !== 'all' || searchQuery || (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) || showInStockOnly) && (
            <span className="bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded-sm">
              {(selectedCategory !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0) + ((priceRange[0] !== minPrice || priceRange[1] !== maxPrice) ? 1 : 0) + (showInStockOnly ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/80 z-40 transition-opacity"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <div className="lg:hidden fixed top-20 bottom-0 right-0 w-[90%] max-w-sm bg-white z-50 border-l-4 border-black flex flex-col animate-slideInRight">
              {/* Header - Fixed */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-black bg-white">
                <h2 className="font-display text-xl uppercase tracking-wide">{t('filters.title')} & {t('sort.title')}</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-gray-100 transition-colors rounded-sm border-2 border-transparent hover:border-gray-300"
                  aria-label={t('filters.close')}
                >
                  <X className="w-7 h-7" strokeWidth={2.5} />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {t('filters.search')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('filters.searchPlaceholder')}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    />
                    <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Stock Filter */}
                <div>
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-300 cursor-pointer transition-all hover:border-gray-400 active:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={showInStockOnly}
                      onChange={(e) => setShowInStockOnly(e.target.checked)}
                      className="w-5 h-5 border-2 border-gray-400 rounded text-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                    />
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {t('filters.inStockOnly')}
                    </span>
                  </label>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {t('filters.category')}
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`w-full text-left px-4 py-3 border-2 transition-all font-semibold uppercase tracking-wide text-sm ${
                        selectedCategory === 'all'
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-50'
                      }`}
                    >
                      {t('filters.allProducts')} ({products.length})
                    </button>
                    {categories.map(category => {
                      const count = products.filter(p => p.category?.slug === category.slug).length
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.slug)}
                          className={`w-full text-left px-4 py-3 border-2 transition-all font-semibold uppercase tracking-wide text-sm ${
                            selectedCategory === category.slug
                              ? 'bg-brand-primary border-brand-primary text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-50'
                          }`}
                        >
                          {getCategoryName(category)} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {t('filters.price')}
                  </h3>
                  <DualRangeSlider
                    min={minPrice}
                    max={maxPrice}
                    value={priceRange}
                    onChange={setPriceRange}
                    step={5}
                  />
                </div>

                {/* Sort */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    {t('sort.title')}
                  </h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
                  >
                    <option value="newest">{t('sort.newest')}</option>
                    <option value="price-asc">{t('sort.priceAsc')}</option>
                    <option value="price-desc">{t('sort.priceDesc')}</option>
                    <option value="name">{t('sort.name')}</option>
                  </select>
                </div>

                {/* Active Filters Summary */}
                {(selectedCategory !== 'all' || searchQuery || (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) || showInStockOnly) && (
                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        {t('filters.active')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedCategory !== 'all' && (
                        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-l-2 border-brand-primary">
                          <span className="text-sm font-semibold">
                            {categories.find(c => c.slug === selectedCategory)?.name}
                          </span>
                          <button
                            onClick={() => setSelectedCategory('all')}
                            className="text-gray-600 hover:text-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {searchQuery && (
                        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-l-2 border-brand-primary">
                          <span className="text-sm font-semibold">"{searchQuery}"</span>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-gray-600 hover:text-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {(priceRange[0] !== minPrice || priceRange[1] !== maxPrice) && (
                        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-l-2 border-brand-primary">
                          <span className="text-sm font-semibold">
                            €{priceRange[0]} - €{priceRange[1]}
                          </span>
                          <button
                            onClick={() => setPriceRange([minPrice, maxPrice])}
                            className="text-gray-600 hover:text-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {showInStockOnly && (
                        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-l-2 border-brand-primary">
                          <span className="text-sm font-semibold">{t('filters.inStockOnly')}</span>
                          <button
                            onClick={() => setShowInStockOnly(false)}
                            className="text-gray-600 hover:text-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Fixed */}
              <div className="flex-shrink-0 border-t-2 border-black bg-white p-6">
                <div className="flex gap-3">
                  <button
                    onClick={handleResetFilters}
                    className="flex-1 py-3 bg-white text-black border-2 border-black font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  >
                    {t('filters.clear')}
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 py-3 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wider hover:bg-gray-900 transition-colors"
                  >
                    {t('filters.show', { count: filteredProducts.length })}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar - Filters (hidden on mobile) */}
          <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Search */}
              <div>
                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  {t('filters.search')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('filters.searchPlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Stock Filter */}
              <div>
                <label className="flex items-center gap-3 p-3 border-2 border-gray-300 cursor-pointer transition-all hover:border-gray-400 active:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="w-4 h-4 border-2 border-gray-400 rounded text-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                  />
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    {t('filters.inStockOnly')}
                  </span>
                </label>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  {t('filters.category')}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-4 py-2 border-2 transition-all font-semibold uppercase tracking-wide text-sm ${
                      selectedCategory === 'all'
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-50'
                    }`}
                  >
                    {t('filters.allProducts')} ({products.length})
                  </button>
                  {categories.map(category => {
                    const count = products.filter(p => p.category?.slug === category.slug).length
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.slug)}
                        className={`w-full text-left px-4 py-2 border-2 transition-all font-semibold uppercase tracking-wide text-sm ${
                          selectedCategory === category.slug
                            ? 'bg-brand-primary border-brand-primary text-white'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-50'
                        }`}
                      >
                        {category.name} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  {t('filters.price')}
                </h3>
                <DualRangeSlider
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange}
                  onChange={setPriceRange}
                  step={5}
                />
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  {t('sort.title')}
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
                >
                  <option value="newest">{t('sort.newest')}</option>
                  <option value="price-asc">{t('sort.priceAsc')}</option>
                  <option value="price-desc">{t('sort.priceDesc')}</option>
                  <option value="name">{t('sort.name')}</option>
                </select>
              </div>

              {/* Active Filters Summary */}
              {(selectedCategory !== 'all' || searchQuery || (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) || showInStockOnly) && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {t('filters.active')}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCategory('all')
                        setSearchQuery('')
                        setPriceRange([minPrice, maxPrice])
                        setShowInStockOnly(false)
                      }}
                      className="text-xs text-brand-primary hover:text-brand-primary-hover font-bold uppercase"
                    >
                      {t('filters.clear')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedCategory !== 'all' && (
                      <div className="flex items-center justify-between bg-gray-100 px-3 py-2">
                        <span className="text-sm font-semibold">
                          {categories.find(c => c.slug === selectedCategory)?.name}
                        </span>
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className="text-gray-600 hover:text-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {searchQuery && (
                      <div className="flex items-center justify-between bg-gray-100 px-3 py-2">
                        <span className="text-sm font-semibold">"{searchQuery}"</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-gray-600 hover:text-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {(priceRange[0] !== minPrice || priceRange[1] !== maxPrice) && (
                      <div className="flex items-center justify-between bg-gray-100 px-3 py-2">
                        <span className="text-sm font-semibold">
                          €{priceRange[0]} - €{priceRange[1]}
                        </span>
                        <button
                          onClick={() => setPriceRange([minPrice, maxPrice])}
                          className="text-gray-600 hover:text-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {showInStockOnly && (
                      <div className="flex items-center justify-between bg-gray-100 px-3 py-2">
                        <span className="text-sm font-semibold">{t('filters.inStockOnly')}</span>
                        <button
                          onClick={() => setShowInStockOnly(false)}
                          className="text-gray-600 hover:text-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content - Products Grid */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b-2 border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2 sm:mb-0">
                {t('results', { count: filteredProducts.length })}
                {selectedCategory !== 'all' && (
                  <span className="text-brand-primary ml-2">
                    {t('inCategory', { category: categories.find(c => c.slug === selectedCategory)?.name || '' })}
                  </span>
                )}
              </h2>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-100 aspect-[3/4] animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-2xl font-display font-bold mb-2 text-gray-800">
                  {t('noResults')}
                </h3>
                <p className="text-gray-600 mb-8">
                  {t('noResultsDesc')}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setSearchQuery('')
                  }}
                  className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors"
                >
                  {t('filters.clear')}
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && filteredProducts.length > 0 && (
              <div 
                className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" 
                style={{ 
                  contain: 'layout style paint',
                  contentVisibility: 'auto'
                }}
              >
                {filteredProducts.map((product, index) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    index={index}
                    locale={locale}
                    getProductName={getProductName}
                    getCategoryName={getCategoryName}
                    isInStock={isInStock}
                    getTotalStock={getTotalStock}
                    getPrimaryImage={getPrimaryImage}
                    t={t}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* Recently Viewed Products - Reserve space to prevent layout shift */}
        <div style={{ minHeight: '300px' }}>
          <RecentlyViewed />
        </div>
      </div>
    </div>
  )
}
