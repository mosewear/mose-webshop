'use client'

import { useEffect, useState } from 'react'
import { useWishlist } from '@/store/wishlist'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/store/cart'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  description: string
}

export default function WishlistPage() {
  const { items, loadWishlist, removeFromWishlist, isLoading } = useWishlist()
  const { addItem } = useCart()
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
      .select('*')
      .in('id', productIds)

    if (error) {
      console.error('Error fetching wishlist products:', error)
    } else {
      setProducts(data || [])
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
      .gt('stock', 0)
      .limit(1)

    if (!variants || variants.length === 0) {
      toast.error('Dit product is helaas uitverkocht')
      return
    }

    const variant = variants[0]

    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      price: product.price,
      size: variant.size,
      color: variant.color,
      colorHex: variant.color_hex || '#000000',
      image: product.images[0] || '/placeholder.png',
      quantity: 1,
      stock: variant.stock,
      sku: variant.sku,
    })

    toast.success('Toegevoegd aan winkelwagen!')
  }

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Mijn wishlist</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-primary"></div>
            <p className="mt-4 text-gray-600">Wishlist laden...</p>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Mijn wishlist</h1>
          
          <div className="bg-gray-100 border-2 border-gray-200 p-12 text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h2 className="text-2xl font-bold mb-4">Je wishlist is leeg</h2>
            <p className="text-gray-600 mb-8">
              Ontdek onze collectie en voeg je favoriete items toe aan je wishlist
            </p>
            <Link
              href="/shop"
              className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors"
            >
              Shop nu
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Mijn wishlist</h1>
          <span className="text-gray-600">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white border-2 border-gray-200 hover:border-brand-primary transition-all group">
              <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Geen afbeelding</span>
                  </div>
                )}
              </Link>

              <div className="p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="font-bold text-lg mb-2 hover:text-brand-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold">€{product.price.toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-4 uppercase text-sm tracking-wider transition-colors"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 font-bold py-3 px-4 transition-colors"
                    title="Verwijderen uit wishlist"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

