'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { InventoryAdjustError, postInventoryAdjust } from '@/lib/admin/inventory-api'

type Props = {
  variantId: string
  quantity: number
  label: string
  onSaved: (quantity: number) => void
}

/** Absolute counts use the observed quantity as a compare-and-set fence. */
export default function StockQuantityEditor({ variantId, quantity, label, onSaved }: Props) {
  const [draft, setDraft] = useState<{ value: string; original: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [conflictStock, setConflictStock] = useState<number | null>(null)
  const statusId = useId()
  const value = draft?.value ?? String(quantity)
  const valid = /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647
  const dirty = draft !== null && (!valid || Number(value) !== draft.original)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = (next: string) => {
    setDraft(current => ({ value: next, original: current?.original ?? quantity }))
    setMessage('')
    setError('')
  }
  const save = async () => {
    if (busy.current || !draft || !dirty || !valid || conflictStock !== null) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const { result } = await postInventoryAdjust({
        variantId, field: 'regular', delta: Number(draft.value) - draft.original,
        expectedStock: draft.original, reason: 'manual', notes: 'Voorraad ingesteld in MOSE admin',
      })
      const saved = result.new_stock
      // Never turn an unconfirmed response into a success display.
      if (typeof saved !== 'number' || !Number.isSafeInteger(saved) || saved < 0) {
        throw new Error('De nieuwe voorraad is nog niet bevestigd. Probeer dezelfde wijziging opnieuw.')
      }
      onSaved(saved)
      setDraft(null)
      setMessage(result.shopify_pending ? `${saved} opgeslagen · Shopify wordt bijgewerkt` : `${saved} opgeslagen`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Opslaan mislukt. Probeer opnieuw.')
      if (cause instanceof InventoryAdjustError && cause.currentStock !== undefined) setConflictStock(cause.currentStock)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-1.5" aria-busy={saving}>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`Verlaag voorraad ${label}`} disabled={saving || !valid || Number(value) === 0 || conflictStock !== null}
          onClick={() => change(String(Number(value) - 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30"><Minus size={15} /></button>
        <input type="number" min={0} max={2147483647} step={1} inputMode="numeric" aria-label={`Voorraad ${label}`}
          aria-describedby={statusId} aria-invalid={!valid || !!error} value={value} disabled={saving || conflictStock !== null}
          onChange={event => change(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); void save() }
            if (event.key === 'Escape' && !busy.current) { setDraft(null); setError(''); setConflictStock(null) }
          }}
          className={`h-10 w-20 min-w-0 border-2 bg-white px-2 text-center text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${dirty ? 'border-brand-primary' : 'border-gray-200'}`} />
        <button type="button" aria-label={`Verhoog voorraad ${label}`} disabled={saving || !valid || Number(value) >= 2147483647 || conflictStock !== null}
          onClick={() => change(String(Number(value) + 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30"><Plus size={15} /></button>
        {dirty && <button type="button" disabled={saving || !valid || conflictStock !== null} onClick={() => void save()}
          aria-label={`Sla voorraad ${label} op`}
          className="h-10 bg-black px-3 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-40">{saving ? 'Opslaan…' : 'Opslaan'}</button>}
      </div>
      <div id={statusId} className="text-xs leading-5" aria-live="polite">
        {!valid ? <p className="text-red-700">Vul een heel aantal van 0 t/m 2.147.483.647 in.</p>
          : error ? <p role="alert" className="max-w-xs whitespace-normal text-red-700">{error}</p>
          : dirty ? <p className="text-amber-800">{draft?.original} → {value} · nog niet opgeslagen</p>
          : message ? <p className="inline-flex items-center gap-1 text-green-800"><Check size={13} />{message}</p>
          : <p className={quantity === 0 ? 'text-red-700' : quantity < 5 ? 'text-amber-800' : 'text-gray-500'}>{quantity === 0 ? 'Uitverkocht' : quantity < 5 ? 'Lage voorraad' : 'Op voorraad'}</p>}
      </div>
      {conflictStock !== null && <button type="button" className="text-xs font-bold underline" onClick={() => {
        onSaved(conflictStock)
        setDraft(current => current ? { ...current, original: conflictStock } : null)
        setConflictStock(null)
        setError('')
      }}>Actuele voorraad ({conflictStock}) laden en wijziging controleren</button>}
    </div>
  )
}
