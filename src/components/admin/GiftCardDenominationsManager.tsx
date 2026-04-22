'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronUp, ChevronDown, Trash2, Plus, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

interface Variant {
  id: string
  product_id: string
  size: string
  color: string | null
  color_hex: string | null
  sku: string | null
  price_adjustment: number
  stock_quantity: number
  is_available: boolean
  display_order: number
}

interface Props {
  productId: string
  productName: string
  basePrice: number
}

function parseAmount(value: string): number {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function formatEuro(amount: number): string {
  return `€${amount.toFixed(2)}`
}

function buildSku(productName: string, amount: number): string {
  const clean = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return `GC-${clean || 'CARD'}-${Math.round(amount * 100)}`
}

export default function GiftCardDenominationsManager({
  productId,
  productName,
  basePrice,
}: Props) {
  const supabase = createClient()
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const supabaseRef = useRef(supabase)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabaseRef.current
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        toast.error(`Fout: ${error.message}`)
        setVariants([])
      } else {
        setVariants((data as Variant[]) || [])
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [productId])

  async function refresh() {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    setVariants((data as Variant[]) || [])
  }

  async function handleAdd() {
    const amount = parseAmount(newAmount)
    if (amount <= 0) {
      toast.error('Vul een geldig bedrag in')
      return
    }
    if (amount <= basePrice - 0.005 && basePrice > 0) {
      // price_adjustment would be negative — still allowed, warn subtly but continue
    }
    const label = (newLabel.trim() || formatEuro(amount))
    const delta = Math.round((amount - basePrice) * 100) / 100
    const maxOrder = variants.length > 0 ? Math.max(...variants.map((v) => v.display_order)) : 0
    setSaving(true)
    const { error } = await supabase.from('product_variants').insert([
      {
        product_id: productId,
        size: label,
        color: '—',
        color_hex: null,
        sku: buildSku(productName, amount),
        stock_quantity: 999999,
        presale_stock_quantity: 0,
        presale_enabled: false,
        price_adjustment: delta,
        is_available: true,
        display_order: maxOrder + 1,
      },
    ])
    setSaving(false)
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    toast.success('Coupure toegevoegd')
    setNewAmount('')
    setNewLabel('')
    await refresh()
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Coupure ${label} verwijderen?`)) return
    const { error } = await supabase.from('product_variants').delete().eq('id', id)
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    toast.success('Coupure verwijderd')
    await refresh()
  }

  async function handleToggleAvailable(id: string, current: boolean) {
    const { error } = await supabase
      .from('product_variants')
      .update({ is_available: !current })
      .eq('id', id)
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    await refresh()
  }

  async function handleUpdateAmount(id: string, amount: number) {
    const delta = Math.round((amount - basePrice) * 100) / 100
    const { error } = await supabase
      .from('product_variants')
      .update({ price_adjustment: delta, size: formatEuro(amount), sku: buildSku(productName, amount) })
      .eq('id', id)
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    await refresh()
  }

  async function handleUpdateLabel(id: string, label: string) {
    const next = label.trim()
    if (!next) return
    const { error } = await supabase
      .from('product_variants')
      .update({ size: next })
      .eq('id', id)
    if (error) {
      toast.error(`Fout: ${error.message}`)
      return
    }
    await refresh()
  }

  async function handleMove(id: string, currentOrder: number, direction: 'up' | 'down') {
    const neighbor = variants.find((v) =>
      direction === 'up' ? v.display_order === currentOrder - 1 : v.display_order === currentOrder + 1
    )
    if (!neighbor) return
    const updates = [
      supabase.from('product_variants').update({ display_order: currentOrder }).eq('id', neighbor.id),
      supabase
        .from('product_variants')
        .update({ display_order: direction === 'up' ? currentOrder - 1 : currentOrder + 1 })
        .eq('id', id),
    ]
    const results = await Promise.all(updates)
    const err = results.find((r) => r.error)?.error
    if (err) {
      toast.error(`Fout: ${err.message}`)
      return
    }
    await refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="bg-brand-primary/5 border-2 border-brand-primary/20 p-4 flex items-start gap-3">
        <Gift className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <strong>Coupures van deze cadeaubon.</strong> Ieder coupure is een{' '}
            <code>product_variant</code> waarbij het <em>label</em> de weergegeven waarde is en
            het <em>bedrag</em> = basisprijs ({formatEuro(basePrice)}) + aanpassing.
          </p>
          <p className="text-xs text-gray-600">
            Tip: de volgorde hieronder bepaalt de volgorde op de productpagina. De laagste
            coupure verschijnt links bovenaan.
          </p>
        </div>
      </div>

      {/* Denominations list */}
      <div className="bg-white border-2 border-gray-200">
        {variants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nog geen coupures. Voeg er hieronder eentje toe.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {variants.map((variant, index) => {
              const isFirst = index === 0
              const isLast = index === variants.length - 1
              const amount = Math.round((basePrice + variant.price_adjustment) * 100) / 100
              return (
                <li
                  key={variant.id}
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
                >
                  {/* Order controls */}
                  <div className="flex md:flex-col gap-1 order-2 md:order-none">
                    <button
                      type="button"
                      onClick={() => handleMove(variant.id, variant.display_order, 'up')}
                      disabled={isFirst}
                      className={`p-1 border-2 transition-colors ${
                        isFirst
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                      }`}
                      aria-label="Verplaats omhoog"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(variant.id, variant.display_order, 'down')}
                      disabled={isLast}
                      className={`p-1 border-2 transition-colors ${
                        isLast
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 hover:border-black hover:bg-gray-100 text-gray-700'
                      }`}
                      aria-label="Verplaats omlaag"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Label */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        defaultValue={variant.size}
                        onBlur={(e) =>
                          e.target.value.trim() !== variant.size &&
                          void handleUpdateLabel(variant.id, e.target.value)
                        }
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                        placeholder="€25"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Bedrag (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={amount.toFixed(2)}
                        onBlur={(e) => {
                          const next = parseAmount(e.target.value)
                          if (next > 0 && Math.abs(next - amount) > 0.001) {
                            void handleUpdateAmount(variant.id, next)
                          }
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
                      />
                      {variant.price_adjustment !== 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          basis {formatEuro(basePrice)}{' '}
                          {variant.price_adjustment >= 0 ? '+' : '−'}{' '}
                          {formatEuro(Math.abs(variant.price_adjustment))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Available + delete */}
                  <div className="flex items-center gap-2 order-3 md:order-none">
                    <button
                      type="button"
                      onClick={() => void handleToggleAvailable(variant.id, variant.is_available)}
                      className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors ${
                        variant.is_available
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {variant.is_available ? 'Actief' : 'Inactief'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(variant.id, variant.size)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Coupure verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Add form */}
      <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nieuwe coupure toevoegen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Bedrag (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
              placeholder="25.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Label <span className="text-gray-400 font-normal normal-case">(optioneel)</span>
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="€25"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laat leeg om automatisch €-label te gebruiken
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving || !newAmount}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Toevoegen...' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  )
}
