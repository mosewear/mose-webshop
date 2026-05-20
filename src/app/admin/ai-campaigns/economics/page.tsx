'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Coins,
  ChevronDown,
  ChevronRight,
  Trash2,
  Info,
} from 'lucide-react'

interface VariantRow {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  stock_quantity: number | null
  price_adjustment: number | null
  is_available: boolean | null
}

interface ProductRow {
  id: string
  name: string
  slug: string
  base_price: number
  sale_price: number | null
  is_active: boolean
  status: string
  product_variants: VariantRow[]
}

interface EconomicsRow {
  id: string
  product_id: string
  variant_id: string | null
  cost_price: number
  shipping_cost_avg: number
  transaction_fee_pct: number
  vat_rate: number
  notes: string | null
}

interface DraftEconomics {
  cost_price: string
  shipping_cost_avg: string
  transaction_fee_pct_pct: string
  vat_rate_pct: string
  notes: string
}

const DEFAULT_DRAFT: DraftEconomics = {
  cost_price: '',
  shipping_cost_avg: '0',
  transaction_fee_pct_pct: '2.9',
  vat_rate_pct: '21',
  notes: '',
}

const CSV_TEMPLATE = `sku,cost_price,shipping_cost_avg,transaction_fee_pct,vat_rate,notes
MOSE-HOOD-BRN-M,28.50,4.20,0.029,0.21,
MOSE-HOOD-BRN-L,28.50,4.20,0.029,0.21,
MOSE-TEE-WHT-S,7.25,3.10,0.029,0.21,seasonal SKU
`

