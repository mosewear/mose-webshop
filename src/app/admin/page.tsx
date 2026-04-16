'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

type DateRange = 'today' | '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string; days: number }[] = [
  { value: 'today', label: 'Vandaag', days: 1 },
  { value: '7d', label: '7 dagen', days: 7 },
  { value: '30d', label: '30 dagen', days: 30 },
  { value: '90d', label: '90 dagen', days: 90 },
]

interface OrderRow {
  status: string
  payment_status: string
  total: number
  checkout_started_at: string | null
  created_at: string
}

interface PeriodStats {
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  unpaidOrders: number
  pendingPayments: number
  totalRevenue: number
  conversionRate: number
  avgOrderValue: number
  abandonedCarts: number
}

interface DashboardStats extends PeriodStats {
  totalProducts: number
  totalCategories: number
  totalVariants: number
  totalStock: number
  lowStockCount: number
  totalCustomers: number
}

const EMPTY_PERIOD: PeriodStats = {
  totalOrders: 0,
  pendingOrders: 0,
  paidOrders: 0,
  unpaidOrders: 0,
  pendingPayments: 0,
  totalRevenue: 0,
  conversionRate: 0,
  avgOrderValue: 0,
  abandonedCarts: 0,
}

function computePeriodStats(orders: OrderRow[]): PeriodStats {
  const totalOrders = orders.length
  const paid = orders.filter(o => o.payment_status === 'paid')
  const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid' || !o.payment_status).length
  const pendingPayments = orders.filter(o => o.payment_status === 'pending').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length

  const totalRevenue = paid.reduce((sum, o) => sum + Number(o.total), 0)
  const avgOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0

  const withCheckout = orders.filter(o => o.checkout_started_at)
  const conversionRate = withCheckout.length > 0
    ? (paid.length / withCheckout.length) * 100
    : 0

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const abandonedCarts = orders.filter(o =>
    o.checkout_started_at &&
    new Date(o.checkout_started_at) < cutoff &&
    o.payment_status !== 'paid'
  ).length

  return {
    totalOrders,
    pendingOrders,
    paidOrders: paid.length,
    unpaidOrders,
    pendingPayments,
    totalRevenue,
    conversionRate,
    avgOrderValue,
    abandonedCarts,
  }
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100
  const positive = pct >= 0
  return (
    <span className={`inline-flex items-center text-xs font-bold ml-2 ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {positive ? '↑' : '↓'} {positive ? '+' : ''}{Math.round(pct)}%
    </span>
  )
}

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [stats, setStats] = useState<DashboardStats>({
    ...EMPTY_PERIOD,
    totalProducts: 0,
    totalCategories: 0,
    totalVariants: 0,
    totalStock: 0,
    lowStockCount: 0,
    totalCustomers: 0,
  })
  const [prevStats, setPrevStats] = useState<PeriodStats>(EMPTY_PERIOD)
  const [ordersToFulfill, setOrdersToFulfill] = useState(0)
  const [dbOnline, setDbOnline] = useState<boolean | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  const fetchData = async (range: DateRange, isInitial = false) => {
    if (isInitial) setLoading(true)

    try {
      const rangeDays = DATE_RANGE_OPTIONS.find(o => o.value === range)!.days
      const now = new Date()
      const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
      const prevStart = new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000)

      const [
        productsRes,
        categoriesRes,
        variantsRes,
        ordersRes,
        customersRes,
        fulfillRes,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('product_variants').select('stock_quantity'),
        supabase.from('orders')
          .select('status, payment_status, total, checkout_started_at, created_at')
          .gte('created_at', prevStart.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('payment_status', 'paid')
          .in('status', ['pending', 'paid', 'processing']),
      ])

      setDbOnline(!productsRes.error && !ordersRes.error)

      const totalProducts = productsRes.count || 0
      const totalCategories = categoriesRes.count || 0
      const variants = variantsRes.data || []
      const totalVariants = variants.length
      const totalStock = variants.reduce((sum: number, v: { stock_quantity: number }) => sum + v.stock_quantity, 0)
      const lowStockCount = variants.filter((v: { stock_quantity: number }) => v.stock_quantity < 5).length
      const totalCustomers = customersRes.count || 0

      const allOrders: OrderRow[] = ordersRes.data || []
      const currentOrders = allOrders.filter(o => new Date(o.created_at) >= currentStart)
      const prevOrders = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= prevStart && d < currentStart
      })

      const currentPeriod = computePeriodStats(currentOrders)
      const previousPeriod = computePeriodStats(prevOrders)

      setStats({
        ...currentPeriod,
        totalProducts,
        totalCategories,
        totalVariants,
        totalStock,
        lowStockCount,
        totalCustomers,
      })
      setPrevStats(previousPeriod)
      setOrdersToFulfill(fulfillRes.count || 0)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      toast.error('Fout bij het laden van dashboard data')
      setDbOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(dateRange, true)
  }, [dateRange])

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(dateRange), 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 flex flex-col">
      {/* Header + Date Range + Last Update */}
      <div className="order-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">Dashboard</h1>
            <p className="text-gray-600 text-sm md:text-base">Welkom terug! Hier is je overzicht.</p>
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap pt-2">
            Laatste update: {lastUpdate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-4 py-2 text-xs uppercase tracking-wide font-bold border-2 transition-all ${
                dateRange === opt.value
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders to Fulfill Alert */}
      {ordersToFulfill > 0 && (
        <Link
          href="/admin/orders"
          className="flex items-center justify-between bg-amber-50 border-2 border-amber-300 p-5 hover:border-amber-500 hover:shadow-lg transition-all group order-1"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-400 text-white flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm md:text-base">
                {ordersToFulfill} {ordersToFulfill === 1 ? 'order wacht' : 'orders wachten'} op verzending
              </div>
              <div className="text-xs text-amber-700">Betaalde orders die nog niet verzonden zijn</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-white text-sm font-bold w-8 h-8 flex items-center justify-center">
              {ordersToFulfill}
            </span>
            <svg className="w-5 h-5 text-amber-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </Link>
      )}

      {/* Revenue & Customers Row */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 ${ordersToFulfill > 0 ? 'order-2' : 'order-1'}`}>
        <Link
          href="/admin/analytics"
          className="bg-gradient-to-r from-brand-primary to-brand-primary-hover p-8 text-white border-2 border-brand-primary hover:shadow-xl hover:scale-[1.02] transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-all">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-right min-w-0">
              <div className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display group-hover:scale-105 transition-transform truncate">
                €{stats.totalRevenue.toFixed(2)}
              </div>
              <DeltaBadge current={stats.totalRevenue} previous={prevStats.totalRevenue} />
            </div>
          </div>
          <div className="text-lg md:text-xl uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Totale Omzet</span>
            <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="text-sm text-white/80 mt-2 space-y-1">
            <div>✓ {stats.paidOrders} betaalde orders</div>
            <div>Ø €{stats.avgOrderValue.toFixed(2)} per order</div>
            <div className="mt-3 text-white/60 text-xs uppercase tracking-wide group-hover:text-white/90 transition-colors">
              → Klik voor uitgebreide analytics
            </div>
          </div>
        </Link>

        <Link
          href="/admin/customers"
          className="bg-white p-8 border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-purple-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-purple-600">
              {stats.totalCustomers}
            </div>
          </div>
          <div className="text-lg md:text-xl text-gray-600 uppercase tracking-wider font-bold">Klanten</div>
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 order-3">
        <Link
          href="/admin/products"
          className="bg-white p-6 border-2 border-gray-200 hover:border-brand-primary hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-brand-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-brand-primary">{stats.totalProducts}</div>
          </div>
          <div className="text-sm md:text-base text-gray-600 uppercase tracking-wide font-semibold">Producten</div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalVariants} varianten</div>
        </Link>

        <Link
          href="/admin/categories"
          className="bg-white p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-blue-600">{stats.totalCategories}</div>
          </div>
          <div className="text-sm md:text-base text-gray-600 uppercase tracking-wide font-semibold">Categorieën</div>
        </Link>

        <Link
          href="/admin/inventory"
          className="bg-white p-6 border-2 border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-orange-600">{stats.totalStock}</div>
          </div>
          <div className="text-sm md:text-base text-gray-600 uppercase tracking-wide font-semibold">Totale Voorraad</div>
          {stats.lowStockCount > 0 && (
            <div className="text-xs text-red-600 mt-1 font-semibold">⚠️ {stats.lowStockCount} items laag</div>
          )}
        </Link>

        <Link
          href="/admin/orders"
          className="bg-white p-6 border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-3xl md:text-4xl font-bold text-green-600">{stats.totalOrders}</div>
              <DeltaBadge current={stats.totalOrders} previous={prevStats.totalOrders} />
            </div>
          </div>
          <div className="text-sm md:text-base text-gray-600 uppercase tracking-wide font-semibold">Orders</div>
          {stats.pendingOrders > 0 && (
            <div className="text-xs text-orange-600 mt-1 font-semibold">🔔 {stats.pendingOrders} pending</div>
          )}
        </Link>
      </div>

      {/* KPI Insights */}
      <div className="order-4">
        <h2 className="text-xl md:text-2xl font-display font-bold mb-4">KPI Inzichten</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white border-2 border-gray-200 p-4 sm:p-6">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600 mb-1 sm:mb-2">Conversie</div>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-bold text-brand-primary">{stats.conversionRate.toFixed(1)}%</span>
              <DeltaBadge current={stats.conversionRate} previous={prevStats.conversionRate} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Checkout → betaald</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 sm:p-6">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600 mb-1 sm:mb-2">Gem. Orderwaarde</div>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-bold text-brand-primary">€{stats.avgOrderValue.toFixed(2)}</span>
              <DeltaBadge current={stats.avgOrderValue} previous={prevStats.avgOrderValue} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Per betaalde order</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 sm:p-6">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600 mb-1 sm:mb-2 leading-tight">Verlaten Mandjes</div>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-bold text-amber-600">{stats.abandonedCarts}</span>
              <DeltaBadge current={stats.abandonedCarts} previous={prevStats.abandonedCarts} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Checkout gestart, niet betaald</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 sm:p-6">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600 mb-1 sm:mb-2">Onbetaalde Orders</div>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-bold text-red-600">{stats.unpaidOrders}</span>
              <DeltaBadge current={stats.unpaidOrders} previous={prevStats.unpaidOrders} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Geen betaling ontvangen</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4 sm:p-6 col-span-2 sm:col-span-1">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600 mb-1 sm:mb-2">Betalingen Pending</div>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-3xl font-bold text-orange-600">{stats.pendingPayments}</span>
              <DeltaBadge current={stats.pendingPayments} previous={prevStats.pendingPayments} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Wachten op verwerking</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-gray-200 p-6 md:p-8 order-5">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Snelle Acties</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/products/create"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all group"
          >
            <div className="w-10 h-10 bg-brand-primary text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm md:text-base">Nieuw Product</div>
              <div className="text-xs text-gray-500">Voeg product toe</div>
            </div>
          </Link>

          <Link
            href="/admin/categories/create"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm md:text-base">Nieuwe Categorie</div>
              <div className="text-xs text-gray-500">Voeg categorie toe</div>
            </div>
          </Link>

          <Link
            href="/admin/orders"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm md:text-base">Bekijk Orders</div>
              <div className="text-xs text-gray-500">Beheer bestellingen</div>
            </div>
          </Link>

          <Link
            href="/admin/reviews"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
          >
            <div className="w-10 h-10 bg-yellow-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm md:text-base">Reviews</div>
              <div className="text-xs text-gray-500">Beheer reviews</div>
            </div>
          </Link>

          <Link
            href="/admin/promo-codes"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm md:text-base">Kortingscodes</div>
              <div className="text-xs text-gray-500">Beheer promo codes</div>
            </div>
          </Link>
        </div>
      </div>

      {/* System Status - Real health check */}
      <div className="bg-white border-2 border-gray-200 p-6 md:p-8 order-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Systeem Status</h2>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${dbOnline ? 'bg-green-500 animate-pulse' : dbOnline === false ? 'bg-red-500' : 'bg-gray-300'}`} />
          <div>
            <div className="font-bold text-sm">Database</div>
            <div className={`text-xs ${dbOnline ? 'text-green-600' : dbOnline === false ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {dbOnline === null ? 'Controleren...' : dbOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
