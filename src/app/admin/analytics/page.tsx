'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, ShoppingCart, Package, CreditCard, DollarSign, Clock, AlertCircle, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AnalyticsStats {
  totalOrders: number
  paidOrdersCount: number
  pendingPaymentsCount: number
  abandonedCartsCount: number
  failedPaymentsCount: number
  totalRevenue: number
  avgOrderValue: number
  conversionRate: number
}

interface PaymentMethodBreakdown {
  method: string
  count: number
  revenue: number
}

interface TopProduct {
  product_name: string
  total_quantity: number
  total_revenue: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<number>(30)
  const [stats, setStats] = useState<AnalyticsStats>({
    totalOrders: 0,
    paidOrdersCount: 0,
    pendingPaymentsCount: 0,
    abandonedCartsCount: 0,
    failedPaymentsCount: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [revenueHistory, setRevenueHistory] = useState<any[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    const supabase = createClient()
    const rangeStart = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString()

    try {
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, payment_status, total, paid_at, checkout_started_at, created_at')
        .gte('created_at', rangeStart)
        .order('created_at', { ascending: false })
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        setLoading(false)
        return
      }

      // Calculate stats manually for accuracy
      const totalOrders = allOrders?.length || 0
      const paidOrders = allOrders?.filter(o => o.payment_status === 'paid') || []
      const pendingOrders = allOrders?.filter(o => o.payment_status === 'pending') || []
      const failedOrders = allOrders?.filter(o => o.payment_status === 'failed') || []
      
      // Calculate abandoned carts (pending orders older than 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const abandonedCarts = allOrders?.filter(o => 
        o.payment_status === 'pending' && 
        o.checkout_started_at && 
        new Date(o.checkout_started_at) < twentyFourHoursAgo
      ) || []
      
      // Calculate revenue (only paid orders)
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
      const conversionRate = totalOrders > 0 ? (paidOrders.length / totalOrders) * 100 : 0
      
      console.log('📊 Analytics calculated:', {
        totalOrders,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        abandonedCarts: abandonedCarts.length,
        totalRevenue,
        avgOrderValue,
        conversionRate,
      })

      setStats({
        totalOrders,
        paidOrdersCount: paidOrders.length,
        pendingPaymentsCount: pendingOrders.length,
        abandonedCartsCount: abandonedCarts.length,
        failedPaymentsCount: failedOrders.length,
        totalRevenue,
        avgOrderValue,
        conversionRate,
      })

      const { data: ordersData } = await supabase
        .from('orders')
        .select('payment_method, total')
        .eq('payment_status', 'paid')
        .gte('created_at', rangeStart)
        .not('payment_method', 'is', null)

      if (ordersData) {
        const methodBreakdown: { [key: string]: { count: number; revenue: number } } = {}
        
        ordersData.forEach((order) => {
          const method = order.payment_method || 'unknown'
          if (!methodBreakdown[method]) {
            methodBreakdown[method] = { count: 0, revenue: 0 }
          }
          methodBreakdown[method].count++
          methodBreakdown[method].revenue += Number(order.total)
        })

        const methods = Object.entries(methodBreakdown).map(([method, data]) => ({
          method,
          count: data.count,
          revenue: data.revenue,
        }))

        setPaymentMethods(methods.sort((a, b) => b.revenue - a.revenue))
      }

      const { data: productsData } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          price_at_purchase,
          order_id,
          orders!inner(payment_status, created_at)
        `)
        .gte('orders.created_at', rangeStart)

      if (productsData) {
        const productStats: { [key: string]: { quantity: number; revenue: number } } = {}
        
        productsData.forEach((item: any) => {
          if (item.orders?.payment_status === 'paid') {
            const name = item.product_name
            if (!productStats[name]) {
              productStats[name] = { quantity: 0, revenue: 0 }
            }
            productStats[name].quantity += item.quantity
            productStats[name].revenue += item.quantity * Number(item.price_at_purchase)
          }
        })

        const products = Object.entries(productStats).map(([name, data]) => ({
          product_name: name,
          total_quantity: data.quantity,
          total_revenue: data.revenue,
        }))

        setTopProducts(products.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5))
      }

      const { data: historyData } = await supabase
        .from('orders')
        .select('paid_at, total')
        .eq('payment_status', 'paid')
        .not('paid_at', 'is', null)
        .gte('paid_at', rangeStart)
        .order('paid_at', { ascending: true })

      if (historyData) {
        const dailyRevenue: { [key: string]: number } = {}
        historyData.forEach((order) => {
          const d = new Date(order.paid_at!)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          dailyRevenue[key] = (dailyRevenue[key] || 0) + Number(order.total)
        })

        const allDays: { date: string; revenue: number }[] = []
        for (let i = dateRange - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const label = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
          allDays.push({ date: label, revenue: dailyRevenue[key] || 0 })
        }
        setRevenueHistory(allDays)
      }

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      card: 'Creditcard',
      ideal: 'iDEAL',
      bancontact: 'Bancontact',
      paypal: 'PayPal',
      unknown: 'Onbekend',
    }
    return labels[method] || method
  }

  const exportCSV = () => {
    const lines: string[] = []

    lines.push('--- Overzicht ---')
    lines.push('Metriek,Waarde')
    lines.push(`Totale Omzet,€${stats.totalRevenue.toFixed(2)}`)
    lines.push(`Gem. Orderwaarde,€${stats.avgOrderValue.toFixed(2)}`)
    lines.push(`Conversie Rate,${stats.conversionRate.toFixed(1)}%`)
    lines.push(`Totaal Orders,${stats.totalOrders}`)
    lines.push(`Betaalde Orders,${stats.paidOrdersCount}`)
    lines.push(`Verlaten Carts,${stats.abandonedCartsCount}`)
    lines.push('')

    if (revenueHistory.length > 0) {
      lines.push('--- Dagelijkse Omzet ---')
      lines.push('Datum,Omzet')
      revenueHistory.forEach((day) => {
        lines.push(`${day.date},€${day.revenue.toFixed(2)}`)
      })
      lines.push('')
    }

    if (topProducts.length > 0) {
      lines.push('--- Top Producten ---')
      lines.push('Product,Aantal Verkocht,Omzet')
      topProducts.forEach((p) => {
        lines.push(`"${p.product_name}",${p.total_quantity},€${p.total_revenue.toFixed(2)}`)
      })
      lines.push('')
    }

    if (paymentMethods.length > 0) {
      lines.push('--- Betaalmethodes ---')
      lines.push('Methode,Aantal,Omzet')
      paymentMethods.forEach((m) => {
        lines.push(`${getPaymentMethodLabel(m.method)},${m.count},€${m.revenue.toFixed(2)}`)
      })
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mosewear-analytics-${dateRange}d-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Analytics laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 transition-colors border-2 border-gray-300"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
                  <TrendingUp size={32} className="text-brand-primary" />
                  Analytics & Conversie
                </h1>
                <p className="text-sm text-gray-600 mt-1">Uitgebreide inzichten in je verkopen en conversies</p>
              </div>
            </div>
            <button
              onClick={exportCSV}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors"
            >
              <Download size={16} />
              Exporteren
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Date Range Filter + Mobile Export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-colors ${
                  dateRange === days
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {days} dagen
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="sm:hidden flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors"
          >
            <Download size={16} />
            Exporteren
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Totale Omzet</div>
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">€{stats.totalRevenue.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.paidOrdersCount} betaalde orders</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Gem. Orderwaarde</div>
              <ShoppingCart size={20} className="text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">€{stats.avgOrderValue.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">Per betaalde order</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Conversie Rate</div>
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">{stats.paidOrdersCount}/{stats.totalOrders} orders</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Verlaten Carts</div>
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.abandonedCartsCount}</div>
            <div className="text-xs text-gray-500 mt-1">Laatste 24 uur</div>
          </div>
        </div>

        {/* Conversion Funnel - MAIN FEATURE */}
        <div className="bg-white border-2 border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 flex items-center gap-3">
            <TrendingUp size={28} className="text-brand-primary" />
            Conversie Funnel
          </h2>
          <div className="space-y-4">
            {/* Total Orders */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-full md:w-32 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Totaal Orders
              </div>
              <div className="flex-1">
                <div className="bg-gray-200 h-12 flex items-center relative overflow-hidden border-2 border-gray-300">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all duration-500"
                    style={{ width: '100%' }}
                  ></div>
                  <span className="relative z-10 ml-4 font-bold text-gray-900 text-lg">{stats.totalOrders}</span>
                </div>
              </div>
              <div className="w-20 text-right font-bold text-gray-700">100%</div>
            </div>

            {/* Pending Payments */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-full md:w-32 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Wacht op Betaling
              </div>
              <div className="flex-1">
                <div className="bg-yellow-100 h-12 flex items-center relative overflow-hidden border-2 border-yellow-300">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500"
                    style={{ width: `${stats.totalOrders > 0 ? (stats.pendingPaymentsCount / stats.totalOrders) * 100 : 0}%` }}
                  ></div>
                  <span className="relative z-10 ml-4 font-bold text-yellow-900 text-lg">{stats.pendingPaymentsCount}</span>
                </div>
              </div>
              <div className="w-20 text-right font-bold text-yellow-700">
                {stats.totalOrders > 0 ? ((stats.pendingPaymentsCount / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* Paid Orders */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-full md:w-32 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Betaald
              </div>
              <div className="flex-1">
                <div className="bg-green-100 h-12 flex items-center relative overflow-hidden border-2 border-green-300">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                    style={{ width: `${stats.totalOrders > 0 ? (stats.paidOrdersCount / stats.totalOrders) * 100 : 0}%` }}
                  ></div>
                  <span className="relative z-10 ml-4 font-bold text-green-900 text-lg">{stats.paidOrdersCount}</span>
                </div>
              </div>
              <div className="w-20 text-right font-bold text-green-700">
                {stats.totalOrders > 0 ? ((stats.paidOrdersCount / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* Abandoned Carts */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-full md:w-32 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Verlaten Carts
              </div>
              <div className="flex-1">
                <div className="bg-red-100 h-12 flex items-center relative overflow-hidden border-2 border-red-300">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                    style={{ width: `${stats.totalOrders > 0 ? (stats.abandonedCartsCount / stats.totalOrders) * 100 : 0}%` }}
                  ></div>
                  <span className="relative z-10 ml-4 font-bold text-red-900 text-lg">{stats.abandonedCartsCount}</span>
                </div>
              </div>
              <div className="w-20 text-right font-bold text-red-700">
                {stats.totalOrders > 0 ? ((stats.abandonedCartsCount / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* Failed Payments */}
            {stats.failedPaymentsCount > 0 && (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-full md:w-32 text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Mislukte Betalingen
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 h-12 flex items-center relative overflow-hidden border-2 border-gray-300">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all duration-500"
                      style={{ width: `${stats.totalOrders > 0 ? (stats.failedPaymentsCount / stats.totalOrders) * 100 : 0}%` }}
                    ></div>
                    <span className="relative z-10 ml-4 font-bold text-gray-900 text-lg">{stats.failedPaymentsCount}</span>
                  </div>
                </div>
                <div className="w-20 text-right font-bold text-gray-700">
                  {stats.totalOrders > 0 ? ((stats.failedPaymentsCount / stats.totalOrders) * 100).toFixed(1) : 0}%
                </div>
              </div>
            )}

            {/* Summary */}
            {stats.totalOrders > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-600">{stats.conversionRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide mt-1">Conversie Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.totalOrders > 0 ? ((stats.pendingPaymentsCount / stats.totalOrders) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide mt-1">Wacht op Betaling</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-600">
                      {stats.totalOrders > 0 ? ((stats.abandonedCartsCount / stats.totalOrders) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide mt-1">Verlaten</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard size={24} className="text-brand-primary" />
              Betaalmethodes
            </h2>
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.method} className="border-2 border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-800">{getPaymentMethodLabel(method.method)}</span>
                      <span className="text-sm text-gray-600">{method.count}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 h-2 overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary transition-all duration-500"
                          style={{ width: `${(method.revenue / stats.totalRevenue) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-800 text-sm">€{method.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nog geen betaalde orders</p>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package size={24} className="text-brand-primary" />
              Top Producten
            </h2>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.product_name} className="border-2 border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-bold text-gray-800 text-sm">{product.product_name}</span>
                      </div>
                      <span className="text-xs text-gray-600">{product.total_quantity}x verkocht</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 h-2 overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary transition-all duration-500"
                          style={{ width: `${(product.total_revenue / topProducts[0].total_revenue) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-800 text-sm">€{product.total_revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nog geen verkochte producten</p>
            )}
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock size={24} className="text-brand-primary" />
            Omzet Laatste {dateRange} Dagen
          </h2>
          {(() => {
            const maxRevenue = Math.max(...revenueHistory.map(d => d.revenue), 1)
            const barCount = revenueHistory.length
            const showEveryNth = barCount > 30 ? 7 : barCount > 14 ? 3 : 1
            return (
              <div className="w-full overflow-x-auto">
                <div className="flex items-end gap-[2px]" style={{ minWidth: barCount > 30 ? `${barCount * 14}px` : undefined, height: '200px' }}>
                  {revenueHistory.map((day, i) => {
                    const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-[8px]">
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 whitespace-nowrap border-2 border-gray-900">
                            {day.date}: €{day.revenue.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className="w-full bg-brand-primary transition-all duration-300 hover:opacity-80"
                          style={{ height: `${Math.max(pct, day.revenue > 0 ? 2 : 0)}%` }}
                        />
                        {i % showEveryNth === 0 && (
                          <span className="text-[10px] text-gray-500 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap absolute -bottom-6 left-1/2">
                            {day.date}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="h-8" />
              </div>
            )
          })()}
          {revenueHistory.every(d => d.revenue === 0) && (
            <p className="text-gray-500 text-sm text-center mt-2">Geen omzet in deze periode</p>
          )}
        </div>
      </div>
    </div>
  )
}

