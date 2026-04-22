'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { postInventoryReceive } from '@/lib/admin/inventory-api'
import type { VariantWithProduct } from '@/components/admin/inventory/InventoryManager'
import {
  sortVariantsByColorSize,
  sortVariantsByProductColorSize,
} from '@/lib/variant-sort'

type Line = {
  variantId: string
  quantityAdded: number
  inventoryType: 'regular' | 'presale'
  label: string
}

type Step = 1 | 2 | 3

export default function ReceivingWizard() {
  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [expectedTotal, setExpectedTotal] = useState<string>('')
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [matrixProductId, setMatrixProductId] = useState<string | null>(null)
  const [matrixQty, setMatrixQty] = useState<Record<string, string>>({})
  const [csvText, setCsvText] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [manualSku, setManualSku] = useState('')
  const [manualQty, setManualQty] = useState(1)
  const [manualType, setManualType] = useState<'regular' | 'presale'>('regular')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'matrix' | 'csv' | 'manual'>('matrix')

  const supabase = createClient()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_variants')
        .select(
          `
          *,
          product:products(id, name, base_price)
        `
        )

      if (error) throw error
      const rows = sortVariantsByProductColorSize(
        (data as VariantWithProduct[]) || []
      )
      setVariants(rows)
      const firstPid = rows[0]?.product?.id
      if (firstPid) setMatrixProductId(firstPid)
    } catch (e) {
      console.error(e)
      toast.error('Kon voorraad niet laden')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  const products = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of variants) {
      map.set(v.product.id, v.product.name)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [variants])

  const matrixVariants = useMemo(() => {
    if (!matrixProductId) return []
    return sortVariantsByColorSize(
      variants.filter((v) => v.product.id === matrixProductId)
    )
  }, [variants, matrixProductId])

  const skuToVariant = useMemo(() => {
    const m = new Map<string, VariantWithProduct>()
    for (const v of variants) {
      if (v.sku) m.set(v.sku.trim().toLowerCase(), v)
    }
    return m
  }, [variants])

  const addOrMergeLine = (
    variantId: string,
    qty: number,
    inventoryType: 'regular' | 'presale',
    label: string
  ) => {
    if (qty <= 0) return
    setLines((prev) => {
      const i = prev.findIndex(
        (l) =>
          l.variantId === variantId && l.inventoryType === inventoryType
      )
      if (i >= 0) {
        const next = [...prev]
        next[i] = {
          ...next[i],
          quantityAdded: next[i].quantityAdded + qty,
        }
        return next
      }
      return [
        ...prev,
        { variantId, quantityAdded: qty, inventoryType, label },
      ]
    })
  }

  const applyMatrix = () => {
    let n = 0
    for (const v of matrixVariants) {
      const raw = matrixQty[v.id]?.trim()
      if (!raw) continue
      const q = parseInt(raw, 10)
      if (!Number.isFinite(q) || q <= 0) continue
      addOrMergeLine(
        v.id,
        q,
        'regular',
        `${v.product.name} ${v.size}/${v.color}`
      )
      n += q
    }
    setMatrixQty({})
    toast.success(`${n} stuks toegevoegd aan concept`, {
      style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
    })
  }

  const parseCsv = () => {
    const rows = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    let added = 0
    let bad = 0
    for (const row of rows) {
      const parts = row.split(/[,\t;]/).map((p) => p.trim())
      if (parts.length < 2) {
        bad++
        continue
      }
      const sku = parts[0].toLowerCase()
      const qty = parseInt(parts[1], 10)
      if (!Number.isFinite(qty) || qty <= 0) {
        bad++
        continue
      }
      const v = skuToVariant.get(sku)
      if (!v) {
        bad++
        continue
      }
      addOrMergeLine(
        v.id,
        qty,
        'regular',
        `${v.product.name} ${v.size}/${v.color}`
      )
      added += qty
    }
    toast(
      `CSV: ${added} stuks verwerkt${bad ? `, ${bad} regels overgeslagen` : ''}`,
      { style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' } }
    )
  }

  const addManual = () => {
    const sku = manualSku.trim().toLowerCase()
    const v = skuToVariant.get(sku)
    if (!v) {
      toast.error('SKU niet gevonden')
      return
    }
    addOrMergeLine(
      v.id,
      manualQty,
      manualType,
      `${v.product.name} ${v.size}/${v.color}`
    )
    setManualSku('')
    toast.success('Regel toegevoegd')
  }

  const lineSum = useMemo(
    () => lines.reduce((s, l) => s + l.quantityAdded, 0),
    [lines]
  )

  const expectedNum = expectedTotal.trim()
    ? parseInt(expectedTotal, 10)
    : NaN
  const expectedOk =
    !Number.isFinite(expectedNum) || expectedNum === lineSum

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Titel is verplicht')
      return
    }
    if (lines.length === 0) {
      toast.error('Voeg minstens één regel toe')
      return
    }
    try {
      setSubmitting(true)
      await postInventoryReceive({
        title: title.trim(),
        notes: notes.trim() || null,
        expectedTotal: Number.isFinite(expectedNum) ? expectedNum : null,
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantityAdded: l.quantityAdded,
          inventoryType: l.inventoryType,
        })),
      })
      toast.success('Levering opgeslagen', {
        style: { border: '2px solid black', borderRadius: '0', fontWeight: 'bold' },
      })
      setLines([])
      setStep(1)
      setTitle('')
      setNotes('')
      setExpectedTotal('')
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fout bij opslaan')
    } finally {
      setSubmitting(false)
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
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/inventory"
            className="text-sm font-bold text-brand-primary hover:underline mb-2 inline-block"
          >
            ← Terug naar voorraad
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Levering invoeren</h1>
          <p className="text-gray-600 text-sm mt-1">
            Stap {step}/3 — bulk ontvangst (desktop & mobiel)
          </p>
        </div>
        <div className="flex gap-2 text-xs font-bold uppercase">
          <span
            className={`px-3 py-1 border-2 ${step === 1 ? 'bg-black text-white' : 'border-gray-300'}`}
          >
            1 Gegevens
          </span>
          <span
            className={`px-3 py-1 border-2 ${step === 2 ? 'bg-black text-white' : 'border-gray-300'}`}
          >
            2 Regels
          </span>
          <span
            className={`px-3 py-1 border-2 ${step === 3 ? 'bg-black text-white' : 'border-gray-300'}`}
          >
            3 Controle
          </span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-gray-600">Titel *</span>
            <input
              className="mt-1 w-full border-2 border-gray-300 px-4 py-3 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bv. Levering april 2026"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-gray-600">Notities</span>
            <textarea
              className="mt-1 w-full border-2 border-gray-300 px-4 py-3 text-sm min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-gray-600">
              Verwacht totaal stuks (optioneel, bv. 225)
            </span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border-2 border-gray-300 px-4 py-3 text-sm max-w-xs"
              value={expectedTotal}
              onChange={(e) => setExpectedTotal(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!title.trim()}
            className="w-full sm:w-auto bg-black text-white font-bold py-3 px-8 uppercase text-sm disabled:opacity-40"
          >
            Volgende
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b-2 border-gray-200 pb-2">
            {(
              [
                ['matrix', 'Matrix per product'],
                ['csv', 'CSV / plakken'],
                ['manual', 'Handmatig'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-bold uppercase border-2 ${
                  activeTab === key
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'matrix' && (
            <div className="bg-white border-2 border-gray-200 p-4 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase">Product</span>
                <select
                  className="mt-1 w-full border-2 border-gray-300 px-3 py-2 text-sm"
                  value={matrixProductId ?? ''}
                  onChange={(e) => setMatrixProductId(e.target.value || null)}
                >
                  {products.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-gray-500">
                Vul per variant het aantal stuks dat je bij wilt boeken (alleen positieve getallen).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                {matrixVariants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 border border-gray-200 p-2"
                  >
                    <div className="min-w-0 text-sm">
                      <div className="font-bold">
                        {v.size} · {v.color}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{v.sku}</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className="w-20 border-2 border-gray-300 px-2 py-1 text-sm font-bold"
                      value={matrixQty[v.id] ?? ''}
                      onChange={(e) =>
                        setMatrixQty((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={applyMatrix}
                className="bg-black text-white font-bold py-2 px-6 uppercase text-sm"
              >
                Toevoegen aan concept
              </button>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="bg-white border-2 border-gray-200 p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Eén regel per stuk: <code className="bg-gray-100 px-1">SKU,aantal</code> of
                gescheiden door tab. Alleen reguliere voorraad.
              </p>
              <textarea
                className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-mono min-h-[160px]"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'MOSE-TSHIRT-S-BLACK,10\nMOSE-TSHIRT-M-BLACK,15'}
              />
              <button
                type="button"
                onClick={parseCsv}
                className="bg-black text-white font-bold py-2 px-6 uppercase text-sm"
              >
                Verwerk plaktekst
              </button>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="bg-white border-2 border-gray-200 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="sm:col-span-2">
                  <span className="text-xs font-bold uppercase">SKU</span>
                  <input
                    className="mt-1 w-full border-2 border-gray-300 px-3 py-2 text-sm"
                    value={manualSku}
                    onChange={(e) => setManualSku(e.target.value)}
                  />
                </label>
                <label>
                  <span className="text-xs font-bold uppercase">Aantal</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full border-2 border-gray-300 px-3 py-2 text-sm"
                    value={manualQty}
                    onChange={(e) => setManualQty(parseInt(e.target.value, 10) || 1)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold">
                <span>Type</span>
                <select
                  className="border-2 border-gray-300 px-2 py-1"
                  value={manualType}
                  onChange={(e) =>
                    setManualType(e.target.value === 'presale' ? 'presale' : 'regular')
                  }
                >
                  <option value="regular">Regulier</option>
                  <option value="presale">Presale</option>
                </select>
              </label>
              <button
                type="button"
                onClick={addManual}
                className="bg-black text-white font-bold py-2 px-6 uppercase text-sm"
              >
                Regel toevoegen
              </button>
            </div>
          )}

          <div className="bg-gray-50 border-2 border-gray-200 p-4">
            <h3 className="font-bold text-sm uppercase mb-2">
              Conceptregels ({lines.length}) — som: {lineSum}
            </h3>
            {lines.length === 0 ? (
              <p className="text-sm text-gray-500">Nog geen regels.</p>
            ) : (
              <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {lines.map((l, idx) => (
                  <li key={`${l.variantId}-${l.inventoryType}-${idx}`} className="flex justify-between gap-2">
                    <span className="truncate">{l.label}</span>
                    <span className="font-mono shrink-0">
                      +{l.quantityAdded} ({l.inventoryType})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="border-2 border-gray-400 px-6 py-3 font-bold uppercase text-sm"
            >
              Vorige
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={lines.length === 0}
              className="bg-black text-white font-bold py-3 px-8 uppercase text-sm disabled:opacity-40"
            >
              Naar controle
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
          <h2 className="font-bold text-lg">{title}</h2>
          {notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>}
          <div
            className={`text-sm font-bold p-3 border-2 ${
              expectedOk ? 'border-green-600 bg-green-50' : 'border-orange-500 bg-orange-50'
            }`}
          >
            Som regels: <strong>{lineSum}</strong>
            {Number.isFinite(expectedNum) && (
              <>
                {' '}
                · Verwacht: <strong>{expectedNum}</strong>
                {!expectedOk && ' — let op: komt niet overeen'}
              </>
            )}
          </div>
          <ul className="text-sm space-y-1 max-h-60 overflow-y-auto border border-gray-200 p-2">
            {lines.map((l, idx) => (
              <li key={`${l.variantId}-${idx}`}>
                {l.label} — +{l.quantityAdded} ({l.inventoryType})
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="border-2 border-gray-400 px-6 py-3 font-bold uppercase text-sm"
            >
              Vorige
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="bg-black text-white font-bold py-3 px-8 uppercase text-sm disabled:opacity-50"
            >
              {submitting ? 'Bezig…' : 'Bevestigen & boeken'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
