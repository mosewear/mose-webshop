'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, ShoppingCart, Package, CreditCard, DollarSign, Clock, AlertCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatBedrag } from '@/lib/format-price'

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
  product_id: string
  product_name: string
  total_quantity: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const [retryToken, setRetryToken] = useState(0)
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
  const [revenueHistory, setRevenueHistory] = useState<{ date: string; revenue: number }[]>([])

  useEffect(() => {
    const controller = new AbortController()
    void fetchAnalytics(controller.signal)
    const refresh = () => { if (document.visibilityState === 'visible') void fetchAnalytics(controller.signal, false) }
    const interval = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [dateRange, retryToken])

  const fetchAnalytics = async (signal: AbortSignal, initial = true) => {
    const request = ++requestSequence.current
    if (initial) setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`, { cache: 'no-store', signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'De analyse kan niet worden geladen.')
      if (signal.aborted || request !== requestSequence.current) return
      setStats(data.stats)
      setPaymentMethods(data.paymentMethods)
      setTopProducts(data.topProducts)
      setRevenueHistory(data.revenueHistory)
    } catch (err) {
      if (!signal.aborted && request === requestSequence.current) setError(err instanceof Error ? err.message : 'De analyse kan niet worden geladen.')
    } finally {
      if (!signal.aborted && request === requestSequence.current) setLoading(false)
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

  const csvCell = (value: string) => {
    const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value
    return '"' + safe.replaceAll('"', '""') + '"'
  }

  const exportCSV = () => {
    const lines: string[] = []

    lines.push('--- Overzicht ---')
    lines.push('Metriek,Waarde')
    lines.push(`Betaalde orderwaarde,€${stats.totalRevenue.toFixed(2)}`)
    lines.push(`Gem. betaalde orderwaarde,€${stats.avgOrderValue.toFixed(2)}`)
    lines.push(`Aandeel orders met betaling,${stats.conversionRate.toFixed(1)}%`)
    lines.push(`Totaal Orders,${stats.totalOrders}`)
    lines.push(`Orders met betaling,${stats.paidOrdersCount}`)
    lines.push(`Verlaten Carts,${stats.abandonedCartsCount}`)
    lines.push('')

    if (revenueHistory.length > 0) {
      lines.push('--- Orderwaarde per besteldatum ---')
      lines.push('Besteldatum,Betaalde orderwaarde')
      revenueHistory.forEach((day) => {
        lines.push(`${day.date},€${day.revenue.toFixed(2)}`)
      })
      lines.push('')
    }

    if (topProducts.length > 0) {
      lines.push('--- Populaire artikelen ---')
      lines.push('Product,Actuele aantallen')
      topProducts.forEach((p) => {
        lines.push(`${csvCell(p.product_name)},${p.total_quantity}`)
      })
      lines.push('')
    }

    if (paymentMethods.length > 0) {
      lines.push('--- Betaalroutes ---')
      lines.push('Betaalroute,Aantal,Betaalde orderwaarde')
      paymentMethods.forEach((m) => {
        lines.push(`${csvCell(getPaymentMethodLabel(m.method))},${m.count},€${m.revenue.toFixed(2)}`)
      })
    }

    const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mosewear-analytics-${dateRange}d-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }

  if (error) {
    return <div role="alert" className="border-2 border-red-600 bg-red-50 p-6 text-red-900">
      <h1 className="text-xl font-bold mb-2">Analyse niet bijgewerkt</h1>
      <p>{error}</p>
      <button className="mt-4 border-2 border-black px-4 py-2 text-black" onClick={() => setRetryToken(value => value + 1)}>Opnieuw laden</button>
    </div>
  }

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
          <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
            <TrendingUp size={28} className="text-brand-primary" />
            Orderanalyse
          </h1>
          <p className="text-gray-600 text-sm md:text-base">MOSE- en Shopify-bestellingen in één analyse</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors"
        >
          <Download size={16} />
          Exporteren
        </button>
      </div>

      <p className="mb-6 text-sm text-gray-600">Orderbedragen zijn inclusief btw en verzending, na bevestigde terugbetalingen. Betaal- en inkoopkosten zijn niet afgetrokken. De grafiek volgt de besteldatum. Het aandeel orders met betaling is geen bezoekersconversie en omvat ook deels betaalde en later terugbetaalde orders.</p>
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="flex flex-wrap gap-2">
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

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Betaalde orderwaarde</div>
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatBedrag(stats.totalRevenue)}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.paidOrdersCount} orders met betaling</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Gem. betaalde orderwaarde</div>
              <ShoppingCart size={20} className="text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatBedrag(stats.avgOrderValue)}</div>
            <div className="text-xs text-gray-500 mt-1">Per betaalde order</div>
          </div>

          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Aandeel orders met betaling</div>
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
            Bestelstatussen
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
                    <div className="text-sm text-gray-600 uppercase tracking-wide mt-1">Aandeel orders met betaling</div>
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
                          style={{ width: `${stats.totalRevenue > 0 ? (method.revenue / stats.totalRevenue) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-800 text-sm">{formatBedrag(method.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nog geen orders met betaling</p>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package size={24} className="text-brand-primary" />
              Populaire artikelen
            </h2>
            <p className="text-xs text-gray-500 mb-4">Op actuele aantallen, na orderwijzigingen en verwerkte retouren.</p>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.product_id} className="border-2 border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-bold text-gray-800 text-sm">{product.product_name}</span>
                      </div>
                      <span className="text-xs text-gray-600">{product.total_quantity} stuks</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 h-2 overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary transition-all duration-500"
                          style={{ width: `${(product.total_quantity / topProducts[0].total_quantity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-800 text-sm">{product.total_quantity}</span>
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
            Orderwaarde laatste {dateRange} dagen
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
                            {day.date}: {formatBedrag(day.revenue)}
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

