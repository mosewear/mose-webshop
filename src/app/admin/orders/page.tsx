'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

interface Order {
  id: string
  user_id: string | null
  email: string
  status: string
  payment_status: string
  paid_at: string | null
  payment_method: string | null
  total: number
  delivery_method?: 'shipping' | 'pickup'
  shipping_address: any
  billing_address: any
  payment_intent_id: string | null
  tracking_code: string | null
  created_at: string
  updated_at: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
    
    // Refresh data wanneer admin terugkomt naar tab
    const handleFocus = () => {
      console.log('👁️ Tab focused, refreshing orders...')
      fetchOrders()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [filter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setRefreshing(true)
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        if (filter === 'returns') {
          // Filter op alle return statussen
          query = query.in('status', ['return_requested', 'return_in_transit', 'return_received', 'return_completed'])
        } else {
          query = query.eq('status', filter)
        }
      }

      const { data, error } = await query

      if (error) throw error
      console.log('📦 Fetched orders:', data?.length, 'orders')
      setOrders(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      paid: 'bg-blue-100 text-blue-700 border-blue-200',
      processing: 'bg-purple-100 text-purple-700 border-purple-200',
      shipped: 'bg-orange-100 text-orange-700 border-orange-200',
      delivered: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      // Return statussen
      return_requested: 'bg-amber-100 text-amber-700 border-amber-200',
      return_in_transit: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      return_received: 'bg-slate-100 text-slate-700 border-slate-200',
      return_completed: 'bg-teal-100 text-teal-700 border-teal-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'In afwachting',
      paid: 'Betaald',
      processing: 'In behandeling',
      shipped: 'Verzonden',
      delivered: 'Afgeleverd',
      cancelled: 'Geannuleerd',
      // Return statussen
      return_requested: 'Return aangevraagd',
      return_in_transit: 'Return onderweg',
      return_received: 'Return ontvangen',
      return_completed: 'Return voltooid',
    }
    return labels[status] || status
  }

