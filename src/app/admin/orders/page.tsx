'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Plus, Search, Printer, Tag, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from '@/components/admin/StatusBadge'
import ProductionStatus from '@/components/admin/ProductionStatus'
import ProductionFeedNotice from '@/components/admin/ProductionFeedNotice'
import { orderStatus } from '@/lib/status-registry'
import { formatBedrag } from '@/lib/format-price'

interface Order {
  id: string
  source?: string
  name?: string
  detail_url?: string
  shipping_status?: string
  synced_at?: string
  production_status?: string
  production_checked_at?: string | null
  production_stale?: boolean
  production_source_url?: string | null
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
  label_url: string | null
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
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
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
    // Counts and rows are updated together from the same complete response.
  }, [])

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
  }, [filter, page, debouncedSearch])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      const response = await fetch('/api/admin/order-overview', {cache:'no-store'})
      if(!response.ok) throw new Error('Het volledige besteloverzicht kan niet worden geladen.')
      const result = await response.json()
      if(!Array.isArray(result.orders)) throw new Error('Ongeldig besteloverzicht.')
      const all = result.orders as Order[]
      const counts: Record<string,number> = {all:all.length}
      for(const o of all) counts[o.status]=(counts[o.status]??0)+1
      counts.returns=['return_requested','return_in_transit','return_received','return_completed'].reduce((n,k)=>n+(counts[k]??0),0)
      setStatusCounts(counts)
      const q=debouncedSearch.trim().toLowerCase()
      const matching=all.filter(o=> (filter==='all'||(filter==='returns'?['return_requested','return_in_transit','return_received','return_completed'].includes(o.status):o.status===filter)) &&
        (!q||[o.id,o.name,o.email,o.tracking_code,o.shipping_address?.first_name,o.shipping_address?.last_name].filter(Boolean).join(' ').toLowerCase().includes(q)))
      setTotalCount(matching.length)
      setOrders(matching.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE))
      setSelectedOrders([])
      setError('')
      pendingScrollRestore.current = true
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const timer=setInterval(()=>{
      if(document.visibilityState==='visible' && !selectedOrders.length && !bulkUpdating && !deleteTargetIds) void fetchOrders()
    },60000)
    return ()=>clearInterval(timer)
  },[filter,page,debouncedSearch,selectedOrders.length,bulkUpdating,deleteTargetIds])

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

  const filteredOrders = orders

  // De vier lokale status-kaarten (getStatusColor, getStatusLabel,
  // getPaymentStatusColor, getPaymentStatusLabel) zijn vervangen door
  // src/lib/status-registry.ts. Er stonden vijf van zulke kaarten in de admin
  // en die gaven voor dezelfde status verschillende kleuren en labels. Hier
  // speelde bovendien dat `paid` als ORDERstatus blauw was en als BETAALstatus
  // groen, twee centimeter uit elkaar in dezelfde rij.

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.filter(o=>o.source!=='shopify').map(o => o.id))
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

    if (bulkAction === '__delete__') {
      setDeleteTargetIds([...selectedOrders])
      return
    }

    setShowBulkConfirm(true)
  }

  const confirmDeleteOrders = async () => {
    if (!deleteTargetIds?.length) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: deleteTargetIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt')
      toast.success(`${data.deleted} order(s) verwijderd`)
      setDeleteTargetIds(null)
      setSelectedOrders([])
      setBulkAction('')
      fetchOrders()
      fetchStatusCounts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verwijderen mislukt'
      toast.error(msg)
    } finally {
      setDeleteSubmitting(false)
    }
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

  const handleSyncAllStatuses = async () => {
    setSyncingAll(true)
    const toastId = toast.loading('Sendcloud statussen synchroniseren…')
    try {
      const res = await fetch('/api/admin/sync-order-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({} as any))

      toast.dismiss(toastId)

      if (!res.ok) {
        throw new Error(data.error || 'Sync mislukt')
      }

      if (data.skipped) {
        toast('Sendcloud niet geconfigureerd — niets te synchroniseren.', {
          icon: 'ℹ️',
        })
      } else {
        const summary = `Gescand: ${data.scanned ?? 0} • Bijgewerkt: ${data.changed ?? 0} • Mails: ${data.emailsSent ?? 0}${data.errors ? ` • Fouten: ${data.errors}` : ''}`
        toast.success(summary, { duration: 6000 })
      }
      fetchOrders()
      fetchStatusCounts()
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message || 'Sync mislukt')
    } finally {
      setSyncingAll(false)
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

  /**
   * Tabs die niets te tonen hebben, tonen we niet.
   *
   * Deze lijst filtert op `status`, en die kolom heeft in de hele winkel nooit
   * de waarde 'paid' of 'processing' gehad. Er stond dus permanent
   * "Betaald (0)" en "In behandeling (0)", pal naast een lijst waarin bij
   * eenenvijftig bestellingen BETAALD staat. Dat is het soort tegenspraak waar
   * je even over struikelt, elke keer opnieuw: die badge toont `payment_status`
   * en deze tab `status`, twee verschillende velden met hetzelfde woord.
   *
   * De lege tabs verdwijnen nu vanzelf, en komen vanzelf terug zodra een
   * status wél voorkomt. Alles en de tab waar je op staat blijven altijd staan.
   */
  const alleFilters = [
    { value: 'all', label: 'Alle Orders', count: statusCounts['all'] || 0 },
    { value: 'pending', label: 'In afwachting', count: statusCounts['pending'] || 0 },
    { value: 'paid', label: 'Betaald', count: statusCounts['paid'] || 0 },
    { value: 'processing', label: 'In behandeling', count: statusCounts['processing'] || 0 },
    { value: 'shipped', label: 'Verzonden', count: statusCounts['shipped'] || 0 },
    { value: 'delivered', label: 'Afgeleverd', count: statusCounts['delivered'] || 0 },
    { value: 'returns', label: 'Retouren', count: statusCounts['returns'] || 0 },
  ]

  const filters = alleFilters.filter(
    (f) => f.value === 'all' || f.value === filter || f.count > 0
  )

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
          <p className="text-xs text-gray-500 mt-2">Alle MOSE- en Shopify-bestellingen. Productie, betaling en verzending worden afzonderlijk gecontroleerd.</p>
          <Link href="/admin/shopify/production" className="inline-block mt-2 text-xs font-semibold underline underline-offset-2">Productiecontrole en verbindingsstatus</Link>
          <ProductionFeedNotice />
        </div>
        {/* Laat de knoppen afbreken. Vanaf md werden het er vier naast elkaar op
            volle tekstbreedte, en op een tablet van 768 pixels stak de knop
            Exporteren daardoor 129 pixels buiten het scherm. */}
        <div className="grid grid-cols-3 md:flex md:flex-wrap md:justify-end md:w-auto gap-2 w-full">
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
            onClick={handleSyncAllStatuses}
            disabled={syncingAll}
            title="Haal voor alle openstaande zendingen de actuele status op bij Sendcloud"
            className="bg-gray-800 hover:bg-black text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 md:gap-2 col-span-3 md:col-span-1"
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Sync…' : 'Sync Sendcloud'}
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
                  `${formatBedrag(Number(o.total))}`,
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

      {/* Resultaatregel.
          Hier stonden vier statkaarten die over `filteredOrders` rekenden, dus
          over de maximaal 25 rijen van de HUIDIGE pagina, terwijl het label
          "Totaal Orders" beloofde. Naast die kaarten tonen de filterknoppen
          hierboven wél de echte tellingen uit de database, dus op pagina 2
          stond er "25" naast een knop die "430" zei. Twee getallen voor
          hetzelfde ding, die elkaar tegenspreken, op het eerste scherm van de
          dag.
          Vervangen door één regel met het echte totaal. Dat scheelt bovendien
          circa 150px verticaal, goed voor ongeveer acht extra zichtbare
          orderrijen. */}
      <div className="flex items-baseline gap-2 mb-4 text-sm text-gray-600">
        <span className="font-bold text-black text-base">{totalCount}</span>
        <span className="uppercase tracking-wide">
          {totalCount === 1 ? 'order' : 'orders'}
          {filter !== 'all' ? ' in dit filter' : ''}
          {debouncedSearch.trim() ? ` voor "${debouncedSearch.trim()}"` : ''}
        </span>
      </div>

      {/* Orders Table */}
      {/* Bulk Confirmation */}
      {deleteTargetIds && deleteTargetIds.length > 0 && (
        <div className="bg-red-50 border-2 border-red-600 p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="font-bold text-red-900 text-sm md:text-base">
            <strong>{deleteTargetIds.length}</strong> order(s) permanent verwijderen? Dit kan niet ongedaan worden
            gemaakt (inclusief orderregels en gekoppelde retourdata).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmDeleteOrders}
              disabled={deleteSubmitting}
              className="bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider text-sm hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              {deleteSubmitting ? 'Bezig…' : 'Definitief verwijderen'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTargetIds(null)}
              disabled={deleteSubmitting}
              className="border-2 border-gray-400 text-gray-800 font-bold py-2 px-6 uppercase tracking-wider text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {showBulkConfirm && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <span className="font-bold text-yellow-800">
            Weet je zeker dat je de status van {selectedOrders.length} order(s) wilt wijzigen naar &quot;{orderStatus(bulkAction).label}&quot;?
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
                  <option value="__delete__">Verwijderen (definitief)…</option>
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
                        {order.name || '#'+order.id.slice(0, 8)}
                      </code>
                      <div className="text-sm font-semibold text-gray-900 mt-2 break-all">{order.email}</div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={order.source === 'shopify'}
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-5 h-5 mt-1"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <StatusBadge status={order.payment_status || 'unpaid'} kind="payment" />
                    <div className="flex items-center flex-wrap gap-1">
                      <StatusBadge status={order.status} kind="order" />
                      <ProductionStatus order={order} />
                      {order.shipping_status && <p className="text-xs text-gray-600 mt-1">{order.shipping_status}</p>}
                      {order.label_url && order.status === 'processing' ? (
                      <span
                        title="Label aangemaakt, wacht op ophalen door DHL"
                        className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-gray-400 text-gray-600 bg-gray-50 whitespace-nowrap"
                      >
                        label klaar
                      </span>
                    ) : null}
                    </div>
                    <div className="text-gray-600">Datum: {new Date(order.created_at).toLocaleDateString('nl-NL')}</div>
                    <div className="font-bold text-gray-900 text-right">{formatBedrag(Number(order.total))}</div>
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

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={order.detail_url || `/admin/orders/${order.id}`}
                      onClick={saveScrollPosition}
                      className="flex-1 text-center text-brand-primary border-2 border-brand-primary py-2 text-sm font-semibold"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      disabled={order.source === 'shopify'}
                      onClick={() => setDeleteTargetIds([order.id])}
                      className="flex-shrink-0 px-3 py-2 border-2 border-red-300 text-red-700 hover:bg-red-50 text-sm font-semibold"
                      title="Order verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-gray-200">
                <caption className="sr-only">Overzicht van bestellingen</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                        onChange={handleSelectAll}
                        className="w-5 h-5"
                      />
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Klant
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Totaal
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
                        disabled={order.source === 'shopify'}
                      checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {order.name || '#'+order.id.slice(0, 8)}
                      </code>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px] md:max-w-none">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatBedrag(Number(order.total))}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.payment_status || 'unpaid'} kind="payment" />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.status} kind="order" />
                      <ProductionStatus order={order} />
                      {order.shipping_status && <p className="text-xs text-gray-600 mt-1">{order.shipping_status}</p>}
                      {order.label_url && order.status === 'processing' ? (
                      <span
                        title="Label aangemaakt, wacht op ophalen door DHL"
                        className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-gray-400 text-gray-600 bg-gray-50 whitespace-nowrap"
                      >
                        label klaar
                      </span>
                    ) : null}
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
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {new Date(order.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={order.detail_url || `/admin/orders/${order.id}`}
                          onClick={saveScrollPosition}
                          className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                        >
                          Details
                        </Link>
                        <button
                          type="button"
                          disabled={order.source === 'shopify'}
                      onClick={() => setDeleteTargetIds([order.id])}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Order verwijderen"
                          aria-label="Order verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

