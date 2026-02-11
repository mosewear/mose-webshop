'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface VariantWithProduct {
  id: string
  product_id: string
  size: string
  color: string
  color_hex: string | null
  sku: string | null
  stock_quantity: number
  presale_enabled: boolean
  presale_stock_quantity: number | null
  price_adjustment: number
  is_available: boolean
  product: {
    id: string
    name: string
    base_price: number
  }
}

interface ProductWithoutVariants {
  id: string
  name: string
  base_price: number
  created_at: string
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [productsWithoutVariants, setProductsWithoutVariants] = useState<ProductWithoutVariants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    fetchInventory()
    fetchProductsWithoutVariants()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          product:products(id, name, base_price)
        `)
        .order('stock_quantity', { ascending: true })

      if (error) throw error
      setVariants(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductsWithoutVariants = async () => {
    try {
      // Get all products
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, base_price, created_at')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Get product IDs that have variants
      const { data: variantProductIds, error: variantsError } = await supabase
        .from('product_variants')
        .select('product_id')

      if (variantsError) throw variantsError

      // Filter products without variants
      const productIdsWithVariants = new Set(variantProductIds?.map(v => v.product_id) || [])
      const withoutVariants = (allProducts || []).filter(p => !productIdsWithVariants.has(p.id))
      
      setProductsWithoutVariants(withoutVariants)
    } catch (err: any) {
      console.error('Error fetching products without variants:', err)
    }
  }

  const handleUpdateStock = async (variantId: string, newStock: number, isPresale: boolean = false) => {
    try {
      const updateField = isPresale ? 'presale_stock_quantity' : 'stock_quantity'
      const { error } = await supabase
        .from('product_variants')
        .update({ [updateField]: newStock })
        .eq('id', variantId)

      if (error) throw error

      // Log inventory mutation
      const oldStock = isPresale 
        ? (variants.find(v => v.id === variantId)?.presale_stock_quantity || 0)
        : (variants.find(v => v.id === variantId)?.stock_quantity || 0)

      await supabase.from('inventory_logs').insert([
        {
          variant_id: variantId,
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          change_amount: newStock - oldStock,
          new_stock_quantity: newStock,
          reason: 'manual_update',
          notes: `Updated ${isPresale ? 'presale' : 'regular'} stock via admin panel`,
        },
      ])

      fetchInventory()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleTogglePresale = async (variantId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ presale_enabled: enabled })
        .eq('id', variantId)

      if (error) throw error
      fetchInventory()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const getFilteredVariants = () => {
    switch (filter) {
      case 'low':
        return variants.filter(v => v.stock_quantity > 0 && v.stock_quantity < 5)
      case 'out':
        return variants.filter(v => v.stock_quantity === 0)
      case 'available':
        return variants.filter(v => v.stock_quantity >= 5)
      default:
        return variants
    }
  }

  const filteredVariants = getFilteredVariants()

  const getTotalStock = () => variants.reduce((sum, v) => sum + v.stock_quantity, 0)
  const getTotalPresaleStock = () => variants.reduce((sum, v) => sum + (v.presale_stock_quantity || 0), 0)
  const getLowStockCount = () => variants.filter(v => v.stock_quantity > 0 && v.stock_quantity < 5).length
  const getOutOfStockCount = () => variants.filter(v => v.stock_quantity === 0).length
  const getPresaleCount = () => variants.filter(v => v.presale_enabled).length

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Voorraad Beheer</h1>
          <p className="text-gray-600 text-sm md:text-base">Overzicht van alle product varianten en stock levels</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{getTotalStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totale Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-purple-200 bg-purple-50">
          <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-2">{getTotalPresaleStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Presale Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
            {variants.filter(v => v.stock_quantity >= 5).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Op Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-orange-200 bg-orange-50">
          <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-2">{getLowStockCount()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Lage Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-red-200 bg-red-50">
          <div className="text-2xl md:text-3xl font-bold text-red-600 mb-2">{getOutOfStockCount()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Uitverkocht</div>
        </div>
      </div>

      {/* Products Without Variants Warning */}
      {productsWithoutVariants.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-2">
                {productsWithoutVariants.length} product{productsWithoutVariants.length !== 1 ? 'en' : ''} zonder varianten
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Deze producten hebben nog geen maat/kleur varianten. Voeg varianten toe om ze verkoopbaar te maken.
              </p>
              <div className="space-y-2">
                {productsWithoutVariants.map((product) => (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-yellow-300">
                    <div>
                      <span className="font-semibold text-gray-900">{product.name}</span>
                      <span className="ml-2 text-sm text-gray-500">€{product.base_price.toFixed(2)}</span>
                    </div>
                    <Link
                      href={`/admin/products/${product.id}/variants`}
                      className="w-full sm:w-auto text-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 text-xs uppercase tracking-wider transition-colors"
                    >
                      + Varianten Toevoegen
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-brand-primary border-brand-primary text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            Alle ({variants.length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'low'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            Laag ({getLowStockCount()})
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'out'
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            Uitverkocht ({getOutOfStockCount()})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'available'
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            Op voorraad ({variants.filter(v => v.stock_quantity >= 5).length})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border-2 border-gray-200">
        {filteredVariants.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Geen items in deze categorie</h3>
          </div>
        ) : (
          <>
          <div className="md:hidden space-y-3 p-3">
            {filteredVariants.map((variant) => (
              <div
                key={variant.id}
                className={`border-2 p-4 ${
                  variant.stock_quantity === 0
                    ? 'border-red-200 bg-red-50'
                    : variant.stock_quantity < 5
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900">{variant.product.name}</div>
                    <div className="text-xs text-gray-600">{variant.size} / {variant.color}</div>
                    {variant.sku && <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">{variant.sku}</code>}
                  </div>
                  <span className="text-xs font-bold text-gray-900">EUR {(variant.product.base_price + variant.price_adjustment).toFixed(2)}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Regulier</label>
                    <input
                      type="number"
                      min="0"
                      value={variant.stock_quantity}
                      onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value) || 0, false)}
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Presale</label>
                    <input
                      type="number"
                      min="0"
                      value={variant.presale_stock_quantity || 0}
                      onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value) || 0, true)}
                      disabled={!variant.presale_enabled}
                      className="w-full px-3 py-2 border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={variant.presale_enabled}
                      onChange={(e) => handleTogglePresale(variant.id, e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-2 border-gray-300 rounded"
                    />
                    <span className="text-xs font-semibold text-purple-700">Presale</span>
                  </label>
                  <Link
                    href={`/admin/products/${variant.product.id}/variants`}
                    className="text-xs font-semibold text-brand-primary"
                  >
                    Varianten
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    SKU
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reguliere Voorraad
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Presale
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVariants.map((variant) => (
                  <tr key={variant.id} className={`hover:bg-gray-50 transition-colors ${
                    variant.stock_quantity === 0 ? 'bg-red-50' : variant.stock_quantity < 5 ? 'bg-orange-50' : ''
                  }`}>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{variant.product.name}</div>
                      <div className="text-xs text-gray-500">€{(variant.product.base_price + variant.price_adjustment).toFixed(2)}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {variant.color_hex && (
                          <div
                            className="w-5 h-5 border-2 border-gray-300 rounded"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-semibold">{variant.size}</div>
                          <div className="text-xs text-gray-500">{variant.color}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      {variant.sku ? (
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {variant.sku}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value) || 0, false)}
                        className={`w-20 px-3 py-2 border-2 focus:outline-none transition-colors text-sm ${
                          variant.stock_quantity === 0
                            ? 'border-red-300 focus:border-red-500 bg-red-50 font-bold text-red-700'
                            : variant.stock_quantity < 5
                            ? 'border-orange-300 focus:border-orange-500 bg-orange-50 font-bold text-orange-700'
                            : 'border-gray-300 focus:border-brand-primary'
                        }`}
                      />
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="space-y-2">
                        {/* Presale Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={variant.presale_enabled}
                            onChange={(e) => handleTogglePresale(variant.id, e.target.checked)}
                            className="w-4 h-4 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-xs font-semibold text-purple-700">
                            {variant.presale_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                        
                        {/* Presale Stock Input */}
                        {variant.presale_enabled && (
                          <input
                            type="number"
                            min="0"
                            value={variant.presale_stock_quantity || 0}
                            onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value) || 0, true)}
                            className="w-20 px-3 py-2 border-2 border-purple-300 focus:border-purple-500 focus:outline-none transition-colors text-sm bg-purple-50 font-bold text-purple-700"
                            placeholder="Qty"
                          />
                        )}
                        
                        {!variant.presale_enabled && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="space-y-1">
                        {variant.stock_quantity === 0 ? (
                          <span className="block px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 border-2 border-red-200 text-center">
                            UITVERKOCHT
                          </span>
                        ) : variant.stock_quantity < 5 ? (
                          <span className="block px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700 border-2 border-orange-200 text-center">
                            LAAG
                          </span>
                        ) : (
                          <span className="block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 border-2 border-green-200 text-center">
                            OP VOORRAAD
                          </span>
                        )}
                        
                        {variant.presale_enabled && (
                          <span className="block px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 border-2 border-purple-200 text-center">
                            PRESALE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/products/${variant.product_id}/variants`}
                        className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  )
}