  const getPaymentStatusColor = (paymentStatus: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      unpaid: 'bg-gray-100 text-gray-600 border-gray-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      refunded: 'bg-purple-100 text-purple-700 border-purple-200',
      expired: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return colors[paymentStatus] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const getPaymentStatusLabel = (paymentStatus: string) => {
    const labels: Record<string, string> = {
      paid: '✓ Betaald',
      unpaid: '○ Onbetaald',
      pending: '⏳ Wacht op betaling',
      failed: '✕ Betaling mislukt',
      refunded: '↩ Terugbetaald',
      expired: '⌛ Verlopen',
    }
    return labels[paymentStatus] || paymentStatus
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(o => o.id))
    }
  }

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const handleBulkAction = async () => {
    if (selectedOrders.length === 0) {
      alert('Selecteer eerst orders')
      return
    }

    if (!bulkAction) {
      alert('Selecteer eerst een actie')
      return
    }

    if (!confirm(`Weet je zeker dat je de status van ${selectedOrders.length} order(s) wilt wijzigen naar "${getStatusLabel(bulkAction)}"?`)) {
      return
    }

    try {
      setBulkUpdating(true)

      const { error } = await supabase
        .from('orders')
        .update({
          status: bulkAction,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedOrders)

      if (error) throw error

      alert(`✅ ${selectedOrders.length} order(s) bijgewerkt!`)
      setSelectedOrders([])
      setBulkAction('')
      fetchOrders()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  const filters = [
    { value: 'all', label: 'Alle Orders', count: orders.length },
    { value: 'pending', label: 'In afwachting', count: orders.filter(o => o.status === 'pending').length },
    { value: 'paid', label: 'Betaald', count: orders.filter(o => o.status === 'paid').length },
    { value: 'processing', label: 'In behandeling', count: orders.filter(o => o.status === 'processing').length },
    { value: 'shipped', label: 'Verzonden', count: orders.filter(o => o.status === 'shipped').length },
    { value: 'delivered', label: 'Afgeleverd', count: orders.filter(o => o.status === 'delivered').length },
    { value: 'returns', label: 'Returns', count: orders.filter(o => ['return_requested', 'return_in_transit', 'return_received', 'return_completed'].includes(o.status)).length },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Orders</h1>
          <p className="text-gray-600 text-sm md:text-base">Beheer alle bestellingen</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
          <button 
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="flex-1 md:flex-none bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 md:py-3 px-4 md:px-6 text-sm md:text-base uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Bezig...' : 'Ververs'}
          </button>
          <button className="flex-1 md:flex-none bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-4 md:px-6 text-sm md:text-base uppercase tracking-wider transition-colors active:scale-95">
            Exporteren
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
                filter === f.value
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{orders.length}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totaal Orders</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
            {orders.filter(o => o.payment_status === 'paid').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Betaald</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">
            {orders.filter(o => o.payment_status === 'pending').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Wacht op betaling</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            €{orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Omzet (Betaald)</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border-2 border-gray-200">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen orders</h3>
            <p className="text-gray-500">Orders verschijnen hier zodra klanten bestellen!</p>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedOrders.length > 0 && (
              <div className="bg-brand-primary text-white p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <span className="font-bold">{selectedOrders.length} order(s) geselecteerd</span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 bg-white text-gray-800 border-2 border-white font-bold"
                >
                  <option value="">Kies actie...</option>
                  <option value="processing">Markeer als: In behandeling</option>
                  <option value="shipped">Markeer als: Verzonden</option>
                  <option value="delivered">Markeer als: Afgeleverd</option>
                  <option value="cancelled">Markeer als: Geannuleerd</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || bulkUpdating}
                  className="w-full md:w-auto bg-white text-brand-primary font-bold py-2 px-6 uppercase tracking-wider hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {bulkUpdating ? 'Bijwerken...' : 'Toepassen'}
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="md:ml-auto text-white hover:text-gray-200 text-left md:text-right"
                >
                  Deselecteren
                </button>
              </div>
            )}

            <div className="md:hidden space-y-3 p-3">
              {orders.map((order) => (
                <div key={order.id} className="border-2 border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        #{order.id.slice(0, 8)}
                      </code>
                      <div className="text-sm font-semibold text-gray-900 mt-2 break-all">{order.email}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-5 h-5 mt-1"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className={`px-2 py-1 font-semibold border inline-block ${getPaymentStatusColor(order.payment_status || 'unpaid')}`}>
                      {getPaymentStatusLabel(order.payment_status || 'unpaid')}
                    </span>
                    <span className={`px-2 py-1 font-semibold border inline-block ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <div className="text-gray-600">Datum: {new Date(order.created_at).toLocaleDateString('nl-NL')}</div>
                    <div className="font-bold text-gray-900 text-right">EUR {Number(order.total).toFixed(2)}</div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 font-semibold border inline-block ${
                        order.delivery_method === 'pickup'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {order.delivery_method === 'pickup' ? 'Afhalen' : 'Verzending'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="mt-3 block w-full text-center text-brand-primary border-2 border-brand-primary py-2 text-sm font-semibold"
                  >
                    Details
                  </Link>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length}
                        onChange={handleSelectAll}
                        className="w-5 h-5"
                      />
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Klant
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Betaling
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Fulfillment
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Levering
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Totaal
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      Datum
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        #{order.id.slice(0, 8)}
                      </code>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px] md:max-w-none">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold border-2 inline-block ${getPaymentStatusColor(order.payment_status || 'unpaid')}`}>
                        {getPaymentStatusLabel(order.payment_status || 'unpaid')}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold border-2 inline-block ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold border-2 inline-block ${
                        order.delivery_method === 'pickup'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {order.delivery_method === 'pickup' ? 'Afhalen' : 'Verzending'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        €{Number(order.total).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {new Date(order.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                      >
                        Details
                      </Link>
                    </td>
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

