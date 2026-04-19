'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  getInventoryLogs,
  postInventoryAdjust,
  type InventoryLogRow,
} from '@/lib/admin/inventory-api'
import { InventorySkuScan } from '@/components/admin/inventory/InventorySkuScan'

export interface VariantWithProduct {
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

export default function InventoryManager() {
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [productsWithoutVariants, setProductsWithoutVariants] = useState<
    ProductWithoutVariants[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingVariant, setEditingVariant] = useState<EditingVariant | null>(
    null
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null)
  const [variantLogCache, setVariantLogCache] = useState<
    Record<string, InventoryLogRow[]>
  >({})
  const [logsLoadingId, setLogsLoadingId] = useState<string | null>(null)
  const [recentLogs, setRecentLogs] = useState<InventoryLogRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [groupByProduct, setGroupByProduct] = useState(false)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('product_variants')
        .select(
          `
          *,
          product:products(id, name, base_price)
        `
        )
        .order('stock_quantity', { ascending: true })

      if (fetchError) throw fetchError
      setVariants((data as VariantWithProduct[]) || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij laden')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchProductsWithoutVariants = useCallback(async () => {
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

      const productIdsWithVariants = new Set(
        variantProductIds?.map((v) => v.product_id) || []
      )
      const withoutVariants = (allProducts || []).filter(
        (p) => !productIdsWithVariants.has(p.id)
      )

      setProductsWithoutVariants(withoutVariants)
    } catch (err) {
      console.error('Error fetching products without variants:', err)
    }
  }, [supabase])

  const fetchLowStockThreshold = useCallback(async () => {
    try {
      const { data, error: settingsError } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'low_stock_threshold')
        .single()

      if (!settingsError && data?.value != null) {
        const parsed =
          typeof data.value === 'number' ? data.value : Number(data.value)
        if (!isNaN(parsed) && parsed > 0) {
          setLowStockThreshold(parsed)
        }
      }
    } catch {
      // default
    }
  }, [supabase])

  const loadRecentLogs = useCallback(async () => {
    try {
      const { logs } = await getInventoryLogs({ limit: 25, offset: 0 })
      setRecentLogs(logs)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
    fetchProductsWithoutVariants()
    fetchLowStockThreshold()
  }, [fetchInventory, fetchProductsWithoutVariants, fetchLowStockThreshold])

  useEffect(() => {
    loadRecentLogs()
  }, [loadRecentLogs])

  const loadVariantLogs = async (variantId: string) => {
    if (variantLogCache[variantId]) return
    setLogsLoadingId(variantId)
    try {
      const { logs } = await getInventoryLogs({ variantId, limit: 30, offset: 0 })
      setVariantLogCache((prev) => ({ ...prev, [variantId]: logs }))
    } catch (e) {
      console.error(e)
      toast.error('Historie laden mislukt')
    } finally {
      setLogsLoadingId(null)
    }
  }

  const startEditing = (
    variant: VariantWithProduct,
    field: 'stock' | 'presale_stock'
  ) => {
    const currentValue =
      field === 'presale_stock'
        ? variant.presale_stock_quantity || 0
        : variant.stock_quantity
    setEditingVariant({
      id: variant.id,
      field,
      value: currentValue,
      originalValue: currentValue,
    })
  }

  const cancelEditing = () => setEditingVariant(null)

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancelEditing()
    if (e.key === 'Enter') void handleSaveEdit()
  }

  const handleSaveEdit = async () => {
    if (!editingVariant) return
    if (editingVariant.value === editingVariant.originalValue) {
      cancelEditing()
      return
    }

    const { id, field, value, originalValue } = editingVariant
    const isPresale = field === 'presale_stock'
    const delta = value - originalValue

    try {
      setAdjustingId(id)
      await postInventoryAdjust({
        variantId: id,
        delta,
        field: isPresale ? 'presale' : 'regular',
        reason: 'manual',
        notes: `Voorraad gezet via admin (${isPresale ? 'presale' : 'regulier'})`,
      })

      cancelEditing()
      await fetchInventory()
      await loadRecentLogs()
      setVariantLogCache((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      toast.success(`Voorraad bijgewerkt: ${originalValue} → ${value}`, {
        duration: 5000,
        icon: '✅',
        style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
      })

      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase">Ongedaan maken?</span>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id)
                try {
                  setAdjustingId(id)
                  await postInventoryAdjust({
                    variantId: id,
                    delta: -delta,
                    field: isPresale ? 'presale' : 'regular',
                    reason: 'manual',
                    notes: 'Undo',
                  })
                  await fetchInventory()
                  await loadRecentLogs()
                  toast.success('Wijziging ongedaan gemaakt', {
                    style: {
                      border: '2px solid black',
                      borderRadius: '0',
                      fontWeight: 'bold',
                    },
                  })
                } catch {
                  toast.error('Kon wijziging niet ongedaan maken')
                } finally {
                  setAdjustingId(null)
                }
              }}
              className="bg-black text-white text-xs font-bold uppercase px-3 py-1"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 8000, style: { border: '2px solid black', borderRadius: '0' } }
      )
    } catch (err: unknown) {
      toast.error(
        `Fout: ${err instanceof Error ? err.message : 'onbekend'}`
      )
    } finally {
      setAdjustingId(null)
    }
  }

  const handleQuickAdjust = async (
    variant: VariantWithProduct,
    field: 'stock' | 'presale_stock',
    delta: number
  ) => {
    if (delta === 0) return
    const id = variant.id
    try {
      setAdjustingId(id)
      await postInventoryAdjust({
        variantId: id,
        delta,
        field: field === 'presale_stock' ? 'presale' : 'regular',
        reason: 'manual',
        notes: 'Snelle aanpassing (+/−)',
      })
      await fetchInventory()
      await loadRecentLogs()
      setVariantLogCache((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success(
        delta > 0 ? `+${delta} toegevoegd` : `${delta} afgeboekt`,
        { style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' } }
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fout')
    } finally {
      setAdjustingId(null)
    }
  }

  const handleTogglePresale = async (variantId: string, enabled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('product_variants')
        .update({ presale_enabled: enabled })
        .eq('id', variantId)

      if (updateError) throw updateError
      fetchInventory()
      toast.success(`Presale ${enabled ? 'ingeschakeld' : 'uitgeschakeld'}`, {
        style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fout')
    }
  }

  const isEditing = (variantId: string, field: 'stock' | 'presale_stock') =>
    editingVariant?.id === variantId && editingVariant?.field === field

  const hasValueChanged = editingVariant
    ? editingVariant.value !== editingVariant.originalValue
    : false

  const searchMatch = (v: VariantWithProduct, q: string) => {
    if (!q.trim()) return true
    const s = q.trim().toLowerCase()
    return (
      v.product.name.toLowerCase().includes(s) ||
      (v.sku && v.sku.toLowerCase().includes(s)) ||
      v.size.toLowerCase().includes(s) ||
      v.color.toLowerCase().includes(s)
    )
  }

  const getFilteredVariants = () => {
    let list = variants
    switch (filter) {
      case 'low':
        list = list.filter(
          (v) => v.stock_quantity > 0 && v.stock_quantity < lowStockThreshold
        )
        break
      case 'out':
        list = list.filter((v) => v.stock_quantity === 0)
        break
      case 'available':
        list = list.filter((v) => v.stock_quantity >= lowStockThreshold)
        break
      default:
        break
    }
    return list.filter((v) => searchMatch(v, searchQuery))
  }

  const filteredVariants = getFilteredVariants()

  const groupedByProduct = useMemo(() => {
    const map = new Map<string, VariantWithProduct[]>()
    for (const v of filteredVariants) {
      const pid = v.product.id
      const arr = map.get(pid) ?? []
      arr.push(v)
      map.set(pid, arr)
    }
    return map
  }, [filteredVariants])

  const getTotalStock = () =>
    variants.reduce((sum, v) => sum + v.stock_quantity, 0)
  const getTotalPresaleStock = () =>
    variants.reduce((sum, v) => sum + (v.presale_stock_quantity || 0), 0)
  const getLowStockCount = () =>
    variants.filter(
      (v) => v.stock_quantity > 0 && v.stock_quantity < lowStockThreshold
    ).length
  const getOutOfStockCount = () =>
    variants.filter((v) => v.stock_quantity === 0).length

  const renderQuickButtons = (
    variant: VariantWithProduct,
    field: 'stock' | 'presale_stock'
  ) => {
    const busy = adjustingId === variant.id
    const presets = [-1, 1, 5, 10]
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {presets.map((d) => (
          <button
            key={d}
            type="button"
            disabled={busy || (field === 'presale_stock' && !variant.presale_enabled)}
            onClick={() => handleQuickAdjust(variant, field, d)}
            className="text-[10px] font-bold uppercase px-1.5 py-0.5 border border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
          >
            {d > 0 ? `+${d}` : `${d}`}
          </button>
        ))}
      </div>
    )
  }

  const renderStockCell = (
    variant: VariantWithProduct,
    field: 'stock' | 'presale_stock'
  ) => {
    const currentValue =
      field === 'presale_stock'
        ? variant.presale_stock_quantity || 0
        : variant.stock_quantity
    const editing = isEditing(variant.id, field)

    if (editing && editingVariant) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <input
              type="number"
              min={0}
              autoFocus
              value={editingVariant.value}
              onChange={(e) =>
                setEditingVariant({
                  ...editingVariant,
                  value: parseInt(e.target.value, 10) || 0,
                })
              }
              onKeyDown={handleEditKeyDown}
              className={`w-20 px-3 py-2 border-2 focus:outline-none transition-colors text-sm ${
                field === 'presale_stock'
                  ? 'border-purple-500 bg-purple-50 font-bold text-purple-700'
                  : 'border-black bg-white font-bold'
              }`}
            />
            {hasValueChanged && (
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                className="bg-black text-white text-xs font-bold uppercase px-3 py-1"
              >
                Opslaan
              </button>
            )}
            <button
              type="button"
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-700 text-xs font-bold uppercase px-2 py-1"
            >
              ✕
            </button>
          </div>
          {field === 'stock' || (field === 'presale_stock' && variant.presale_enabled)
            ? renderQuickButtons(variant, field)
            : null}
        </div>
      )
    }

    if (field === 'presale_stock') {
      return (
        <div>
          <span
            role="button"
            tabIndex={0}
            onClick={() => {
              if (variant.presale_enabled) startEditing(variant, field)
            }}
            onKeyDown={(e) => {
              if (
                (e.key === 'Enter' || e.key === ' ') &&
                variant.presale_enabled
              ) {
                startEditing(variant, field)
              }
            }}
            className={`inline-block px-3 py-2 text-sm font-bold cursor-pointer border-2 border-transparent hover:border-purple-300 transition-colors ${
              variant.presale_enabled ? 'text-purple-700' : 'text-gray-400 cursor-default'
            }`}
          >
            {variant.presale_enabled ? currentValue : '-'}
          </span>
          {variant.presale_enabled ? renderQuickButtons(variant, field) : null}
        </div>
      )
    }

    return (
      <div>
        <span
          role="button"
          tabIndex={0}
          onClick={() => startEditing(variant, field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') startEditing(variant, field)
          }}
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
        {renderQuickButtons(variant, field)}
      </div>
    )
  }

  const renderHistorySection = (variant: VariantWithProduct) => {
    const vid = variant.id
    const isExpanded = expandedVariant === vid
    const cached = variantLogCache[vid]

    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const next = isExpanded ? null : vid
            setExpandedVariant(next)
            if (next && !variantLogCache[vid]) void loadVariantLogs(vid)
          }}
          className="text-xs text-gray-400 hover:text-gray-700 font-bold uppercase tracking-wide"
        >
          {isExpanded ? '▾ Verberg historie' : '▸ Historie (database)'}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {logsLoadingId === vid && (
              <p className="text-xs text-gray-400">Laden…</p>
            )}
            {!logsLoadingId && cached?.length === 0 && (
              <p className="text-xs text-gray-400 italic">Geen registraties</p>
            )}
            {cached?.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center gap-2 text-xs text-gray-600 border-l-2 border-gray-200 pl-2"
              >
                <span className="font-mono">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString('nl-NL')
                    : ''}
                </span>
                <span className="font-bold">
                  {log.inventory_type === 'presale' ? 'Presale' : 'Regulier'}:
                </span>
                <span>
                  {log.previous_stock} → {log.new_stock}
                </span>
                <span className="text-gray-400">({log.reason})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderVariantBlock = (variant: VariantWithProduct) => (
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
          <div className="text-xs text-gray-600">
            {variant.size} / {variant.color}
          </div>
          {variant.sku && (
            <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">
              {variant.sku}
            </code>
          )}
        </div>
        <span className="text-xs font-bold text-gray-900">
          EUR {(variant.product.base_price + variant.price_adjustment).toFixed(2)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Regulier
          </label>
          {renderStockCell(variant, 'stock')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Presale
          </label>
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

      {renderHistorySection(variant)}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Voorraad Beheer</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Zoeken, groeperen en snelle +/−. Levering bulk invoer via de knop rechts.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Link
            href="/admin/inventory/receiving"
            className="text-center bg-black text-white font-bold py-3 px-6 text-sm uppercase tracking-wider border-2 border-black hover:bg-gray-900"
          >
            Levering invoeren
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="search"
            placeholder="Zoek product, SKU, maat, kleur…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-2 border-gray-300 px-4 py-2.5 text-sm font-medium focus:border-black focus:outline-none"
          />
          <InventorySkuScan onSku={(sku) => setSearchQuery(sku)} />
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap text-sm font-bold">
            <input
              type="checkbox"
              checked={groupByProduct}
              onChange={(e) => setGroupByProduct(e.target.checked)}
              className="w-4 h-4"
            />
            Groeperen per product
          </label>
        </div>

        {recentLogs.length > 0 && (
          <div className="bg-gray-50 border-2 border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">
              Recentste mutaties (database)
            </h3>
            <ul className="space-y-1 text-xs text-gray-700 max-h-32 overflow-y-auto">
              {recentLogs.slice(0, 12).map((log) => (
                <li key={log.id} className="flex flex-wrap gap-x-2">
                  <span className="font-mono text-gray-500">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString('nl-NL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                  <span className="font-semibold">{log.product_name || '—'}</span>
                  <span>
                    {log.size}/{log.color}
                  </span>
                  <span>
                    {log.previous_stock}→{log.new_stock}
                  </span>
                  <span className="text-gray-500">({log.inventory_type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-1 sm:mb-2">
            {getTotalStock()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Totale Voorraad
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-purple-200 bg-purple-50">
          <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">
            {getTotalPresaleStock()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Presale Voorraad
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
            {variants.filter((v) => v.stock_quantity >= lowStockThreshold).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Op Voorraad
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-orange-200 bg-orange-50">
          <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">
            {getLowStockCount()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Lage Voorraad
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-red-200 bg-red-50 col-span-2 sm:col-span-1">
          <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
            {getOutOfStockCount()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">
            Uitverkocht
          </div>
        </div>
      </div>

      {productsWithoutVariants.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-2">
                {productsWithoutVariants.length} product
                {productsWithoutVariants.length !== 1 ? 'en' : ''} zonder varianten
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Voeg varianten toe om ze verkoopbaar te maken.
              </p>
              <div className="space-y-2">
                {productsWithoutVariants.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-yellow-300"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{product.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        €{product.base_price.toFixed(2)}
                      </span>
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

      <div className="bg-white border-2 border-gray-200 p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(
            [
              ['all', `Alle (${variants.length})`],
              ['low', `Laag (${getLowStockCount()})`],
              ['out', `Uitverkocht (${getOutOfStockCount()})`],
              [
                'available',
                `Op voorraad (${variants.filter((v) => v.stock_quantity >= lowStockThreshold).length})`,
              ],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
                filter === key
                  ? key === 'all'
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : key === 'low'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : key === 'out'
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200">
        {filteredVariants.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              Geen items in deze categorie
            </h3>
          </div>
        ) : groupByProduct ? (
          <div className="p-3 md:p-4 space-y-6">
            {Array.from(groupedByProduct.entries()).map(([productId, list]) => (
              <div key={productId} className="border-2 border-gray-100">
                <div className="bg-gray-50 px-4 py-2 border-b-2 border-gray-200">
                  <h3 className="font-bold text-gray-900">{list[0]?.product.name}</h3>
                </div>
                <div className="md:hidden space-y-3 p-3">
                  {list.map((v) => renderVariantBlock(v))}
                </div>
                <div className="hidden md:block overflow-x-auto p-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold uppercase">
                          Variant
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold uppercase">
                          Regulier
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold uppercase">
                          Presale
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-bold uppercase">
                          Acties
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((variant) => (
                        <tr key={variant.id}>
                          <td className="px-4 py-3">
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
                                {variant.sku && (
                                  <code className="text-xs text-gray-400">{variant.sku}</code>
                                )}
                              </div>
                            </div>
                            {renderHistorySection(variant)}
                          </td>
                          <td className="px-4 py-3">{renderStockCell(variant, 'stock')}</td>
                          <td className="px-4 py-3">
                            <label className="flex items-center gap-2 cursor-pointer mb-1">
                              <input
                                type="checkbox"
                                checked={variant.presale_enabled}
                                onChange={(e) =>
                                  handleTogglePresale(variant.id, e.target.checked)
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-xs text-purple-700">Presale</span>
                            </label>
                            {variant.presale_enabled &&
                              renderStockCell(variant, 'presale_stock')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/products/${variant.product_id}/variants`}
                              className="text-brand-primary font-semibold text-sm"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-3">
              {filteredVariants.map((variant) => renderVariantBlock(variant))}
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
                    <tr
                      key={variant.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        variant.stock_quantity === 0
                          ? 'bg-red-50'
                          : variant.stock_quantity < lowStockThreshold
                            ? 'bg-orange-50'
                            : ''
                      }`}
                    >
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {variant.product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          €{(variant.product.base_price + variant.price_adjustment).toFixed(2)}
                        </div>
                        {renderHistorySection(variant)}
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
                              onChange={(e) =>
                                handleTogglePresale(variant.id, e.target.checked)
                              }
                              className="w-4 h-4 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-xs font-semibold text-purple-700">
                              {variant.presale_enabled ? 'Aan' : 'Uit'}
                            </span>
                          </label>
                          {variant.presale_enabled &&
                            renderStockCell(variant, 'presale_stock')}
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
