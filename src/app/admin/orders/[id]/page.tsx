'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Package, Clock, CheckCircle2, XCircle, Truck, AlertCircle, ChevronDown, ChevronUp, Printer, Zap } from 'lucide-react'
import { getCarrierOptions, generateTrackingUrl, calculateEstimatedDelivery } from '@/lib/order-utils'

interface Order {
  id: string
  user_id: string | null
  email: string
  status: string
  total: number
  shipping_address: any
  billing_address: any
  payment_intent_id: string | null
  tracking_code: string | null
  tracking_url: string | null
  carrier: string | null
  estimated_delivery_date: string | null
  internal_notes: string | null
  last_email_sent_at: string | null
  last_email_type: string | null
  created_at: string
  updated_at: string
}

interface OrderItem {
  id: string
  product_id: string | null
  product_name: string | null
  variant_id: string | null
  quantity: number
  price_at_purchase: number
  size: string | null
  color: string | null
  sku: string | null
  image_url: string | null
}

interface StatusHistoryItem {
  id: string
  old_status: string | null
  new_status: string
  changed_at: string
  changed_by: string | null
  notes: string | null
  email_sent: boolean
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [carrier, setCarrier] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [sendEmailOnStatusChange, setSendEmailOnStatusChange] = useState(true)
  const [autoUpdateToShipped, setAutoUpdateToShipped] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [labelSuccess, setLabelSuccess] = useState(false)
  const [labelUrl, setLabelUrl] = useState('')

  const carrierOptions = getCarrierOptions()

  useEffect(() => {
    fetchOrder()
    fetchOrderItems()
    fetchStatusHistory()
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
      setTrackingUrl(data.tracking_url || '')
      setCarrier(data.carrier || '')
      setInternalNotes(data.internal_notes || '')
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

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('changed_at', { ascending: false })

      if (error) throw error
      setStatusHistory(data || [])
    } catch (err: any) {
      console.error('Error fetching status history:', err)
    }
  }

  const handleAutoGenerateUrl = () => {
    if (!carrier || !trackingCode) {
      alert('Vul eerst vervoerder en tracking code in!')
      return
    }
    
    const url = generateTrackingUrl(carrier, trackingCode)
    setTrackingUrl(url)
  }

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return

    if (!confirm(`Status wijzigen naar "${getStatusLabel(newStatus)}"?`)) return

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

      // Send email if checkbox is checked
      if (sendEmailOnStatusChange) {
        await handleSendStatusEmail(order.status, newStatus)
      }

      await fetchOrder()
      await fetchStatusHistory()
      alert('✅ Status bijgewerkt!')
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
      
      const updates: any = {
        tracking_code: trackingCode || null,
        tracking_url: trackingUrl || null,
        carrier: carrier || null,
        updated_at: new Date().toISOString(),
      }

