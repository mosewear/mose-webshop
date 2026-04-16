'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Plus, Search, Printer, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [batchLabelsLoading, setBatchLabelsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 25

  const pendingScrollRestore = useRef(false)

  const saveScrollPosition = useCallback(() => {
    sessionStorage.setItem('admin-orders-scroll', String(window.scrollY))
    sessionStorage.setItem('admin-orders-filter', filter)
    sessionStorage.setItem('admin-orders-page', String(page))
  }, [filter, page])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const fetchStatusCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
      if (error) throw error
      const counts: Record<string, number> = {}
      let total = 0
      for (const row of data || []) {
        counts[row.status] = (counts[row.status] || 0) + 1
        total++
      }
      counts['all'] = total
      counts['returns'] = (counts['return_requested'] || 0) +
        (counts['return_in_transit'] || 0) +
        (counts['return_received'] || 0) +
        (counts['return_completed'] || 0)
      setStatusCounts(counts)
    } catch {
      // counts are non-critical
    }
  }, [supabase])

  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      const savedFilter = sessionStorage.getItem('admin-orders-filter')
      const savedPage = sessionStorage.getItem('admin-orders-page')
      if (savedFilter && savedFilter !== filter) {
        setFilter(savedFilter)
        if (savedPage) setPage(parseInt(savedPage, 10))
        return
      }
      if (savedPage) setPage(parseInt(savedPage, 10))
    }

    fetchOrders()
    fetchStatusCounts()
    
    const handleFocus = () => {
      fetchOrders()
      fetchStatusCounts()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [filter, page])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      let countQuery = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (filter !== 'all') {
        if (filter === 'returns') {
          countQuery = countQuery.in('status', ['return_requested', 'return_in_transit', 'return_received', 'return_completed'])
        } else {
          countQuery = countQuery.eq('status', filter)
        }
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (filter !== 'all') {
        if (filter === 'returns') {
          query = query.in('status', ['return_requested', 'return_in_transit', 'return_received', 'return_completed'])
        } else {
          query = query.eq('status', filter)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
      pendingScrollRestore.current = true
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (pendingScrollRestore.current && !loading && orders.length > 0) {
      pendingScrollRestore.current = false
      const saved = sessionStorage.getItem('admin-orders-scroll')
      if (saved) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10))
          sessionStorage.removeItem('admin-orders-scroll')
          sessionStorage.removeItem('admin-orders-filter')
          sessionStorage.removeItem('admin-orders-page')
        })
      }
    }
  }, [loading, orders])

  const filteredOrders = useMemo(() => {
    if (!debouncedSearch.trim()) return orders
    const q = debouncedSearch.toLowerCase().trim()
    return orders.filter((order) => {
      const idMatch = order.id.toLowerCase().includes(q)
      const emailMatch = order.email.toLowerCase().includes(q)
      const firstName = (order.shipping_address?.first_name || '').toLowerCase()
      const lastName = (order.shipping_address?.last_name || '').toLowerCase()
      const nameMatch = firstName.includes(q) || lastName.includes(q) || `${firstName} ${lastName}`.includes(q)
      const trackingMatch = (order.tracking_code || '').toLowerCase().includes(q)
      return idMatch || emailMatch || nameMatch || trackingMatch
    })
  }, [orders, debouncedSearch])

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
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id))
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
      toast.error('Selecteer eerst orders')
      return
    }

    if (!bulkAction) {
      toast.error('Selecteer eerst een actie')
      return
    }

    setShowBulkConfirm(true)
  }

  const executeBulkAction = async () => {
    setShowBulkConfirm(false)
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

      toast.success(`${selectedOrders.length} order(s) bijgewerkt!`)
      setSelectedOrders([])
      setBulkAction('')
      fetchOrders()
      fetchStatusCounts()
    } catch (err: any) {
      toast.error(`Fout: ${err.message}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleBatchLabels = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecteer eerst orders')
      return
    }

    setBatchLabelsLoading(true)
    const toastId = toast.loading(`Labels aanmaken voor ${selectedOrders.length} order(s)...`)

    try {
      const res = await fetch('/api/admin/orders/batch-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrders }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Fout bij batch label aanmaak')
      }

      toast.dismiss(toastId)

      if (data.message) {
        toast.success(data.message, { duration: 6000 })
      } else {
        const parts: string[] = []
        if (data.success?.length) parts.push(`${data.success.length} label(s) aangemaakt`)
        if (data.failed?.length) parts.push(`${data.failed.length} mislukt`)
        toast.success(parts.join(', ') || 'Klaar!')

        if (data.failed?.length) {
          data.failed.forEach((f: { id: string; error: string }) => {
            toast.error(`#${f.id.slice(0, 8)}: ${f.error}`, { duration: 5000 })
          })
        }
      }

      setSelectedOrders([])
      setBulkAction('')
      fetchOrders()
      fetchStatusCounts()
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message || 'Fout bij batch label aanmaak')
    } finally {
      setBatchLabelsLoading(false)
    }
  }

  const handlePicklist = () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecteer eerst orders')
      return
    }
    const ids = selectedOrders.join(',')
    window.open(`/admin/orders/picklist?ids=${ids}`, '_blank')
  }

  const filters = [
    { value: 'all', label: 'Alle Orders', count: statusCounts['all'] || 0 },
    { value: 'pending', label: 'In afwachting', count: statusCounts['pending'] || 0 },
    { value: 'paid', label: 'Betaald', count: statusCounts['paid'] || 0 },
    { value: 'processing', label: 'In behandeling', count: statusCounts['processing'] || 0 },
    { value: 'shipped', label: 'Verzonden', count: statusCounts['shipped'] || 0 },
    { value: 'delivered', label: 'Afgeleverd', count: statusCounts['delivered'] || 0 },
    { value: 'returns', label: 'Returns', count: statusCounts['returns'] || 0 },
  ]

  if (loading && orders.length === 0) {
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
        <div className="grid grid-cols-3 md:flex md:w-auto gap-2 w-full">
          <Link
            href="/admin/orders/create"
            className="bg-black hover:bg-gray-800 text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors active:scale-95 flex items-center justify-center gap-1.5 md:gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nieuwe</span> Order
          </Link>
          <button 
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 md:gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Bezig...' : 'Ververs'}
          </button>
          <button
            onClick={() => {
              if (filteredOrders.length === 0) { toast.error('Geen orders om te exporteren'); return }
              const headers = ['Order ID','Email','Status','Betaling','Levering','Totaal','Datum']
              const csvRows = [
                headers.join(','),
                ...filteredOrders.map(o => [
                  o.id.slice(0, 8),
                  o.email,
                  o.status,
                  o.payment_status || 'unpaid',
                  o.delivery_method === 'pickup' ? 'Afhalen' : 'Verzending',
                  `€${Number(o.total).toFixed(2)}`,
                  new Date(o.created_at).toLocaleDateString('nl-NL'),
                ].map(val => `"${val}"`).join(','))
              ]
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
              link.style.visibility = 'hidden'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors active:scale-95 flex items-center justify-center"
          >
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Zoek op order ID, email, naam of tracking code..."
          className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-medium bg-white transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1) }}
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
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{filteredOrders.length}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totaal Orders</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
            {filteredOrders.filter(o => o.payment_status === 'paid').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Betaald</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">
            {filteredOrders.filter(o => o.payment_status === 'pending').length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Wacht op betaling</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            €{filteredOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Omzet (Betaald)</div>
        </div>
      </div>

      {/* Orders Table */}
      {/* Bulk Confirmation */}
      {showBulkConfirm && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <span className="font-bold text-yellow-800">
            Weet je zeker dat je de status van {selectedOrders.length} order(s) wilt wijzigen naar &quot;{getStatusLabel(bulkAction)}&quot;?
          </span>
          <div className="flex gap-2">
            <button
              onClick={executeBulkAction}
              disabled={bulkUpdating}
              className="bg-black text-white font-bold py-2 px-6 uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {bulkUpdating ? 'Bijwerken...' : 'Bevestigen'}
            </button>
            <button
              onClick={() => setShowBulkConfirm(false)}
              className="border-2 border-gray-300 text-gray-700 font-bold py-2 px-6 uppercase tracking-wider text-sm hover:border-gray-400 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-gray-200">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {debouncedSearch.trim() ? (
              <>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Geen resultaten</h3>
                <p className="text-gray-500">Geen orders gevonden voor &quot;{debouncedSearch}&quot;</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen orders</h3>
                <p className="text-gray-500">Orders verschijnen hier zodra klanten bestellen!</p>
              </>
            )}
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
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={handleBatchLabels}
                    disabled={batchLabelsLoading}
                    className="flex-1 md:flex-none bg-white text-brand-primary font-bold py-2 px-4 uppercase tracking-wider text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Tag className="w-4 h-4" />
                    {batchLabelsLoading ? 'Bezig...' : 'Labels aanmaken'}
                  </button>
                  <button
                    onClick={handlePicklist}
                    className="flex-1 md:flex-none bg-white text-brand-primary font-bold py-2 px-4 uppercase tracking-wider text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Picklijst
                  </button>
                </div>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="md:ml-auto text-white hover:text-gray-200 text-left md:text-right"
                >
                  Deselecteren
                </button>
              </div>
            )}

            <div className="md:hidden space-y-3 p-3">
              {filteredOrders.map((order) => (
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
                    <div className="font-bold text-gray-900 text-right">€{Number(order.total).toFixed(2)}</div>
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
                    onClick={saveScrollPosition}
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
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
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
                {filteredOrders.map((order) => (
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
                        onClick={saveScrollPosition}
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
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Pagina {page} van {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} items)
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
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
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

