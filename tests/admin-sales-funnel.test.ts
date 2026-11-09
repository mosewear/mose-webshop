import { describe, expect, it } from 'vitest'
import { buildAdminSalesFunnel } from '@/lib/admin-sales-funnel'

const names = new Map([['jacket', 'Denim Zip Jacket'], ['tee', 'Heavy Tee']])
const event = (session_id: string, event_name: string, event_properties: Record<string, unknown> = {}, page_url: string | null = null) => ({ session_id, event_name, event_properties, page_url })

describe('admin sales funnel', () => {
  it('carries campaign attribution through checkout and counts each session once per step', () => {
    const result = buildAdminSalesFunnel([
      event('1', 'page_view', {}, 'https://www.mosewear.com/nl?utm_campaign=DENIM_NL'),
      event('1', 'product_view', { product_id: 'jacket' }),
      event('1', 'product_view', { product_id: 'jacket' }),
      event('1', 'add_to_cart', { product_id: 'jacket' }),
      event('1', 'add_to_cart', { product_id: 'jacket' }),
      event('1', 'checkout_handoff_failed', { product_ids: ['jacket'] }),
      event('1', 'checkout_started', { product_ids: ['jacket'], shopify_attempt_id: 'confirmed' }),
      event('1', 'checkout_started', { product_ids: ['tee'], shopify_attempt_id: 'confirmed' }),
      event('2', 'product_view', { product_id: 'tee' }),
      event('2', 'checkout_started', { product_ids: ['tee'], shopify_attempt_id: 'unpaid' }),
      event('2', 'purchase', { shopify_attempt_id: 'unpaid' }),
    ], [{ attemptId: 'confirmed', products: ['tee'] }], names)
    expect(result.total).toEqual({ sessions: 2, viewed: 2, added: 1, checkout: 2, failed: 1, paid: 1 })
    expect(result.campaigns).toEqual([{ id: 'denim_nl', label: 'denim_nl', sessions: 1, viewed: 1, added: 1, checkout: 1, failed: 1, paid: 1 }])
    expect(result.byCampaign.denim_nl.find(row => row.id === 'jacket')).toMatchObject({ viewed: 1, added: 1, checkout: 1, failed: 1, paid: 0 })
    expect(result.byCampaign.denim_nl.find(row => row.id === 'tee')).toMatchObject({ viewed: 0, checkout: 1, paid: 1 })
    expect(result.products.find(row => row.id === 'tee')).toMatchObject({ sessions: 2, paid: 1 })
  })

  it('keeps untagged sessions in totals and excludes unknown product IDs from breakdowns', () => {
    const result = buildAdminSalesFunnel([
      event('1', 'product_view', { product_id: 'unknown' }, 'https://www.mosewear.com/nl?utm_campaign=%3Cscript%3E'),
      event('2', 'checkout_started'),
    ], [], names)
    expect(result.total).toMatchObject({ sessions: 2, viewed: 1, checkout: 1, paid: 0 })
    expect(result.campaigns).toEqual([])
    expect(result.products).toEqual([])
  })
})
