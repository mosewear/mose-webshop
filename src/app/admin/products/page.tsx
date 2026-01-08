'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  base_price: number
  sale_price: number | null
  category_id: string | null
  created_at: string
  updated_at: string
  category?: {
    name: string
  }
  product_images?: Array<{
    url: string
    is_primary?: boolean
  }>
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          product_images(url, is_primary)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Refresh lijst
      fetchProducts()
    } catch (err: any) {
      alert(`Fout bij verwijderen: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Producten</h1>
          <p className="text-gray-600">Beheer alle producten in je webshop</p>
        </div>
        <Link
          href="/admin/products/create"
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
        >
          + Nieuw Product
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-brand-primary mb-2">{products.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Producten</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {products.filter(p => p.category_id).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Met Categorie</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {products.filter(p => p.sale_price && p.sale_price < p.base_price).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Met Korting</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-gray-800 mb-2">
            €{products.reduce((sum, p) => sum + Number(p.sale_price || p.base_price), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totale Waarde</div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border-2 border-gray-200 overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen producten</h3>
            <p className="text-gray-500 mb-6">Begin met het toevoegen van je eerste product!</p>
            <Link
              href="/admin/products/create"
              className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
            >
              + Nieuw Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prijs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aangemaakt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 bg-gray-100 border border-gray-200 overflow-hidden">
                          {(() => {
                            const primaryImage = product.product_images?.find(img => img.is_primary)
                            const imageUrl = primaryImage?.url || product.product_images?.[0]?.url
                            
                            if (imageUrl) {
                              return (
                                <Image
                                  src={imageUrl}
                                  alt={product.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              )
                            }
                            
                            return (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )
                          })()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.category ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Geen categorie
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const hasDiscount = product.sale_price && product.sale_price < product.base_price
                        const discountPercentage = hasDiscount 
                          ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) 
                          : 0

                        if (hasDiscount) {
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-red-600">
                                  €{Number(product.sale_price).toFixed(2)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-red-600 text-white">
                                  -{discountPercentage}%
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 line-through">
                                €{Number(product.base_price).toFixed(2)}
                              </span>
                            </div>
                          )
                        }

                        return (
                          <div className="text-sm font-bold text-gray-900">
                            €{Number(product.base_price).toFixed(2)}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                        >
                          Bewerken
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="text-red-600 hover:text-red-900 font-semibold"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}



