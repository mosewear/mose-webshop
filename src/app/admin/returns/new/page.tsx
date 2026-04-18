'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Package, Search } from 'lucide-react'

type LabelMode =
  | 'admin_generated'
  | 'customer_paid'
  | 'customer_free'
  | 'in_store'

type InStoreState = 'approved' | 'received'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  size: string
  color: string
  quantity: number
  price_at_purchase: number
  image_url: string | null
  already_returned_quantity?: number
}

interface Order {
  id: string
  email: string
  total: number
  status: string
  created_at: string
  delivered_at: string | null
  shipping_address: any
  order_items: OrderItem[]
}

const RETURN_REASONS = [
  'Past niet goed',
  'Niet wat ik verwachtte',
  'Defect product',
  'Verkeerde maat/kleur geleverd',
  'Coulance',
  'Anders',
]

const LABEL_MODE_OPTIONS: Array<{
  id: LabelMode
  title: string
  description: string
}> = [
  {
    id: 'admin_generated',
    title: 'Admin genereert retourlabel nu',
    description:
      'Sendcloud-label wordt direct aangemaakt en naar de klant gemaild. Status → "Label Beschikbaar".',
  },
  {
    id: 'customer_paid',
    title: 'Klant betaalt zelf voor retourlabel',
    description:
      'Klant krijgt een mail met link naar het portaal om de labelkosten af te rekenen. Status → "Betaling Label".',
  },
  {
    id: 'customer_free',
    title: 'Gratis retourlabel — klant genereert in portaal',
    description:
      'Geen betaling nodig. Klant ziet in het portaal een knop "Retourlabel aanmaken" en ontvangt na generatie een label-mail.',
  },
  {
    id: 'in_store',
    title: 'Geen label — pakket in de winkel',
    description:
      'Voor klanten die het pakket bij ons langsbrengen. Kies zelf of de retour nog onderweg is of al binnen.',
  },
]

