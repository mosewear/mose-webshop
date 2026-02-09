'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, Eye, ShoppingCart, Package, Play, MousePointer } from 'lucide-react'
import Link from 'next/link'

interface ProductPerformance {
  product_id: string
  product_name: string
  views: number
  add_to_carts: number
  purchases: number
  add_to_cart_rate: number
  purchase_rate: number
  revenue: number
}

interface FunnelStep {
  step: string
  count: number
  percentage: number
}

interface RecentEvent {
  id: string
  created_at: string
  event_name: string
  event_properties: any
  device_type: string | null
}

interface ChatStats {
  opens_today: number
  opens_7d: number
  opens_30d: number
  closes_today: number
  closes_7d: number
  closes_30d: number
}

export default function BehaviorAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([])
  const [conversionFunnel, setConversionFunnel] = useState<FunnelStep[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [chatStats, setChatStats] = useState<ChatStats | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    
    try {
      // 1. Get product performance
      const { data: performance, error: perfError } = await supabase
        .rpc('get_product_performance', {
          p_start_date: getStartDate(),
          p_end_date: new Date().toISOString(),
        })
      
      if (perfError) {
        console.error('Error fetching product performance:', perfError)
      } else {
        setProductPerformance(performance || [])
      }
      
      // 2. Get conversion funnel
      const { data: funnel, error: funnelError } = await supabase
        .rpc('get_conversion_funnel', {
          p_start_date: getStartDate(),
          p_end_date: new Date().toISOString(),
        })
      
      if (funnelError) {
        console.error('Error fetching conversion funnel:', funnelError)
      } else {
        setConversionFunnel(funnel || [])
      }
      
      // 3. Get recent events (for live feed)
      const { data: events, error: eventsError} = await supabase
        .from('analytics_events')
        .select('id, created_at, event_name, event_properties, device_type')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (eventsError) {
        console.error('Error fetching recent events:', eventsError)
      } else {
        setRecentEvents(events || [])
      }
      
      // 4. Get chat statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      const now = new Date().toISOString()
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      // Chat opens
      const { count: opensToday } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_opened')
        .gte('created_at', todayStart)
        .lte('created_at', now)
      
      const { count: opens7d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_opened')
        .gte('created_at', sevenDaysAgo)
        .lte('created_at', now)
      
      const { count: opens30d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_opened')
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', now)
      
      // Chat closes
      const { count: closesToday } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_closed')
        .gte('created_at', todayStart)
        .lte('created_at', now)
      
      const { count: closes7d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_closed')
        .gte('created_at', sevenDaysAgo)
        .lte('created_at', now)
      
      const { count: closes30d } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'chat_closed')
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', now)
      
      setChatStats({
        opens_today: opensToday || 0,
        opens_7d: opens7d || 0,
        opens_30d: opens30d || 0,
        closes_today: closesToday || 0,
        closes_7d: closes7d || 0,
        closes_30d: closes30d || 0,
      })
      
    } catch (error) {
      console.error('Error fetching behavior analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStartDate = () => {
    const now = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Winkelgedrag laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 transition-colors border-2 border-gray-300"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
                  <MousePointer size={24} className="text-brand-primary md:w-8 md:h-8" />
                  <span className="hidden sm:inline">Winkelgedrag Analytics</span>
                  <span className="sm:hidden">Winkelgedrag</span>
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-1">PRECIES zien wat klanten doen</p>
              </div>
            </div>
            
            {/* Time Range Selector - Mobile Optimized */}
            <div className="flex gap-2 w-full md:w-auto">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 md:flex-none px-3 md:px-4 py-2 text-xs md:text-sm font-bold border-2 transition-all ${
                    timeRange === range
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-primary'
                  }`}
                >
                  <span className="md:hidden">{range}</span>
                  <span className="hidden md:inline">{range === '7d' ? '7 dagen' : range === '30d' ? '30 dagen' : '90 dagen'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        
        {/* Quick Actions - PostHog Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://eu.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-gray-200 p-6 hover:border-brand-primary hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <Play size={24} className="text-brand-primary" />
              <h3 className="text-lg font-bold">Session Recordings</h3>
            </div>
            <p className="text-sm text-gray-600">Bekijk hoe klanten de site gebruiken</p>
            <p className="text-xs text-gray-500 mt-2">→ Opens in PostHog</p>
          </a>

          <a
            href="https://eu.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-gray-200 p-6 hover:border-brand-primary hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <MousePointer size={24} className="text-brand-primary" />
              <h3 className="text-lg font-bold">Heatmaps</h3>
            </div>
            <p className="text-sm text-gray-600">Zie waar klanten klikken en scrollen</p>
            <p className="text-xs text-gray-500 mt-2">→ Opens in PostHog</p>
          </a>

          <Link
            href="/admin/analytics"
            className="bg-white border-2 border-gray-200 p-6 hover:border-brand-primary hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={24} className="text-brand-primary" />
              <h3 className="text-lg font-bold">Conversie Analytics</h3>
            </div>
            <p className="text-sm text-gray-600">Bekijk conversie funnel en omzet</p>
            <p className="text-xs text-gray-500 mt-2">→ Bestaande analytics</p>
          </Link>
        </div>

        {/* Conversion Funnel Chart */}
        {conversionFunnel && conversionFunnel.length > 0 && (
          <div className="bg-white border-2 border-gray-200 p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">User Journey Funnel</h2>
            <div className="space-y-4">
              {conversionFunnel.map((step, index) => {
                const prevStep = conversionFunnel[index - 1]
                const dropOff = prevStep ? Number(prevStep.count) - Number(step.count) : 0
                const dropOffRate = prevStep ? ((dropOff / Number(prevStep.count)) * 100).toFixed(1) : '0'
                
                return (
                  <div key={step.step}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                      <div className="w-full md:w-40 text-sm font-bold text-gray-700">{step.step}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 h-12 flex items-center relative overflow-hidden border-2 border-gray-300">
                          <div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-primary to-green-500 transition-all duration-500"
                            style={{ width: `${Number(step.percentage)}%` }}
                          ></div>
                          <span className="relative z-10 ml-4 font-bold text-gray-900 text-lg">
                            {String(step.count)} ({Number(step.percentage).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    {index > 0 && dropOff > 0 && (
                      <div className="ml-0 md:ml-44 text-sm text-red-600 font-semibold">
                        ⚠️ -{dropOff} users ({dropOffRate}% drop-off)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Product Performance Table - Mobile Optimized with Cards */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6 lg:p-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
            <Package size={24} className="text-brand-primary md:w-7 md:h-7" />
            Product Performance
          </h2>
          
          {productPerformance && productPerformance.length > 0 ? (
            <>
              {/* Desktop: Table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-2 border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase border-b-2 border-gray-200">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Views</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Add to Cart</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Cart Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Purchases</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Conv. Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase border-b-2 border-gray-200">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.slice(0, 10).map((product, index) => (
                      <tr key={product.product_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-semibold border-b border-gray-200">{product.product_name}</td>
                        <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                          <Eye size={14} className="inline mr-1" />
                          {String(product.views)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                          <ShoppingCart size={14} className="inline mr-1" />
                          {String(product.add_to_carts)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                          <span className={`font-bold ${Number(product.add_to_cart_rate) > 10 ? 'text-green-600' : Number(product.add_to_cart_rate) > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {Number(product.add_to_cart_rate).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right border-b border-gray-200">{String(product.purchases)}</td>
                        <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                          <span className={`font-bold ${Number(product.purchase_rate) > 2 ? 'text-green-600' : Number(product.purchase_rate) > 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {Number(product.purchase_rate).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold border-b border-gray-200">€{Number(product.revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Card view */}
              <div className="md:hidden space-y-3">
                {productPerformance.slice(0, 10).map((product, index) => (
                  <div key={product.product_id} className="border-2 border-gray-200 p-4 bg-gray-50">
                    <div className="font-bold text-sm mb-3 text-gray-900">{product.product_name}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Views</div>
                        <div className="font-bold text-gray-900">
                          <Eye size={12} className="inline mr-1" />
                          {String(product.views)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Cart Rate</div>
                        <div className={`font-bold ${Number(product.add_to_cart_rate) > 10 ? 'text-green-600' : Number(product.add_to_cart_rate) > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Number(product.add_to_cart_rate).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Add to Cart</div>
                        <div className="font-bold text-gray-900">
                          <ShoppingCart size={12} className="inline mr-1" />
                          {String(product.add_to_carts)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Conv. Rate</div>
                        <div className={`font-bold ${Number(product.purchase_rate) > 2 ? 'text-green-600' : Number(product.purchase_rate) > 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Number(product.purchase_rate).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Purchases</div>
                        <div className="font-bold text-gray-900">{String(product.purchases)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 uppercase font-semibold mb-1">Revenue</div>
                        <div className="font-bold text-brand-primary">€{Number(product.revenue).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Nog geen product performance data. Start met shoppen om data te verzamelen!</p>
          )}
        </div>

        {/* Recent Events Live Feed */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Live Event Feed</h2>
          {recentEvents && recentEvents.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 text-xs flex-wrap">
                  <div className="w-full md:w-32 font-mono text-gray-500">
                    {new Date(event.created_at).toLocaleTimeString('nl-NL')}
                  </div>
                  <div className="w-full md:w-40 font-bold text-brand-primary">{event.event_name}</div>
                  <div className="flex-1 text-gray-600 truncate min-w-[200px]">
                    {event.event_properties?.product_name || event.event_properties?.page_url || '-'}
                  </div>
                  <div className="w-20 text-gray-500">{event.device_type || 'unknown'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nog geen events getrackt. Start met shoppen om data te zien!</p>
          )}
        </div>

        {/* Setup Instructions (if no data) */}
        {(!conversionFunnel || conversionFunnel.length === 0) && (!productPerformance || productPerformance.length === 0) && (
          <div className="bg-yellow-50 border-2 border-yellow-300 p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-3">Setup Vereist</h3>
            <p className="text-sm text-yellow-800 mb-4">
              Er is nog geen analytics data beschikbaar. Dit kan betekenen:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-2 mb-4">
              <li>De analytics_events tabel bestaat nog niet in Supabase (run de SQL migration)</li>
              <li>PostHog API key is nog niet ingesteld (voeg toe aan .env.local)</li>
              <li>Er zijn nog geen events getrackt (bezoek de webshop en test de tracking)</li>
            </ul>
            <div className="bg-yellow-100 border border-yellow-400 p-4 text-xs font-mono whitespace-pre-wrap">
              <strong>Stap 1: Run SQL Migration</strong>
              {'\n'}→ Ga naar Supabase Dashboard → SQL Editor
              {'\n'}→ Plak en run: /MOSE/add-analytics-events-table.sql
              {'\n\n'}
              <strong>Stap 2: PostHog Setup</strong>
              {'\n'}→ Create account op https://posthog.com
              {'\n'}→ Copy Project ID
              {'\n'}→ Add to .env.local: NEXT_PUBLIC_POSTHOG_KEY=phc_...
              {'\n\n'}
              <strong>Stap 3: Test Tracking</strong>
              {'\n'}→ Visit homepage
              {'\n'}→ View een product
              {'\n'}→ Add to cart
              {'\n'}→ Check console logs voor "✅ [Analytics]"
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

