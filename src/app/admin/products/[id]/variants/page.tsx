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

  // Form state for new variant
  const [newVariant, setNewVariant] = useState({
    size: 'M',
    color: 'Zwart',
    color_hex: '#000000',
    sku: '',
    stock_quantity: '0',
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
        price_adjustment: '0',
        is_available: true,
      })
      setShowAddForm(false)
      fetchVariants()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleUpdateStock = async (variantId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ stock_quantity: newStock })
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/products/${id}/edit`}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Product Varianten</h1>
            {product && (
              <p className="text-gray-600">
                {product.name} <span className="text-brand-primary">€{product.base_price.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
        >
          {showAddForm ? 'Annuleren' : '+ Variant Toevoegen'}
        </button>
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
          <div className="text-3xl font-bold text-brand-primary mb-2">{variants.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Varianten</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-2">{getAvailableVariants()}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Beschikbaar</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-orange-600 mb-2">{getTotalStock()}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totale Voorraad</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {variants.filter(v => v.stock_quantity < 5).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Lage Voorraad</div>
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
          </div>

          <div className="flex items-center gap-3 mb-6">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                    Volgorde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Maat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Kleur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prijs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Voorraad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
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
                    <td className="px-2 py-4">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900">{variant.size}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {variant.color_hex && (
                          <div
                            className="w-6 h-6 border-2 border-gray-300 rounded"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        )}
                        <span className="text-sm text-gray-900">{variant.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {variant.sku ? (
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {variant.sku}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        €{(product!.base_price + variant.price_adjustment).toFixed(2)}
                      </div>
                      {variant.price_adjustment !== 0 && (
                        <div className="text-xs text-gray-500">
                          ({variant.price_adjustment > 0 ? '+' : ''}€{variant.price_adjustment.toFixed(2)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(e) => handleUpdateStock(variant.id, parseInt(e.target.value))}
                        className={`w-20 px-3 py-2 border-2 focus:outline-none transition-colors ${
                          variant.stock_quantity < 5
                            ? 'border-red-300 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-brand-primary'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(variant.id, variant.is_available)}
                        className={`px-3 py-1 text-xs font-semibold border-2 transition-colors ${
                          variant.is_available
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {variant.is_available ? 'Beschikbaar' : 'Niet beschikbaar'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteVariant(variant.id, variant.size, variant.color)}
                        className="text-red-600 hover:text-red-900 font-semibold"
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
        )}
      </div>
    </div>
  )
}

