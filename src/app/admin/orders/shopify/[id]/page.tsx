import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/admin'
import { canCreateShopifyReturnLabel, readShopifyAdminOrder } from '@/lib/shopify/admin-order-detail'
import { readShopifyReturnLabel } from '@/lib/shopify/admin-return-label'
import { SHOPIFY_STORE } from '@/lib/shopify/policy'
import { shipmentLabel } from '@/lib/shopify/shipping-status'
import StatusBadge from '@/components/admin/StatusBadge'
import ReturnLabel from './ReturnLabel'

type Address = NonNullable<NonNullable<Awaited<ReturnType<typeof readShopifyAdminOrder>>>['shippingAddress']>

function AddressDetails({ address }: { address: Address | null }) {
  if (!address) return <p>Geen adres beschikbaar</p>
  return <address className="not-italic">
    {[address.name, address.company, address.address1, address.address2,
      [address.zip, address.city].filter(Boolean).join(' '), address.countryCodeV2, address.phone]
      .filter(Boolean).map((line, index) => <div key={index}>{line}</div>)}
  </address>
}

export default async function ShopifyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin()).authorized) redirect('/admin')
  const { id } = await params
  const order = await readShopifyAdminOrder(id)
  if (!order) notFound()
  const label = await readShopifyReturnLabel(order.id).catch(() => undefined)
  const money = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: order.currency })

  return <div className="mx-auto max-w-5xl space-y-5">
    <Link href="/admin/orders" className="text-sm font-semibold underline">← Alle bestellingen</Link>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Bestelling {order.name}</h1>
        <p>Shopify · {new Date(order.createdAt).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>
      </div>
      <div className="flex gap-4">
        <a href="#retour" className="underline">Retourlabel</a>
        <a href={`https://admin.shopify.com/store/${SHOPIFY_STORE.split('.')[0]}/orders/${id}`} className="underline">Open in Shopify</a>
      </div>
    </header>
    <section className="grid gap-5 border border-gray-200 p-5 sm:grid-cols-3">
      <div><h2 className="font-bold">Klant en bezorgadres</h2><p>{order.email}</p><AddressDetails address={order.shippingAddress} /></div>
      <div><h2 className="font-bold">Factuuradres</h2><AddressDetails address={order.billingAddress} /></div>
      <div><h2 className="font-bold">Betaling</h2><p><StatusBadge kind="payment" status={order.financialStatus.toLowerCase()} /> {money.format(Number(order.total))}</p>
        {Number(order.refunded) > 0 && <p>Terugbetaald: {money.format(Number(order.refunded))}</p>}
        {order.cancelled && <p>Geannuleerd</p>}
      </div>
    </section>
    <section className="border border-gray-200 p-5">
      <h2 className="mb-3 text-lg font-bold">Artikelen</h2>
      <ul className="divide-y divide-gray-200">
        {order.items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2">
          <div>{item.name}{item.sku && <div className="text-sm text-gray-600">SKU {item.sku}</div>}</div>
          <div>{item.quantity} × {money.format(Number(item.originalUnitPriceSet.shopMoney.amount))}</div>
        </li>)}
      </ul>
    </section>
    <section className="space-y-2 border border-gray-200 p-5">
      <h2 className="text-lg font-bold">Verzending</h2>
      {order.shipments.length === 0 && <p>Nog geen verzendmelding.</p>}
      {order.shipments.map(shipment => <div key={shipment.id}>
        <p>{shipmentLabel(shipment.displayStatus ?? undefined)}</p>
        {shipment.tracking.map((tracking, index) => (
          <p key={index}>{tracking.company} {tracking.url ? <a className="underline" href={tracking.url}>{tracking.number}</a> : tracking.number}</p>
        ))}
      </div>)}
    </section>
    {label === undefined ? <p id="retour" role="alert">Retourstatus tijdelijk niet beschikbaar.</p> : (
      <ReturnLabel id={id} eligible={canCreateShopifyReturnLabel(order)} email={label?.recipient_email ?? order.email} parcel={Boolean(label?.parcel_id)}
        sent={Boolean(label?.email_sent_at)} pendingEmail={Boolean(label?.email_claimed_at)} tracking={label?.tracking_code ?? null} />
    )}
  </div>
}
