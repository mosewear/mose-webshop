'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  console.log('🟢 [CUSTOMER DETAIL] Component mounted with ID:', id)
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    console.log('🟢 [CUSTOMER DETAIL] useEffect triggered for ID:', id)
    fetchCustomerAndOrders()
  }, [id])

  const fetchCustomerAndOrders = async () => {
    try {
      console.log('🔵 [CUSTOMER DETAIL] ========== FETCH START ==========')
      console.log('🔵 [CUSTOMER DETAIL] Customer ID:', id)
      setLoading(true)
      
      // Fetch customer profile
      console.log('🔵 [CUSTOMER DETAIL] Fetching customer profile...')
      const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      console.log('🔵 [CUSTOMER DETAIL] Customer query result:', { customerData, customerError })

      if (customerError) throw customerError
      
      console.log('🔵 [CUSTOMER DETAIL] Customer email:', customerData?.email)
      setCustomer(customerData)
      
      // Fetch orders by email (for guest checkouts) OR user_id (for future authenticated users)
      if (customerData?.email) {
        const orQuery = `email.eq.${customerData.email},user_id.eq.${id}`
        console.log('🔵 [CUSTOMER DETAIL] Fetching orders with OR query:', orQuery)
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, status, total, created_at, payment_status')
          .or(orQuery)
          .order('created_at', { ascending: false })

        console.log('🔵 [CUSTOMER DETAIL] Orders query result:', { ordersData, ordersError })
        console.log('🔵 [CUSTOMER DETAIL] Number of orders found:', ordersData?.length || 0)

        if (ordersError) throw ordersError
        setOrders(ordersData || [])
      } else {
        console.log('⚠️ [CUSTOMER DETAIL] No customer email, skipping orders fetch')
        setOrders([])
      }
      
      console.log('🔵 [CUSTOMER DETAIL] ========== FETCH END ==========')
    } catch (err: any) {
      console.error('❌ [CUSTOMER DETAIL] Error:', err)
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
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
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

  const totalSpent = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total), 0)
  
  console.log('🟣 [CUSTOMER DETAIL] Render state:', {
    loading,
    hasCustomer: !!customer,
    customerEmail: customer?.email,
    ordersCount: orders.length,
    totalSpent,
    error
  })

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
                  Customer ID
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {customer.id.slice(0, 12)}...
                </code>
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

          {/* Stats Card */}
          <div className="bg-white border-2 border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Statistieken</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Totaal Orders</span>
                <span className="text-xl font-bold text-brand-primary">
                  {customer.total_orders || orders.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Totaal Uitgegeven</span>
                <span className="text-xl font-bold text-green-600">
                  €{(customer.total_spent || totalSpent).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gemiddelde Order</span>
                <span className="text-xl font-bold text-gray-800">
                  €{(customer.total_orders || orders.length) > 0 
                    ? ((customer.total_spent || totalSpent) / (customer.total_orders || orders.length)).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Order History */}
        <div className="lg:col-span-2">
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

