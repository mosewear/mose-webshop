import { afterEach, expect, it, vi } from 'vitest'
const { load } = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => ({ select: () => ({ abortSignal: load }) }) }) }))
afterEach(() => { vi.resetModules(); load.mockReset() })
it('shares one settings request across simultaneous header, footer and product consumers', async () => {
  let complete!: (value: unknown) => void
  load.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const { getSiteSettings } = await import('@/lib/settings')
  const requests = Array.from({ length: 5 }, () => getSiteSettings())
  expect(load).toHaveBeenCalledOnce()
  complete({ data: [{ key: 'free_shipping_threshold', value: '150', updated_at: '2026-10-27' }], error: null })
  const settings = await Promise.all(requests)
  expect(settings.every(value => value.free_shipping_threshold === 150)).toBe(true)
  await getSiteSettings()
  expect(load).toHaveBeenCalledOnce()
})
