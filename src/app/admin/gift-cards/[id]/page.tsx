'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, Save, Ban, RotateCcw, Gift } from 'lucide-react'

interface GiftCardDetail {
  id: string
  code_last4: string
  initial_amount: number
  balance: number
  currency: string
  status: 'active' | 'depleted' | 'expired' | 'cancelled'
  expires_at: string | null
  source: 'purchase' | 'admin' | 'refund'
  purchased_by_email: string | null
  purchased_by_order_id: string | null
  recipient_email: string | null
  recipient_name: string | null
  sender_name: string | null
  personal_message: string | null
  scheduled_send_at: string | null
  delivered_at: string | null
  delivery_attempts: number
  last_delivery_error: string | null
  admin_notes: string | null
  pending_delivery_code: string | null
  created_at: string
}

interface Redemption {
  id: string
  order_id: string
  amount: number
  status: 'reserved' | 'committed' | 'reversed'
  created_at: string
  committed_at: string | null
  reversed_at: string | null
}

const STATUS_LABELS: Record<GiftCardDetail['status'], { text: string; cls: string }> = {
  active: { text: 'Actief', cls: 'bg-green-100 text-green-800 border-green-200' },
  depleted: { text: 'Leeg', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  expired: { text: 'Verlopen', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  cancelled: { text: 'Geannuleerd', cls: 'bg-red-100 text-red-700 border-red-200' },
}

function fmtMoney(v: number, c: string = 'EUR') {
  try {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: c }).format(v)
  } catch {
    return `€${Number(v).toFixed(2)}`
  }
}

function fmtDateTime(s: string | null) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return s
  }
}

function isoToInputDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ''
  }
}

