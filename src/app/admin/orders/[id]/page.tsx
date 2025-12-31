'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Order {
  id: string
  user_id: string | null
  email: string
  status: string
  total_amount: number
  shipping_address: any
  billing_address: any
  payment_intent_id: string | null
  tracking_code: string | null
  created_at: string
  updated_at: string
}

interface OrderItem {
  id: string
  product_id: string | null
  variant_id: string | null
  quantity: number
  price_at_purchase: number
  size: string | null
  color: string | null
  sku: string | null
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [trackingCode, setTrackingCode] = useState('')
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    fetchOrder()
    fetchOrderItems()
  }, [id])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setOrder(data)
      setNewStatus(data.status)
      setTrackingCode(data.tracking_code || '')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchOrderItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)

      if (error) throw error
      setOrderItems(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // Log status change
      await supabase.from('order_status_history').insert([
        {
          order_id: id,
          status: newStatus,
          changed_by: (await supabase.auth.getUser()).data.user?.id || null,
        },
      ])

      fetchOrder()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateTracking = async () => {
    if (!order) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_code: trackingCode || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      fetchOrder()
      alert('Tracking code opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
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
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Order niet gevonden</p>
        <Link href="/admin/orders" className="text-brand-primary font-semibold mt-4 inline-block">
          Terug naar orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/orders"
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Geplaatst op {new Date(order.created_at).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`px-4 py-2 text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
          {order.status.toUpperCase()}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Bestelde Producten</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm md:text-base">Product ID: {item.product_id?.slice(0, 8) || 'N/A'}</div>
                    <div className="text-xs md:text-sm text-gray-600">
                      {item.size && `Maat: ${item.size}`} {item.color && `• Kleur: ${item.color}`}
                    </div>
                    {item.sku && (
                      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                        {item.sku}
                      </code>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm md:text-base">€{Number(item.price_at_purchase).toFixed(2)}</div>
                    <div className="text-xs md:text-sm text-gray-600">Aantal: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
              <span className="text-lg font-bold">Totaal</span>
              <span className="text-2xl md:text-3xl font-bold text-brand-primary">
                €{Number(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Klantinformatie</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Email</span>
                <div className="text-sm md:text-base mt-1">{order.email}</div>
              </div>

              {order.shipping_address && (
                <div>
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Verzendadres</span>
                  <div className="text-sm md:text-base mt-1 text-gray-700">
                    {typeof order.shipping_address === 'object' ? (
                      <>
                        <div>{order.shipping_address.name || 'N/A'}</div>
                        <div>{order.shipping_address.address || 'N/A'}</div>
                        <div>{order.shipping_address.city || 'N/A'}, {order.shipping_address.postal_code || 'N/A'}</div>
                        <div>{order.shipping_address.country || 'Nederland'}</div>
                      </>
                    ) : (
                      <div className="text-gray-500">Geen adres beschikbaar</div>
                    )}
                  </div>
                </div>
              )}

              {order.payment_intent_id && (
                <div>
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Payment Intent</span>
                  <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1 font-mono">
                    {order.payment_intent_id}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Order Management */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Status Bijwerken</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Nieuwe Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                >
                  <option value="pending">In afwachting</option>
                  <option value="paid">Betaald</option>
                  <option value="processing">In behandeling</option>
                  <option value="shipped">Verzonden</option>
                  <option value="delivered">Afgeleverd</option>
                  <option value="cancelled">Geannuleerd</option>
                </select>
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === order.status}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Bijwerken...' : 'Status Bijwerken'}
              </button>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Track & Trace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Tracking Code
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
                  placeholder="3SMOSE123456789"
                />
              </div>
              <button
                onClick={handleUpdateTracking}
                disabled={updating}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Opslaan...' : 'Tracking Opslaan'}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-100 border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Samenvatting</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">{order.id.slice(0, 12)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aangemaakt:</span>
                <span className="font-semibold">{new Date(order.created_at).toLocaleDateString('nl-NL')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Laatst bijgewerkt:</span>
                <span className="font-semibold">{new Date(order.updated_at).toLocaleDateString('nl-NL')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-600">Totaal bedrag:</span>
                <span className="font-bold text-brand-primary">€{Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

