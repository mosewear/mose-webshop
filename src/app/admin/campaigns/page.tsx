'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Copy,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { CampaignPromoCodeMeta, MarketingCampaign } from '@/lib/marketing-campaign-shared'

interface CampaignRow extends MarketingCampaign {
  promo_code: CampaignPromoCodeMeta | null
}

type StatusKind = 'active' | 'scheduled' | 'draft' | 'ended'

function deriveStatus(c: CampaignRow): StatusKind {
  const now = Date.now()
  if (!c.is_enabled) return 'draft'
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return 'scheduled'
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return 'ended'
  return 'active'
}

function statusLabel(s: StatusKind): string {
  return s === 'active'
    ? 'Actief'
    : s === 'scheduled'
      ? 'Geplanned'
      : s === 'ended'
        ? 'Beëindigd'
        : 'Concept'
}

function statusEmoji(s: StatusKind): string {
  return s === 'active'
    ? '🟢'
    : s === 'scheduled'
      ? '🟡'
      : s === 'ended'
        ? '⚫'
        : '⚪'
}

function fmtRange(c: CampaignRow): string {
  const f = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('nl-NL', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Amsterdam',
        })
      : null
  const s = f(c.starts_at)
  const e = f(c.ends_at)
  if (!s && !e) return 'Permanent'
  if (s && !e) return `Vanaf ${s}`
  if (!s && e) return `Tot ${e}`
  return `${s} → ${e}`
}

export default function CampaignsListPage() {
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaigns')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setRows(json.data as CampaignRow[])
      } else {
        toast.error(json.error || 'Laden mislukt')
      }
    } catch (err) {
      console.error(err)
      toast.error('Onverwachte fout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const counts = { active: 0, scheduled: 0, draft: 0, ended: 0 }
    rows.forEach((r) => {
      counts[deriveStatus(r)] += 1
    })
    return counts
  }, [rows])

  const toggleEnabled = async (row: CampaignRow) => {
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...row, is_enabled: !row.is_enabled }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Wijziging mislukt')
        return
      }
      toast.success(!row.is_enabled ? 'Campagne geactiveerd' : 'Campagne uitgeschakeld')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Onverwachte fout')
    } finally {
      setBusyId(null)
    }
  }

  const duplicate = async (row: CampaignRow) => {
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${row.id}/duplicate`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Dupliceren mislukt')
        return
      }
      toast.success('Campagne gedupliceerd')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Onverwachte fout')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (row: CampaignRow) => {
    if (!window.confirm(`Weet je zeker dat je "${row.name}" wilt verwijderen?`)) return
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${row.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Verwijderen mislukt')
        return
      }
      toast.success('Campagne verwijderd')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Onverwachte fout')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-brand-primary" />
            Campagnes
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Banner, popup, themakleur en kortingscode op één plek per feestdag of sale-moment.
          </p>
        </div>
        <Link
          href="/admin/campaigns/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe campagne
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Actief" value={stats.active} tone="green" />
        <StatCard label="Geplanned" value={stats.scheduled} tone="amber" />
        <StatCard label="Concept" value={stats.draft} tone="neutral" />
        <StatCard label="Beëindigd" value={stats.ended} tone="dark" />
      </div>

      <div className="bg-white border-2 border-gray-200">
        {loading ? (
          <div className="px-4 py-12 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-gray-500 mb-4">Nog geen campagnes aangemaakt.</p>
            <Link
              href="/admin/campaigns/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wider text-sm"
            >
              <Plus className="w-4 h-4" /> Maak je eerste campagne
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-gray-200">
              {rows.map((row) => {
                const s = deriveStatus(row)
                return (
                  <li key={row.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-3 h-3 mt-1.5 border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: row.theme_color ?? '#FFFFFF' }}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{row.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {row.slug}
                        </p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        {statusEmoji(s)} {statusLabel(s)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{fmtRange(row)}</p>
                    {row.promo_code ? (
                      <p className="text-xs text-gray-700">
                        Code: <span className="font-mono">{row.promo_code.code}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Geen code gekoppeld</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/admin/campaigns/${row.id}/edit`}
                        className="flex-1 px-3 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider text-center"
                      >
                        Bewerken
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleEnabled(row)}
                        disabled={busyId === row.id}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black ${
                          row.is_enabled
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white'
                        }`}
                      >
                        {row.is_enabled ? 'Uit' : 'Aan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(row)}
                        disabled={busyId === row.id}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-xs font-bold uppercase tracking-wider"
                        aria-label="Dupliceren"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        disabled={busyId === row.id}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold uppercase tracking-wider"
                        aria-label="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead className="border-b-2 border-gray-200 bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 px-4 py-3">
                    Campagne
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 px-4 py-3">
                    Periode
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 px-4 py-3">
                    Code
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-700 px-4 py-3">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const s = deriveStatus(row)
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: row.theme_color ?? '#FFFFFF' }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{row.name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {row.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {statusEmoji(s)} {statusLabel(s)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {fmtRange(row)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.promo_code ? (
                          <span className="font-mono">
                            {row.promo_code.code}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleEnabled(row)}
                            disabled={busyId === row.id}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                              row.is_enabled
                                ? 'bg-brand-primary border-brand-primary text-white hover:bg-brand-primary-hover'
                                : 'bg-white border-black hover:bg-black hover:text-white'
                            }`}
                          >
                            {row.is_enabled ? 'Aan' : 'Uit'}
                          </button>
                          <Link
                            href={`/admin/campaigns/${row.id}/edit`}
                            className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 inline-flex items-center gap-1.5"
                          >
                            <PencilLine className="w-3.5 h-3.5" /> Bewerken
                          </Link>
                          <button
                            type="button"
                            onClick={() => duplicate(row)}
                            disabled={busyId === row.id}
                            className="p-1.5 hover:bg-gray-200 transition-colors"
                            aria-label="Dupliceren"
                            title="Dupliceren"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(row)}
                            disabled={busyId === row.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Verwijderen"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'neutral' | 'dark'
}) {
  const cls =
    tone === 'green'
      ? 'border-green-400 bg-green-50'
      : tone === 'amber'
        ? 'border-amber-400 bg-amber-50'
        : tone === 'dark'
          ? 'border-gray-400 bg-gray-100'
          : 'border-gray-200 bg-white'
  return (
    <div className={`border-2 px-4 py-3 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
        {label}
      </p>
      <p className="text-3xl font-display font-bold mt-1">{value}</p>
    </div>
  )
}