export default function AdminGiftCardDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [card, setCard] = useState<GiftCardDetail | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)

  const [form, setForm] = useState({
    expires_at: '',
    admin_notes: '',
    recipient_email: '',
    recipient_name: '',
  })

  async function fetchDetail() {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}`)
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Niet gevonden')
        return
      }
      setCard(json.data.card)
      setRedemptions(json.data.redemptions || [])
      setForm({
        expires_at: isoToInputDate(json.data.card.expires_at),
        admin_notes: json.data.card.admin_notes || '',
        recipient_email: json.data.card.recipient_email || '',
        recipient_name: json.data.card.recipient_name || '',
      })
    } catch (e: any) {
      toast.error(e?.message || 'Netwerkfout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave() {
    if (!card) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          admin_notes: form.admin_notes,
          recipient_email: form.recipient_email.trim(),
          recipient_name: form.recipient_name.trim(),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Opslaan mislukt')
        return
      }
      toast.success('Opgeslagen')
      await fetchDetail()
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!card) return
    if (!confirm('Deze cadeaubon annuleren? Saldo is daarna niet meer bruikbaar.')) return
    const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error || 'Annuleren mislukt')
      return
    }
    toast.success('Geannuleerd')
    await fetchDetail()
  }

  async function handleReactivate() {
    if (!card) return
    const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error || 'Heractiveren mislukt')
      return
    }
    toast.success('Heractiveerd')
    await fetchDetail()
  }

  async function handleResend() {
    if (!card) return
    setResending(true)
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: form.recipient_email.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Verzenden mislukt')
        return
      }
      toast.success('E-mail verstuurd')
      await fetchDetail()
    } finally {
      setResending(false)
    }
  }

  const totalSpent = useMemo(
    () =>
      redemptions
        .filter((r) => r.status === 'committed')
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    [redemptions]
  )

  if (loading || !card) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="text-gray-500 text-sm">Laden...</div>
      </div>
    )
  }

  const s = STATUS_LABELS[card.status]

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => router.push('/admin/gift-cards')}
        className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider mb-4 text-gray-600 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
      </button>

      {/* Hero card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-black to-neutral-900 text-white p-5 md:p-8 mb-5 md:mb-6 border-2 border-black">
        <div className="absolute top-4 right-4 opacity-10">
          <Gift className="w-24 h-24 md:w-40 md:h-40" strokeWidth={1.5} />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-brand-primary font-bold">
              Cadeaubon
            </div>
            <span
              className={`inline-block border px-2 py-0.5 text-[10px] md:text-[11px] uppercase tracking-wide font-bold ${s.cls}`}
            >
              {s.text}
            </span>
          </div>
          <div className="font-mono text-lg md:text-3xl tracking-[0.15em] md:tracking-wide mt-1 break-all">
            MOSE-····-····-{card.code_last4}
          </div>
          <div className="mt-4 md:mt-5 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
            <div>
              <div className="text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-white/60 font-bold">
                Saldo
              </div>
              <div className="font-bold text-lg md:text-2xl mt-1 text-brand-primary truncate">
                {fmtMoney(Number(card.balance), card.currency)}
              </div>
            </div>
            <div>
              <div className="text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-white/60 font-bold">
                Start
              </div>
              <div className="font-bold text-base md:text-xl mt-1 truncate">
                {fmtMoney(Number(card.initial_amount), card.currency)}
              </div>
            </div>
            <div>
              <div className="text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-white/60 font-bold">
                Uitgegeven
              </div>
              <div className="font-bold text-base md:text-xl mt-1 truncate">
                {fmtMoney(totalSpent, card.currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5 md:mb-6">
        {/* Details */}
        <div className="border-2 border-gray-200 bg-white p-4 md:p-5">
          <h2 className="font-bold text-sm md:text-base uppercase tracking-wider mb-3 md:mb-4">
            Details
          </h2>
          <dl className="text-sm divide-y divide-gray-100">
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Bron</dt>
              <dd className="font-medium">{card.source}</dd>
            </div>
            {card.purchased_by_email ? (
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-gray-500 shrink-0">Koper</dt>
                <dd className="font-medium text-right break-all">{card.purchased_by_email}</dd>
              </div>
            ) : null}
            {card.purchased_by_order_id ? (
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-gray-500">Bestelling</dt>
                <dd className="font-medium text-right">
                  <Link
                    href={`/admin/orders/${card.purchased_by_order_id}`}
                    className="text-brand-primary hover:underline"
                  >
                    #{card.purchased_by_order_id.slice(0, 8).toUpperCase()}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Verstuurd</dt>
              <dd className="font-medium text-right">{fmtDateTime(card.delivered_at)}</dd>
            </div>
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Gepland op</dt>
              <dd className="font-medium text-right">{fmtDateTime(card.scheduled_send_at)}</dd>
            </div>
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Verzendpogingen</dt>
              <dd className="font-medium">{card.delivery_attempts}</dd>
            </div>
            {card.last_delivery_error ? (
              <div className="py-2">
                <dt className="text-gray-500 text-xs">Laatste fout</dt>
                <dd className="text-xs mt-1 text-red-700 break-words">
                  {card.last_delivery_error}
                </dd>
              </div>
            ) : null}
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Aangemaakt</dt>
              <dd className="font-medium text-right">{fmtDateTime(card.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Edit form */}
        <div className="border-2 border-gray-200 bg-white p-4 md:p-5">
          <h2 className="font-bold text-sm md:text-base uppercase tracking-wider mb-3 md:mb-4">
            Bijwerken
          </h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-700">
                Vervaldatum
              </span>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-200 focus:border-brand-primary px-3 py-2 focus:outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-700">
                Naam ontvanger
              </span>
              <input
                type="text"
                value={form.recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-200 focus:border-brand-primary px-3 py-2 focus:outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-700">
                E-mail ontvanger
              </span>
              <input
                type="email"
                value={form.recipient_email}
                onChange={(e) => setForm((f) => ({ ...f, recipient_email: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-200 focus:border-brand-primary px-3 py-2 focus:outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-700">
                Interne notities
              </span>
              <textarea
                rows={3}
                value={form.admin_notes}
                onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-200 focus:border-brand-primary px-3 py-2 focus:outline-none resize-none transition-colors"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 font-bold uppercase text-xs tracking-wider transition-colors active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              {card.pending_delivery_code ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-1.5 border-2 border-black px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors active:scale-95 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {resending ? 'Verzenden...' : 'Opnieuw versturen'}
                </button>
              ) : null}
              {card.status === 'active' ? (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 border-2 border-red-600 text-red-600 px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-red-600 hover:text-white transition-colors active:scale-95"
                >
                  <Ban className="w-4 h-4" /> Annuleren
                </button>
              ) : card.status === 'cancelled' ? (
                <button
                  onClick={handleReactivate}
                  className="inline-flex items-center gap-1.5 border-2 border-brand-primary text-brand-primary px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-brand-primary hover:text-white transition-colors active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> Heractiveren
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Redemptions */}
      <div className="border-2 border-gray-200 bg-white">
        <div className="p-4 md:p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-sm md:text-base uppercase tracking-wider">Gebruik</h2>
          <span className="text-[11px] md:text-xs text-gray-500 font-semibold">
            {redemptions.length} transacties
          </span>
        </div>

        {redemptions.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500 text-sm">
            Deze bon is nog niet gebruikt.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {redemptions.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${r.order_id}`}
                        className="font-mono text-sm font-bold text-brand-primary hover:underline"
                      >
                        #{r.order_id.slice(0, 8).toUpperCase()}
                      </Link>
                      <div className="text-[11px] uppercase tracking-wider font-bold mt-1">
                        {r.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {fmtDateTime(r.created_at)}
                      </div>
                    </div>
                    <div className="font-bold text-base shrink-0">
                      {fmtMoney(Number(r.amount), card.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left uppercase text-[11px] tracking-[0.15em] text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Bestelling</th>
                    <th className="px-4 py-3 font-bold">Bedrag</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Gemaakt</th>
                    <th className="px-4 py-3 font-bold">Vastgezet</th>
                    <th className="px-4 py-3 font-bold">Teruggedraaid</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-mono">
                        <Link
                          href={`/admin/orders/${r.order_id}`}
                          className="text-brand-primary hover:underline"
                        >
                          #{r.order_id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {fmtMoney(Number(r.amount), card.currency)}
                      </td>
                      <td className="px-4 py-3 uppercase text-[11px] tracking-wider font-bold">
                        {r.status}
                      </td>
                      <td className="px-4 py-3 text-xs">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 text-xs">{fmtDateTime(r.committed_at)}</td>
                      <td className="px-4 py-3 text-xs">{fmtDateTime(r.reversed_at)}</td>
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