export default function AdminCreateReturnPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 – order search
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Step 2 – item selection
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { quantity: number; reason: string }>
  >({})
  const [returnReason, setReturnReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [refundOverride, setRefundOverride] = useState<string>('')

  // Step 3 – label mode + submit
  const [labelMode, setLabelMode] = useState<LabelMode>('admin_generated')
  const [inStoreState, setInStoreState] = useState<InStoreState>('approved')
  const [sendEmail, setSendEmail] = useState(true)
  const [force, setForce] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ---------- Step 1 helpers ----------
  useEffect(() => {
    const handle = setTimeout(() => runSearch(searchTerm), 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  async function runSearch(term: string) {
    setSearchLoading(true)
    try {
      const params = new URLSearchParams()
      const trimmed = term.trim()
      if (trimmed) params.set('q', trimmed)

      const res = await fetch(`/api/admin/orders/search?${params.toString()}`, {
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || res.statusText || 'Zoeken mislukt')
      }
      setOrders((body.orders as Order[]) || [])
    } catch (err: unknown) {
      console.error('Order search error:', err)
      const message = err instanceof Error ? err.message : 'Zoeken mislukt'
      toast.error(message)
    } finally {
      setSearchLoading(false)
    }
  }

  function pickOrder(order: Order) {
    setSelectedOrder(order)
    setSelectedItems({})
    setReturnReason('')
    setAdminNotes('')
    setRefundOverride('')
    setStep(2)
  }

  // ---------- Step 2 helpers ----------
  function toggleItem(item: OrderItem) {
    setSelectedItems((prev) => {
      if (prev[item.id]) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      return { ...prev, [item.id]: { quantity: 1, reason: '' } }
    })
  }

  function updateItemQuantity(itemId: string, quantity: number, max: number) {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.min(Math.max(1, quantity), max),
      },
    }))
  }

  function updateItemReason(itemId: string, reason: string) {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason },
    }))
  }

  const refundPreview = useMemo(() => {
    if (!selectedOrder) return 0
    if (refundOverride.trim()) {
      const v = parseFloat(refundOverride.replace(',', '.'))
      if (!isNaN(v) && v >= 0) return Math.round(v * 100) / 100
    }
    let total = 0
    for (const [itemId, data] of Object.entries(selectedItems)) {
      const oi = selectedOrder.order_items.find((i) => i.id === itemId)
      if (!oi) continue
      total += oi.price_at_purchase * data.quantity
    }
    return Math.round(total * 100) / 100
  }, [selectedItems, selectedOrder, refundOverride])

  // ---------- Step 3 helpers ----------
  async function submitReturn() {
    if (!selectedOrder) return
    if (!returnReason) {
      toast.error('Vul een hoofdreden in')
      return
    }
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Selecteer minimaal één item')
      return
    }

    const return_items = Object.entries(selectedItems).map(
      ([order_item_id, data]) => ({
        order_item_id,
        quantity: data.quantity,
        reason: data.reason || returnReason,
      })
    )

    const payload: Record<string, any> = {
      order_id: selectedOrder.id,
      return_items,
      return_reason: returnReason,
      admin_notes: adminNotes || undefined,
      label_mode: labelMode,
      send_email: sendEmail,
    }

    if (labelMode === 'in_store') {
      payload.in_store_state = inStoreState
    }

    if (refundOverride.trim()) {
      const v = parseFloat(refundOverride.replace(',', '.'))
      if (!isNaN(v) && v >= 0) payload.refund_amount_override = v
    }

    if (force) payload.force = true

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kon retour niet aanmaken')
      }
      toast.success('Retour aangemaakt!')
      router.push(`/admin/returns/${data.return_id}`)
    } catch (err: any) {
      toast.error(err.message || 'Kon retour niet aanmaken')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Nieuwe retour aanmaken
          </h1>
          <p className="text-gray-600">
            Stap {step} van 3 · Handmatige retour voor een bestaande bestelling
          </p>
        </div>
        <Link
          href="/admin/returns"
          className="self-start px-4 py-2 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors"
        >
          Annuleren
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-2 flex-1 ${
              n <= step ? 'bg-brand-primary' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* STEP 1 - Order zoeken */}
      {step === 1 && (
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Kies een bestelling</h2>
          <p className="text-sm text-gray-600">
            Zoek op e-mailadres of de eerste karakters van een order-ID. Alleen
            geleverde orders zijn zichtbaar tenzij je zoekt.
          </p>
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek op e-mail of order-ID (min. 3 tekens)…"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
            />
          </div>

          {searchLoading ? (
            <div className="py-8 text-center text-gray-500">Zoeken…</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Geen orders gevonden.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => pickOrder(order)}
                  className="w-full text-left bg-gray-50 border-2 border-gray-200 hover:border-brand-primary hover:bg-brand-light/30 p-4 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">{order.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {order.status} · Geleverd:{' '}
                        {order.delivered_at
                          ? new Date(order.delivered_at).toLocaleDateString(
                              'nl-NL'
                            )
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">€{order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {order.order_items?.length || 0} items
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2 - Items kiezen */}
      {step === 2 && selectedOrder && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">
                  2. Kies items voor retour
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()} ·{' '}
                  {selectedOrder.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-1.5 text-xs border-2 border-gray-400 text-gray-700 font-bold uppercase hover:bg-gray-100"
              >
                Andere bestelling
              </button>
            </div>

            <div className="space-y-3">
              {selectedOrder.order_items.map((item) => {
                const selected = !!selectedItems[item.id]
                const data = selectedItems[item.id]
                return (
                  <div
                    key={item.id}
                    className={`border-2 p-4 transition-colors ${
                      selected
                        ? 'border-brand-primary bg-brand-light/30'
                        : 'border-gray-200'
                    }`}
                  >
                    <label className="flex gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleItem(item)}
                        className="w-5 h-5 mt-1"
                      />
                      <div className="relative w-16 h-20 bg-gray-100 flex-shrink-0 border border-gray-200">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400 m-auto mt-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{item.product_name}</div>
                        <div className="text-xs text-gray-500">
                          {item.size} · {item.color} · {item.quantity}× besteld
                        </div>
                        <div className="text-sm font-bold mt-1">
                          €{item.price_at_purchase.toFixed(2)}
                        </div>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold mb-1 uppercase tracking-wider">
                            Aantal (max {item.quantity})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={data.quantity}
                            onChange={(e) =>
                              updateItemQuantity(
                                item.id,
                                parseInt(e.target.value) || 1,
                                item.quantity
                              )
                            }
                            className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 uppercase tracking-wider">
                            Reden (optioneel — valt terug op hoofdreden)
                          </label>
                          <select
                            value={data.reason}
                            onChange={(e) =>
                              updateItemReason(item.id, e.target.value)
                            }
                            className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                          >
                            <option value="">Zelfde als hoofdreden</option>
                            {RETURN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
            <h3 className="text-lg font-bold">Reden & refund</h3>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider">
                Hoofdreden *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
              >
                <option value="">Selecteer reden…</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider">
                Admin-notitie (intern)
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                placeholder="Optioneel — bijv. afspraak met klant, coulance-reden…"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider">
                Refund override (leeglaten voor automatisch)
              </label>
              <input
                type="text"
                value={refundOverride}
                onChange={(e) => setRefundOverride(e.target.value)}
                placeholder="bijv. 49.95"
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Berekende refund: €{refundPreview.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 border-2 border-gray-400 font-bold uppercase text-sm hover:bg-gray-100"
            >
              ← Vorige
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={
                Object.keys(selectedItems).length === 0 || !returnReason
              }
              className="flex-1 px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Volgende stap →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 - Label mode + submit */}
      {step === 3 && selectedOrder && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-4">
            <h2 className="text-xl font-bold">3. Hoe regelen we het label?</h2>
            <p className="text-sm text-gray-600">
              Kies hoe je het retourlabel wilt afhandelen. De mail naar de klant
              past zich hierop aan.
            </p>
            <div className="space-y-2">
              {LABEL_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex gap-3 p-4 border-2 cursor-pointer transition-colors ${
                    labelMode === opt.id
                      ? 'border-brand-primary bg-brand-light/30'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="label_mode"
                    value={opt.id}
                    checked={labelMode === opt.id}
                    onChange={() => setLabelMode(opt.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold">{opt.title}</div>
                    <div className="text-sm text-gray-600">
                      {opt.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {labelMode === 'in_store' && (
              <div className="bg-gray-50 border-2 border-gray-200 p-4 space-y-2">
                <div className="font-bold text-sm uppercase tracking-wider">
                  In-store status
                </div>
                <label className="flex gap-2 items-center cursor-pointer">
                  <input
                    type="radio"
                    name="in_store_state"
                    value="approved"
                    checked={inStoreState === 'approved'}
                    onChange={() => setInStoreState('approved')}
                  />
                  <span>
                    Klant moet pakket nog langsbrengen (start op{' '}
                    <span className="font-bold">Goedgekeurd</span>)
                  </span>
                </label>
                <label className="flex gap-2 items-center cursor-pointer">
                  <input
                    type="radio"
                    name="in_store_state"
                    value="received"
                    checked={inStoreState === 'received'}
                    onChange={() => setInStoreState('received')}
                  />
                  <span>
                    Pakket is al binnen (start op{' '}
                    <span className="font-bold">Ontvangen</span>)
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 md:p-6 space-y-3">
            <label className="flex gap-2 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>Mail naar klant versturen</strong> (aangeraden).
                Verstuurt een bevestiging die past bij de gekozen label-mode.
              </span>
            </label>
            <label className="flex gap-2 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>Force</strong> — bypass delivered-check en
                retourtermijn-deadline (coulance).
              </span>
            </label>
          </div>

          <div className="bg-black text-white p-4 md:p-6 space-y-2">
            <h3 className="font-display text-xl">Samenvatting</h3>
            <div className="flex justify-between text-sm">
              <span>Order</span>
              <span className="font-mono">
                #{selectedOrder.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Items</span>
              <span>{Object.keys(selectedItems).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Hoofdreden</span>
              <span>{returnReason}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Label-mode</span>
              <span>{labelMode}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-700">
              <span>Refund</span>
              <span>€{refundPreview.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 border-2 border-gray-400 font-bold uppercase text-sm hover:bg-gray-100"
              disabled={submitting}
            >
              ← Vorige
            </button>
            <button
              type="button"
              onClick={submitReturn}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Bezig…' : 'Retour aanmaken'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
