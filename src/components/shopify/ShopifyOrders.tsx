'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ShopifyOrderView } from '@/lib/shopify/order-views'

type Props = { mode: 'admin' | 'account'; locale?: string }
const labels: Record<string, [string, string]> = {
  PAID: ['Betaald', 'Paid'], PENDING: ['Betaling in behandeling', 'Payment pending'], AUTHORIZED: ['Betaling gereserveerd', 'Payment authorized'],
  PARTIALLY_PAID: ['Deels betaald', 'Partially paid'], REFUNDED: ['Terugbetaald', 'Refunded'], PARTIALLY_REFUNDED: ['Deels terugbetaald', 'Partially refunded'],
  VOIDED: ['Betaling geannuleerd', 'Payment voided'], EXPIRED: ['Betaling verlopen', 'Payment expired'], UNKNOWN: ['Status wordt gecontroleerd', 'Status being checked'],
  UNFULFILLED: ['Wordt voorbereid', 'Preparing your order'], FULFILLED: ['Verzonden', 'Shipped'], PARTIALLY_FULFILLED: ['Deels verzonden', 'Partially shipped'],
  IN_PROGRESS: ['In behandeling', 'In progress'], ON_HOLD: ['In afwachting', 'On hold'], SCHEDULED: ['Gepland', 'Scheduled'], RESTOCKED: ['Terug op voorraad', 'Restocked'],
}

