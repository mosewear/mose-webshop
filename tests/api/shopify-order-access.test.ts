// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ getUser: vi.fn(), requireAdmin: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mock.getUser } }) }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mock.requireAdmin }))
vi.mock('@/lib/shopify/order-access', async importOriginal => ({ ...await importOriginal<object>(), readShopifyOrders: mock.read }))
import { GET as account } from '@/app/api/account/shopify-orders/route'
import { GET as admin } from '@/app/api/admin/shopify/orders/route'
import { parseOrderPage } from '@/lib/shopify/order-access'
beforeEach(() => {
  vi.clearAllMocks()
  mock.getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null })
  mock.requireAdmin.mockResolvedValue({ authorized: true })
  mock.read.mockResolvedValue({ orders: [], hasMore: false, page: 0 })
})
describe('Shopify order read authorization', () => {
  it('uses verified identity and never accepts a requested user or email', async () => {
    expect((await account(new NextRequest('https://mosewear.com/api/account/shopify-orders?page=2'))).status).toBe(200)
    expect(mock.read).toHaveBeenCalledWith(2, 'account', 'verified-user')
    expect((await account(new NextRequest('https://mosewear.com/api/account/shopify-orders?userId=other'))).status).toBe(400)
    expect(mock.read).toHaveBeenCalledTimes(1)
  })
  it('rejects absent or invalid sessions before service-role access', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await account(new NextRequest('https://mosewear.com/api/account/shopify-orders'))).status).toBe(401)
    mock.getUser.mockResolvedValue({ data: { user: { id: 'untrusted' } }, error: {} })
    expect((await account(new NextRequest('https://mosewear.com/api/account/shopify-orders'))).status).toBe(401)
    expect(mock.read).not.toHaveBeenCalled()
  })
  it('requires an admin or manager, not merely an authenticated user', async () => {
    mock.requireAdmin.mockResolvedValue({ authorized: false })
    expect((await admin(new NextRequest('https://mosewear.com/api/admin/shopify/orders'))).status).toBe(403)
    expect(mock.requireAdmin).toHaveBeenCalledWith(['admin', 'manager'])
    expect(mock.read).not.toHaveBeenCalled()
  })
  it('disables caching and hides backend errors', async () => {
    mock.read.mockRejectedValue(new Error('secret database error'))
    const result = await admin(new NextRequest('https://mosewear.com/api/admin/shopify/orders'))
    expect(result.status).toBe(503)
    expect(result.headers.get('cache-control')).toBe('private, no-store')
    expect(await result.text()).not.toContain('secret')
  })
  it('rejects ambiguous, negative, oversized and unexpected pagination inputs', () => {
    for (const query of ['page=-1', 'page=10001', 'page=1&page=2', 'page=1.1', 'page=1e2', 'email=a@b.com']) {
      expect(parseOrderPage('https://mosewear.com/?' + query)).toBe(null)
    }
    expect(parseOrderPage('https://mosewear.com')).toBe(0)
  })
})