      // Auto-update status to shipped if checkbox is checked
      if (autoUpdateToShipped && trackingCode && order.status !== 'shipped') {
        updates.status = 'shipped'
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Send shipping email if updating to shipped
      if (autoUpdateToShipped && trackingCode && order.status !== 'shipped') {
        await handleSendShippingEmail()
      }

      await fetchOrder()
      await fetchStatusHistory()
      alert('✅ Tracking informatie opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!order) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({
          internal_notes: internalNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      await fetchOrder()
      alert('✅ Notities opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleSendStatusEmail = async (oldStatus: string, newStatus: string) => {
    try {
      const response = await fetch('/api/send-status-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          oldStatus,
          newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

      console.log('✅ Status email sent')
    } catch (err: any) {
      console.error('Error sending status email:', err)
      // Don't fail the status update if email fails
    }
  }

  const handleSendShippingEmail = async () => {
    if (!order || !trackingCode) {
      alert('Voeg eerst een tracking code toe!')
      return
    }

    try {
      setSendingEmail(true)
      const response = await fetch('/api/send-shipping-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

      alert('✅ Verzend-email verzonden!')
    } catch (err: any) {
      alert(`Fout bij versturen email: ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!order) return

    if (!confirm('Automatisch verzendlabel aanmaken via Sendcloud + DHL?')) return

    try {
      setCreatingLabel(true)
      setLabelSuccess(false)
      
      const response = await fetch('/api/create-shipping-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          sendEmail: true, // Automatisch shipping email versturen
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create label')
      }

      const result = await response.json()
      
      setLabelSuccess(true)
      setLabelUrl(result.data.labelUrl)
      
      // Update local state
      setTrackingCode(result.data.trackingNumber)
      setTrackingUrl(result.data.trackingUrl)
      setCarrier(result.data.carrier)

      // Refresh order data
      await fetchOrder()
      await fetchStatusHistory()

      alert('✅ Label aangemaakt en klant gemaild!')

      // Open label in new tab
      if (result.data.labelUrl) {
        window.open(result.data.labelUrl, '_blank')
      }
    } catch (err: any) {
      alert(`Fout bij aanmaken label: ${err.message}`)
    } finally {
      setCreatingLabel(false)
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
      return_requested: 'bg-amber-100 text-amber-700 border-amber-200',
      returned: 'bg-gray-100 text-gray-700 border-gray-200',
      refunded: 'bg-pink-100 text-pink-700 border-pink-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'paid':
        return <Clock className="w-5 h-5" />
      case 'processing':
        return <Package className="w-5 h-5" />
      case 'shipped':
        return <Truck className="w-5 h-5" />
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5" />
      case 'cancelled':
      case 'return_requested':
      case 'returned':
        return <XCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'In afwachting',
      paid: 'Betaald',
      processing: 'In behandeling',
      shipped: 'Verzonden',
      delivered: 'Afgeleverd',
      cancelled: 'Geannuleerd',
      return_requested: 'Retour aangevraagd',
      returned: 'Geretourneerd',
      refunded: 'Terugbetaald',
    }
    return labels[status] || status
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
        <span className={`px-4 py-2 text-sm font-semibold border-2 flex items-center gap-2 ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)}
          {getStatusLabel(order.status).toUpperCase()}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Last Email Info */}
      {order.last_email_sent_at && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-600" />
          <div className="text-sm">
            <strong>Laatste email:</strong> {order.last_email_type} verzonden op {' '}
            {new Date(order.last_email_sent_at).toLocaleString('nl-NL')}
          </div>
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
                  <div className="relative w-20 h-24 bg-gray-100 flex-shrink-0 border border-gray-200">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name || 'Product'}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm md:text-base">
                      {item.product_name || `Product ${item.product_id?.slice(0, 8)}`}
                    </div>
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
                    <div className="text-xs md:text-sm font-semibold text-brand-primary mt-1">
                      €{(Number(item.price_at_purchase) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotaal</span>
                <span className="font-semibold">€{Number(order.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Waarvan BTW (21%)</span>
                <span className="text-gray-500">€{(Number(order.total) - Number(order.total) / 1.21).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-lg font-bold">Totaal (incl. BTW)</span>
                <span className="text-2xl md:text-3xl font-bold text-brand-primary">
                  €{Number(order.total).toFixed(2)}
                </span>
              </div>
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
                        <div>{order.shipping_address.city || 'N/A'}, {order.shipping_address.postalCode || 'N/A'}</div>
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

          {/* Status Timeline */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full flex items-center justify-between text-xl font-bold mb-4"
            >
              <span>Order Tijdlijn</span>
              {showTimeline ? <ChevronUp /> : <ChevronDown />}
            </button>
            
            {showTimeline && (
              <div className="space-y-4">
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">Nog geen statuswijzigingen</p>
                ) : (
                  statusHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {getStatusIcon(history.new_status)}
                        </div>
                        {index < statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-semibold">
                          {history.old_status && `${getStatusLabel(history.old_status)} → `}
                          {getStatusLabel(history.new_status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(history.changed_at).toLocaleString('nl-NL')}
                        </div>
                        {history.email_sent && (
                          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email verzonden
                          </div>
                        )}
                        {history.notes && (
                          <div className="text-sm text-gray-500 mt-1 italic">{history.notes}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
                  <option value="return_requested">Retour aangevraagd</option>
                  <option value="returned">Geretourneerd</option>
                  <option value="refunded">Terugbetaald</option>
                </select>
              </div>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmailOnStatusChange}
                  onChange={(e) => setSendEmailOnStatusChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Email klant automatisch versturen</span>
              </label>

              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === order.status}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Bijwerken...' : 'Status Bijwerken'}
              </button>
            </div>
          </div>

          {/* Sendcloud Label Creatie */}
          {!order.tracking_code && order.status !== 'cancelled' && order.status !== 'refunded' && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 p-4 md:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500 text-white rounded">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Automatisch Verzendlabel</h2>
                  <p className="text-sm text-gray-700 mt-1">
                    Maak instant een verzendlabel via Sendcloud + DHL. Tracking code wordt automatisch toegevoegd en klant ontvangt verzend-email.
                  </p>
                </div>
              </div>

              {labelSuccess && (
                <div className="bg-green-100 border-2 border-green-400 text-green-800 px-4 py-3 rounded mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <div className="flex-1">
                    <strong>Label aangemaakt!</strong>
                    <div className="text-sm mt-1">
                      Tracking: {trackingCode} • {carrier}
                    </div>
                  </div>
                  {labelUrl && (
                    <a
                      href={labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-bold uppercase transition-colors"
                    >
                      <Printer size={16} />
                      Print Label
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <h3 className="font-bold text-sm uppercase tracking-wide text-gray-700 mb-2">Wat Gebeurt Er?</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✅ DHL verzendlabel wordt aangemaakt</li>
                    <li>✅ Tracking code automatisch toegevoegd aan order</li>
                    <li>✅ Status wordt "Verzonden"</li>
                    <li>✅ Klant ontvangt shipping email met tracking link</li>
                    <li>✅ Label PDF opent automatisch voor printen</li>
                  </ul>
                </div>

                <button
                  onClick={handleCreateLabel}
                  disabled={creatingLabel}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-lg"
                >
                  {creatingLabel ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Label Aanmaken...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Maak Verzendlabel (DHL)
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-600">
                  Kosten: ~€4,50 via Sendcloud • Geschatte levering: 1-2 werkdagen
                </p>
              </div>
            </div>
          )}

          {/* Tracking Code */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Track & Trace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Vervoerder
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                >
                  <option value="">Selecteer vervoerder...</option>
                  {carrierOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Tracking URL
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                  placeholder="https://..."
                />
                <button
                  onClick={handleAutoGenerateUrl}
                  disabled={!carrier || !trackingCode}
                  className="mt-2 text-sm text-brand-primary hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  Auto-genereer URL
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoUpdateToShipped}
                  onChange={(e) => setAutoUpdateToShipped(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Status automatisch naar "Verzonden"</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmailOnStatusChange}
                  onChange={(e) => setSendEmailOnStatusChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Verzend-email automatisch versturen</span>
              </label>

              <button
                onClick={handleUpdateTracking}
                disabled={updating}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Opslaan...' : 'Tracking Opslaan'}
              </button>
              
              {trackingCode && !autoUpdateToShipped && (
                <button
                  onClick={handleSendShippingEmail}
                  disabled={sendingEmail}
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  {sendingEmail ? 'Verzenden...' : 'Verzend Email Versturen'}
                </button>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Admin Notities</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Interne Notities
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                  rows={4}
                  placeholder="Voeg interne notities toe (niet zichtbaar voor klant)..."
                />
              </div>
              <button
                onClick={handleUpdateNotes}
                disabled={updating}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Opslaan...' : 'Notities Opslaan'}
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
              {order.estimated_delivery_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Verwachte levering:</span>
                  <span className="font-semibold text-brand-primary">
                    {new Date(order.estimated_delivery_date).toLocaleDateString('nl-NL')}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-600">Totaal bedrag:</span>
                <span className="font-bold text-brand-primary">€{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