/** Read-only surfaces intentionally have no legacy payment/refund/shipping action handlers. */
export default function ShopifyOrders({ mode, locale = 'nl' }: Props) {
  const en = locale === 'en'
  const [orders, setOrders] = useState<ShopifyOrderView[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [settledRequest, setSettledRequest] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const requestKey = `${mode}:${page}:${revision}`
  const loading = settledRequest !== requestKey
  const text = useCallback((nl: string, english: string) => en ? english : nl, [en])
  useEffect(() => {
    const controller = new AbortController()
    const deadline = setTimeout(() => controller.abort(), 12_000)
    let current = true
    fetch(`${mode === 'admin' ? '/api/admin/shopify/orders' : '/api/account/shopify-orders'}?page=${page}`, {
      cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('ORDERS_UNAVAILABLE')
      const result = await response.json()
      if (!Array.isArray(result.orders) || typeof result.hasMore !== 'boolean') throw new Error('INVALID_RESPONSE')
      if (current) { setOrders(result.orders); setHasMore(result.hasMore); setFailed(false) }
    }).catch(() => { if (current) setFailed(true) }).finally(() => { clearTimeout(deadline); if (current) setSettledRequest(requestKey) })
    return () => { current = false; clearTimeout(deadline); controller.abort() }
  }, [mode, page, requestKey])
  const status = (value: string) => labels[value]?.[en ? 1 : 0] ?? text('Status wordt gecontroleerd', 'Status being checked')
  const money = (amount: string, currency: string) => new Intl.NumberFormat(en ? 'en-IE' : 'nl-NL', { style: 'currency', currency }).format(Number(amount))
  const date = (value: string) => new Intl.DateTimeFormat(en ? 'en-GB' : 'nl-NL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Amsterdam' }).format(new Date(value))

  return <section aria-label={text('Bestellingen via Shopify', 'Orders via Shopify')} className="mb-8 space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-2xl uppercase">{text('Bestellingen via Shopify', 'Orders via Shopify')}</h2>
      <button type="button" onClick={() => setRevision(v => v + 1)} disabled={loading} className="border-2 border-black px-4 py-2 text-sm font-bold uppercase disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
        {text('Vernieuwen', 'Refresh')}
      </button>
    </div>
    {mode === 'admin' ? <p className="text-sm text-gray-600">Betalingen en retourbetalingen beheer je in Shopify. De verzendstatus wordt per artikel bijgewerkt; Tapstitch-artikelen worden door Tapstitch afgehandeld.</p>
      : <p className="text-sm text-gray-600">{text('Hier verschijnen bestellingen die je ingelogd via onze Shopify-checkout plaatst. Als gast besteld? Gebruik de bestelbevestiging in je e-mail. Je bestelling kan in meerdere pakketten komen.', 'Orders placed while signed in through our Shopify checkout appear here. Ordered as a guest? Use your email confirmation. Your order may arrive in separate parcels.')}</p>}
    {loading ? <p role="status" className="border-2 border-gray-200 p-6">{text('Bestellingen laden…', 'Loading orders…')}</p>
      : failed ? <div role="alert" className="border-2 border-amber-500 bg-amber-50 p-5"><p>{text('Je bestellingen kunnen nu niet worden geladen. Probeer het opnieuw met Vernieuwen.', 'Your orders could not be loaded. Please try Refresh again.')}</p></div>
      : !orders.length ? <p className="border-2 border-gray-200 bg-gray-50 p-6 text-gray-600">{text('Nog geen bestellingen via Shopify op deze pagina.', 'No orders via Shopify on this page yet.')}</p>
      : orders.map(order => <article key={order.id} className="border-2 border-black bg-white">
        <header className="flex flex-wrap justify-between gap-3 border-b-2 border-black p-4 md:p-6">
          <div><h3 className="font-bold text-xl break-words">{order.name}</h3><p className="text-xs text-gray-500 mt-1">{text('Laatst bijgewerkt', 'Last updated')}: {date(order.updatedAt)}</p></div>
          <div className="text-left sm:text-right"><p className="font-bold text-xl">{money(order.total, order.currency)}</p><p className="text-sm mt-1">{status(order.financialStatus)}</p></div>
        </header>
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm font-semibold"><span className="bg-gray-100 px-3 py-1">{order.cancelled ? text('Bestelling geannuleerd', 'Order cancelled') : status(order.fulfillmentStatus)}</span><span className="bg-gray-100 px-3 py-1">Checkout: Shopify</span></div>
          {Number(order.refunded) > 0 && <p className="text-sm">{text('Terugbetaald', 'Refunded')}: <strong>{money(order.refunded, order.currency)}</strong></p>}
          <ul className="divide-y divide-gray-200">
            {order.lines.map(line => <li key={line.id} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold break-words">{line.quantity} × {line.name}</p>
                {mode === 'admin' && <p className="text-xs text-gray-600 mt-1">Afhandeling: {line.owner === 'tapstitch' ? 'Tapstitch' : line.owner === 'mose' ? 'MOSE' : line.owner === 'digital' ? 'Digitaal' : 'Koppeling controleren'}</p>}
                {line.currentQuantity < line.quantity && <p className="text-sm text-gray-600">{text('Resterend na aanpassingen', 'Remaining after adjustments')}: {line.currentQuantity}</p>}
              </div>
              <p className="text-sm shrink-0">{line.shippedQuantity} {text('verzonden', 'shipped')}</p>
            </li>)}
          </ul>
          {order.shipments.map((shipment, index) => <div key={shipment.id} className="bg-gray-50 p-4 space-y-2">
            <h4 className="font-bold">{text('Pakket', 'Parcel')} {index + 1}</h4>
            <ul className="text-sm">{shipment.lines.map(line => <li key={line.id}>{line.quantity} × {order.lines.find(item => item.id === line.id)?.name ?? text('Artikel', 'Item')}</li>)}</ul>
            {shipment.tracking.length ? shipment.tracking.map((tracking, i) => <p key={i} className="text-sm break-all">
              {tracking.company && <span>{tracking.company} · </span>}{tracking.number && <span>{tracking.number} </span>}
              {tracking.url && <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">{text('Volg je pakket', 'Track parcel')}</a>}
            </p>) : <p className="text-sm text-gray-600">{text('De trackingcode volgt zodra deze beschikbaar is.', 'Tracking will appear when available.')}</p>}
          </div>)}
          <footer className="flex flex-wrap justify-between gap-3 text-xs text-gray-500">
            <p>{text('Gesynchroniseerd', 'Synced')}: {date(order.syncedAt)}</p>
            {mode === 'admin' ? <a href={`https://mosewear.myshopify.com/admin/orders/${order.id.split('/').at(-1)}`} target="_blank" rel="noopener noreferrer" className="text-black font-bold underline underline-offset-4">Open in Shopify ↗</a>
              : <a href={`/${en ? 'en' : 'nl'}/contact`} className="text-black font-bold underline underline-offset-4">{text('Vraag over deze bestelling?', 'Question about this order?')}</a>}
          </footer>
        </div>
      </article>)}
    {(page > 0 || hasMore) && <nav aria-label={text('Pagina’s met bestellingen', 'Order pages')} className="flex items-center gap-3">
      <button type="button" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)} className="border-2 border-black px-4 py-2 font-bold disabled:opacity-40">{text('Vorige', 'Previous')}</button>
      <span className="text-sm">{text('Pagina', 'Page')} {page + 1}</span>
      <button type="button" disabled={loading || !hasMore || failed} onClick={() => setPage(p => p + 1)} className="border-2 border-black px-4 py-2 font-bold disabled:opacity-40">{text('Volgende', 'Next')}</button>
    </nav>}
  </section>
}
