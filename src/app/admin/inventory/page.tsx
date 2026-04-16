'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

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

interface EditingVariant {
  id: string
  field: 'stock' | 'presale_stock'
  value: number
  originalValue: number
}

interface InventoryLogEntry {
  variantId: string
  field: 'stock' | 'presale_stock'
  oldValue: number
  newValue: number
  timestamp: Date
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [productsWithoutVariants, setProductsWithoutVariants] = useState<ProductWithoutVariants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingVariant, setEditingVariant] = useState<EditingVariant | null>(null)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogEntry[]>([])
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchInventory()
    fetchProductsWithoutVariants()
    fetchLowStockThreshold()
  }, [])

  const fetchLowStockThreshold = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'low_stock_threshold')
        .single()

      if (!error && data?.value != null) {
        const parsed = typeof data.value === 'number' ? data.value : Number(data.value)
        if (!isNaN(parsed) && parsed > 0) {
          setLowStockThreshold(parsed)
        }
      }
    } catch {
      // Fallback to default (5) silently
    }
  }

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
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, base_price, created_at')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      const { data: variantProductIds, error: variantsError } = await supabase
        .from('product_variants')
        .select('product_id')

      if (variantsError) throw variantsError

      const productIdsWithVariants = new Set(variantProductIds?.map(v => v.product_id) || [])
      const withoutVariants = (allProducts || []).filter(p => !productIdsWithVariants.has(p.id))
      
      setProductsWithoutVariants(withoutVariants)
    } catch (err: any) {
      console.error('Error fetching products without variants:', err)
    }
  }

  const startEditing = (variant: VariantWithProduct, field: 'stock' | 'presale_stock') => {
    const currentValue = field === 'presale_stock'
      ? (variant.presale_stock_quantity || 0)
      : variant.stock_quantity
    setEditingVariant({
      id: variant.id,
      field,
      value: currentValue,
      originalValue: currentValue,
    })
  }

  const cancelEditing = () => {
    setEditingVariant(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancelEditing()
    if (e.key === 'Enter') handleSaveEdit()
  }

  const handleSaveEdit = async () => {
    if (!editingVariant) return
    if (editingVariant.value === editingVariant.originalValue) {
      cancelEditing()
      return
    }

    const { id, field, value, originalValue } = editingVariant
    const isPresale = field === 'presale_stock'
    const updateField = isPresale ? 'presale_stock_quantity' : 'stock_quantity'

    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ [updateField]: value })
        .eq('id', id)

      if (error) throw error

      try {
        await supabase.from('inventory_logs').insert([{
          variant_id: id,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id || null,
          change_amount: value - originalValue,
          previous_stock: originalValue,
          new_stock: value,
          inventory_type: isPresale ? 'presale' : 'regular',
          reason: 'manual_update',
          notes: `Updated ${isPresale ? 'presale' : 'regular'} stock via admin panel`,
        }])
      } catch {
        // Non-critical: log failure shouldn't block the save
      }

      setInventoryLogs(prev => [{
        variantId: id,
        field,
        oldValue: originalValue,
        newValue: value,
        timestamp: new Date(),
      }, ...prev])

      cancelEditing()
      fetchInventory()

      toast.success(
        `Voorraad bijgewerkt: ${originalValue} → ${value}`,
        {
          duration: 5000,
          icon: '✅',
          style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
        }
      )

      // Undo toast
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase">Ongedaan maken?</span>
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                try {
                  await supabase
                    .from('product_variants')
                    .update({ [updateField]: originalValue })
                    .eq('id', id)
                  fetchInventory()
                  toast.success('Wijziging ongedaan gemaakt', {
                    style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
                  })
                } catch {
                  toast.error('Kon wijziging niet ongedaan maken')
                }
              }}
              className="bg-black text-white text-xs font-bold uppercase px-3 py-1"
            >
              Undo
            </button>
          </div>
        ),
        {
          duration: 8000,
          style: { border: '2px solid black', borderRadius: '0' },
        }
      )
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
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
      toast.success(`Presale ${enabled ? 'ingeschakeld' : 'uitgeschakeld'}`, {
        style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
      })
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
    }
  }

  const getVariantLogs = (variantId: string) =>
    inventoryLogs.filter(log => log.variantId === variantId)

  const isEditing = (variantId: string, field: 'stock' | 'presale_stock') =>
    editingVariant?.id === variantId && editingVariant?.field === field

  const hasValueChanged = editingVariant
    ? editingVariant.value !== editingVariant.originalValue
    : false

  const getFilteredVariants = () => {
    switch (filter) {
      case 'low':
        return variants.filter(v => v.stock_quantity > 0 && v.stock_quantity < lowStockThreshold)
      case 'out':
        return variants.filter(v => v.stock_quantity === 0)
      case 'available':
        return variants.filter(v => v.stock_quantity >= lowStockThreshold)
      default:
        return variants
    }
  }

  const filteredVariants = getFilteredVariants()

  const getTotalStock = () => variants.reduce((sum, v) => sum + v.stock_quantity, 0)
  const getTotalPresaleStock = () => variants.reduce((sum, v) => sum + (v.presale_stock_quantity || 0), 0)
  const getLowStockCount = () => variants.filter(v => v.stock_quantity > 0 && v.stock_quantity < lowStockThreshold).length
  const getOutOfStockCount = () => variants.filter(v => v.stock_quantity === 0).length

  const renderStockCell = (variant: VariantWithProduct, field: 'stock' | 'presale_stock') => {
    const currentValue = field === 'presale_stock'
      ? (variant.presale_stock_quantity || 0)
      : variant.stock_quantity
    const editing = isEditing(variant.id, field)

    if (editing && editingVariant) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            autoFocus
            value={editingVariant.value}
            onChange={(e) => setEditingVariant({ ...editingVariant, value: parseInt(e.target.value) || 0 })}
            onKeyDown={handleEditKeyDown}
            className={`w-20 px-3 py-2 border-2 focus:outline-none transition-colors text-sm ${
              field === 'presale_stock'
                ? 'border-purple-500 bg-purple-50 font-bold text-purple-700'
                : 'border-black bg-white font-bold'
            }`}
          />
          {hasValueChanged && (
            <button
              onClick={handleSaveEdit}
              className="bg-black text-white text-xs font-bold uppercase px-3 py-1"
            >
              Opslaan
            </button>
          )}
          <button
            onClick={cancelEditing}
            className="text-gray-400 hover:text-gray-700 text-xs font-bold uppercase px-2 py-1"
          >
            ✕
          </button>
        </div>
      )
    }

    if (field === 'presale_stock') {
      return (
        <span
          onClick={() => variant.presale_enabled && startEditing(variant, field)}
          className={`inline-block px-3 py-2 text-sm font-bold cursor-pointer border-2 border-transparent hover:border-purple-300 transition-colors ${
            variant.presale_enabled ? 'text-purple-700' : 'text-gray-400 cursor-default'
          }`}
        >
          {variant.presale_enabled ? currentValue : '-'}
        </span>
      )
    }

    return (
      <span
        onClick={() => startEditing(variant, field)}
        className={`inline-block px-3 py-2 text-sm font-bold cursor-pointer border-2 border-transparent hover:border-gray-400 transition-colors ${
          currentValue === 0
            ? 'text-red-700'
            : currentValue < lowStockThreshold
            ? 'text-orange-700'
            : 'text-gray-900'
        }`}
      >
        {currentValue}
      </span>
    )
  }

  const renderHistorySection = (variantId: string) => {
    const logs = getVariantLogs(variantId)
    const isExpanded = expandedVariant === variantId
    if (logs.length === 0 && !isExpanded) return null

    return (
      <div className="mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpandedVariant(isExpanded ? null : variantId)
          }}
          className="text-xs text-gray-400 hover:text-gray-700 font-bold uppercase tracking-wide"
        >
          {isExpanded ? '▾ Verberg historie' : `▸ Historie (${logs.length})`}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-1">
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Geen wijzigingen in deze sessie</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                  <span className="font-mono">
                    {log.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold">
                    {log.field === 'presale_stock' ? 'Presale' : 'Regulier'}:
                  </span>
                  <span className="text-red-500 line-through">{log.oldValue}</span>
                  <span>→</span>
                  <span className="text-green-600 font-bold">{log.newValue}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1 sm:mb-2">{getTotalStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totale Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-purple-200 bg-purple-50">
          <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">{getTotalPresaleStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Presale Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
            {variants.filter(v => v.stock_quantity >= lowStockThreshold).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Op Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-orange-200 bg-orange-50">
          <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">{getLowStockCount()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Lage Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-red-200 bg-red-50 col-span-2 sm:col-span-1">
          <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{getOutOfStockCount()}</div>
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
            Op voorraad ({variants.filter(v => v.stock_quantity >= lowStockThreshold).length})
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
          {/* Mobile view */}
          <div className="md:hidden space-y-3 p-3">
            {filteredVariants.map((variant) => (
              <div
                key={variant.id}
                className={`border-2 p-4 ${
                  variant.stock_quantity === 0
                    ? 'border-red-200 bg-red-50'
                    : variant.stock_quantity < lowStockThreshold
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
                    {renderStockCell(variant, 'stock')}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Presale</label>
                    {renderStockCell(variant, 'presale_stock')}
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

                {renderHistorySection(variant.id)}
              </div>
            ))}
          </div>

          {/* Desktop view */}
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
                    variant.stock_quantity === 0 ? 'bg-red-50' : variant.stock_quantity < lowStockThreshold ? 'bg-orange-50' : ''
                  }`}>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{variant.product.name}</div>
                      <div className="text-xs text-gray-500">€{(variant.product.base_price + variant.price_adjustment).toFixed(2)}</div>
                      {renderHistorySection(variant.id)}
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
                      {renderStockCell(variant, 'stock')}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="space-y-2">
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
                        
                        {variant.presale_enabled && renderStockCell(variant, 'presale_stock')}
                        
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
                        ) : variant.stock_quantity < lowStockThreshold ? (
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
