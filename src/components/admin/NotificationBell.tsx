'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface OrderNotification {
  type: 'order'
  id: string
  email: string
  total: number
  created_at: string
}

interface ReturnNotification {
  type: 'return'
  id: string
  order_id: string
  status: string
  created_at: string
}

interface StockNotification {
  type: 'stock'
  id: string
  size: string
  color: string
  stock_quantity: number
  product: { id: string; name: string } | null
}

interface ReviewNotification {
  type: 'review'
  id: string
  reviewer_name: string
  title: string
  rating: number
  created_at: string
  product_id: string
  products: { name: string; slug: string } | null
}

type NotificationItem = OrderNotification | ReturnNotification | StockNotification | ReviewNotification

const LAST_SEEN_KEY = 'mosewear_admin_notif_last_seen'

function getLastSeen(): Date {
  const stored = localStorage.getItem(LAST_SEEN_KEY)
  if (stored) return new Date(stored)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday
}

function setLastSeen(date: Date) {
  localStorage.setItem(LAST_SEEN_KEY, date.toISOString())
}

export default function NotificationBell() {
  const [isSupported, setIsSupported] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  const [orders, setOrders] = useState<OrderNotification[]>([])
  const [returns, setReturns] = useState<ReturnNotification[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockNotification[]>([])
  const [reviews, setReviews] = useState<ReviewNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeen, setLastSeenState] = useState<Date>(new Date())

  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const countUnread = useCallback((
    ordersList: OrderNotification[],
    returnsList: ReturnNotification[],
    reviewsList: ReviewNotification[],
    seen: Date
  ) => {
    let count = 0
    count += ordersList.filter(o => new Date(o.created_at) > seen).length
    count += returnsList.filter(r => new Date(r.created_at) > seen).length
    count += reviewsList.filter(r => new Date(r.created_at) > seen).length
    return count
  }, [])

  const fetchNotifications = useCallback(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [ordersRes, returnsRes, stockRes, reviewsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, email, total, created_at')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('returns')
        .select('id, order_id, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('product_variants')
        .select('id, size, color, stock_quantity, product:products(id, name)')
        .lt('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(5),
      supabase
        .from('product_reviews')
        .select('id, reviewer_name, title, rating, created_at, product_id, products(name, slug)')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const newOrders: OrderNotification[] = (ordersRes.data || []).map(o => ({ type: 'order' as const, ...o }))
    const newReturns: ReturnNotification[] = (returnsRes.data || []).map(r => ({ type: 'return' as const, ...r }))
    const newStock: StockNotification[] = (stockRes.data || []).map((s: any) => ({ type: 'stock' as const, ...s }))
    const newReviews: ReviewNotification[] = (reviewsRes.data || []).map((r: any) => ({ type: 'review' as const, ...r }))

    setOrders(newOrders)
    setReturns(newReturns)
    setStockAlerts(newStock)
    setReviews(newReviews)

    const seen = getLastSeen()
    setLastSeenState(seen)
    setUnreadCount(countUnread(newOrders, newReturns, newReviews, seen))
  }, [countUnread, supabase])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) fetchNotifications()
  }, [isOpen, fetchNotifications])

  // Realtime subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder: OrderNotification = {
            type: 'order',
            id: payload.new.id,
            email: payload.new.email,
            total: payload.new.total,
            created_at: payload.new.created_at,
          }
          setOrders(prev => [newOrder, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Push notification support check
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      if (supported) {
        setNotificationsEnabled(Notification.permission === 'granted')
        registerServiceWorker()
      }
    }
    checkSupport()
  }, [])

  const markAllAsRead = () => {
    const now = new Date()
    setLastSeen(now)
    setLastSeenState(now)
    setUnreadCount(0)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'zojuist'
    if (diffMin < 60) return `${diffMin}m geleden`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}u geleden`
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  const totalItems = orders.length + returns.length + stockAlerts.length + reviews.length

  // ── Push notification methods (preserved from original) ──

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const existingRegistrations = await navigator.serviceWorker.getRegistrations()
        const adminReg = existingRegistrations.find(reg => reg.scope.includes('/admin'))

        let registration: ServiceWorkerRegistration

        if (adminReg && (adminReg.active || adminReg.waiting)) {
          registration = adminReg
          registration.update().catch(() => {})
        } else {
          if (adminReg) await adminReg.unregister()
          registration = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' })
          if (!registration.active) {
            await new Promise<void>((resolve) => {
              const checkActive = () => {
                if (registration.active) resolve()
                else setTimeout(checkActive, 100)
              }
              checkActive()
            })
          }
        }

        setSwRegistration(registration)

        try {
          const getSubscriptionPromise = registration.pushManager.getSubscription()
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Get subscription timeout')), 2000)
          )
          const existing = await Promise.race([getSubscriptionPromise, timeoutPromise])

          if (existing) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              try {
                const response = await fetch(`/api/admin/push/check-subscription?userId=${user.id}`)
                const data = await response.json()
                if (data.exists) {
                  setSubscription(existing)
                  setNotificationsEnabled(true)
                } else {
                  await existing.unsubscribe()
                  setSubscription(null)
                  setNotificationsEnabled(false)
                }
              } catch {
                setSubscription(null)
                setNotificationsEnabled(false)
              }
            }
          } else {
            setSubscription(null)
            setNotificationsEnabled(false)
          }
        } catch {
          setSubscription(null)
          setNotificationsEnabled(false)
        }
      } catch {
        setSubscription(null)
        setNotificationsEnabled(false)
      }
    }
  }

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      alert('Push notifications worden niet ondersteund in deze browser')
      return
    }
    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await subscribeToPush()
      } else if (permission === 'denied') {
        alert('Notificaties zijn geblokkeerd. Schakel ze in via browser instellingen.')
      }
    } catch {
      alert('Fout bij activeren van notificaties')
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeToPush = async () => {
    try {
      let registration: ServiceWorkerRegistration
      if (swRegistration) {
        registration = swRegistration
      } else {
        const registrationPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service worker timeout after 5 seconds')), 5000)
        )
        registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration
      }

      const response = await fetch('/api/admin/push/vapid-public-key')
      const { publicKey } = await response.json()
      if (!publicKey) throw new Error('No VAPID public key received from server')

      const applicationServerKey = urlBase64ToUint8Array(publicKey)
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      })

      setSubscription(sub)
      setNotificationsEnabled(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const apiResponse = await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id })
        })
        if (!apiResponse.ok) {
          const apiData = await apiResponse.json()
          throw new Error(apiData.error || 'Failed to save subscription')
        }
        playKaChing()
        new Notification('MOSE Admin', {
          body: 'KaChing notifications zijn actief! 💰',
          icon: '/favicon.ico',
          badge: '/favicon-32x32.png'
        })
      } else {
        throw new Error('User not authenticated')
      }
    } catch (error) {
      setSubscription(null)
      setNotificationsEnabled(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('timeout')) {
        alert('Service Worker reageert niet. Probeer de pagina te refreshen en opnieuw.')
      } else {
        alert('Fout bij instellen van push notifications: ' + errorMessage)
      }
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      let browserSubscription = null
      if ('serviceWorker' in navigator) {
        try {
          let registration: ServiceWorkerRegistration | undefined
          if (swRegistration) {
            registration = swRegistration
          } else {
            const registrationPromise = navigator.serviceWorker.ready
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Service worker timeout')), 2000)
            )
            registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration
          }
          browserSubscription = await registration.pushManager.getSubscription()
          if (browserSubscription) await browserSubscription.unsubscribe()
        } catch {
          // continue
        }
      }
      if (!browserSubscription && subscription) {
        try { await subscription.unsubscribe() } catch { /* continue */ }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetch('/api/admin/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
      }

      setSubscription(null)
      setNotificationsEnabled(false)
      alert('Notifications uitgeschakeld!')
    } catch {
      setSubscription(null)
      setNotificationsEnabled(false)
      alert('Notifications uitgeschakeld!')
    } finally {
      setIsLoading(false)
    }
  }

  const playKaChing = () => {
    try {
      const audio = new Audio('/kaching.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {
      // Audio not available
    }
  }

  const testNotification = async () => {
    if (!notificationsEnabled) {
      alert('Schakel eerst notifications in!')
      return
    }
    playKaChing()
    new Notification('🛒 Test Order!', {
      body: 'Nieuwe bestelling van €99.99\nKaChing! 💰',
      icon: '/favicon.ico',
      badge: '/favicon-32x32.png',
      tag: 'test-order',
      requireInteraction: true
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 border-2 border-black hover:bg-black hover:text-white transition-all group"
        title="Notificaties"
      >
        <svg
          className="w-5 h-5 text-current"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-0 top-[57px] mx-3 sm:mx-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white border-2 border-black shadow-lg z-50">
          {/* Header */}
          <div className="bg-black text-white p-3 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wide">Notificaties</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs uppercase tracking-wide hover:underline opacity-80 hover:opacity-100 transition-opacity"
              >
                Alles gelezen
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {totalItems === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Geen recente notificaties
              </div>
            ) : (
              <>
                {/* Orders */}
                {orders.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Nieuwe Orders
                      </span>
                    </div>
                    {orders.map((order) => {
                      const isUnread = new Date(order.created_at) > lastSeen
                      return (
                        <Link
                          key={order.id}
                          href={`/admin/orders/${order.id}`}
                          onClick={() => setIsOpen(false)}
                          className={`block p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${isUnread ? 'bg-red-50/50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                              <div className="min-w-0">
                                <span className="font-bold block truncate">€{order.total.toFixed(2)}</span>
                                <span className="text-gray-500 block truncate">{order.email}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{formatTime(order.created_at)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Returns */}
                {returns.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Retouren
                      </span>
                    </div>
                    {returns.map((ret) => {
                      const isUnread = new Date(ret.created_at) > lastSeen
                      return (
                        <Link
                          key={ret.id}
                          href={`/admin/orders/${ret.order_id}`}
                          onClick={() => setIsOpen(false)}
                          className={`block p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${isUnread ? 'bg-red-50/50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                              <div className="min-w-0">
                                <span className="font-bold block">Retour #{ret.id.slice(0, 8)}</span>
                                <span className="text-gray-500 block">Status: {ret.status}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{formatTime(ret.created_at)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Stock Alerts */}
                {stockAlerts.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Voorraad
                      </span>
                    </div>
                    {stockAlerts.map((item) => (
                      <Link
                        key={item.id}
                        href="/admin/inventory"
                        onClick={() => setIsOpen(false)}
                        className="block p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-sm transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold block truncate">
                              {item.product?.name || 'Onbekend product'}
                            </span>
                            <span className="text-gray-500 block">
                              {item.size} / {item.color} — <span className="text-red-600 font-bold">{item.stock_quantity} op voorraad</span>
                            </span>
                          </div>
                          <span className="text-xs text-red-500 font-bold shrink-0 uppercase">Laag</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Reviews
                      </span>
                    </div>
                    {reviews.map((review) => {
                      const isUnread = new Date(review.created_at) > lastSeen
                      return (
                        <Link
                          key={review.id}
                          href="/admin/reviews"
                          onClick={() => setIsOpen(false)}
                          className={`block p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${isUnread ? 'bg-red-50/50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isUnread && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                              <div className="min-w-0">
                                <span className="font-bold block truncate">
                                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} — {review.reviewer_name}
                                </span>
                                <span className="text-gray-500 block truncate">
                                  {review.products?.name || 'Product'}: {review.title}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{formatTime(review.created_at)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Push Notification Settings */}
          <div className="border-t-2 border-black p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Push Instellingen</span>
            </div>

            {isSupported ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    KaChing! meldingen: <span className={`font-bold ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {notificationsEnabled ? 'Aan' : 'Uit'}
                    </span>
                  </span>
                </div>
                {!notificationsEnabled ? (
                  <button
                    onClick={requestNotificationPermission}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Bezig...' : 'Enable KaChing'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={testNotification}
                      className="flex-1 px-3 py-2 border-2 border-black text-black hover:bg-black hover:text-white font-bold text-xs uppercase tracking-wide transition-colors"
                    >
                      Test
                    </button>
                    <button
                      onClick={unsubscribe}
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? '...' : 'Uitzetten'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Push niet beschikbaar in deze browser</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
