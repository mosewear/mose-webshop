'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, Save, Ban, RotateCcw } from 'lucide-react'

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
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="text-gray-500">Laden...</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <button
        onClick={() => router.push('/admin/gift-cards')}
        className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Terug
      </button>

      <div className="bg-black text-white p-5 md:p-6 mb-6">
        <div className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-bold">
          Cadeaubon
        </div>
        <div className="font-display text-2xl md:text-4xl tracking-wide mt-1">
          MOSE-····-····-{card.code_last4}
        </div>
        <div className="mt-3 text-sm">
          Saldo: <strong>{fmtMoney(Number(card.balance), card.currency)}</strong>
          <span className="opacity-60"> / {fmtMoney(Number(card.initial_amount), card.currency)}</span>
          {totalSpent > 0 ? (
            <span className="ml-4 opacity-80">
              Uitgegeven: {fmtMoney(totalSpent, card.currency)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border border-black/10 bg-white p-5">
          <h2 className="font-display text-lg uppercase tracking-tight mb-4">Details</h2>
          <dl className="text-sm divide-y divide-gray-100">
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium uppercase">{card.status}</dd>
            </div>
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Bron</dt>
              <dd className="font-medium">{card.source}</dd>
            </div>
            <div className="py-2 flex justify-between gap-3">
              <dt className="text-gray-500">Koper</dt>
              <dd className="font-medium text-right">{card.purchased_by_email || '—'}</dd>
            </div>
            {card.purchased_by_order_id ? (
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-gray-500">Bestelling</dt>
                <dd className="font-medium text-right">
                  <Link
                    href={`/admin/orders/${card.purchased_by_order_id}`}
                    className="hover:underline"
                  >
                    {card.purchased_by_order_id.slice(0, 8).toUpperCase()}
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

        <div className="border border-black/10 bg-white p-5">
          <h2 className="font-display text-lg uppercase tracking-tight mb-4">Bijwerken</h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                Vervaldatum
              </span>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                Naam ontvanger
              </span>
              <input
                type="text"
                value={form.recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                E-mail ontvanger
              </span>
              <input
                type="email"
                value={form.recipient_email}
                onChange={(e) => setForm((f) => ({ ...f, recipient_email: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                Interne notities
              </span>
              <textarea
                rows={3}
                value={form.admin_notes}
                onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))}
                className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none resize-none"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              {card.pending_delivery_code ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-1.5 border-2 border-black px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {resending ? 'Verzenden...' : 'Opnieuw versturen'}
                </button>
              ) : null}
              {card.status === 'active' ? (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 border-2 border-red-600 text-red-600 px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Ban className="w-4 h-4" /> Annuleren
                </button>
              ) : card.status === 'cancelled' ? (
                <button
                  onClick={handleReactivate}
                  className="inline-flex items-center gap-1.5 border-2 border-emerald-600 text-emerald-700 px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Heractiveren
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Redemptions table */}
      <div className="border border-black/10 bg-white">
        <div className="p-5 border-b border-black/10 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-tight">Gebruik</h2>
          <span className="text-xs text-gray-500">{redemptions.length} transacties</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left uppercase text-[11px] tracking-[0.15em] text-gray-600">
              <tr>
                <th className="px-3 py-3">Bestelling</th>
                <th className="px-3 py-3">Bedrag</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Gemaakt</th>
                <th className="px-3 py-3">Vastgezet</th>
                <th className="px-3 py-3">Teruggedraaid</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    Deze bon is nog niet gebruikt.
                  </td>
                </tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-t border-gray-200">
                    <td className="px-3 py-3 font-mono">
                      <Link
                        href={`/admin/orders/${r.order_id}`}
                        className="hover:underline"
                      >
                        {r.order_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {fmtMoney(Number(r.amount), card.currency)}
                    </td>
                    <td className="px-3 py-3 uppercase text-[11px] tracking-wider font-bold">
                      {r.status}
                    </td>
                    <td className="px-3 py-3 text-xs">{fmtDateTime(r.created_at)}</td>
                    <td className="px-3 py-3 text-xs">{fmtDateTime(r.committed_at)}</td>
                    <td className="px-3 py-3 text-xs">{fmtDateTime(r.reversed_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
