import { z } from 'zod'

export const productionLabels = {
  'On Hold': 'Wacht op indiening',
  'In Review': 'In beoordeling',
  'In Production': 'In productie',
  'Quality Check': 'Kwaliteitscontrole',
  Shipped: 'Productie afgerond · verzending gemeld',
  Delivered: 'Productie afgerond · levering gemeld',
  Cancelled: 'Geannuleerd bij Tapstitch',
} as const
export const observedOrderSchema = z
  .object({
    supplier_order_id: z.string().regex(/^[1-9]\d{10,24}$/),
    shopify_order_name: z.string().regex(/^#[A-Za-z0-9-]{1,40}$/),
    status: z.enum([
      'On Hold',
      'In Review',
      'In Production',
      'Quality Check',
      'Shipped',
      'Delivered',
      'Cancelled',
    ]),
    header_text: z.string().min(10).max(600),
    source_url: z.string().url().max(500),
  })
  .strict()
export type ProductionObservation = z.infer<typeof observedOrderSchema>
export function supplierOrderUrl(id: string) {
  if (!/^[1-9]\d{10,24}$/.test(id)) throw new Error('INVALID_SUPPLIER_ORDER')
  return `https://www.tapstitch.com/order/detail/${id}`
}

/** Validate the actual order header, never a progress legend containing every stage. */
export function validateProductionObservation(
  input: unknown,
  expectedName: string,
  expectedSupplierId?: string,
) {
  const value = observedOrderSchema.parse(input)
  const url = new URL(value.source_url)
  if (
    url.origin !== 'https://www.tapstitch.com' ||
    url.pathname !== `/order/detail/${value.supplier_order_id}` ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error('INVALID_SOURCE_URL')
  if (
    value.shopify_order_name !== expectedName ||
    (expectedSupplierId && value.supplier_order_id !== expectedSupplierId)
  )
    throw new Error('SUPPLIER_ORDER_MISMATCH')
  const header = value.header_text.replace(/\s+/g, ' ').trim()
  const expected = `Order #${value.supplier_order_id} ${expectedName} ${value.status}`
  // The collector returns just the observed order header, without dates or customer details.
  if (header !== expected) throw new Error('UNVERIFIED_PRODUCTION_HEADER')
  return {
    ...value,
    header_text: header,
    source_url: supplierOrderUrl(value.supplier_order_id),
  }
}

export type StoredProduction = ProductionObservation & {
  shopify_order_id: string
  observed_at: string
  run_id: string
}
export function productionPresentation(
  row: StoredProduction | undefined,
  now = Date.now(),
) {
  if (!row)
    return {
      production_status: 'Productie niet afzonderlijk gemeld',
      production_checked_at: null,
      production_stale: false,
      production_source_url: null,
    }
  const at = Date.parse(row.observed_at)
  const productionComplete = ['Shipped', 'Delivered', 'Cancelled'].includes(
    row.status,
  )
  const stale =
    !Number.isFinite(at) ||
    at > now + 60_000 ||
    (!productionComplete && now - at > 8 * 60 * 60_000)
  return {
    production_status: productionLabels[row.status],
    production_checked_at: row.observed_at,
    production_stale: stale,
    production_source_url: supplierOrderUrl(row.supplier_order_id),
  }
}

/** A scheduler outage must be visible even before a new order has an observation. */
export function productionSyncOverdue(
  state: {
    state: string
    next_run_at: string | null
    started_at: string | null
  },
  enabled: boolean,
  now = Date.now(),
): boolean {
  if (!enabled) return false
  const running = state.state === 'starting' || state.state === 'running'
  const timestamp = Date.parse(
    (running ? state.started_at : state.next_run_at) ?? '',
  )
  const grace = (running ? 30 : 15) * 60_000
  return !Number.isFinite(timestamp) || timestamp < now - grace
}
