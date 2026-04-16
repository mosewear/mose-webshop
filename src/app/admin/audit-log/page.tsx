'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AuditLogEntry {
  id: string
  admin_user_id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Aangemaakt',
  update: 'Bijgewerkt',
  delete: 'Verwijderd',
  status_change: 'Status gewijzigd',
  refund: 'Terugbetaald',
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700 border-green-300',
  update: 'bg-blue-100 text-blue-700 border-blue-300',
  delete: 'bg-red-100 text-red-700 border-red-300',
  status_change: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  refund: 'bg-purple-100 text-purple-700 border-purple-300',
}

const ENTITY_LABELS: Record<string, string> = {
  order: 'Order',
  product: 'Product',
  customer: 'Klant',
  settings: 'Instellingen',
  return: 'Retour',
  promo_code: 'Kortingscode',
}

const PAGE_SIZE = 25

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)

  const [filterEntityType, setFilterEntityType] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const supabase = createClient()

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      let countQuery = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })

      let dataQuery = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (filterEntityType !== 'all') {
        countQuery = countQuery.eq('entity_type', filterEntityType)
        dataQuery = dataQuery.eq('entity_type', filterEntityType)
      }
      if (filterAction !== 'all') {
        countQuery = countQuery.eq('action', filterAction)
        dataQuery = dataQuery.eq('action', filterAction)
      }
      if (filterDateFrom) {
        const from = new Date(filterDateFrom).toISOString()
        countQuery = countQuery.gte('created_at', from)
        dataQuery = dataQuery.gte('created_at', from)
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo + 'T23:59:59').toISOString()
        countQuery = countQuery.lte('created_at', to)
        dataQuery = dataQuery.lte('created_at', to)
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      const { data, error } = await dataQuery
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to fetch audit log:', err)
    } finally {
      setLoading(false)
    }
  }, [page, filterEntityType, filterAction, filterDateFrom, filterDateTo, supabase])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleFilterChange = () => {
    setPage(1)
  }

  const formatDetails = (details: Record<string, any>): string => {
    if (!details || Object.keys(details).length === 0) return '—'
    const keys = Object.keys(details)
    if (keys.length <= 2) {
      return keys.map(k => `${k}: ${JSON.stringify(details[k])}`).join(', ')
    }
    return `${keys.length} velden`
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Audit Log</h1>
          <p className="text-gray-600 text-sm md:text-base">Overzicht van alle admin-acties</p>
        </div>
        <div className="text-sm text-gray-500">
          {totalCount} {totalCount === 1 ? 'actie' : 'acties'} gevonden
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={filterEntityType}
              onChange={(e) => { setFilterEntityType(e.target.value); handleFilterChange() }}
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-medium bg-white"
            >
              <option value="all">Alle types</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Actie
            </label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); handleFilterChange() }}
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-medium bg-white"
            >
              <option value="all">Alle acties</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Vanaf
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); handleFilterChange() }}
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-medium bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Tot
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); handleFilterChange() }}
              className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-medium bg-white"
            />
          </div>
        </div>
        {(filterEntityType !== 'all' || filterAction !== 'all' || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => {
              setFilterEntityType('all')
              setFilterAction('all')
              setFilterDateFrom('')
              setFilterDateTo('')
              setPage(1)
            }}
            className="mt-3 text-sm font-bold text-brand-primary hover:underline uppercase tracking-wider"
          >
            Filters wissen
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Geen audit log entries</h3>
            <p className="text-gray-500">Er zijn nog geen admin-acties vastgelegd.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border-2 border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold border inline-block ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 inline-block">
                      {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(entry.created_at).toLocaleString('nl-NL', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 truncate">{entry.admin_email}</div>
                  {entry.entity_id && (
                    <div className="mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 font-mono">{entry.entity_id.slice(0, 8)}</code>
                    </div>
                  )}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <button
                      onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                      className="mt-2 text-xs font-bold text-brand-primary flex items-center gap-1"
                    >
                      Details
                      {expandedRow === entry.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  {expandedRow === entry.id && (
                    <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 p-2 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Datum/Tijd
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Entity ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(entry.created_at).toLocaleString('nl-NL', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                          {entry.admin_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold border-2 inline-block ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border-2 border-gray-300 inline-block">
                          {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.entity_id ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 font-mono">
                            {entry.entity_id.slice(0, 8)}
                          </code>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {entry.details && Object.keys(entry.details).length > 0 ? (
                          <div>
                            <button
                              onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                              className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline"
                            >
                              {formatDetails(entry.details)}
                              {expandedRow === entry.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {expandedRow === entry.id && (
                              <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 p-3 overflow-x-auto max-h-48 max-w-md whitespace-pre-wrap break-all">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Pagina {page} van {totalPages} ({totalCount} items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Vorige
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
