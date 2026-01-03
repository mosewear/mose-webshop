'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  created_at: string
  total: number
  status: string
  payment_status: string
  order_items: {
    product_name: string
    size: string
    color: string
    quantity: number
    price_at_purchase: number
    subtotal: number
  }[]
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await fetchOrders(user.email!)
    setLoading(false)
  }

  async function fetchOrders(email: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('email', email)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In behandeling'
      case 'processing':
        return 'Wordt verwerkt'
      case 'shipped':
        return 'Verzonden'
      case 'delivered':
        return 'Afgeleverd'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return status
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

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display mb-2">MIJN ACCOUNT</h1>
            <p className="text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase text-sm"
          >
            Uitloggen
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 border-2 border-gray-300 p-4">
              <nav className="space-y-2">
                <button className="w-full text-left px-4 py-3 bg-brand-primary text-white font-bold">
                  Bestellingen
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-gray-200 transition-colors">
                  Profiel
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-gray-200 transition-colors">
                  Adressen
                </button>
              </nav>
            </div>
          </div>

          {/* Orders */}
          <div className="md:col-span-3">
            <h2 className="text-2xl font-display mb-6">MIJN BESTELLINGEN</h2>

            {orders.length === 0 ? (
              <div className="bg-gray-50 border-2 border-gray-300 p-8 text-center">
                <p className="text-gray-600 mb-4">Je hebt nog geen bestellingen geplaatst</p>
                <Link
                  href="/shop"
                  className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                >
                  Start met shoppen
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border-2 border-black p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            Bestelling #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="mt-4 md:mt-0 text-right">
                        <p className="text-2xl font-display">€{order.total.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="border-t-2 border-gray-200 pt-4 space-y-3">
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="text-sm flex-grow">
                            <p className="font-semibold">{item.product_name}</p>
                            <p className="text-gray-600">
                              {item.size} • {item.color} • x{item.quantity}
                            </p>
                          </div>
                          <p className="font-bold">€{item.subtotal.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="border-t-2 border-gray-200 pt-4 mt-4 flex gap-3">
                      <Link
                        href={`/order-confirmation?order=${order.id}`}
                        className="px-6 py-2 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors"
                      >
                        Bekijk details
                      </Link>
                      {order.status === 'delivered' && (
                        <Link
                          href="/shop"
                          className="px-6 py-2 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors"
                        >
                          Bestel opnieuw
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
