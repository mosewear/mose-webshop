'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { X, SlidersHorizontal, Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  base_price: number
  sale_price: number | null
  category_id: string | null
  created_at: string
  category?: {
    name: string
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
    stock_quantity: number
    is_available: boolean
  }>
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [searchQuery, setSearchQuery] = useState('')
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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
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
          category:categories(name, slug),
          images:product_images(url, alt_text, is_primary, media_type, color),
          variants:product_variants(stock_quantity, is_available)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAndSortedProducts = () => {
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

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.base_price - b.base_price)
        break
      case 'price-desc':
        filtered.sort((a, b) => b.base_price - a.base_price)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered
  }

  const filteredProducts = getFilteredAndSortedProducts()

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
          <span>Filters & Sorteren</span>
          {(selectedCategory !== 'all' || searchQuery) && (
            <span className="bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded-sm">
              {(selectedCategory !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0)}
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
                <h2 className="font-display text-xl uppercase tracking-wide">Filters & Sorteren</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-gray-100 transition-colors rounded-sm border-2 border-transparent hover:border-gray-300"
                  aria-label="Sluit filters"
                >
                  <X className="w-7 h-7" strokeWidth={2.5} />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Zoeken
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Zoek producten..."
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    />
                    <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Categorieën
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
                      Alle Producten ({products.length})
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
                          {category.name} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Sorteren
                  </h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
                  >
                    <option value="newest">Nieuwste</option>
                    <option value="price-asc">Prijs: Laag - Hoog</option>
                    <option value="price-desc">Prijs: Hoog - Laag</option>
                    <option value="name">Naam: A - Z</option>
                  </select>
                </div>

                {/* Active Filters Summary */}
                {(selectedCategory !== 'all' || searchQuery) && (
                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Actieve Filters
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
                    Wis alles
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 py-3 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wider hover:bg-gray-900 transition-colors"
                  >
                    Toon {filteredProducts.length}
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
                  Zoeken
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Zoek producten..."
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  Categorieën
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
                    Alle Producten ({products.length})
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

              {/* Sort */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  Sorteren
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
                >
                  <option value="newest">Nieuwste</option>
                  <option value="price-asc">Prijs: Laag - Hoog</option>
                  <option value="price-desc">Prijs: Hoog - Laag</option>
                  <option value="name">Naam: A - Z</option>
                </select>
              </div>

              {/* Active Filters Summary */}
              {(selectedCategory !== 'all' || searchQuery) && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Actieve Filters
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCategory('all')
                        setSearchQuery('')
                      }}
                      className="text-xs text-brand-primary hover:text-brand-primary-hover font-bold uppercase"
                    >
                      Wis Alles
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
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Producten'}
                {selectedCategory !== 'all' && (
                  <span className="text-brand-primary ml-2">
                    in {categories.find(c => c.slug === selectedCategory)?.name}
                  </span>
                )}
              </h2>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
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
                  GEEN PRODUCTEN GEVONDEN
                </h3>
                <p className="text-gray-600 mb-8">
                  Probeer andere filters of zoektermen
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setSearchQuery('')
                  }}
                  className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredProducts.map(product => {
                  const inStock = isInStock(product)
                  const totalStock = getTotalStock(product)
                  
                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      className="group block"
                    >
                      <div className="bg-white border-2 border-black overflow-hidden transition-all duration-300 md:hover:shadow-2xl md:hover:-translate-y-2">
                        {/* Image - Larger on mobile */}
                        <div className="relative aspect-[3/4.2] md:aspect-[3/4] bg-gray-100 overflow-hidden">
                          <Image
                            src={getPrimaryImage(product)}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                          />
                          
                          {/* Stock Badge */}
                          {!inStock && (
                            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-red-600 text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                              UITVERKOCHT
                            </div>
                          )}
                          {inStock && totalStock < 5 && (
                            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-orange-500 text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                              LAATSTE ITEMS
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
                              <div className={`absolute ${!inStock || (inStock && totalStock < 5) ? 'top-14' : 'top-2'} left-2 md:${!inStock || (inStock && totalStock < 5) ? 'top-16' : 'top-4'} md:left-4 bg-green-600 text-white px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider`}>
                                -{discountPercentage}% KORTING
                              </div>
                            )
                          })()}

                          {/* Category Badge - Hidden on mobile */}
                          {product.category && (
                            <div className="hidden md:block absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider border-2 border-black">
                              {product.category.name}
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
                        <div className="p-2 md:p-4">
                          <h3 className="font-bold text-xs md:text-lg uppercase tracking-wide mb-1 md:mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            {(() => {
                              const hasDiscount = product.sale_price && product.sale_price < product.base_price
                              
                              if (hasDiscount && product.sale_price) {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-base md:text-2xl font-bold text-red-600">
                                      €{product.sale_price.toFixed(2)}
                                    </span>
                                    <span className="text-xs md:text-sm text-gray-500 line-through">
                                      €{product.base_price.toFixed(2)}
                                    </span>
                                  </div>
                                )
                              }
                              
                              return (
                                <span className="text-base md:text-2xl font-bold text-brand-primary">
                                  €{product.base_price.toFixed(2)}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
