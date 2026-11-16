// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShopifyAdminOrder } from '@/lib/shopify/admin-order-detail'

const mocks = vi.hoisted(() => ({
  read: vi.fn(), insert: vi.fn(), update: vi.fn(), upsert: vi.fn(),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
      insert: mocks.insert,
      update: mocks.update,
      upsert: mocks.upsert,
    }),
  }),
}))
vi.mock('@/lib/email', () => ({ sendShopifyReturnLabelEmail: vi.fn() }))

import { createShopifyReturnLabel } from '@/lib/shopify/admin-return-label'

const order = {
  id: 'gid://shopify/Order/1',
  name: '#TEST42',
  createdAt: '2026-01-01T12:00:00Z',
  email: 'shopper@example.com',
  financialStatus: 'PAID',
  cancelled: false,
  shippingAddress: { name: 'Test Klant', address1: 'Voorbeeldstraat 14', zip: '1234 AB', city: 'Teststad', countryCodeV2: 'NL' },
  lines: [{ shippedQuantity: 1, currentQuantity: 1, owner: 'mose' }],
} as ShopifyAdminOrder

describe('creating a Shopify return label', () => {
  const fetcher = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', fetcher)
    vi.stubEnv('SENDCLOUD_PUBLIC_KEY', 'test')
    vi.stubEnv('SENDCLOUD_SECRET_KEY', 'test')
    mocks.read.mockResolvedValue({ data: null })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.update.mockReturnValue({ eq: async () => ({ error: null }) })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('reuses a matching manually created label without a second carrier POST', async () => {
    fetcher.mockResolvedValueOnce(Response.json({
      data: [{
        order_number: 'TEST42', from_address: { email: order.email, postal_code: '1234AB' },
        tracking_number: 'RETURN-ABC', label: { label_printer: 'https://panel.sendcloud.sc/api/v3/parcels/123/documents/label' },
      }],
      next: null,
    }))
    await createShopifyReturnLabel(order, 600)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toContain('page_size=40')
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      order_id: order.id, parcel_id: 123, tracking_code: 'RETURN-ABC',
    }), expect.any(Object))
  })

  it('registers the purchaser-paid return before emailing can begin', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ data: [], next: null }))
      .mockResolvedValueOnce(Response.json({ return_id: 2, parcel_id: 3, multi_collo_ids: [] }, { status: 201 }))
    await createShopifyReturnLabel(order, 600)
    const [url, request] = fetcher.mock.calls[1]
    expect(url).toBe('https://panel.sendcloud.sc/api/v3/returns/announce-synchronously')
    expect(JSON.parse(String(request?.body))).toMatchObject({
      from_address: { address_line_1: 'Voorbeeldstraat', house_number: '14' },
      weight: { value: 600, unit: 'g' },
      send_tracking_emails: false,
      apply_rules: false,
    })
    expect(mocks.update).toHaveBeenCalledWith({ sendcloud_return_id: 2, parcel_id: 3 })
  })

  it('does not buy a second label while a previous carrier request is unresolved', async () => {
    mocks.read.mockResolvedValue({ data: { parcel_id: null } })
    fetcher.mockResolvedValueOnce(Response.json({ data: [], next: null }))
    await expect(createShopifyReturnLabel(order, 600)).rejects.toThrow('RETURN_ALREADY_PENDING')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
