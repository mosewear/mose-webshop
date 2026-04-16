'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface OrderItem {
  id: string
  order_id: string
  product_name: string
  size: string
  color: string
  quantity: number
  sku: string
  image_url: string | null
}

interface OrderWithItems {
  id: string
  email: string
  shipping_address: any
  order_items: OrderItem[]
}

interface GroupedProduct {
  product_name: string
  sku: string
  size: string
  color: string
  total_quantity: number
  order_refs: string[]
}

export default function PicklistPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []

  useEffect(() => {
    if (ids.length === 0) {
      setError('Geen order IDs opgegeven')
      setLoading(false)
      return
    }
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('id, email, shipping_address, order_items(*)')
        .in('id', ids)

      if (fetchError) throw fetchError
      setOrders((data as any[]) || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const groupedProducts = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    for (const order of orders) {
      for (const item of order.order_items || []) {
        const key = `${item.product_name}__${item.size}__${item.color}`
        const existing = map.get(key)

        if (existing) {
          existing.total_quantity += item.quantity
          if (!existing.order_refs.includes(order.id.slice(0, 8))) {
            existing.order_refs.push(order.id.slice(0, 8))
          }
        } else {
          map.set(key, {
            product_name: item.product_name,
            sku: item.sku,
            size: item.size,
            color: item.color,
            total_quantity: item.quantity,
            order_refs: [order.id.slice(0, 8)],
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const nameComp = a.product_name.localeCompare(b.product_name)
      if (nameComp !== 0) return nameComp
      const colorComp = a.color.localeCompare(b.color)
      if (colorComp !== 0) return colorComp
      return a.size.localeCompare(b.size)
    })
  }, [orders])

  const allItems = useMemo(() => {
    const items: (OrderItem & { order_short_id: string; customer: string })[] = []
    for (const order of orders) {
      const name = order.shipping_address?.name || order.email
      for (const item of order.order_items || []) {
        items.push({
          ...item,
          order_short_id: order.id.slice(0, 8),
          customer: name,
        })
      }
    }
    return items
  }, [orders])

  const totalItems = groupedProducts.reduce((sum, p) => sum + p.total_quantity, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 font-bold">
          {error}
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide admin layout chrome */
          nav, header, aside,
          [data-admin-sidebar], [data-admin-header],
          .admin-sidebar, .admin-header {
            display: none !important;
          }

          /* Make main content full width */
          .flex-1.flex.flex-col.min-w-0,
          .min-h-screen {
            display: block !important;
          }
          .min-h-screen > *:not(.flex-1) {
            display: none !important;
          }

          /* Hide print controls */
          .no-print {
            display: none !important;
          }

          /* Reset page margins */
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }

          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }

          table {
            font-size: 11px !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }

          .print-title {
            font-size: 16px !important;
            margin-bottom: 8px !important;
          }

          .print-meta {
            font-size: 10px !important;
            margin-bottom: 12px !important;
          }
        }
      `}</style>

      <div className="print-container p-4 md:p-8">
        {/* Header - hidden when printing */}
        <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/orders"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 text-sm uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold">Picklijst</h1>
              <p className="text-gray-600 text-sm">{orders.length} order(s), {totalItems} item(s)</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Afdrukken
          </button>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block">
          <h1 className="print-title text-xl font-bold">MOSE — Picklijst</h1>
          <p className="print-meta text-gray-600">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' — '}{orders.length} order(s), {totalItems} item(s)
          </p>
        </div>

        {/* Grouped Products Table */}
        <div className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b-2 border-black pb-2">
            Producten (gegroepeerd)
          </h2>
          <div className="bg-white border-2 border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Maat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Kleur
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aantal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Order(s)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                    ✓
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedProducts.map((product, idx) => (
                  <tr key={`${product.product_name}-${product.size}-${product.color}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {product.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                      {product.size}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.color}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                      {product.total_quantity}×
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {product.order_refs.map(ref => `#${ref}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-5 h-5 border-2 border-gray-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-700">
                    Totaal
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                    {totalItems}×
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Per-Order Breakdown */}
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b-2 border-black pb-2">
            Per order
          </h2>
          <div className="bg-white border-2 border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Klant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Maat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Kleur
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Aantal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allItems.map((item) => (
                  <tr key={`${item.order_id}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        #{item.order_short_id}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[180px]">
                      {item.customer}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-bold">
                      {item.size}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.color}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                      {item.quantity}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
