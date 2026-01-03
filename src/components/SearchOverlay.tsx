'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Search as SearchIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  name: string
  slug: string
  base_price: number
  product_images: Array<{ url: string }>
  category?: { name: string }
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Disable body scroll when open
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

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Live search (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            base_price,
            product_images (url),
            categories (name)
          `)
          .ilike('name', `%${query}%`)
          .limit(8)

        if (!error && data) {
          // Transform the data to match SearchResult type
          const transformedData = data.map((item: any) => ({
            ...item,
            category: Array.isArray(item.categories) && item.categories.length > 0
              ? item.categories[0]
              : undefined
          }))
          setResults(transformedData)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, supabase])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 md:pt-32 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Container */}
      <div className="relative w-full max-w-4xl mx-4 bg-white border-4 border-black shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header with Input */}
        <div className="p-6 md:p-8 border-b-4 border-black">
          <div className="flex items-center gap-4">
            <SearchIcon className="w-8 h-8 flex-shrink-0" strokeWidth={2.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek producten..."
              className="flex-1 text-2xl md:text-3xl font-bold placeholder:text-gray-400 focus:outline-none bg-transparent"
            />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 transition-colors"
              aria-label="Sluiten"
            >
              <X className="w-8 h-8" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                Geen resultaten voor "{query}"
              </h3>
              <p className="text-gray-600">
                Probeer een andere zoekterm
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-all group"
                >
                  {/* Image */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 border-2 border-black">
                    <Image
                      src={product.product_images[0]?.url || '/placeholder.png'}
                      alt={product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold group-hover:text-brand-primary transition-colors truncate">
                      {product.name}
                    </h4>
                    {product.category && (
                      <p className="text-sm text-gray-600">
                        {product.category.name}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-brand-primary">
                      €{product.base_price.toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && !query && (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                Zoek MOSE Producten
              </h3>
              <p className="text-gray-600">
                Type om te beginnen met zoeken
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t-2 border-gray-200 px-6 md:px-8 py-3 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
          <span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">ESC</kbd>
            {' '}om te sluiten
          </span>
          {results.length > 0 && (
            <span className="text-gray-500">
              {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

