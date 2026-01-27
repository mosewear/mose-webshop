'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface OrderTrackingData {
  id: string
  status: string
  created_at: string
  updated_at: string
  tracking_code: string | null
  tracking_url: string | null
  carrier: string | null
  estimated_delivery_date: string | null
  total: number
  order_items: Array<{
    product_name: string
    quantity: number
    size: string
    color: string
  }>
}

export default function TrackOrderPage() {
  const t = useTranslations('trackOrder')
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null)
  const supabase = createClient()

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOrderData(null)

    if (!orderNumber || !email) {
      setError(t('errors.fillAllFields'))
      return
    }

    try {
      setLoading(true)
      
      // Search for order by ID and email
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, created_at, updated_at, tracking_code, tracking_url, carrier, estimated_delivery_date, total, order_items(product_name, quantity, size, color)')
        .eq('email', email)
        .ilike('id', `${orderNumber}%`)
        .single()

      if (fetchError || !data) {
        setError(t('errors.notFound'))
        return
      }

      setOrderData(data as any)
    } catch (err: any) {
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; icon: any; color: string; description: string }> = {
      pending: {
        label: 'In afwachting',
        icon: <Clock className="w-12 h-12" />,
        color: 'text-yellow-600',
        description: 'We hebben je bestelling ontvangen en verwerken de betaling.',
      },
      paid: {
        label: 'Betaald',
        icon: <CheckCircle2 className="w-12 h-12" />,
        color: 'text-blue-600',
        description: 'Je betaling is ontvangen! We gaan je bestelling voorbereiden.',
      },
      processing: {
        label: 'In behandeling',
        icon: <Package className="w-12 h-12" />,
        color: 'text-purple-600',
        description: 'Je bestelling wordt ingepakt en verzendklaar gemaakt.',
      },
      shipped: {
        label: 'Verzonden',
        icon: <Truck className="w-12 h-12" />,
        color: 'text-orange-600',
        description: 'Je pakket is onderweg! Volg je zending met de tracking code.',
      },
      delivered: {
        label: 'Afgeleverd',
        icon: <CheckCircle2 className="w-12 h-12" />,
        color: 'text-green-600',
        description: 'Je pakket is bezorgd! Geniet van je nieuwe MOSE items.',
      },
      cancelled: {
        label: t('status.cancelled.label'),
        icon: <XCircle className="w-12 h-12" />,
        color: 'text-red-600',
        description: t('status.cancelled.description'),
      },
    }
    return statuses[status] || statuses.pending
  }

  const getProgressPercentage = (status: string) => {
    const progress: Record<string, number> = {
      pending: 20,
      paid: 40,
      processing: 60,
      shipped: 80,
      delivered: 100,
      cancelled: 0,
    }
    return progress[status] || 0
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {t('title')}
          </h1>
          <p className="text-gray-600 text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Search Form */}
        {!orderData && (
          <div className="bg-white border-2 border-black p-8 md:p-12 max-w-2xl mx-auto">
            <form onSubmit={handleTrackOrder} className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wide mb-2">
                  {t('form.orderNumber')}
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors uppercase font-mono"
                  placeholder={t('form.orderPlaceholder')}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('form.orderHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wide mb-2">
                  {t('form.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder={t('form.emailPlaceholder')}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-500 text-red-900 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('form.searching') : t('form.submit')}
              </button>
            </form>
          </div>
        )}

        {/* Order Tracking Results */}
        {orderData && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white border-2 border-black p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Order #{orderData.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('results.placedOn')} {new Date(orderData.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setOrderData(null)}
                  className="text-brand-primary hover:underline text-sm font-semibold"
                >
                  {t('results.newSearch')}
                </button>
              </div>

              {/* Status Icon & Info */}
              <div className="text-center py-8">
                <div className={`${getStatusInfo(orderData.status).color} flex justify-center mb-4`}>
                  {getStatusInfo(orderData.status).icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {getStatusInfo(orderData.status).label}
                </h3>
                <p className="text-gray-600">
                  {getStatusInfo(orderData.status).description}
                </p>
              </div>

              {/* Progress Bar */}
              {orderData.status !== 'cancelled' && (
                <div className="mt-6">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-primary h-full transition-all duration-500"
                      style={{ width: `${getProgressPercentage(orderData.status)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{t('progress.ordered')}</span>
                    <span>{t('progress.processing')}</span>
                    <span>{t('progress.shipped')}</span>
                    <span>{t('progress.delivered')}</span>
                  </div>
                </div>
              )}

              {/* Tracking Info */}
              {orderData.tracking_code && (
                <div className="mt-8 bg-brand-primary text-white p-6 rounded">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-6 h-6" />
                    <h4 className="font-bold text-lg">Track & Trace</h4>
                  </div>
                  {orderData.carrier && (
                    <p className="text-sm mb-2 opacity-90">Via {orderData.carrier}</p>
                  )}
                  <p className="text-2xl font-mono font-bold mb-4 tracking-wider">
                    {orderData.tracking_code}
                  </p>
                  {orderData.tracking_url && (
                    <a
                      href={orderData.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-white text-brand-primary px-6 py-3 font-bold uppercase text-sm hover:bg-gray-100 transition-colors"
                    >
                      Volg Zending →
                    </a>
                  )}
                  {orderData.estimated_delivery_date && (
                    <p className="text-sm mt-4 opacity-90">
                      Verwachte levering: {new Date(orderData.estimated_delivery_date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white border-2 border-black p-8">
              <h3 className="text-xl font-bold mb-4">Je Items</h3>
              <div className="space-y-4">
                {orderData.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center pb-4 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        Maat {item.size} • {item.color} • {item.quantity}x
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="font-bold text-lg">Totaal</span>
                <span className="text-2xl font-bold text-brand-primary">
                  €{orderData.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gray-100 border-2 border-gray-200 p-8 text-center">
              <h3 className="font-bold text-lg mb-2">Vragen over je bestelling?</h3>
              <p className="text-gray-600 mb-4">
                We helpen je graag! Neem contact met ons op.
              </p>
              <Link
                href="/contact"
                className="inline-block bg-black text-white px-8 py-3 font-bold uppercase text-sm hover:bg-gray-800 transition-colors"
              >
                Contact Opnemen
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


