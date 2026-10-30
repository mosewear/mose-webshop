// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ from: () => ({ insert: mock.insert }) }) }))
import { POST } from '@/app/api/analytics/track/route'
beforeEach(() => mock.insert.mockReset().mockResolvedValue({ error: null }))
const request = (event_name: string, ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15') => new NextRequest('https://www.mosewear.com/api/analytics/track', {
  method: 'POST', headers: { 'user-agent': ua, 'x-vercel-ip-country': 'NL', 'x-forwarded-for': '192.0.2.50' }, body: JSON.stringify({ event_name, event_properties: { product_id: 'p', result_count: 12 }, session_id: 'test-session' }),
})
it.each(['catalog_results', 'catalog_filter_change', 'catalog_search_results', 'catalog_product_impression', 'catalog_product_click', 'catalog_web_vital'])('accepts the supported %s event through the actual ingest allowlist', async (name) => {
  expect((await POST(request(name))).status).toBe(200)
  expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ event_name: name }))
})
it('continues rejecting unknown events and filters automation before storage', async () => {
  expect((await POST(request('invented_event'))).status).toBe(400)
  expect((await POST(request('catalog_product_click', 'HeadlessChrome/120.0'))).status).toBe(200)
  expect(mock.insert).not.toHaveBeenCalled()
})
