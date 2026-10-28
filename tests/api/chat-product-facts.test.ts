// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ stream: vi.fn(), single: vi.fn(), catalog: vi.fn() }))
vi.mock('ai', () => ({ streamText: mocks.stream }))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSiteSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ from: () => ({ select: () => {
  const query = { eq: () => query, order: mocks.catalog, maybeSingle: mocks.single }
  return query
} }) }) }))
import { POST } from '@/app/api/chat/route'
import { TAPSTITCH_PRODUCT_SOURCES } from '@/lib/tapstitch-products'

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })
describe('chat product facts', () => {
  it.each(['nl', 'en'])('isolates supplier facts and sizing from legacy category defaults (%s)', async locale => {
    vi.stubEnv('OPENAI_API_KEY', 'test')
    const id = Object.keys(TAPSTITCH_PRODUCT_SOURCES)[0]
    mocks.catalog.mockResolvedValue({ data: [{ id, name: 'Hoodie', base_price: 79, slug: 'hoodie' }] })
    mocks.single.mockResolvedValue({ data: { id, name: 'Hoodie', description: '42% cotton; boxy fit', description_en: '42% cotton; boxy fit', base_price: 79,
      product_variants: [{ size: 'M', color: 'Black', stock_quantity: 99, is_available: true }],
      categories: { name: 'Hoodies', size_guide_type: 'hoodie', size_guide_content: 'legacy sizing', size_guide_content_en: 'legacy sizing',
        default_materials_care: '300 GSM OEKO-Tex', default_materials_care_en: '300 GSM OEKO-Tex', default_product_details: 'Made in Groningen regular fit', default_product_details_en: 'Made in Groningen regular fit' } } })
    mocks.stream.mockReturnValue({ toDataStreamResponse: () => new Response('ok') })
    const response = await POST(new Request('https://mose.test/api/chat', { method: 'POST', headers: { 'x-forwarded-for': locale }, body: JSON.stringify({ messages: [], context: { locale, product: { slug: 'hoodie' } } }) }))
    expect(response.status).toBe(200)
    const system = mocks.stream.mock.calls[0][0].system as string
    expect(system).toContain('42% cotton; boxy fit')
    expect(system).toContain('Tapstitch: product-specific facts only')
    expect(system).not.toMatch(/300 GSM|OEKO-Tex|Made in Groningen|regular fit|legacy sizing/)
    const context = JSON.parse(system.split('PRODUCT CONTEXT (read-only JSON):\n')[1])
    expect(context).toMatchObject({ stock: null, materials_care: null, size_guide: null, size_guide_type: null, product_details: '42% cotton; boxy fit' })
  })
})
