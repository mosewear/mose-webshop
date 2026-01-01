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
  price_adjustment: number
  is_available: boolean
  product: {
    id: string
    name: string
    base_price: number
  }
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    fetchInventory()
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

  const handleUpdateStock = async (variantId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ stock_quantity: newStock })
        .eq('id', variantId)

      if (error) throw error

      // Log inventory mutation
      await supabase.from('inventory_logs').insert([
        {
          variant_id: variantId,
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          change_amount: newStock - (variants.find(v => v.id === variantId)?.stock_quantity || 0),
          new_stock_quantity: newStock,
          reason: 'manual_update',
          notes: 'Updated via admin panel',
        },
      ])

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
  const getLowStockCount = () => variants.filter(v => v.stock_quantity > 0 && v.stock_quantity < 5).length
  const getOutOfStockCount = () => variants.filter(v => v.stock_quantity === 0).length

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{getTotalStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totale Voorraad</div>
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
            ⚠️ Laag ({getLowStockCount()})
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'out'
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            🚫 Uitverkocht ({getOutOfStockCount()})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
              filter === 'available'
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            ✅ Op Voorraad ({variants.filter(v => v.stock_quantity >= 5).length})
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    SKU
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Voorraad
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
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
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
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
                        onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value) || 0)}
                        className={`w-20 px-3 py-2 border-2 focus:outline-none transition-colors text-sm ${
                          variant.stock_quantity === 0
                            ? 'border-red-300 focus:border-red-500 bg-red-50 font-bold text-red-700'
                            : variant.stock_quantity < 5
                            ? 'border-orange-300 focus:border-orange-500 bg-orange-50 font-bold text-orange-700'
                            : 'border-gray-300 focus:border-brand-primary'
                        }`}
                      />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      {variant.stock_quantity === 0 ? (
                        <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 border-2 border-red-200">
                          UITVERKOCHT
                        </span>
                      ) : variant.stock_quantity < 5 ? (
                        <span className="px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700 border-2 border-orange-200">
                          LAAG
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 border-2 border-green-200">
                          OP VOORRAAD
                        </span>
                      )}
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
        )}
      </div>
    </div>
  )
}



