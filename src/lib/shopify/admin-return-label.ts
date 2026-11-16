import { z } from 'zod'
import { splitsAdres, nummerMetToevoeging } from '@/lib/adres'
import { createServiceClient } from '@/lib/supabase/service'
import { sendShopifyReturnLabelEmail } from '@/lib/email'
import { canCreateShopifyReturnLabel, type ShopifyAdminOrder } from './admin-order-detail'

const table = 'admin_shopify_return_labels'
const providerIds = z.object({
  return_id: z.number().int().positive(),
  parcel_id: z.number().int().positive(),
})
const returnInfo = z.object({
  label_url: z.string().nullish(),
  label: z.object({ label_printer: z.string().nullish() }).nullish(),
  order_number: z.string().nullish(),
  tracking_number: z.string().nullish(),
  from_address: z.object({ email: z.string().nullish(), postal_code: z.string() }).nullish(),
})

function sendcloud(path: string, init?: RequestInit) {
  const { SENDCLOUD_PUBLIC_KEY: key, SENDCLOUD_SECRET_KEY: secret } = process.env
  if (!key || !secret) throw new Error('SENDCLOUD_NOT_CONFIGURED')
  return fetch('https://panel.sendcloud.sc/api/v3' + path, {
    ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: 'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      'Content-Type': 'application/json',
      Accept: path.includes('/documents/') ? 'application/pdf' : 'application/json',
    },
  })
}

export async function readShopifyReturnLabel(id: string) {
  const { data, error } = await createServiceClient().from(table)
    .select('sendcloud_return_id,parcel_id,tracking_code,recipient_email,email_sent_at,email_claimed_at')
    .eq('order_id', id).maybeSingle()
  if (error) throw new Error('RETURN_STATUS_UNAVAILABLE')
  return data
}

function postal(value: string) {
  return value.replace(/\s/g, '').toUpperCase()
}

async function findExistingReturn(order: ShopifyAdminOrder) {
  const filters = new URLSearchParams({
    from_date: (order.createdAt ?? order.updatedAt).slice(0, 10) + ' 00:00:00',
    to_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) + ' 00:00:00',
    page_size: '40',
  })
  const pageSchema = z.object({
    data: z.array(z.unknown()),
    next: z.string().url().nullish(),
  })
  const deadline = Date.now() + 45_000
  for (let page = 0; page < 100 && Date.now() < deadline; page++) {
    const response = await sendcloud('/returns?' + filters)
    if (!response.ok) throw new Error('SENDCLOUD_LOOKUP_FAILED')
    const result = pageSchema.parse(await response.json())
    for (const raw of result.data) {
      const item = returnInfo.safeParse(raw)
      if (!item.success) continue
      const value = item.data
      if (value.order_number?.replace(/^#/, '') === order.name.replace(/^#/, '')
        && value.from_address?.email?.toLowerCase() === order.email?.toLowerCase()
        && value.from_address && postal(value.from_address.postal_code) === postal(order.shippingAddress?.zip ?? '')) {
        const url = value.label?.label_printer || value.label_url || ''
        const parcelId = Number(url.match(/\/parcels\/(\d+)\/documents\/label/)?.[1])
        if (!Number.isSafeInteger(parcelId) || parcelId < 1) throw new Error('RETURN_PDF_UNAVAILABLE')
        return { parcelId, trackingCode: value.tracking_number ?? null }
      }
    }
    if (!result.next) return null
    const cursor = new URL(result.next).searchParams.get('cursor')
    if (!cursor || cursor === filters.get('cursor')) break
    filters.set('cursor', cursor)
  }
  throw new Error('SENDCLOUD_LOOKUP_INCOMPLETE')
}