export default function EconomicsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [economics, setEconomics] = useState<EconomicsRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftEconomics>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set())
  const [showImport, setShowImport] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState<null | {
    imported: number
    updated: number
    skipped: Array<{ row: number; reason: string }>
  }>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ai-campaigns/economics', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `GET failed (${res.status})`)
      }
      const data = (await res.json()) as { products: ProductRow[]; economics: EconomicsRow[] }
      setProducts(data.products)
      setEconomics(data.economics)
      const map: Record<string, DraftEconomics> = {}
      data.economics.forEach((e) => {
        map[keyOf(e.product_id, e.variant_id)] = {
          cost_price: e.cost_price.toString(),
          shipping_cost_avg: e.shipping_cost_avg.toString(),
          transaction_fee_pct_pct: (e.transaction_fee_pct * 100).toString(),
          vat_rate_pct: (e.vat_rate * 100).toString(),
          notes: e.notes ?? '',
        }
      })
      setDrafts(map)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const economicsByKey = useMemo(() => {
    const m = new Map<string, EconomicsRow>()
    economics.forEach((e) => m.set(keyOf(e.product_id, e.variant_id), e))
    return m
  }, [economics])

  const productLevelFallbacks = useMemo(() => {
    const set = new Set<string>()
    economics.forEach((e) => {
      if (e.variant_id === null) set.add(e.product_id)
    })
    return set
  }, [economics])

  const updateDraftField = (key: string, field: keyof DraftEconomics, value: string) => {
    setDrafts((d) => ({
      ...d,
      [key]: { ...(d[key] ?? DEFAULT_DRAFT), [field]: value },
    }))
  }

  const handleSave = async (productId: string, variantId: string | null) => {
    const key = keyOf(productId, variantId)
    const draft = drafts[key] ?? DEFAULT_DRAFT
    const cost_price = toNumber(draft.cost_price)
    if (cost_price === null || cost_price < 0) {
      setError(`Kostprijs voor ${key} is ongeldig`)
      return
    }
    const shipping_cost_avg = toNumber(draft.shipping_cost_avg) ?? 0
    const transaction_fee_pct = (toNumber(draft.transaction_fee_pct_pct) ?? 2.9) / 100
    const vat_rate = (toNumber(draft.vat_rate_pct) ?? 21) / 100

    setSavingKey(key)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ai-campaigns/economics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId,
          cost_price,
          shipping_cost_avg,
          transaction_fee_pct,
          vat_rate,
          notes: draft.notes || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Save failed (${res.status})`)
      }
      await load()
      setMessage('Opgeslagen.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Opslaan mislukt'
      setError(msg)
    } finally {
      setSavingKey(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deze regel verwijderen?')) return
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/ai-campaigns/economics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Delete failed (${res.status})`)
      }
      await load()
      setMessage('Verwijderd.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verwijderen mislukt'
      setError(msg)
    }
  }

  const handleImport = async () => {
    setImportBusy(true)
    setImportResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/ai-campaigns/economics/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Import failed (${res.status})`)
      setImportResult({
        imported: body.imported,
        updated: body.updated,
        skipped: body.skipped ?? [],
      })
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Importeren mislukt'
      setError(msg)
    } finally {
      setImportBusy(false)
    }
  }

  const toggleExpanded = (productId: string) => {
    setExpandedProductIds((s) => {
      const next = new Set(s)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/ai-campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar Campagne AI
        </Link>
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-lg">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">SKU economics</h1>
              <p className="text-sm text-gray-600 max-w-2xl">
                Kostprijs, verzendkosten en transactie-fee per product of variant. De autopilot
                gebruikt deze waarden om <strong>contributie-marge</strong> uit te rekenen in plaats van
                op het ruwe Meta-ROAS te sturen.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-black text-gray-900 rounded-lg text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            CSV-import
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">Hoe het werkt</p>
          <ul className="list-disc pl-5 space-y-1 text-blue-800">
            <li>
              Vul per product een <strong>product-level fallback</strong> in (variant_id = null) zodat
              de autopilot ook werkt als variant-rijen ontbreken.
            </li>
            <li>
              Overschrijf per variant alleen wanneer de kosten echt verschillen (bv. een grotere
              hoodie weegt meer en heeft hogere verzendkosten).
            </li>
            <li>
              Margepreview gebruikt <code className="text-xs">sale_price ?? base_price + variant.price_adjustment</code>{' '}
              minus VAT, COGS, verzendkosten en transactie-fee.
            </li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-600">
          Geen actieve producten gevonden.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const productKey = keyOf(product.id, null)
            const productDraft = drafts[productKey] ?? DEFAULT_DRAFT
            const productExisting = economicsByKey.get(productKey)
            const expanded = expandedProductIds.has(product.id)
            const variantCoveredCount = product.product_variants.filter((v) =>
              economicsByKey.has(keyOf(product.id, v.id))
            ).length
            const hasFallback = productLevelFallbacks.has(product.id)

            return (
              <article
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    onClick={() => toggleExpanded(product.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        Basisprijs €{product.base_price.toFixed(2)}
                        {product.sale_price !== null && product.sale_price !== undefined && (
                          <> — actieprijs €{Number(product.sale_price).toFixed(2)}</>
                        )}{' '}
                        · {product.product_variants.length} varianten · {variantCoveredCount} met
                        economics
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    {hasFallback ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Product-level fallback aanwezig
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Geen product-level fallback
                      </span>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="divide-y divide-gray-100">
                    <EconomicsRowEditor
                      label="Product-level fallback (variant_id = null)"
                      draft={productDraft}
                      existing={productExisting}
                      saving={savingKey === productKey}
                      onChange={(field, value) => updateDraftField(productKey, field, value)}
                      onSave={() => handleSave(product.id, null)}
                      onDelete={productExisting ? () => handleDelete(productExisting.id) : undefined}
                      effectivePrice={effectivePrice(product, null)}
                    />

                    {product.product_variants.map((variant) => {
                      const variantKey = keyOf(product.id, variant.id)
                      const draft = drafts[variantKey] ?? DEFAULT_DRAFT
                      const existing = economicsByKey.get(variantKey)
                      return (
                        <EconomicsRowEditor
                          key={variant.id}
                          label={`Variant · ${formatVariant(variant)}`}
                          subLabel={`SKU ${variant.sku ?? '—'} · voorraad ${variant.stock_quantity ?? 0}`}
                          draft={draft}
                          existing={existing}
                          saving={savingKey === variantKey}
                          onChange={(field, value) => updateDraftField(variantKey, field, value)}
                          onSave={() => handleSave(product.id, variant.id)}
                          onDelete={existing ? () => handleDelete(existing.id) : undefined}
                          effectivePrice={effectivePrice(product, variant)}
                          isFallbackInherited={!existing && !!productExisting}
                        />
                      )
                    })}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {showImport && (
        <ImportDialog
          csvText={csvText}
          onCsvChange={setCsvText}
          onClose={() => {
            setShowImport(false)
            setImportResult(null)
          }}
          onImport={handleImport}
          busy={importBusy}
          result={importResult}
        />
      )}
    </div>
  )
}

function EconomicsRowEditor({
  label,
  subLabel,
  draft,
  existing,
  saving,
  onChange,
  onSave,
  onDelete,
  effectivePrice,
  isFallbackInherited,
}: {
  label: string
  subLabel?: string
  draft: DraftEconomics
  existing: EconomicsRow | undefined
  saving: boolean
  onChange: (field: keyof DraftEconomics, value: string) => void
  onSave: () => void
  onDelete?: () => void
  effectivePrice: number | null
  isFallbackInherited?: boolean
}) {
  const cost = toNumber(draft.cost_price) ?? 0
  const shipping = toNumber(draft.shipping_cost_avg) ?? 0
  const feePct = (toNumber(draft.transaction_fee_pct_pct) ?? 0) / 100
  const vatPct = (toNumber(draft.vat_rate_pct) ?? 0) / 100

  const marginPerUnit =
    effectivePrice !== null
      ? effectivePrice / (1 + vatPct) - cost - shipping - effectivePrice * feePct
      : null
  const marginPct =
    effectivePrice !== null && effectivePrice > 0 && marginPerUnit !== null
      ? marginPerUnit / (effectivePrice / (1 + vatPct))
      : null

  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          {subLabel && <div className="text-xs text-gray-500">{subLabel}</div>}
          {isFallbackInherited && (
            <div className="text-xs text-blue-700 mt-1">
              Gebruikt momenteel de product-level fallback. Vul hieronder iets in om te overschrijven.
            </div>
          )}
        </div>
        <div className="text-sm font-mono">
          {effectivePrice === null ? (
            <span className="text-gray-400">geen prijs</span>
          ) : marginPerUnit === null ? (
            <span className="text-gray-400">—</span>
          ) : (
            <span className={marginPerUnit >= 0 ? 'text-green-700' : 'text-red-700'}>
              €{marginPerUnit.toFixed(2)} / stuk
              {marginPct !== null && <> ({(marginPct * 100).toFixed(1)} %)</>}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Field
          label="Kostprijs"
          suffix="€"
          inputMode="decimal"
          value={draft.cost_price}
          onChange={(v) => onChange('cost_price', v)}
          step="0.01"
        />
        <Field
          label="Verzendkosten avg"
          suffix="€"
          inputMode="decimal"
          value={draft.shipping_cost_avg}
          onChange={(v) => onChange('shipping_cost_avg', v)}
          step="0.01"
        />
        <Field
          label="Transactie-fee"
          suffix="%"
          inputMode="decimal"
          value={draft.transaction_fee_pct_pct}
          onChange={(v) => onChange('transaction_fee_pct_pct', v)}
          step="0.01"
        />
        <Field
          label="VAT"
          suffix="%"
          inputMode="decimal"
          value={draft.vat_rate_pct}
          onChange={(v) => onChange('vat_rate_pct', v)}
          step="0.5"
        />
        <Field
          label="Notitie"
          value={draft.notes}
          onChange={(v) => onChange('notes', v)}
          placeholder="optioneel"
        />
      </div>
      <div className="mt-3 flex items-center gap-2 justify-end">
        {onDelete && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md text-red-700 hover:bg-red-50 border border-red-200"
          >
            <Trash2 className="w-3 h-3" />
            Verwijderen
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md text-white bg-black hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Opslaan…' : existing ? 'Bijwerken' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  inputMode,
  step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  placeholder?: string
  inputMode?: 'decimal' | 'text'
  step?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <div className="relative">
        <input
          type={inputMode === 'decimal' ? 'number' : 'text'}
          inputMode={inputMode}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm px-2.5 py-1.5 pr-7 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

function ImportDialog({
  csvText,
  onCsvChange,
  onClose,
  onImport,
  busy,
  result,
}: {
  csvText: string
  onCsvChange: (v: string) => void
  onClose: () => void
  onImport: () => void
  busy: boolean
  result: null | {
    imported: number
    updated: number
    skipped: Array<{ row: number; reason: string }>
  }
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">SKU economics CSV-import</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
            Sluiten
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Plak een CSV met kolommen <code>sku</code> (of <code>product_id</code> / <code>product_slug</code>),
          <code>cost_price</code>, optioneel <code>shipping_cost_avg</code>,{' '}
          <code>transaction_fee_pct</code>, <code>vat_rate</code>, <code>notes</code>. Fees en VAT zijn
          fracties (0.029 = 2.9 %).
        </p>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onCsvChange(CSV_TEMPLATE)}
            className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-gray-400 text-gray-700"
          >
            Voorbeeld invullen
          </button>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => onCsvChange(e.target.value)}
          rows={12}
          className="w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          placeholder={CSV_TEMPLATE}
        />
        {result && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
            <div className="font-medium text-gray-900">
              {result.imported} toegevoegd · {result.updated} bijgewerkt · {result.skipped.length}{' '}
              overgeslagen
            </div>
            {result.skipped.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-red-700 space-y-1">
                {result.skipped.slice(0, 20).map((s) => (
                  <li key={`${s.row}-${s.reason}`}>
                    Rij {s.row}: {s.reason}
                  </li>
                ))}
                {result.skipped.length > 20 && <li>… en {result.skipped.length - 20} meer</li>}
              </ul>
            )}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Annuleren
          </button>
          <button
            onClick={onImport}
            disabled={busy || csvText.trim().length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-black hover:bg-gray-800 text-white rounded-md disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {busy ? 'Importeren…' : 'Importeren'}
          </button>
        </div>
      </div>
    </div>
  )
}

function keyOf(productId: string, variantId: string | null): string {
  return `${productId}::${variantId ?? 'null'}`
}

function toNumber(input: string): number | null {
  if (input === '' || input === null || input === undefined) return null
  const cleaned = input.replace(',', '.').replace(/[^0-9.\-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function formatVariant(v: VariantRow): string {
  const parts = [v.size, v.color].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : 'standaard'
}

function effectivePrice(product: ProductRow, variant: VariantRow | null): number | null {
  const base =
    product.sale_price !== null && product.sale_price !== undefined
      ? Number(product.sale_price)
      : Number(product.base_price)
  if (!Number.isFinite(base)) return null
  const adj = variant?.price_adjustment ? Number(variant.price_adjustment) : 0
  const v = base + (Number.isFinite(adj) ? adj : 0)
  return Number.isFinite(v) ? v : null
}
