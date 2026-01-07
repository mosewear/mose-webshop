'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Package, CheckCircle, XCircle, Download, RefreshCw, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReturnData {
  id: string
  order_id: string
  user_id: string | null
  status: string
  return_reason: string
  customer_notes: string | null
  admin_notes: string | null
  return_items: any[]
  refund_amount: number
  return_label_cost_excl_btw: number
  return_label_cost_incl_btw: number
  total_refund: number
  return_label_payment_intent_id: string | null
  return_label_payment_status: string | null
  return_label_paid_at: string | null
  sendcloud_return_id: number | null
  return_tracking_code: string | null
  return_tracking_url: string | null
  return_label_url: string | null
  stripe_refund_id: string | null
  stripe_refund_status: string | null
  created_at: string
  approved_at: string | null
  label_generated_at: string | null
  received_at: string | null
  refunded_at: string | null
  orders: {
    id: string
    email: string
    total: number
    status: string
    created_at: string
    delivered_at: string | null
    shipping_address: any
    order_items: Array<{
      id: string
      product_name: string
      size: string
      color: string
      quantity: number
      price_at_purchase: number
      image_url: string | null
    }>
  }
  status_history: Array<{
    id: string
    old_status: string | null
    new_status: string
    changed_by: string | null
    notes: string | null
    created_at: string
  }>
}

