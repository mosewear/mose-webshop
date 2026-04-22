'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Gift, Plus, Search, Copy, X, Mail } from 'lucide-react'

interface GiftCard {
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
  delivered_at: string | null
  scheduled_send_at: string | null
  created_at: string
  admin_notes: string | null
}

type StatusFilter = 'all' | 'active' | 'depleted' | 'expired' | 'cancelled'

const STATUS_LABELS: Record<GiftCard['status'], { text: string; cls: string }> = {
  active: { text: 'Actief', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  depleted: { text: 'Leeg', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  expired: { text: 'Verlopen', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  cancelled: { text: 'Geannuleerd', cls: 'bg-red-100 text-red-700 border-red-300' },
}

const SOURCE_LABELS: Record<GiftCard['source'], string> = {
  purchase: 'Verkocht',
  admin: 'Admin',
  refund: 'Refund',
}

function fmtMoney(v: number, c: string = 'EUR') {
  try {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: c }).format(v)
  } catch {
    return `€${Number(v).toFixed(2)}`
  }
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

export default function AdminGiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [justCreated, setJustCreated] = useState<{
    code: string
    amount: number
    recipient: string | null
  } | null>(null)

  const [createForm, setCreateForm] = useState({
    amount: '50',
    validity_months: '24',
    expires_at: '',
    recipient_name: '',
    recipient_email: '',
    sender_name: 'MOSE',
    personal_message: '',
    admin_notes: '',
    send_email: true,
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCards()
  }, [statusFilter])

  async function fetchCards() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/admin/gift-cards?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setCards(json.data || [])
      } else {
        toast.error(json.error || 'Kon cadeaubonnen niet laden')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Netwerkfout')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const amt = Number(createForm.amount.replace(',', '.'))
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error('Bedrag is ongeldig')
        setCreating(false)
        return
      }
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          validity_months: Number(createForm.validity_months) || null,
          expires_at: createForm.expires_at || null,
          recipient_name: createForm.recipient_name.trim() || null,
          recipient_email: createForm.recipient_email.trim() || null,
          sender_name: createForm.sender_name.trim() || 'MOSE',
          personal_message: createForm.personal_message.trim() || null,
          admin_notes: createForm.admin_notes.trim() || null,
          send_email: createForm.send_email && !!createForm.recipient_email.trim(),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Aanmaken mislukt')
        return
      }
      setJustCreated({
        code: json.data.code,
        amount: json.data.initialAmount,
        recipient: createForm.recipient_email.trim() || null,
      })
      setShowCreate(false)
      setCreateForm((f) => ({
        ...f,
        recipient_name: '',
        recipient_email: '',
        personal_message: '',
        admin_notes: '',
      }))
      await fetchCards()
      toast.success('Cadeaubon aangemaakt')
    } catch (e: any) {
      toast.error(e?.message || 'Netwerkfout')
    } finally {
      setCreating(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Code gekopieerd')
    } catch {
      toast.error('Kon niet kopiëren')
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return cards
    const s = search.trim().toLowerCase()
    return cards.filter((c) =>
      [c.recipient_email, c.recipient_name, c.purchased_by_email, c.code_last4]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(s))
    )
  }, [cards, search])

  const totalOutstanding = useMemo(
    () =>
      cards
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + Number(c.balance || 0), 0),
    [cards]
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center bg-black text-white">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display tracking-tight uppercase">
              Cadeaubonnen
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Beheer, maak aan en volg cadeaubon-saldi.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe bon
        </button>
      </div>

      {/* Just-created code banner */}
      {justCreated && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-600 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-emerald-700 mb-1">
                Nieuwe cadeaubon aangemaakt
              </div>
              <div className="text-sm mb-2">
                Deze code is slechts <strong>éénmalig</strong> zichtbaar — kopieer hem nu.
                {justCreated.recipient ? (
                  <span className="ml-1">
                    Ook per e-mail verstuurd naar{' '}
                    <strong>{justCreated.recipient}</strong>.
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="bg-black text-white px-3 py-1.5 font-mono tracking-[0.2em] text-base">
                  {justCreated.code}
                </code>
                <button
                  onClick={() => copyCode(justCreated.code)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                >
                  <Copy className="w-4 h-4" /> Kopieer
                </button>
                <span className="text-sm text-gray-700">
                  Saldo: <strong>{fmtMoney(justCreated.amount)}</strong>
                </span>
              </div>
            </div>
            <button
              onClick={() => setJustCreated(null)}
              className="p-1 hover:bg-emerald-100 rounded"
              aria-label="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats + filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-black/10 p-4 bg-white">
          <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-gray-500">
            Totaal bonnen
          </div>
          <div className="font-display text-3xl mt-1">{cards.length}</div>
        </div>
        <div className="border border-black/10 p-4 bg-white">
          <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-gray-500">
            Actieve saldo
          </div>
          <div className="font-display text-3xl mt-1 text-emerald-700">
            {fmtMoney(totalOutstanding)}
          </div>
        </div>
        <div className="border border-black/10 p-4 bg-white">
          <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-gray-500">
            Actief
          </div>
          <div className="font-display text-3xl mt-1">
            {cards.filter((c) => c.status === 'active').length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center border border-black/20 bg-white px-3 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchCards()
            }}
            placeholder="Zoek op e-mail, naam of laatste 4 cijfers..."
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-black/20 bg-white px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="depleted">Leeg</option>
          <option value="expired">Verlopen</option>
          <option value="cancelled">Geannuleerd</option>
        </select>
        <button
          onClick={fetchCards}
          className="border-2 border-black px-4 py-2 font-bold uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors"
        >
          Ververs
        </button>
      </div>

      {/* Table */}
      <div className="border border-black/10 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left uppercase text-[11px] tracking-[0.15em] text-gray-600">
            <tr>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Saldo / start</th>
              <th className="px-3 py-3">Ontvanger</th>
              <th className="px-3 py-3">Bron</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Geldig t/m</th>
              <th className="px-3 py-3">Aangemaakt</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Laden...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Geen cadeaubonnen gevonden.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const s = STATUS_LABELS[c.status]
                return (
                  <tr key={c.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono">
                      MOSE-····-····-{c.code_last4}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{fmtMoney(Number(c.balance), c.currency)}</div>
                      <div className="text-xs text-gray-500">
                        van {fmtMoney(Number(c.initial_amount), c.currency)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {c.recipient_name || c.recipient_email ? (
                        <div>
                          {c.recipient_name ? (
                            <div className="font-medium">{c.recipient_name}</div>
                          ) : null}
                          <div className="text-xs text-gray-500">
                            {c.recipient_email || '—'}
                          </div>
                        </div>
                      ) : c.purchased_by_email ? (
                        <div className="text-xs text-gray-500">
                          Koper: {c.purchased_by_email}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">{SOURCE_LABELS[c.source]}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-wide font-bold ${s.cls}`}
                      >
                        {s.text}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">{fmtDate(c.expires_at)}</td>
                    <td className="px-3 py-3 text-xs">{fmtDate(c.created_at)}</td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/gift-cards/${c.id}`}
                        className="font-bold uppercase text-[11px] tracking-wider hover:underline"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 border-2 border-black"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl uppercase tracking-tight">
                Nieuwe cadeaubon
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Bedrag (€) *
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Geldigheid (maanden)
                </span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={createForm.validity_months}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, validity_months: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  ...of vaste vervaldatum (overschrijft maanden)
                </span>
                <input
                  type="date"
                  value={createForm.expires_at}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, expires_at: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Naam ontvanger
                </span>
                <input
                  type="text"
                  value={createForm.recipient_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, recipient_name: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  E-mail ontvanger
                </span>
                <input
                  type="email"
                  value={createForm.recipient_email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, recipient_email: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Afzender (sender_name)
                </span>
                <input
                  type="text"
                  value={createForm.sender_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, sender_name: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Persoonlijk bericht (optioneel)
                </span>
                <textarea
                  rows={3}
                  value={createForm.personal_message}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, personal_message: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none resize-none"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-gray-600">
                  Interne notities
                </span>
                <textarea
                  rows={2}
                  value={createForm.admin_notes}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, admin_notes: e.target.value }))
                  }
                  className="mt-1 w-full border-2 border-gray-300 focus:border-black px-3 py-2 focus:outline-none resize-none"
                />
              </label>

              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createForm.send_email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, send_email: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  Stuur meteen e-mail naar ontvanger (vereist geldig e-mailadres)
                </span>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="border-2 border-black px-5 py-2 font-bold uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-black text-white px-6 py-2.5 font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Aanmaken...' : 'Cadeaubon aanmaken'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
