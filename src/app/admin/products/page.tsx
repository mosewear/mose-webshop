'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  sku?: string
  base_price: number
  sale_price: number | null
  category_id: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
  category?: {
    name: string
  }
  product_images?: Array<{
    url: string
    is_primary?: boolean
  }>
  product_variants?: Array<{
    stock_quantity: number
  }>
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const PAGE_SIZE = 25
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProducts()
  }, [page])

  const fetchProducts = async () => {
    try {
      setLoading(true)

      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      setTotalCount(count || 0)

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          product_images(url, is_primary)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

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
      toast.success('Product verwijderd')
      fetchProducts()
    } catch (err: any) {
      toast.error(`Fout bij verwijderen: ${err.message}`)
    }
  }

  const handleDuplicate = async (productId: string) => {
    setDuplicating(productId)
    try {
      const res = await fetch('/api/admin/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dupliceren mislukt')
      toast.success('Product gedupliceerd!')
      router.push(`/admin/products/${data.id}/edit`)
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
    } finally {
      setDuplicating(null)
    }
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleBulkAction = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecteer eerst producten')
      return
    }
    if (!bulkAction) {
      toast.error('Selecteer eerst een actie')
      return
    }
    setShowBulkConfirm(true)
  }

  const executeBulkAction = async () => {
    setShowBulkConfirm(false)
    try {
      setBulkUpdating(true)
      const isActive = bulkAction === 'activate'
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .in('id', selectedProducts)

      if (error) throw error
      toast.success(`${selectedProducts.length} product(en) ${isActive ? 'geactiveerd' : 'gedeactiveerd'}`)
      setSelectedProducts([])
      setBulkAction('')
      fetchProducts()
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(stock_quantity), categories:category_id(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('Geen producten om te exporteren')
        return
      }

      const headers = ['Product', 'SKU', 'Prijs', 'Sale Prijs', 'Categorie', 'Voorraad', 'Status']
      const csvRows = [
        headers.join(','),
        ...data.map(p => {
          const cat = (p.categories as any)?.name || ''
          const totalStock = (p.product_variants as any[])?.reduce(
            (sum: number, v: any) => sum + (v.stock_quantity || 0), 0
          ) ?? 0
          return [
            p.name,
            p.sku || '',
            `€${Number(p.base_price).toFixed(2)}`,
            p.sale_price ? `€${Number(p.sale_price).toFixed(2)}` : '',
            cat,
            totalStock.toString(),
            p.is_active ? 'Actief' : 'Inactief',
          ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        }),
      ]

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `producten-export-${new Date().toISOString().split('T')[0]}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Export gedownload')
    } catch (err: any) {
      toast.error(`Export mislukt: ${err.message}`)
    } finally {
      setExporting(false)
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
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Producten</h1>
          <p className="text-gray-600">Beheer alle producten in je webshop</p>
        </div>
        <div className="grid grid-cols-2 md:flex md:w-auto gap-2 w-full">
          <Link
            href="/admin/products/create"
            className="w-full md:w-auto text-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors"
          >
            + Nieuw Product
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full md:w-auto bg-black hover:bg-gray-800 text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {exporting ? 'Bezig...' : 'Exporteren'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-brand-primary mb-1 sm:mb-2">{products.length}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Totaal Producten</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
            {products.filter(p => p.category_id).length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Met Categorie</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
            {products.filter(p => p.sale_price && p.sale_price < p.base_price).length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Met Korting</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">
            €{products.reduce((sum, p) => sum + Number(p.sale_price || p.base_price), 0).toFixed(2)}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Totale Waarde</div>
        </div>
      </div>

      {/* Bulk Confirmation */}
      {showBulkConfirm && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <span className="font-bold text-yellow-800">
            Weet je zeker dat je {selectedProducts.length} product(en) wilt {bulkAction === 'activate' ? 'activeren' : 'deactiveren'}?
          </span>
          <div className="flex gap-2">
            <button
              onClick={executeBulkAction}
              disabled={bulkUpdating}
              className="bg-black text-white font-bold py-2 px-6 uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {bulkUpdating ? 'Bijwerken...' : 'Bevestigen'}
            </button>
            <button
              onClick={() => setShowBulkConfirm(false)}
              className="border-2 border-gray-300 text-gray-700 font-bold py-2 px-6 uppercase tracking-wider text-sm hover:border-gray-400 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

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
          <>
          {/* Bulk Actions Bar */}
          {selectedProducts.length > 0 && (
            <div className="bg-brand-primary text-white p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <span className="font-bold">{selectedProducts.length} product(en) geselecteerd</span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="w-full md:w-auto px-4 py-2 bg-white text-gray-800 border-2 border-white font-bold"
              >
                <option value="">Kies actie...</option>
                <option value="activate">Activeren</option>
                <option value="deactivate">Deactiveren</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkUpdating}
                className="w-full md:w-auto bg-white text-brand-primary font-bold py-2 px-6 uppercase tracking-wider hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {bulkUpdating ? 'Bijwerken...' : 'Toepassen'}
              </button>
              <button
                onClick={() => setSelectedProducts([])}
                className="md:ml-auto text-white hover:text-gray-200 text-left md:text-right"
              >
                Deselecteren
              </button>
            </div>
          )}

          <div className="md:hidden space-y-3 p-3">
            {products.map((product) => {
              const hasDiscount = product.sale_price && product.sale_price < product.base_price
              const discountPercentage = hasDiscount && product.sale_price
                ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
                : 0

              return (
                <div key={product.id} className="border-2 border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-5 h-5 mt-1 flex-shrink-0"
                    />
                    <div className="flex-shrink-0 h-14 w-14 bg-gray-100 border border-gray-200 overflow-hidden">
                      {(() => {
                        const primaryImage = product.product_images?.find(img => img.is_primary)
                        const imageUrl = primaryImage?.url || product.product_images?.[0]?.url

                        if (imageUrl) {
                          return (
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              width={56}
                              height={56}
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
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate">{product.slug}</div>
                      <div className="mt-2">
                        {product.category ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Geen categorie
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      {hasDiscount && product.sale_price ? (
                        <>
                          <div className="text-sm font-bold text-red-600">
                            €{Number(product.sale_price).toFixed(2)}
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-bold bg-red-600 text-white">
                              -{discountPercentage}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 line-through">€{Number(product.base_price).toFixed(2)}</div>
                        </>
                      ) : (
                        <div className="text-sm font-bold text-gray-900">€{Number(product.base_price).toFixed(2)}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="flex-1 text-center text-brand-primary border-2 border-brand-primary py-2 text-sm font-semibold"
                    >
                      Bewerken
                    </Link>
                    <button
                      onClick={() => handleDuplicate(product.id)}
                      disabled={duplicating === product.id}
                      className="flex-1 text-center text-gray-700 border-2 border-gray-300 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {duplicating === product.id ? '...' : 'Dupliceer'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="flex-1 text-center text-red-600 border-2 border-red-600 py-2 text-sm font-semibold"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <caption className="sr-only">Overzicht van producten</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedProducts.length === products.length}
                      onChange={handleSelectAll}
                      className="w-5 h-5"
                    />
                  </th>
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
                    Status
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
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="w-5 h-5"
                      />
                    </td>
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
                        const discountPercentage = hasDiscount && product.sale_price
                          ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100) 
                          : 0

                        if (hasDiscount && product.sale_price) {
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold border inline-block ${
                        product.is_active !== false
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {product.is_active !== false ? 'Actief' : 'Inactief'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                        >
                          Bewerken
                        </Link>
                        <button
                          onClick={() => handleDuplicate(product.id)}
                          disabled={duplicating === product.id}
                          className="text-gray-600 hover:text-gray-900 font-semibold disabled:opacity-50"
                        >
                          {duplicating === product.id ? '...' : 'Dupliceer'}
                        </button>
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
          </>
        )}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Pagina {page} van {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Vorige
              </button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



