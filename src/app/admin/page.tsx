'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DashboardStats {
  totalProducts: number
  totalCategories: number
  totalVariants: number
  totalStock: number
  lowStockCount: number
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  unpaidOrders: number
  pendingPayments: number
  totalCustomers: number
  totalRevenue: number
  conversionRate: number
  avgOrderValue: number
  abandonedCarts: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalVariants: 0,
    totalStock: 0,
    lowStockCount: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    pendingPayments: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    abandonedCarts: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        productsRes,
        categoriesRes,
        variantsRes,
        ordersRes,
        customersRes,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('product_variants').select('stock_quantity'),
        supabase.from('orders').select('status, payment_status, total, checkout_started_at'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])

      // Calculate stats
      const totalProducts = productsRes.count || 0
      const totalCategories = categoriesRes.count || 0
      
      const variants = variantsRes.data || []
      const totalVariants = variants.length
      const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0)
      const lowStockCount = variants.filter(v => v.stock_quantity < 5).length

      const orders = ordersRes.data || []
      const totalOrders = orders.length
      
      // Payment status stats
      const paidOrders = orders.filter(o => o.payment_status === 'paid')
      const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid' || !o.payment_status)
      const pendingPayments = orders.filter(o => o.payment_status === 'pending')
      
      // Order status stats
      const pendingOrders = orders.filter(o => o.status === 'pending').length
      
      // Revenue (ONLY from paid orders)
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
      
      // Average order value (only paid orders)
      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
      
      // Conversion rate (paid / total orders that started checkout)
      const ordersWithCheckout = orders.filter(o => o.checkout_started_at)
      const conversionRate = ordersWithCheckout.length > 0 
        ? (paidOrders.length / ordersWithCheckout.length) * 100 
        : 0
      
      // Abandoned carts (checkout started but not paid, older than 24h)
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const abandonedCarts = orders.filter(o => 
        o.checkout_started_at &&
        new Date(o.checkout_started_at) < twentyFourHoursAgo &&
        o.payment_status !== 'paid'
      ).length

      const totalCustomers = customersRes.count || 0

      setStats({
        totalProducts,
        totalCategories,
        totalVariants,
        totalStock,
        lowStockCount,
        totalOrders,
        pendingOrders,
        paidOrders: paidOrders.length,
        unpaidOrders: unpaidOrders.length,
        pendingPayments: pendingPayments.length,
        totalCustomers,
        totalRevenue,
        conversionRate,
        avgOrderValue,
        abandonedCarts,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 flex flex-col">
      {/* Welcome Header */}
      <div className="order-0">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 text-sm md:text-base">Welkom terug! Hier is je overzicht.</p>
      </div>

      {/* Revenue & Customers Row - FIRST ON MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 order-1">
        {/* Revenue */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-primary-hover p-8 text-white border-2 border-brand-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-5xl md:text-6xl font-display">
              €{stats.totalRevenue.toFixed(2)}
            </div>
          </div>
          <div className="text-lg md:text-xl uppercase tracking-wider font-bold">Totale Omzet</div>
          <div className="text-sm text-white/80 mt-2 space-y-1">
            <div>✓ {stats.paidOrders} betaalde orders</div>
            <div>Ø €{stats.avgOrderValue.toFixed(2)} per order</div>
          </div>
        </div>

        {/* Customers */}
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
            <div className="text-5xl md:text-6xl font-display text-purple-600">
              {stats.totalCustomers}
            </div>
          </div>
          <div className="text-lg md:text-xl text-gray-600 uppercase tracking-wider font-bold">Klanten</div>
        </Link>
      </div>

      {/* CONVERSION FUNNEL - NEW */}
      <div className="bg-white border-2 border-gray-200 p-6 md:p-8 order-1-5">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 flex items-center gap-2">
          📊 Conversion Funnel
        </h2>
        <div className="space-y-4">
          {/* Funnel Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 border-l-4 border-gray-400">
              <div className="text-3xl font-bold text-gray-700">{stats.totalOrders}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mt-1">
                Totaal Orders
              </div>
            </div>
            <div className="bg-yellow-50 p-4 border-l-4 border-yellow-400">
              <div className="text-3xl font-bold text-yellow-700">{stats.pendingPayments}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mt-1">
                ⏳ Wacht op betaling
              </div>
            </div>
            <div className="bg-green-50 p-4 border-l-4 border-green-400">
              <div className="text-3xl font-bold text-green-700">{stats.paidOrders}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mt-1">
                ✓ Betaald
              </div>
            </div>
            <div className="bg-red-50 p-4 border-l-4 border-red-400">
              <div className="text-3xl font-bold text-red-700">{stats.abandonedCarts}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mt-1">
                🛒 Abandoned (24h+)
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-r from-green-400 to-green-500 p-6 text-white mt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-wider font-semibold mb-1">Conversie Rate</div>
                <div className="text-4xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              </div>
              <div className="text-5xl opacity-50">📈</div>
            </div>
            <div className="mt-3 text-sm text-white/90">
              {stats.paidOrders} van {stats.totalOrders} orders zijn succesvol betaald
            </div>
          </div>

          {/* Visual Funnel */}
          <div className="mt-6 space-y-2">
            <div className="text-sm font-bold text-gray-700 mb-3">VISUELE FUNNEL:</div>
            {/* Step 1: All Orders */}
            <div className="relative">
              <div 
                className="bg-gray-300 h-12 flex items-center justify-between px-4"
                style={{ width: '100%' }}
              >
                <span className="text-sm font-bold">Orders Aangemaakt</span>
                <span className="text-sm font-bold">{stats.totalOrders}</span>
              </div>
            </div>
            {/* Step 2: Pending */}
            <div className="relative">
              <div 
                className="bg-yellow-300 h-12 flex items-center justify-between px-4"
                style={{ width: `${stats.totalOrders > 0 ? (stats.pendingPayments / stats.totalOrders * 100) : 0}%`, minWidth: '20%' }}
              >
                <span className="text-sm font-bold">Wacht op betaling</span>
                <span className="text-sm font-bold">{stats.pendingPayments}</span>
              </div>
            </div>
            {/* Step 3: Paid */}
            <div className="relative">
              <div 
                className="bg-green-400 h-12 flex items-center justify-between px-4"
                style={{ width: `${stats.totalOrders > 0 ? (stats.paidOrders / stats.totalOrders * 100) : 0}%`, minWidth: '20%' }}
              >
                <span className="text-sm font-bold text-white">Betaald ✓</span>
                <span className="text-sm font-bold text-white">{stats.paidOrders}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid - SECOND ON MOBILE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 order-2">
        {/* Products */}
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

        {/* Categories */}
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

        {/* Stock */}
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

        {/* Orders */}
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
            <div className="text-3xl md:text-4xl font-bold text-green-600">{stats.totalOrders}</div>
          </div>
          <div className="text-sm md:text-base text-gray-600 uppercase tracking-wide font-semibold">Orders</div>
          {stats.pendingOrders > 0 && (
            <div className="text-xs text-orange-600 mt-1 font-semibold">🔔 {stats.pendingOrders} pending</div>
          )}
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-gray-200 p-6 md:p-8 order-3">
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

      {/* System Status */}
      <div className="bg-white border-2 border-gray-200 p-6 md:p-8 order-4">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Systeem Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <div className="font-bold text-sm">Database</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <div className="font-bold text-sm">Storage</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <div className="font-bold text-sm">API</div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
