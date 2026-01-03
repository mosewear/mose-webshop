'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, ShoppingCart, Package, CreditCard, DollarSign, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch revenue stats
      const { data: revenueData, error: revenueError } = await supabase.rpc('get_revenue_stats')
      
      if (revenueError) {
        console.error('Error fetching revenue stats:', revenueError)
      } else if (revenueData && revenueData.length > 0) {
        const stats = revenueData[0]
        
        // Fetch additional counts
        const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })
        const { count: pendingCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending')
        const { count: failedCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'failed')
        
        // Fetch abandoned carts
        const { data: abandonedData } = await supabase.rpc('get_abandoned_carts', {
          hours_threshold: 24,
          email_not_sent_only: false,
        })

        setStats({
          totalOrders: totalOrders || 0,
          paidOrdersCount: stats.total_paid_orders || 0,
          pendingPaymentsCount: pendingCount || 0,
          abandonedCartsCount: abandonedData?.length || 0,
          failedPaymentsCount: failedCount || 0,
          totalRevenue: stats.total_revenue || 0,
          avgOrderValue: stats.avg_order_value || 0,
          conversionRate: stats.conversion_rate || 0,
        })
      }

      // Fetch payment method breakdown
      const { data: ordersData } = await supabase
        .from('orders')
        .select('payment_method, total')
        .eq('payment_status', 'paid')
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

      // Fetch top products
      const { data: productsData } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          price_at_purchase,
          order_id,
          orders!inner(payment_status)
        `)

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

      // Fetch revenue history (last 30 days)
      const { data: historyData } = await supabase
        .from('orders')
        .select('paid_at, total')
        .eq('payment_status', 'paid')
        .not('paid_at', 'is', null)
        .gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('paid_at', { ascending: true })

      if (historyData) {
        // Group by day
        const dailyRevenue: { [key: string]: number } = {}
        historyData.forEach((order) => {
          const date = new Date(order.paid_at!).toLocaleDateString('nl-NL')
          dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.total)
        })

        setRevenueHistory(Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })))
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
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

        {/* Revenue Timeline (if we have data) */}
        {revenueHistory.length > 0 && (
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock size={24} className="text-brand-primary" />
              Omzet Laatste 30 Dagen
            </h2>
            <div className="space-y-2">
              {revenueHistory.slice(-10).map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 font-mono">{day.date}</div>
                  <div className="flex-1 bg-gray-200 h-8 flex items-center relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-brand-primary transition-all duration-500"
                      style={{ width: `${(day.revenue / Math.max(...revenueHistory.map(d => d.revenue))) * 100}%` }}
                    ></div>
                    <span className="relative z-10 ml-3 font-bold text-gray-800 text-sm">€{day.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

