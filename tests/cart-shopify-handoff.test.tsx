import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CartItem } from '@/store/cart'
import { ShopifyCheckoutHandoff } from '@/components/shopify/ShopifyCheckoutHandoff'

const { state, clearCart } = vi.hoisted(() => ({ state: { items: [] as CartItem[] }, clearCart: vi.fn() }))
vi.mock('@/store/cart', () => ({
  useCart: Object.assign((selector: (value: typeof state) => unknown) => selector(state), { getState: () => ({ ...state, clearCart }) }),
  useCartGehydrateerd: () => true,
}))
vi.mock('next-intl', () => ({ useLocale: () => 'nl' }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
vi.mock('next/image', () => ({ default: () => null }))

const item = (variantId: string): CartItem => ({
  productId: 'p', variantId, slug: 'hoodie', name: variantId, size: 'M', color: 'Black', colorHex: '#000', quantity: 1, price: 75, image: '', stock: 5, sku: variantId,
})
const attemptId = 'c6a7205c-f9aa-4bc4-8e8f-83276c4273be'

describe('Shopify handoff', () => {
  beforeEach(() => {
    state.items = [item('mose-stock'), item('tapstitch')]
    clearCart.mockClear()
    const storage = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
    vi.stubGlobal('crypto', { randomUUID: () => attemptId })
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('sends the whole bag in one request and preserves it on a service failure', async () => {
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/session')
      ? { ok: true, json: async () => ({ ready: true }) }
      : { ok: false, status: 503, json: async () => ({ code: 'CHECKOUT_UNAVAILABLE' }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/je winkelmand is behouden/i)
    const body = JSON.parse(fetch.mock.calls[1][1].body)
    expect(body).toEqual({ locale: 'nl', country: 'NL', attemptId, lines: [
      { variantId: 'mose-stock', quantity: 1 }, { variantId: 'tapstitch', quantity: 1 },
    ] })
    expect(state.items).toHaveLength(2)
    expect(clearCart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
    expect(JSON.parse(fetch.mock.calls[3][1].body).attemptId).toBe(attemptId)
  })

  it('ignores double submission and refuses a stale response when another tab changes the bag', async () => {
    let finish!: (value: unknown) => void
    const fetch = vi.fn((url: string) => url.endsWith('/session')
      ? Promise.resolve({ ok: true, json: async () => ({ ready: true }) })
      : new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    const button = screen.getByRole('button', { name: 'Veilig verder naar betalen' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    state.items = [item('mose-stock')]
    finish({ ok: true, json: async () => ({ checkoutUrl: 'https://mosewear.myshopify.com/checkouts/a', attemptId }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Je winkelmand, prijs of beschikbaarheid is gewijzigd')
    expect(state.items).toHaveLength(1)
    expect(clearCart).not.toHaveBeenCalled()
  })

  it('never creates a checkout if the session acknowledgement is lost', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('Connection lost'))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await screen.findByRole('alert')
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('/api/shopify/session')
    expect(state.items).toHaveLength(2)
    expect(clearCart).not.toHaveBeenCalled()
  })

  it('does not silently drop a gift card from a mixed bag', () => {
    state.items.push({ ...item('gift'), isGiftCard: true, giftCardAmount: 50 })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    expect(screen.getByRole('button', { name: 'Veilig verder naar betalen' })).toBeDisabled()
    expect(screen.getByText(/Afrekenen met cadeaubonnen is via deze route nog niet beschikbaar/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(state.items).toHaveLength(3)
  })

  it.each([
    ['ATTEMPT_PENDING', false, false],
    ['ATTEMPT_EXPIRED', false, false],
    ['ATTEMPT_EXPIRED', true, true],
    ['ATTEMPT_FAILED', true, true],
  ])('handles %s safely with retrySafe=%s', async (code, retrySafe, rotates) => {
    const nextId = '34fa1f30-2326-4111-84f8-1d321f0a7b84'
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce(attemptId).mockReturnValue(nextId) })
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/session')
      ? { ok: true, json: async () => ({ ready: true }) }
      : { ok: false, status: 409, json: async () => ({ code, retrySafe }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    const alert = await screen.findByRole('alert')
    if (!rotates) expect(alert).toHaveTextContent(/betaalpoging.*gecontroleerd/)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
    expect(JSON.parse(fetch.mock.calls[1][1].body).attemptId).toBe(attemptId)
    expect(JSON.parse(fetch.mock.calls[3][1].body).attemptId).toBe(rotates ? nextId : attemptId)
    expect(clearCart).not.toHaveBeenCalled()
  })
})