export default function AdminReturnDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const returnId = params.id as string

  const [returnData, setReturnData] = useState<ReturnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchReturn()
  }, [returnId])

  async function fetchReturn() {
    try {
      const response = await fetch(`/api/returns/${returnId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch return')
      }

      setReturnData(data.return)
      setAdminNotes(data.return.admin_notes || '')
    } catch (error: any) {
      toast.error(error.message || 'Kon retour niet laden')
      router.push('/admin/returns')
    } finally {
      setLoading(false)
    }
  }

  async function approveReturn() {
    if (!confirm('Weet je zeker dat je deze retour wilt goedkeuren?')) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve return')
      }

      toast.success('Retour goedgekeurd!')
      await fetchReturn()
    } catch (error: any) {
      toast.error(error.message || 'Kon retour niet goedkeuren')
    } finally {
      setProcessing(false)
    }
  }

  async function rejectReturn() {
    if (!rejectionReason.trim()) {
      toast.error('Vul een reden in voor afwijzing')
      return
    }

    if (!confirm('Weet je zeker dat je deze retour wilt afwijzen?')) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject return')
      }

      toast.success('Retour afgewezen')
      await fetchReturn()
      setRejectionReason('')
    } catch (error: any) {
      toast.error(error.message || 'Kon retour niet afwijzen')
    } finally {
      setProcessing(false)
    }
  }

  async function generateLabel() {
    if (!confirm('Weet je zeker dat je het retourlabel wilt genereren? Dit kan alleen als de betaling is voltooid.')) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/generate-label`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate label')
      }

      toast.success('Retourlabel gegenereerd!')
      await fetchReturn()
    } catch (error: any) {
      toast.error(error.message || 'Kon label niet genereren')
    } finally {
      setProcessing(false)
    }
  }

  async function confirmReceived() {
    if (!confirm('Bevestig je dat je de retour hebt ontvangen?')) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/confirm-received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm receipt')
      }

      toast.success('Ontvangst bevestigd!')
      await fetchReturn()
    } catch (error: any) {
      toast.error(error.message || 'Kon ontvangst niet bevestigen')
    } finally {
      setProcessing(false)
    }
  }

  async function processRefund() {
    if (!confirm('Weet je zeker dat je de refund wilt verwerken? Dit kan niet ongedaan worden gemaakt.')) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/returns/${returnId}/process-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund')
      }

      toast.success('Refund verwerkt!')
      await fetchReturn()
    } catch (error: any) {
      toast.error(error.message || 'Kon refund niet verwerken')
    } finally {
      setProcessing(false)
    }
  }

  async function saveAdminNotes() {
    // Admin notes worden automatisch opgeslagen bij andere acties
    toast.success('Notities worden opgeslagen bij de volgende actie')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'return_requested':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'return_approved':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'return_label_payment_pending':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'return_label_payment_completed':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'return_label_generated':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'return_in_transit':
        return 'bg-brand-primary/20 text-brand-primary border-brand-primary/30'
      case 'return_received':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'refund_processing':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      case 'refunded':
        return 'bg-gray-800 text-white border-gray-900'
      case 'return_rejected':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      return_requested: 'Aangevraagd',
      return_approved: 'Goedgekeurd',
      return_label_payment_pending: 'Betaling Label',
      return_label_payment_completed: 'Label Betaald',
      return_label_generated: 'Label Beschikbaar',
      return_in_transit: 'Onderweg',
      return_received: 'Ontvangen',
      refund_processing: 'Refund Bezig',
      refunded: 'Terugbetaald',
      return_rejected: 'Afgewezen',
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

  if (!returnData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Retour niet gevonden</p>
        <Link href="/admin/returns" className="text-brand-primary font-semibold mt-4 inline-block">
          Terug naar retouren
        </Link>
      </div>
    )
  }

  const returnItems = returnData.return_items as any[]
  const orderItems = returnData.orders.order_items

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/returns"
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Retour #{returnData.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Aangevraagd op {new Date(returnData.created_at).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span className={`px-4 py-2 text-sm font-semibold border-2 ${getStatusColor(returnData.status)}`}>
          {getStatusLabel(returnData.status).toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Return Items */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Retour Items</h2>
            <div className="space-y-4">
              {returnItems.map((returnItem, idx) => {
                const orderItem = orderItems.find((item) => item.id === returnItem.order_item_id)
                if (!orderItem) return null

                return (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className="relative w-20 h-24 bg-gray-100 flex-shrink-0 border border-gray-200">
                      {orderItem.image_url ? (
                        <Image
                          src={orderItem.image_url}
                          alt={orderItem.product_name}
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
                      <div className="font-bold text-sm md:text-base">{orderItem.product_name}</div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Maat: {orderItem.size} • Kleur: {orderItem.color}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600 mt-1">
                        Aantal retour: {returnItem.quantity} van {orderItem.quantity}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600 mt-1">
                        <strong>Reden:</strong> {returnItem.reason}
                      </div>
                      <div className="font-bold text-sm md:text-base mt-2">
                        €{(orderItem.price_at_purchase * returnItem.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Return Information */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Retour Informatie</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Reden:</strong> {returnData.return_reason}</p>
              {returnData.customer_notes && (
                <p><strong>Klant notities:</strong> {returnData.customer_notes}</p>
              )}
              <p><strong>Order:</strong> <Link href={`/admin/orders/${returnData.order_id}`} className="text-brand-primary hover:underline">#{returnData.orders.id.slice(0, 8).toUpperCase()}</Link></p>
              <p><strong>Klant:</strong> {returnData.orders.email}</p>
            </div>
          </div>

          {/* Status Timeline */}
          {returnData.status_history && returnData.status_history.length > 0 && (
            <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4">Status Geschiedenis</h2>
              <div className="space-y-3">
                {returnData.status_history.map((history, idx) => (
                  <div key={history.id} className="flex gap-3 pb-3 border-b border-gray-200 last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 bg-brand-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{getStatusLabel(history.new_status)}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(history.created_at).toLocaleString('nl-NL')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Financieel</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Refund bedrag (items)</span>
                <span className="font-bold">€{returnData.refund_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Label kosten (betaald)</span>
                <span>€{returnData.return_label_cost_incl_btw.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Terug te betalen</span>
                  <span>€{returnData.total_refund.toFixed(2)}</span>
                </div>
              </div>
              {returnData.return_label_payment_status && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <div className="text-xs text-gray-600">
                    <strong>Label betaling:</strong> {returnData.return_label_payment_status}
                  </div>
                  {returnData.return_label_paid_at && (
                    <div className="text-xs text-gray-600">
                      Betaald op: {new Date(returnData.return_label_paid_at).toLocaleString('nl-NL')}
                    </div>
                  )}
                </div>
              )}
              {returnData.stripe_refund_id && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <div className="text-xs text-gray-600">
                    <strong>Stripe refund:</strong> {returnData.stripe_refund_id}
                  </div>
                  <div className="text-xs text-gray-600">
                    Status: {returnData.stripe_refund_status || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Acties</h2>
            <div className="space-y-3">
              {returnData.status === 'return_requested' && (
                <>
                  <button
                    onClick={approveReturn}
                    disabled={processing}
                    className="w-full px-4 py-3 bg-green-500 text-white font-bold uppercase text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Goedkeuren
                  </button>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Reden voor afwijzing..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-red-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={rejectReturn}
                      disabled={processing || !rejectionReason.trim()}
                      className="w-full px-4 py-3 bg-red-500 text-white font-bold uppercase text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Afwijzen
                    </button>
                  </div>
                </>
              )}

              {returnData.status === 'return_label_payment_completed' && (
                <button
                  onClick={generateLabel}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Genereer Label
                </button>
              )}

              {(returnData.status === 'return_label_generated' || returnData.status === 'return_in_transit') && (
                <button
                  onClick={confirmReceived}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-blue-500 text-white font-bold uppercase text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Bevestig Ontvangst
                </button>
              )}

              {returnData.status === 'return_received' && (
                <button
                  onClick={processRefund}
                  disabled={processing}
                  className="w-full px-4 py-3 bg-green-500 text-white font-bold uppercase text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Start Refund
                </button>
              )}

              {returnData.return_label_url && (
                <a
                  href={returnData.return_label_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 bg-gray-800 text-white font-bold uppercase text-sm hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Label
                </a>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Admin Notities</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
              placeholder="Interne notities voor dit retour..."
            />
            <button
              onClick={saveAdminNotes}
              className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-800 font-bold uppercase text-xs hover:bg-gray-300 transition-colors"
            >
              Opslaan (wordt opgeslagen bij actie)
            </button>
          </div>

          {/* Return Label Info */}
          {returnData.return_tracking_code && (
            <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4">Retour Tracking</h2>
              <div className="space-y-2 text-sm">
                <p><strong>Tracking code:</strong> <span className="font-mono">{returnData.return_tracking_code}</span></p>
                {returnData.return_tracking_url && (
                  <a
                    href={returnData.return_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:underline"
                  >
                    Volg retour →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

