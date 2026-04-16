'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  last_order_at: string | null
  total_orders: number
  total_spent: number
}

interface Order {
  id: string
  status: string
  total: number
  created_at: string
  payment_status: string
  shipping_address?: {
    name: string
    address: string
    city: string
    postalCode: string
    country: string
    phone: string
  }
}

interface Return {
  id: string
  order_id: string
  status: string
  created_at: string
  refund_amount: number
  return_reason: string
}

type TimelineEntry = {
  type: 'order' | 'return'
  id: string
  date: string
  status: string
  amount: number
  description: string
  href: string
}

const CUSTOMER_TAGS = ['VIP', 'Problematisch', 'Influencer', 'Nieuw', 'Trouw'] as const
type CustomerTag = typeof CUSTOMER_TAGS[number]

function getTagsStorageKey(customerId: string) {
  return `mosewear_customer_tags_${customerId}`
}

function getNotesStorageKey(customerId: string) {
  return `mosewear_customer_notes_${customerId}`
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCustomerAndOrders()
  }, [id])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getTagsStorageKey(id))
      if (stored) setTags(JSON.parse(stored))
    } catch {}
    try {
      const stored = localStorage.getItem(getNotesStorageKey(id))
      if (stored) setNotes(stored)
    } catch {}
  }, [id])

  const saveNotes = useCallback((value: string) => {
    try {
      localStorage.setItem(getNotesStorageKey(id), value)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch {
      toast.error('Notities konden niet worden opgeslagen')
    }
  }, [id])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setNotesSaved(false)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => saveNotes(value), 2000)
  }

  const handleNotesBlur = () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    saveNotes(notes)
  }

  const toggleTag = (tag: CustomerTag) => {
    setTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      try {
        localStorage.setItem(getTagsStorageKey(id), JSON.stringify(next))
        toast.success(prev.includes(tag) ? `Tag "${tag}" verwijderd` : `Tag "${tag}" toegevoegd`)
      } catch {
        toast.error('Tags konden niet worden opgeslagen')
      }
      return next
    })
  }

  const fetchCustomerAndOrders = async () => {
    try {
      setLoading(true)

      const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (customerError) throw customerError
      setCustomer(customerData)

      if (customerData?.email) {
        const orQuery = `email.eq.${customerData.email},user_id.eq.${id}`
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, status, total, created_at, payment_status, shipping_address')
          .or(orQuery)
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError
        setOrders(ordersData || [])

        const orderIds = (ordersData || []).map((o: Order) => o.id)
        if (orderIds.length > 0) {
          const { data: returnsData } = await supabase
            .from('returns')
            .select('id, order_id, status, created_at, refund_amount, return_reason')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })

          setReturns(returnsData || [])
        }
      } else {
        setOrders([])
        setReturns([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
      return_requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      return_approved: 'bg-blue-100 text-blue-700 border-blue-200',
      return_rejected: 'bg-red-100 text-red-700 border-red-200',
      return_in_transit: 'bg-orange-100 text-orange-700 border-orange-200',
      return_received: 'bg-green-100 text-green-700 border-green-200',
      refunded: 'bg-green-100 text-green-700 border-green-200',
      refund_processing: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getReturnStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      return_requested: 'Retour Aangevraagd',
      return_approved: 'Retour Goedgekeurd',
      return_rejected: 'Retour Afgewezen',
      return_label_payment_pending: 'Label Betaling Wacht',
      return_label_payment_completed: 'Label Betaald',
      return_label_generated: 'Label Gegenereerd',
      return_in_transit: 'Onderweg',
      return_received: 'Ontvangen',
      refund_processing: 'Terugbetaling Verwerken',
      refunded: 'Terugbetaald',
      cancelled: 'Geannuleerd',
    }
    return labels[status] || status
  }

  if (loading || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/admin/customers" className="text-brand-primary font-semibold">
          Terug naar klanten
        </Link>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Klant niet gevonden</p>
        <Link href="/admin/customers" className="text-brand-primary font-semibold mt-4 inline-block">
          Terug naar klanten
        </Link>
      </div>
    )
  }

  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)
  const avgOrderValue = paidOrders.length > 0 ? totalSpent / paidOrders.length : 0
  const returnPercentage = orders.length > 0 ? (returns.length / orders.length) * 100 : 0

  const timelineEntries: TimelineEntry[] = [
    ...orders.map((o): TimelineEntry => ({
      type: 'order',
      id: o.id,
      date: o.created_at,
      status: o.status,
      amount: Number(o.total),
      description: `Order #${o.id.slice(0, 8)} — ${o.payment_status === 'paid' ? 'Betaald' : o.payment_status.charAt(0).toUpperCase() + o.payment_status.slice(1)}`,
      href: `/admin/orders/${o.id}`,
    })),
    ...returns.map((r): TimelineEntry => ({
      type: 'return',
      id: r.id,
      date: r.created_at,
      status: r.status,
      amount: Number(r.refund_amount || 0),
      description: `Retour — ${getReturnStatusLabel(r.status)}${r.return_reason ? `: ${r.return_reason}` : ''}`,
      href: `/admin/returns/${r.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/customers"
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {customer.first_name || customer.last_name
              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
              : customer.email?.split('@')[0] || 'Klant Details'}
          </h1>
          <p className="text-sm md:text-base text-gray-600">{customer.email}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* CLV Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Totaal besteed
          </div>
          <div className="text-2xl font-bold text-green-600">
            €{totalSpent.toFixed(2)}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Gem. orderwaarde
          </div>
          <div className="text-2xl font-bold text-brand-primary">
            €{avgOrderValue.toFixed(2)}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Aantal orders
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {orders.length}
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Retourpercentage
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {returnPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Customer Tags */}
      <div className="bg-white border-2 border-gray-200 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-3">
          Klant Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TAGS.map(tag => {
            const active = tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`border-2 border-black px-3 py-1 text-xs font-bold uppercase transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-white border-2 border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Interne Notities
          </h3>
          {notesSaved && (
            <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Opgeslagen
            </span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Schrijf hier interne notities over deze klant..."
          rows={3}
          className="border-2 border-gray-300 focus:border-brand-primary w-full p-3 text-sm outline-none resize-y transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              {customer.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">
                {customer.first_name || customer.last_name
                  ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                  : customer.email?.split('@')[0] || 'Geen naam'}
              </h3>
              <p className="text-gray-600 text-sm">{customer.email}</p>
            </div>

            <div className="space-y-3 border-t-2 border-gray-200 pt-4">
              <div>
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Email
                </div>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-sm text-brand-primary hover:underline break-all"
                >
                  {customer.email}
                </a>
              </div>

              {customer.phone && (
                <div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Telefoon
                  </div>
                  <a href={`tel:${customer.phone}`} className="text-sm text-brand-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Customer ID
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                  {customer.id}
                </code>
              </div>

              <div className="border-t-2 border-gray-200 pt-3 mt-3"></div>

              <div>
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Account Type
                </div>
                <div className="text-sm flex items-center gap-2">
                  {customer.user_id ? (
                    <>
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-green-700 font-semibold">Geregistreerd Account</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-600">Guest Checkout</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  Klant Sinds
                </div>
                <div className="text-sm">
                  {new Date(customer.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {customer.last_order_at && (
                <div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Laatste Order
                  </div>
                  <div className="text-sm">
                    {new Date(customer.last_order_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Card */}
          {orders.length > 0 && orders[0].shipping_address && (
            <div className="bg-white border-2 border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Verzendadres</h3>
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900">
                  {orders[0].shipping_address.name}
                </div>
                <div className="text-gray-700">
                  {orders[0].shipping_address.address}
                </div>
                <div className="text-gray-700">
                  {orders[0].shipping_address.postalCode} {orders[0].shipping_address.city}
                </div>
                <div className="text-gray-700">
                  {orders[0].shipping_address.country === 'NL' ? 'Nederland' : orders[0].shipping_address.country}
                </div>
                {orders[0].shipping_address.phone && (
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <a
                      href={`tel:${orders[0].shipping_address.phone}`}
                      className="text-brand-primary hover:underline font-medium"
                    >
                      {orders[0].shipping_address.phone}
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Laatste order: {new Date(orders[0].created_at).toLocaleDateString('nl-NL')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Timeline + Order History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold mb-6">Tijdlijn</h2>

            {timelineEntries.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Geen activiteit</h3>
                <p className="text-gray-500">Er is nog geen activiteit voor deze klant</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-0">
                  {timelineEntries.map((entry) => (
                    <Link
                      key={`${entry.type}-${entry.id}`}
                      href={entry.href}
                      className="relative flex items-start gap-4 pl-10 pr-2 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      {/* Dot */}
                      <div className={`absolute left-2.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
                        entry.type === 'order' ? 'bg-brand-primary ring-brand-primary/30' : 'bg-orange-500 ring-orange-500/30'
                      }`} />

                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded flex items-center justify-center ${
                        entry.type === 'order' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {entry.type === 'order' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                          <div>
                            <div className="font-bold text-sm group-hover:text-brand-primary transition-colors">
                              {entry.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(entry.date).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-0.5 text-xs font-semibold border ${getStatusColor(entry.status)}`}>
                              {entry.type === 'return' ? getReturnStatusLabel(entry.status) : entry.status.toUpperCase()}
                            </span>
                            {entry.amount > 0 && (
                              <span className={`text-sm font-bold ${entry.type === 'return' ? 'text-orange-600' : 'text-brand-primary'}`}>
                                {entry.type === 'return' ? '-' : ''}€{entry.amount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order History (kept as separate section for direct access) */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold mb-6">Order Geschiedenis</h2>

            {orders.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen orders</h3>
                <p className="text-gray-500">Deze klant heeft nog geen bestellingen geplaatst</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block border-2 border-gray-200 p-4 hover:border-brand-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm mb-1">
                          Order #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-semibold border-2 ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                        <span className="text-lg font-bold text-brand-primary">
                          €{Number(order.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
