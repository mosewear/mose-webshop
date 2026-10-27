vi.mock('server-only', () => ({}))
import { expect, it, vi } from 'vitest'

const { from, pagina } = vi.hoisted(() => ({ from: vi.fn(), pagina: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }))
vi.mock('@/lib/toestemming', () => ({ leesInstellingen: async () => ({ postmark_bundel: 51500 }), verstuurdLaatste30Dagen: async () => 16690, ORDERRESERVE: 1500 }))
vi.mock('@/lib/postmark', () => ({ sendEmail: vi.fn(), htmlToText: vi.fn() }))
vi.mock('@/lib/email-suppression', () => ({}))
vi.mock('@/lib/brevo', () => ({ schrijfContactUit: vi.fn() }))
import { campagneOverzicht } from '@/lib/campagnes'

it('telt een campagne met meer dan 1.000 ontvangers volledig, inclusief signalen buiten pagina één', async () => {
  const ontvangers = Array.from({ length: 8553 }, (_, i) => ({ campagne_id: 'herfst', email: `ontvanger${i}@example.com`, moment_id: i < 1000 ? 'brevo' : 'postmark', status: i === 8552 ? 'afgemeld' : 'verzonden', verzonden_op: '2026-10-25T11:00:00Z' }))
  from.mockImplementation((table: string) => {
    const result = { data: table === 'campagnes' ? [{ id: 'herfst', slug: 'herfst-2026' }] : table === 'campagne_momenten' ? [{ id: 'brevo' }, { id: 'postmark' }] : [], count: 8499, error: null }
    const q = { select: () => q, order: () => q, in: () => q, eq: () => q, neq: () => q, gte: () => q, range: async (start: number, end: number) => { pagina(start, end); return { data: ontvangers.slice(start, end + 1), error: null } }, then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) }
    return q
  })
  const result = await campagneOverzicht()
  expect(result.momenten.find(m => m.id === 'brevo')?.cijfers?.verzonden).toBe(1000)
  expect(result.momenten.find(m => m.id === 'postmark')?.cijfers?.verzonden).toBe(7553)
  expect(result.momenten.find(m => m.id === 'postmark')?.cijfers?.afgemeld).toBe(1)
  expect(pagina).toHaveBeenLastCalledWith(8000, 8999)
})
