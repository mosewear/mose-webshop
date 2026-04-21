'use client'

import { useState } from 'react'
import { Package, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'

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

const STATUS_ICON: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  pending: {
    icon: <Clock className="w-12 h-12" />,
    color: 'text-yellow-600',
  },
  paid: {
    icon: <CheckCircle2 className="w-12 h-12" />,
    color: 'text-blue-600',
  },
  processing: {
    icon: <Package className="w-12 h-12" />,
    color: 'text-purple-600',
  },
  shipped: {
    icon: <Truck className="w-12 h-12" />,
    color: 'text-orange-600',
  },
  delivered: {
    icon: <CheckCircle2 className="w-12 h-12" />,
    color: 'text-green-600',
  },
  cancelled: {
    icon: <XCircle className="w-12 h-12" />,
    color: 'text-red-600',
  },
}

export default function TrackOrderPage() {
  const t = useTranslations('trackOrder')
  const locale = useLocale()
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null)

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOrderData(null)

    if (!orderNumber || !email) {
      setError(t('errorFillFields'))
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, orderNumber }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 429) {
        setError(t('errorRateLimited'))
        return
      }

      if (!res.ok) {
        setError(res.status === 404 ? t('errorNotFound') : t('errorGeneric'))
        return
      }

      if (!payload.order) {
        setError(t('errorNotFound'))
        return
      }

      setOrderData(payload.order as OrderTrackingData)
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const labelDesc = (() => {
      switch (status) {
        case 'paid':
          return { label: t('status.paid'), description: t('status.paidDesc') }
        case 'processing':
          return { label: t('status.processing'), description: t('status.processingDesc') }
        case 'shipped':
          return { label: t('status.shipped'), description: t('status.shippedDesc') }
        case 'delivered':
          return { label: t('status.delivered'), description: t('status.deliveredDesc') }
        case 'cancelled':
          return { label: t('status.cancelled'), description: t('status.cancelledDesc') }
        case 'pending':
        default:
          return { label: t('status.pending'), description: t('status.pendingDesc') }
      }
    })()

    const visual = STATUS_ICON[status] ?? STATUS_ICON.pending
    return { ...labelDesc, ...visual }
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

  const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString(locale, opts)

  const statusInfo = orderData ? getStatusInfo(orderData.status) : null

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {t('title')}
          </h1>
          <p className="text-gray-600 text-lg">
            {t('description')}
          </p>
        </div>

        {!orderData && (
          <div className="bg-white border-2 border-black p-8 md:p-12 max-w-2xl mx-auto">
            <form onSubmit={handleTrackOrder} className="space-y-6" noValidate>
              <div>
                <label
                  htmlFor="track-order-number"
                  className="block text-sm font-bold uppercase tracking-wide mb-2"
                >
                  {t('orderNumber')}
                </label>
                <input
                  id="track-order-number"
                  type="text"
                  name="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors uppercase font-mono"
                  placeholder={t('orderNumberPlaceholder')}
                  required
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('orderNumberHint')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="track-order-email"
                  className="block text-sm font-bold uppercase tracking-wide mb-2"
                >
                  {t('emailAddress')}
                </label>
                <input
                  id="track-order-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder={t('emailPlaceholder')}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="bg-red-50 border-2 border-red-500 text-red-900 px-4 py-3 text-sm"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('searching') : t('searchButton')}
              </button>
            </form>
          </div>
        )}

        {orderData && statusInfo && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-black p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {t('orderDetails', { id: orderData.id.slice(0, 8).toUpperCase() })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('placedOn')}{' '}
                    {formatDate(orderData.created_at, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderData(null)}
                  className="text-brand-primary hover:underline text-sm font-semibold"
                >
                  {t('newSearch')}
                </button>
              </div>

              <div className="text-center py-8">
                <div className={`${statusInfo.color} flex justify-center mb-4`}>
                  {statusInfo.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{statusInfo.label}</h3>
                <p className="text-gray-600">{statusInfo.description}</p>
              </div>

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
                    <span>{t('progress.processed')}</span>
                    <span>{t('progress.shipped')}</span>
                    <span>{t('progress.delivered')}</span>
                  </div>
                </div>
              )}

              {orderData.tracking_code && (
                <div className="mt-8 bg-brand-primary text-white p-6 rounded">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-6 h-6" />
                    <h4 className="font-bold text-lg">{t('tracking.title')}</h4>
                  </div>
                  {orderData.carrier && (
                    <p className="text-sm mb-2 opacity-90">
                      {t('tracking.via')} {orderData.carrier}
                    </p>
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
                      {t('tracking.button')}
                    </a>
                  )}
                  {orderData.estimated_delivery_date && (
                    <p className="text-sm mt-4 opacity-90">
                      {t('tracking.expectedDelivery')}{' '}
                      {formatDate(orderData.estimated_delivery_date, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-black p-8">
              <h3 className="text-xl font-bold mb-4">{t('items.title')}</h3>
              <div className="space-y-4">
                {orderData.order_items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center pb-4 border-b border-gray-200 last:border-0"
                  >
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        {t('items.line', {
                          size: item.size,
                          color: item.color,
                          quantity: item.quantity,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="font-bold text-lg">{t('items.total')}</span>
                <span className="text-2xl font-bold text-brand-primary">
                  €{orderData.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-gray-100 border-2 border-gray-200 p-8 text-center">
              <h3 className="font-bold text-lg mb-2">{t('help.title')}</h3>
              <p className="text-gray-600 mb-4">{t('help.description')}</p>
              <Link
                href="/contact"
                className="inline-block bg-black text-white px-8 py-3 font-bold uppercase text-sm hover:bg-gray-800 transition-colors"
              >
                {t('help.button')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