export async function createShopifyReturnLabel(order: ShopifyAdminOrder, grams: number) {
  const address = order.shippingAddress
  if (!canCreateShopifyReturnLabel(order) || !address?.address1 || !address.name || !address.city
    || !address.zip || !order.email) throw new Error('ORDER_CANNOT_RETURN')

  const from = splitsAdres({ address: address.address1 })
  const [destination, locality] = (process.env.MOSE_CONTACT_ADDRESS || 'Stavangerweg 13, 9723 JC Groningen').split(',')
  const to = splitsAdres({ address: destination })
  const toLocality = locality?.trim().match(/^(\d{4}\s?[A-Z]{2})\s+(.+)$/i)
  if (!from.nummer || !to.nummer || !toLocality) throw new Error('RETURN_ADDRESS_INVALID')

  const db = createServiceClient()
  const current = await readShopifyReturnLabel(order.id)
  if (current?.parcel_id) return
  const existing = await findExistingReturn(order)
  if (existing) {
    const linked = await db.from(table).upsert({
      order_id: order.id, parcel_id: existing.parcelId, tracking_code: existing.trackingCode, recipient_email: order.email,
    }, { onConflict: 'order_id', ignoreDuplicates: !current })
    if (linked.error) throw new Error('RETURN_SAVE_FAILED')
    return
  }
  if (current) throw new Error('RETURN_ALREADY_PENDING')

  const claim = await db.from(table).insert({ order_id: order.id, recipient_email: order.email })
  if (claim.error?.code === '23505') throw new Error('RETURN_ALREADY_PENDING')
  if (claim.error) throw new Error('RETURN_STATUS_UNAVAILABLE')

  // Keep the claim if the response is ambiguous. Repeating a paid carrier call
  // after a timeout could buy a second label.
  const response = await sendcloud('/returns/announce-synchronously', {
    method: 'POST',
    body: JSON.stringify({
      from_address: {
        name: address.name, email: order.email, address_line_1: from.straat,
        house_number: nummerMetToevoeging(from.nummer, from.toevoeging),
        address_line_2: address.address2 || undefined,
        postal_code: postal(address.zip), city: address.city, country_code: 'NL',
        phone_number: address.phone || undefined,
      },
      to_address: {
        name: 'Mosewear.com', address_line_1: to.straat,
        house_number: nummerMetToevoeging(to.nummer, to.toevoeging),
        postal_code: postal(toLocality[1]), city: toLocality[2], country_code: 'NL',
        email: process.env.MOSE_CONTACT_EMAIL || 'info@mosewear.com',
      },
      ship_with: { type: 'shipping_option_code', shipping_option_code: 'dhl:complete/dropoff,return' },
      weight: { value: grams, unit: 'g' },
      order_number: order.name.replace(/^#/, ''),
      external_reference: order.id.split('/').pop(),
      send_tracking_emails: false,
      apply_rules: false,
    }),
  })
  if ([401, 403, 422, 429].includes(response.status)) {
    await db.from(table).delete().eq('order_id', order.id).is('parcel_id', null)
    throw new Error('SENDCLOUD_CREATE_REJECTED')
  }
  if (!response.ok) throw new Error('SENDCLOUD_CREATE_UNCONFIRMED')
  const ids = providerIds.parse(await response.json())
  const saved = await db.from(table).update({
    sendcloud_return_id: ids.return_id,
    parcel_id: ids.parcel_id,
  }).eq('order_id', order.id)
  if (saved.error) throw new Error('RETURN_SAVE_FAILED')
}

export async function downloadShopifyReturnLabel(parcelId: number) {
  if (!Number.isSafeInteger(parcelId) || parcelId < 1) throw new Error('RETURN_PARCEL_INVALID')
  const response = await sendcloud(`/parcels/${parcelId}/documents/label?paper_size=a4`)
  if (!response.ok) throw new Error('RETURN_PDF_UNAVAILABLE')
  const pdf = Buffer.from(await response.arrayBuffer())
  if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('RETURN_PDF_UNAVAILABLE')
  return pdf
}

export async function emailShopifyReturnLabel(order: ShopifyAdminOrder) {
  const record = await readShopifyReturnLabel(order.id)
  if (!record?.parcel_id || !order.email) throw new Error('RETURN_PDF_UNAVAILABLE')
  if (record.email_sent_at) return
  if (record.recipient_email !== order.email) throw new Error('RETURN_EMAIL_CHANGED')
  const pdf = await downloadShopifyReturnLabel(record.parcel_id)
  const db = createServiceClient()
  const claim = await db.from(table).update({ email_claimed_at: new Date().toISOString() })
    .eq('order_id', order.id).is('email_claimed_at', null).is('email_sent_at', null).select('order_id').maybeSingle()
  if (claim.error || !claim.data) throw new Error('RETURN_EMAIL_PENDING')
  const sent = await sendShopifyReturnLabelEmail({ email: record.recipient_email, orderName: order.name, pdf })
  if (!sent.success) throw new Error('RETURN_EMAIL_PENDING')
  const saved = await db.from(table).update({ email_sent_at: new Date().toISOString() }).eq('order_id', order.id)
  if (saved.error) throw new Error('RETURN_EMAIL_PENDING')
}
