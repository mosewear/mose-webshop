'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw } from 'lucide-react'

interface Return {
  id: string
  order_id: string
  user_id: string | null
  status: string
  return_reason: string
  refund_amount: number
  total_refund: number
  return_label_payment_status: string | null
  created_at: string
  orders: {
    id: string
    email: string
    shipping_address: any
  }
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchReturns()
    
    // Setup realtime subscription voor alle return updates
    const channel = supabase
      .channel('all-returns-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Luister naar alle events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'returns'
        },
        (payload) => {
          console.log('🔄 Returns table changed:', payload)
          fetchReturns()
        }
      )
      .subscribe()
    
    // Refresh data wanneer admin terugkomt naar tab
    const handleFocus = () => {
      console.log('👁️ Tab focused, refreshing returns...')
      fetchReturns()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', handleFocus)
    }
  }, [filter])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      setRefreshing(true)
      const response = await fetch('/api/returns?' + (filter !== 'all' ? `status=${filter}` : ''))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch returns')
      }

      console.log('📦 Fetched returns:', data.returns?.length, 'returns')
      setReturns(data.returns || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      return_requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      return_approved: 'bg-blue-100 text-blue-700 border-blue-200',
      return_label_payment_pending: 'bg-orange-100 text-orange-700 border-orange-200',
      return_label_payment_completed: 'bg-purple-100 text-purple-700 border-purple-200',
      return_label_generated: 'bg-green-100 text-green-700 border-green-200',
      return_in_transit: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30',
      return_received: 'bg-gray-100 text-gray-700 border-gray-200',
      refund_processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      refunded: 'bg-gray-800 text-white border-gray-900',
      return_rejected: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      return_requested: 'Aangevraagd',
      return_approved: 'Goedgekeurd',
      return_label_payment_pending: 'Betaling Label',
      return_label_payment_completed: 'Label Betaald',
      return_label_generated: 'Label Beschikbaar',
      return_in_transit: 'Onderweg',
      return_received: 'Ontvangen',
      refund_processing: 'Refund Bezig',
      refunded: 'Terugbetaald',
      return_rejected: 'Afgewezen',
    }
    return labels[status] || status
  }

  const filteredReturns = returns.filter((returnItem) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        returnItem.id.toLowerCase().includes(searchLower) ||
        returnItem.orders?.id?.toLowerCase().includes(searchLower) ||
        returnItem.orders?.email?.toLowerCase().includes(searchLower) ||
        returnItem.return_reason.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Retouren</h1>
          <p className="text-gray-600">Beheer alle retourverzoeken</p>
        </div>
        <button
          onClick={() => fetchReturns()}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Bezig...' : 'Ververs'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-black p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Zoek op return ID, order ID of email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
          >
            <option value="all">Alle Statussen</option>
            <option value="return_requested">Aangevraagd</option>
            <option value="return_approved">Goedgekeurd</option>
            <option value="return_label_payment_pending">Betaling Label</option>
            <option value="return_label_generated">Label Beschikbaar</option>
            <option value="return_in_transit">Onderweg</option>
            <option value="return_received">Ontvangen</option>
            <option value="refund_processing">Refund Bezig</option>
            <option value="refunded">Terugbetaald</option>
            <option value="return_rejected">Afgewezen</option>
          </select>
        </div>
      </div>

      {/* Returns List */}
      {error && (
        <div className="bg-red-50 border-2 border-red-600 p-4 text-red-900">
          {error}
        </div>
      )}

      {filteredReturns.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
          <p className="text-gray-600 text-lg">Geen retouren gevonden</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-black overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Return ID</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Order</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Klant</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Status</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Refund</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-sm font-bold uppercase">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">#{returnItem.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${returnItem.order_id}`}
                      className="text-brand-primary hover:underline font-mono text-sm"
                    >
                      #{returnItem.orders?.id?.slice(0, 8).toUpperCase() || 'N/A'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div>{returnItem.orders?.email || 'N/A'}</div>
                      {returnItem.orders?.shipping_address?.name && (
                        <div className="text-gray-600 text-xs">{returnItem.orders.shipping_address.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-bold uppercase border ${getStatusColor(returnItem.status)}`}>
                      {getStatusLabel(returnItem.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {returnItem.total_refund ? (
                      <span className="font-bold">€{returnItem.total_refund.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(returnItem.created_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/returns/${returnItem.id}`}
                      className="text-brand-primary hover:underline font-bold text-sm uppercase"
                    >
                      Bekijk
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black p-4">
          <div className="text-2xl font-display font-bold">{returns.length}</div>
          <div className="text-sm text-gray-600">Totaal Retouren</div>
        </div>
        <div className="bg-white border-2 border-black p-4">
          <div className="text-2xl font-display font-bold text-yellow-600">
            {returns.filter((r) => r.status === 'return_requested').length}
          </div>
          <div className="text-sm text-gray-600">Aangevraagd</div>
        </div>
        <div className="bg-white border-2 border-black p-4">
          <div className="text-2xl font-display font-bold text-green-600">
            {returns.filter((r) => r.status === 'return_label_generated' || r.status === 'return_in_transit').length}
          </div>
          <div className="text-sm text-gray-600">Actief</div>
        </div>
        <div className="bg-white border-2 border-black p-4">
          <div className="text-2xl font-display font-bold text-gray-800">
            {returns.filter((r) => r.status === 'refunded').length}
          </div>
          <div className="text-sm text-gray-600">Terugbetaald</div>
        </div>
      </div>
    </div>
  )
}

