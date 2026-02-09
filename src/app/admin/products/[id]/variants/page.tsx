'use client'

import { use, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Product {
  id: string
  name: string
  base_price: number
}

interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  color_hex: string | null
  sku: string | null
  stock_quantity: number
  presale_stock_quantity: number
  presale_enabled: boolean
  presale_expected_date: string | null
  presale_expected_date_en: string | null
  price_adjustment: number
  is_available: boolean
  display_order: number
  created_at: string
}

export default function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const supabase = createClient()

  // State to track pending changes per variant
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<ProductVariant>>>({})

  // Form state for new variant
  const [newVariant, setNewVariant] = useState({
    size: 'M',
    color: 'Zwart',
    color_hex: '#000000',
    sku: '',
    stock_quantity: '0',
    presale_stock_quantity: '0',
    presale_enabled: false,
    presale_expected_date: '',
    presale_expected_date_en: '',
    price_adjustment: '0',
    is_available: true,
  })

  useEffect(() => {
    fetchProduct()
    fetchVariants()
  }, [id])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, base_price')
        .eq('id', id)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchVariants = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setVariants(data || [])
      // Clear pending changes when refreshing data
      setPendingChanges({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Generate SKU from product name, size and color
  const generateSKU = (productName: string, size: string, color: string) => {
    const cleanName = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8)
    const cleanSize = size.toUpperCase().replace(/\s/g, '')
    const cleanColor = color
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3)
    return `${cleanName}-${cleanSize}-${cleanColor}`
  }

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Auto-generate SKU if empty
      let sku = newVariant.sku.trim()
      if (!sku && product) {
        sku = generateSKU(product.name, newVariant.size, newVariant.color)
      }

      // Get next display_order (max + 1)
      const maxOrder = variants.length > 0 
        ? Math.max(...variants.map(v => v.display_order))
        : 0

      const { error } = await supabase
        .from('product_variants')
        .insert([
          {
            product_id: id,
            size: newVariant.size,
            color: newVariant.color,
            color_hex: newVariant.color_hex || null,
            sku: sku,
            stock_quantity: parseInt(newVariant.stock_quantity),
            presale_stock_quantity: parseInt(newVariant.presale_stock_quantity),
            presale_enabled: newVariant.presale_enabled,
            presale_expected_date: newVariant.presale_expected_date || null,
            presale_expected_date_en: newVariant.presale_expected_date_en || null,
            price_adjustment: parseFloat(newVariant.price_adjustment),
            is_available: newVariant.is_available,
            display_order: maxOrder + 1,
          },
        ])

      if (error) throw error

      // Reset form & refresh
      setNewVariant({
        size: 'M',
        color: 'Zwart',
        color_hex: '#000000',
        sku: '',
        stock_quantity: '0',
        presale_stock_quantity: '0',
        presale_enabled: false,
        presale_expected_date: '',
        presale_expected_date_en: '',
        price_adjustment: '0',
        is_available: true,
      })
      setShowAddForm(false)
      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  // Track changes in state instead of saving immediately
  const handleFieldChange = (variantId: string, field: keyof ProductVariant, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value,
      }
    }))
  }

  // Save all pending changes for all variants at once
  const handleSaveAll = async () => {
    const variantIds = Object.keys(pendingChanges)
    if (variantIds.length === 0) {
      return // No changes to save
    }

    try {
      // Save all changes in parallel
      const savePromises = variantIds.map(async (variantId) => {
        const changes = pendingChanges[variantId]
        if (!changes || Object.keys(changes).length === 0) {
          return
        }

        const { error } = await supabase
          .from('product_variants')
          .update(changes)
          .eq('id', variantId)

        if (error) throw error
      })

      await Promise.all(savePromises)

      // Clear all pending changes
      setPendingChanges({})

      // Refresh variants to show updated data
      fetchVariants()

      // Show success message
      alert(`✅ ${variantIds.length} variant${variantIds.length > 1 ? 'en' : ''} opgeslagen!`)
    } catch (err: any) {
      alert(`Fout bij opslaan: ${err.message}`)
    }
  }

  // Get total number of pending changes
  const getPendingChangesCount = () => {
    return Object.keys(pendingChanges).length
  }

  // Keep toggle functions that save immediately (they're action buttons, not form fields)
  const handleTogglePresale = async (variantId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ presale_enabled: enabled })
        .eq('id', variantId)

      if (error) throw error
      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleToggleAvailability = async (variantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ is_available: !currentStatus })
        .eq('id', variantId)

      if (error) throw error
      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleDeleteVariant = async (variantId: string, size: string, color: string) => {
    if (!confirm(`Weet je zeker dat je variant ${size} / ${color} wilt verwijderen?`)) return

    try {
      const { error} = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId)

      if (error) throw error
      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleMoveUp = async (variantId: string, currentOrder: number) => {
    // Find variant directly above (lower order number)
    const variantAbove = variants.find(v => v.display_order === currentOrder - 1)
    if (!variantAbove) return // Already at top

    try {
      // Swap display_order values
      await supabase
        .from('product_variants')
        .update({ display_order: currentOrder })
        .eq('id', variantAbove.id)

      await supabase
        .from('product_variants')
        .update({ display_order: currentOrder - 1 })
        .eq('id', variantId)

      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleMoveDown = async (variantId: string, currentOrder: number) => {
    // Find variant directly below (higher order number)
    const variantBelow = variants.find(v => v.display_order === currentOrder + 1)
    if (!variantBelow) return // Already at bottom

    try {
      // Swap display_order values
      await supabase
        .from('product_variants')
        .update({ display_order: currentOrder })
        .eq('id', variantBelow.id)

      await supabase
        .from('product_variants')
        .update({ display_order: currentOrder + 1 })
        .eq('id', variantId)

      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const getTotalStock = () => {
    return variants.reduce((sum, v) => sum + v.stock_quantity, 0)
  }

  const getAvailableVariants = () => {
    return variants.filter(v => v.is_available).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border-2 border-red-600 p-6 text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Admin Error</h2>
          <p className="text-red-800 mb-4">
            {error || 'Product kon niet worden geladen. Probeer het opnieuw.'}
          </p>
          <Link
            href="/admin/products"
            className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
          >
            Terug naar Producten
          </Link>
        </div>
      </div>
    )
  }

  const pendingCount = getPendingChangesCount()

  return (
    <div className="pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/products/${id}/edit`}
            className="p-2 hover:bg-gray-100 transition-colors rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1 md:mb-2">Product Varianten</h1>
            {product ? (
              <p className="text-sm md:text-base text-gray-600">
                {product.name} <span className="text-brand-primary">€{product.base_price.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-sm md:text-base text-gray-500">Product laden...</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSaveAll}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 md:py-3 px-4 md:px-6 uppercase tracking-wider transition-colors text-sm md:text-base flex items-center gap-2"
            >
              <span>Opslaan</span>
              <span className="bg-white text-green-600 rounded-full px-2 py-0.5 text-xs font-bold">
                {pendingCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-4 md:px-6 uppercase tracking-wider transition-colors text-sm md:text-base"
          >
            {showAddForm ? 'Annuleren' : '+ Variant'}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1 md:mb-2">{variants.length}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totaal Varianten</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1 md:mb-2">{getAvailableVariants()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Beschikbaar</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-1 md:mb-2">{getTotalStock()}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totale Voorraad</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1 md:mb-2">
            {variants.filter(v => v.stock_quantity < 5).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Lage Voorraad</div>
        </div>
      </div>

      {/* Add Variant Form */}
      {showAddForm && (
        <form onSubmit={handleAddVariant} className="bg-white border-2 border-gray-200 p-6 mb-8">
          <h3 className="text-xl font-bold mb-6">Nieuwe Variant Toevoegen</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Size */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Maat *
              </label>
              <select
                required
                value={newVariant.size}
                onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="One Size">One Size</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Kleur *
              </label>
              <input
                type="text"
                required
                value={newVariant.color}
                onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Zwart"
              />
            </div>

            {/* Color Hex */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Kleur Code
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newVariant.color_hex}
                  onChange={(e) => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                  className="w-16 h-12 border-2 border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={newVariant.color_hex}
                  onChange={(e) => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* SKU */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                SKU <span className="text-gray-400 font-normal">(auto-gegenereerd als leeg)</span>
              </label>
              <input
                type="text"
                value={newVariant.sku}
                onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
                placeholder={product ? generateSKU(product.name, newVariant.size, newVariant.color) : 'MOSE-M-ZWA'}
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Voorraad *
              </label>
              <input
                type="number"
                required
                min="0"
                value={newVariant.stock_quantity}
                onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>

            {/* Price Adjustment */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Prijs Aanpassing (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={newVariant.price_adjustment}
                onChange={(e) => setNewVariant({ ...newVariant, price_adjustment: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">Bijv. +5.00 voor XL maat</p>
            </div>

            {/* Pre-sale Stock */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Pre-sale Voorraad
              </label>
              <input
                type="number"
                min="0"
                value={newVariant.presale_stock_quantity}
                onChange={(e) => setNewVariant({ ...newVariant, presale_stock_quantity: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>

            {/* Pre-sale Expected Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Pre-sale Verwachte Datum (NL)
              </label>
              <input
                type="text"
                value={newVariant.presale_expected_date}
                onChange={(e) => setNewVariant({ ...newVariant, presale_expected_date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="bijv. Week 10 februari"
              />
              <p className="mt-1 text-xs text-gray-500">Bijv. "Week 10 februari" of "Eind maart"</p>
            </div>

            {/* Pre-sale Expected Date EN */}
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Pre-sale Expected Date (EN)
              </label>
              <input
                type="text"
                value={newVariant.presale_expected_date_en}
                onChange={(e) => setNewVariant({ ...newVariant, presale_expected_date_en: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="e.g. Week 10 February"
              />
              <p className="mt-1 text-xs text-gray-500">E.g. "Week 10 February" or "End of March"</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="presale_enabled"
                checked={newVariant.presale_enabled}
                onChange={(e) => setNewVariant({ ...newVariant, presale_enabled: e.target.checked })}
                className="w-5 h-5 border-2 border-gray-300"
              />
              <label htmlFor="presale_enabled" className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Pre-sale activeren
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_available"
                checked={newVariant.is_available}
                onChange={(e) => setNewVariant({ ...newVariant, is_available: e.target.checked })}
                className="w-5 h-5 border-2 border-gray-300"
              />
              <label htmlFor="is_available" className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Direct beschikbaar
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors"
          >
            Variant Toevoegen
          </button>
        </form>
      )}

      {/* Variants Table */}
      <div className="bg-white border-2 border-gray-200">
        {variants.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen varianten</h3>
            <p className="text-gray-500 mb-6">Voeg size/color varianten toe met voorraad!</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
            >
              + Eerste Variant Toevoegen
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-200">
              {variants.map((variant, index) => {
                const isFirst = index === 0
                const isLast = index === variants.length - 1
                const hasChanges = pendingChanges[variant.id] && Object.keys(pendingChanges[variant.id]).length > 0
                
                return (
                  <div key={variant.id} className={`p-4 ${hasChanges ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {variant.color_hex && (
                            <div
                              className="w-6 h-6 border-2 border-gray-300 rounded"
                              style={{ backgroundColor: variant.color_hex }}
                            />
                          )}
                          <span className="font-bold text-gray-900">{variant.size} / {variant.color}</span>
                        </div>
                        {variant.sku && (
                          <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded block mb-2">
                            {variant.sku}
                          </code>
                        )}
                        {product && (
                          <div className="text-sm font-bold text-gray-900 mb-2">
                            €{(product.base_price + variant.price_adjustment).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveUp(variant.id, variant.display_order)}
                          disabled={isFirst}
                          className={`p-1 border-2 transition-colors ${
                            isFirst
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(variant.id, variant.display_order)}
                          disabled={isLast}
                          className={`p-1 border-2 transition-colors ${
                            isLast
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Color Hex */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Kleur Code</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pendingChanges[variant.id]?.color_hex !== undefined 
                              ? (pendingChanges[variant.id]?.color_hex || '#000000')
                              : (variant.color_hex || '#000000')}
                            onChange={(e) => handleFieldChange(variant.id, 'color_hex', e.target.value)}
                            className="w-12 h-10 border-2 border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pendingChanges[variant.id]?.color_hex !== undefined
                              ? (pendingChanges[variant.id]?.color_hex || '')
                              : (variant.color_hex || '')}
                            onChange={(e) => handleFieldChange(variant.id, 'color_hex', e.target.value)}
                            placeholder="#000000"
                            className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Voorraad</label>
                        <input
                          type="number"
                          min="0"
                          value={pendingChanges[variant.id]?.stock_quantity !== undefined
                            ? pendingChanges[variant.id]?.stock_quantity
                            : variant.stock_quantity}
                          onChange={(e) => handleFieldChange(variant.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-3 py-2 border-2 focus:outline-none transition-colors ${
                            (pendingChanges[variant.id]?.stock_quantity !== undefined
                              ? (pendingChanges[variant.id]?.stock_quantity ?? 0)
                              : variant.stock_quantity) < 5
                              ? 'border-red-300 focus:border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-brand-primary'
                          }`}
                        />
                      </div>

                      {/* Presale */}
                      <div className="border-t pt-3">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Pre-sale</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-12">Qty:</span>
                            <input
                              type="number"
                              min="0"
                              value={pendingChanges[variant.id]?.presale_stock_quantity !== undefined
                                ? pendingChanges[variant.id]?.presale_stock_quantity
                                : variant.presale_stock_quantity}
                              onChange={(e) => handleFieldChange(variant.id, 'presale_stock_quantity', parseInt(e.target.value) || 0)}
                              className="flex-1 px-2 py-1 text-sm border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={variant.presale_enabled}
                              onChange={(e) => handleTogglePresale(variant.id, e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-600">Enabled</span>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">NL:</label>
                            <input
                              type="text"
                              value={pendingChanges[variant.id]?.presale_expected_date !== undefined
                                ? (pendingChanges[variant.id]?.presale_expected_date || '')
                                : (variant.presale_expected_date || '')}
                              onChange={(e) => handleFieldChange(variant.id, 'presale_expected_date', e.target.value || null)}
                              placeholder="Week 10 feb"
                              className="w-full px-2 py-1 text-sm border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">EN:</label>
                            <input
                              type="text"
                              value={pendingChanges[variant.id]?.presale_expected_date_en !== undefined
                                ? (pendingChanges[variant.id]?.presale_expected_date_en || '')
                                : (variant.presale_expected_date_en || '')}
                              onChange={(e) => handleFieldChange(variant.id, 'presale_expected_date_en', e.target.value || null)}
                              placeholder="Week 10 Feb"
                              className="w-full px-2 py-1 text-sm border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <button
                          onClick={() => handleToggleAvailability(variant.id, variant.is_available)}
                          className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors ${
                            variant.is_available
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {variant.is_available ? 'Beschikbaar' : 'Niet beschikbaar'}
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(variant.id, variant.size, variant.color)}
                          className="text-red-600 hover:text-red-900 font-semibold text-xs"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16 md:w-20">
                    Volgorde
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Maat
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Kleur
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Kleur Code
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    SKU
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prijs
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Voorraad
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                    Pre-sale
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variants.map((variant, index) => {
                  const isFirst = index === 0
                  const isLast = index === variants.length - 1
                  
                  return (
                  <tr key={variant.id} className="hover:bg-gray-50 transition-colors">
                    {/* Order Controls */}
                    <td className="px-2 md:px-2 py-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(variant.id, variant.display_order)}
                          disabled={isFirst}
                          className={`p-1 border-2 transition-colors ${
                            isFirst
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                          }`}
                          title="Verplaats omhoog"
                          aria-label="Verplaats omhoog"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(variant.id, variant.display_order)}
                          disabled={isLast}
                          className={`p-1 border-2 transition-colors ${
                            isLast
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                          }`}
                          title="Verplaats omlaag"
                          aria-label="Verplaats omlaag"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900 text-sm md:text-base">{variant.size}</span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {variant.color_hex && (
                          <div
                            className="w-5 h-5 md:w-6 md:h-6 border-2 border-gray-300 rounded"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        )}
                        <span className="text-xs md:text-sm text-gray-900">{variant.color}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 md:gap-2">
                        <input
                          type="color"
                          value={pendingChanges[variant.id]?.color_hex !== undefined 
                            ? (pendingChanges[variant.id]?.color_hex || '#000000')
                            : (variant.color_hex || '#000000')}
                          onChange={(e) => handleFieldChange(variant.id, 'color_hex', e.target.value)}
                          className="w-8 h-8 md:w-10 md:h-8 border-2 border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={pendingChanges[variant.id]?.color_hex !== undefined
                            ? (pendingChanges[variant.id]?.color_hex || '')
                            : (variant.color_hex || '')}
                          onChange={(e) => handleFieldChange(variant.id, 'color_hex', e.target.value)}
                          placeholder="#000000"
                          className="w-20 md:w-24 px-2 py-1 text-xs border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono"
                        />
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      {variant.sku ? (
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {variant.sku}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      {product ? (
                        <div className="text-xs md:text-sm font-bold text-gray-900">
                          €{(product.base_price + variant.price_adjustment).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-xs md:text-sm text-gray-400">-</div>
                      )}
                      {product && variant.price_adjustment !== 0 && (
                        <div className="text-xs text-gray-500">
                          ({variant.price_adjustment > 0 ? '+' : ''}€{variant.price_adjustment.toFixed(2)})
                        </div>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={pendingChanges[variant.id]?.stock_quantity !== undefined
                          ? pendingChanges[variant.id]?.stock_quantity
                          : variant.stock_quantity}
                        onChange={(e) => handleFieldChange(variant.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                        className={`w-16 md:w-20 px-2 md:px-3 py-1.5 md:py-2 text-sm border-2 focus:outline-none transition-colors ${
                          (pendingChanges[variant.id]?.stock_quantity !== undefined
                            ? (pendingChanges[variant.id]?.stock_quantity ?? 0)
                            : variant.stock_quantity) < 5
                            ? 'border-red-300 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-brand-primary'
                        }`}
                      />
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden xl:table-cell">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Qty:</span>
                          <input
                            type="number"
                            min="0"
                            value={pendingChanges[variant.id]?.presale_stock_quantity !== undefined
                              ? pendingChanges[variant.id]?.presale_stock_quantity
                              : variant.presale_stock_quantity}
                            onChange={(e) => handleFieldChange(variant.id, 'presale_stock_quantity', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-sm border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={variant.presale_enabled}
                              onChange={(e) => handleTogglePresale(variant.id, e.target.checked)}
                              className="w-3 h-3"
                            />
                            <span className="text-xs text-gray-600">Enabled</span>
                          </label>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">NL:</label>
                          <input
                            type="text"
                            value={pendingChanges[variant.id]?.presale_expected_date !== undefined
                              ? (pendingChanges[variant.id]?.presale_expected_date || '')
                              : (variant.presale_expected_date || '')}
                            onChange={(e) => handleFieldChange(variant.id, 'presale_expected_date', e.target.value || null)}
                            placeholder="Week 10 feb"
                            className="w-full px-2 py-1 text-xs border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">EN:</label>
                          <input
                            type="text"
                            value={pendingChanges[variant.id]?.presale_expected_date_en !== undefined
                              ? (pendingChanges[variant.id]?.presale_expected_date_en || '')
                              : (variant.presale_expected_date_en || '')}
                            onChange={(e) => handleFieldChange(variant.id, 'presale_expected_date_en', e.target.value || null)}
                            placeholder="Week 10 Feb"
                            className="w-full px-2 py-1 text-xs border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(variant.id, variant.is_available)}
                        className={`px-2 md:px-3 py-1 text-xs font-semibold border-2 transition-colors ${
                          variant.is_available
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {variant.is_available ? 'Ja' : 'Nee'}
                      </button>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteVariant(variant.id, variant.size, variant.color)}
                        className="text-red-600 hover:text-red-900 font-semibold text-xs"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Sticky Save Button (Mobile) */}
      {pendingCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg md:hidden z-50">
          <button
            onClick={handleSaveAll}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <span>Opslaan</span>
            <span className="bg-white text-green-600 rounded-full px-3 py-1 text-sm font-bold">
              {pendingCount}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

