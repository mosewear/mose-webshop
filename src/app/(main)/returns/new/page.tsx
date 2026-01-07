'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Order {
  id: string
  created_at: string
  delivered_at: string | null
  total: number
  status: string
  order_items: {
    id: string
    product_name: string
    size: string
    color: string
    quantity: number
    price_at_purchase: number
    subtotal: number
    image_url: string | null
  }[]
}

const RETURN_REASONS = [
  'Past niet goed',
  'Niet wat ik verwachtte',
  'Defect product',
  'Verkeerde maat/kleur geleverd',
  'Anders',
]

// Component voor order selectie lijst
function OrderSelectionList({ returnDays }: { returnDays: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (error) throw error

      // Haal alle returns op voor deze gebruiker
      const { data: returnsData } = await supabase
        .from('returns')
        .select('order_id, status')
        .eq('user_id', user.id)
        .in('status', ['return_requested', 'return_approved', 'return_label_payment_pending', 'return_label_payment_completed', 'return_label_generated', 'return_in_transit', 'return_received', 'refund_processing'])

      const activeReturnOrderIds = new Set((returnsData || []).map(r => r.order_id))

      // Filter alleen orders waar nog geen actieve retour voor is en waar retour deadline nog niet verstreken is
      const now = new Date()
      const eligibleOrders = (ordersData || []).filter((order) => {
        if (!order.delivered_at) return false
        if (activeReturnOrderIds.has(order.id)) return false // Skip orders met actieve retour
        
        const deliveredDate = new Date(order.delivered_at)
        const deadline = new Date(deliveredDate)
        deadline.setDate(deadline.getDate() + returnDays)
        
        return now <= deadline
      })

      setOrders(eligibleOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  if (loadingOrders) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Bestellingen laden...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">
          Je hebt geen geleverde bestellingen die in aanmerking komen voor retour.
        </p>
        <Link
          href="/account"
          className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
        >
          Terug naar account
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const deliveredDate = order.delivered_at ? new Date(order.delivered_at) : null
        const deadline = deliveredDate ? new Date(deliveredDate) : null
        if (deadline) {
          deadline.setDate(deadline.getDate() + returnDays)
        }
        const daysLeft = deadline ? Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

        return (
          <Link
            key={order.id}
            href={`/returns/new?order_id=${order.id}`}
            className="block bg-gray-50 border-2 border-gray-300 p-6 hover:border-brand-primary hover:bg-brand-light transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </h3>
                  {daysLeft > 0 && (
                    <span className="px-3 py-1 text-xs font-bold uppercase bg-yellow-400 text-black">
                      Nog {daysLeft} dag{daysLeft !== 1 ? 'en' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Geleverd op {deliveredDate ? deliveredDate.toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''} • €{order.total.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors">
                  Retour Aanvragen →
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default function NewReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')

  const [user, setUser] = useState<any>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [returnDays, setReturnDays] = useState(14)
  
  const [selectedItems, setSelectedItems] = useState<Record<string, {
    quantity: number
    reason: string
  }>>({})
  const [returnReason, setReturnReason] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  useEffect(() => {
    checkUser()
    // Default 14 dagen retourtermijn
    setReturnDays(14)
  }, [])

  useEffect(() => {
    if (user && orderId) {
      fetchOrder()
    } else if (!user && !orderId) {
      setLoading(false)
    }
  }, [user, orderId, returnDays])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=/returns/new' + (orderId ? `?order_id=${orderId}` : ''))
      return
    }

    setUser(user)
  }

  async function fetchOrder() {
    if (!orderId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }
      
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .single()

      if (error || !orderData) {
        toast.error('Order niet gevonden')
        setLoading(false)
        router.push('/account')
        return
      }

      // Check of order delivered is
      if (orderData.status !== 'delivered') {
        toast.error('Alleen geleverde orders kunnen worden geretourneerd')
        setLoading(false)
        router.push('/account')
        return
      }

      // Check return deadline (use returnDays from state, default 14)
      const days = returnDays || 14
      if (orderData.delivered_at) {
        const deliveredDate = new Date(orderData.delivered_at)
        const deadline = new Date(deliveredDate)
        deadline.setDate(deadline.getDate() + days)
        
        if (new Date() > deadline) {
          toast.error(`Retourtermijn is verstreken. Je hebt ${days} dagen vanaf levering.`)
          setLoading(false)
          router.push('/account')
          return
        }
      }

      setOrder(orderData)
    } catch (error: any) {
      console.error('Error fetching order:', error)
      toast.error('Kon order niet laden')
      router.push('/account')
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(itemId: string, maxQuantity: number) {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const newItems = { ...prev }
        delete newItems[itemId]
        return newItems
      } else {
        return {
          ...prev,
          [itemId]: {
            quantity: 1,
            reason: '',
          },
        }
      }
    })
  }

  function updateItemQuantity(itemId: string, quantity: number, maxQuantity: number) {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.min(Math.max(1, quantity), maxQuantity),
      },
    }))
  }

  function updateItemReason(itemId: string, reason: string) {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason,
      },
    }))
  }

  function calculateRefund() {
    if (!order) return 0
    
    let total = 0
    Object.entries(selectedItems).forEach(([itemId, data]) => {
      const orderItem = order.order_items.find((item) => item.id === itemId)
      if (orderItem) {
        total += orderItem.price_at_purchase * data.quantity
      }
    })
    return total
  }

  async function submitReturn() {
    if (!order || !returnReason) {
      toast.error('Vul alle verplichte velden in')
      return
    }

    const selectedItemsArray = Object.entries(selectedItems).map(([order_item_id, data]) => {
      const orderItem = order.order_items.find((item) => item.id === order_item_id)
      return {
        order_item_id,
        quantity: data.quantity,
        reason: data.reason || returnReason,
        product_name: orderItem?.product_name || 'Product',
      }
    })

    if (selectedItemsArray.length === 0) {
      toast.error('Selecteer minimaal één item om te retourneren')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: order.id,
          return_items: selectedItemsArray,
          return_reason: returnReason,
          customer_notes: customerNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create return')
      }

      toast.success('Retourverzoek succesvol ingediend!')
      router.push(`/returns/${data.return_id}`)
    } catch (error: any) {
      toast.error(error.message || 'Kon retour niet aanmaken')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  // Als er geen order_id is, toon lijst met orders waaruit gebruiker kan kiezen
  if (!orderId) {
    return (
      <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/account?tab=returns"
              className="p-2 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-4xl md:text-5xl font-display">RETOUR AANVRAGEN</h1>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Laden...</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-black p-6 mb-6">
              <h2 className="text-2xl font-display mb-4">Selecteer een Bestelling</h2>
              <p className="text-gray-600 mb-6">
                Kies een geleverde bestelling om een retour voor aan te vragen. Je hebt {returnDays} dagen vanaf de leverdatum om een retour aan te vragen.
              </p>

              {!user ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Je moet ingelogd zijn om een retour aan te vragen.</p>
                  <Link
                    href="/login?redirect=/returns/new"
                    className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                  >
                    Inloggen
                  </Link>
                </div>
              ) : (
                <OrderSelectionList returnDays={returnDays} />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
            <p className="text-gray-600 mb-6 text-lg">Order niet gevonden</p>
            <Link
              href="/returns/new"
              className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors mb-4"
            >
              Kies een andere bestelling
            </Link>
            <br />
            <Link
              href="/account"
              className="inline-block px-8 py-4 border-2 border-black font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
            >
              Terug naar account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const refundAmount = calculateRefund()

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display mb-8">RETOUR AANVRAGEN</h1>

        {/* Order Info */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-bold text-xl mb-2">Order #{order.id.slice(0, 8).toUpperCase()}</h2>
              <p className="text-sm text-gray-600">
                Geleverd op {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display">€{order.total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Select Items */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Selecteer Items</h2>
          <div className="space-y-4">
            {order.order_items.map((item) => {
              const isSelected = !!selectedItems[item.id]
              const selectedData = selectedItems[item.id]

              return (
                <div
                  key={item.id}
                  className={`border-2 p-4 transition-colors ${
                    isSelected ? 'border-brand-primary bg-brand-light' : 'border-gray-300'
                  }`}
                >
                  <div className="flex gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id, item.quantity)}
                      className="w-5 h-5 border-2 border-gray-300 focus:border-brand-primary mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex gap-4">
                        {item.image_url && (
                          <div className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-gray-200 overflow-hidden flex-shrink-0">
                            <Image
                              src={item.image_url}
                              alt={item.product_name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{item.product_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Maat {item.size} • {item.color} • {item.quantity}x stuks
                          </p>
                          <p className="font-bold">€{item.subtotal.toFixed(2)}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-3">
                          <div>
                            <label className="block text-sm font-bold mb-2">
                              Aantal retourneren (max {item.quantity})
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={selectedData.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1, item.quantity)}
                              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2">Reden voor dit item</label>
                            <select
                              value={selectedData.reason}
                              onChange={(e) => updateItemReason(item.id, e.target.value)}
                              className="w-full px-4 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                            >
                              <option value="">Selecteer reden...</option>
                              {RETURN_REASONS.map((reason) => (
                                <option key={reason} value={reason}>
                                  {reason}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Return Reason */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Retour Reden</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">
                Hoofdreden voor retour *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                required
              >
                <option value="">Selecteer reden...</option>
                {RETURN_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">
                Optionele notities
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Voeg eventuele extra informatie toe..."
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-black text-white p-6 mb-6">
          <h2 className="text-2xl font-display mb-4">Refund Overzicht</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Terug te betalen (items)</span>
              <span className="font-bold">€{refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Retourlabel kosten</span>
              <span>€7,87</span>
            </div>
            <div className="border-t-2 border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-xl font-display">
                <span>Terug te betalen</span>
                <span>€{refundAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                (Na ontvangst retour, label kosten zijn al betaald)
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={submitReturn}
            disabled={submitting || Object.keys(selectedItems).length === 0 || !returnReason}
            className="flex-1 px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verzenden...' : 'Retour Aanvragen'}
          </button>
          <Link
            href="/account"
            className="px-8 py-4 border-2 border-black font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors text-center"
          >
            Annuleren
          </Link>
        </div>
      </div>
    </div>
  )
}

