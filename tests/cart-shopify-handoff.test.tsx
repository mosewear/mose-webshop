import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CartItem } from '@/store/cart'
import { SHOPIFY_ATTEMPT_STORAGE_KEY, createShopifyCartSnapshot } from '@/lib/shopify-cart'
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
    const local = new Map<string,string>()
    vi.stubGlobal('localStorage', {getItem:(key:string)=>local.get(key)??null,setItem:(key:string,value:string)=>local.set(key,value)})
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

  it('carries an already applied cart promo into the server-authoritative Shopify checkout', async () => {
    localStorage.setItem('mose_promo_code', ' saved-15 ')
    localStorage.setItem('mose_promo_discount', '99999')
    const fetch = vi.fn().mockImplementation((url:string) => Promise.resolve(url.endsWith('/session')
      ? {ok:true,json:async()=>({ready:true})}
      : {ok:false,status:503,json:async()=>({code:'CHECKOUT_UNAVAILABLE'})}))
    vi.stubGlobal('fetch',fetch)
    render(<ShopifyCheckoutHandoff />)
    expect(screen.getByLabelText('Kortingscode')).toHaveValue('SAVED-15')
    fireEvent.click(screen.getByRole('button',{name:'Veilig verder naar betalen'}))
    await screen.findByRole('alert')
    const body=JSON.parse(fetch.mock.calls[1][1].body)
    expect(body.promoCode).toBe('SAVED-15')
    expect(body).not.toHaveProperty('discountAmount')
  })

  it.each([undefined,'RETAINED-10'])('keeps the locked attempt promo %s authoritative over the saved cart code', (promoCode) => {
    localStorage.setItem('mose_promo_code','OTHER-25')
    sessionStorage.setItem(SHOPIFY_ATTEMPT_STORAGE_KEY, JSON.stringify({attemptId,locked:true,snapshot:JSON.stringify(createShopifyCartSnapshot(state.items,'nl',{promoCode}))}))
    render(<ShopifyCheckoutHandoff />)
    expect(screen.getByLabelText('Kortingscode')).toHaveValue(promoCode??'')
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
    expect(screen.getByRole('button', { name: 'Veilig verder naar betalen' })).toBeEnabled()
    expect(screen.getByText(/Je cadeaubon wordt per e-mail geleverd/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(state.items).toHaveLength(3)
  })

  it.each([
    ['ATTEMPT_PENDING', false, false],
    ['ATTEMPT_EXPIRED', false, false],
    ['ATTEMPT_EXPIRED', true, true],
    ['ATTEMPT_FAILED', true, true],
    ['BENEFIT_UNAVAILABLE', true, true],
    ['BENEFIT_UNAVAILABLE', false, false],
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
    if (!rotates) expect(alert).toHaveTextContent(code === 'BENEFIT_UNAVAILABLE' ? /kortingscode en beschikbare spaarpunten/ : /betaalpoging.*gecontroleerd/)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
    expect(JSON.parse(fetch.mock.calls[1][1].body).attemptId).toBe(attemptId)
    expect(JSON.parse(fetch.mock.calls[3][1].body).attemptId).toBe(rotates ? nextId : attemptId)
    expect(clearCart).not.toHaveBeenCalled()
  })
  it('loads verified loyalty only on request and sends selected points and promo, never tier prices', async () => {
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/api/loyalty'
      ? { ok: true, status: 200, json: async () => ({ points_balance: 350, tier: 'silver', discount_percent: 5 }) }
      : url.endsWith('/session') ? { ok: true, json: async () => ({ ready: true }) }
      : { ok: false, status: 409, json: async () => ({ code: 'BENEFIT_UNAVAILABLE' }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Kortingscode'), { target: { value: ' welcome_10 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mijn MOSE-punten bekijken' }))
    expect(await screen.findByText(/350 punten beschikbaar/)).toBeInTheDocument()
    const points = screen.getByLabelText('Punten gebruiken')
    expect(points).toHaveAttribute('max', '300')
    fireEvent.change(points, { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Controleer je kortingscode en beschikbare spaarpunten.')
    const request = fetch.mock.calls.find(call => call[0] === '/api/shopify/checkout')!
    const body = JSON.parse(request[1].body)
    expect(body).toMatchObject({ promoCode: 'WELCOME_10', loyaltyPoints: 200 })
    expect(body).not.toHaveProperty('discount_percent'); expect(body).not.toHaveProperty('tier'); expect(body).not.toHaveProperty('price')
    expect(clearCart).not.toHaveBeenCalled()
  })
  it('offers sign in to guests without enabling point redemption or losing their bag', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Niet ingelogd' }) })
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.click(screen.getByRole('button', { name: 'Mijn MOSE-punten bekijken' }))
    expect(await screen.findByText('Log in om je MOSE-punten te gebruiken.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Punten gebruiken')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Naar mijn account' })).toHaveAttribute('href', '/account')
    expect(fetch).toHaveBeenCalledOnce(); expect(clearCart).not.toHaveBeenCalled()
  })
  it('never creates a second cart after promo input changes while an earlier outcome is uncertain', async () => {
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(url.endsWith('/session')
      ? { ok: true, json: async () => ({ ready: true }) }
      : { ok: false, status: 503, json: async () => ({ code: 'ATTEMPT_PENDING' }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.change(screen.getByLabelText('Kortingscode'), { target: { value: 'FIRST' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await screen.findByRole('alert')
    fireEvent.change(screen.getByLabelText('Kortingscode'), { target: { value: 'SECOND' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/moet eerst worden gecontroleerd/))
    expect(fetch.mock.calls.filter(call => call[0] === '/api/shopify/checkout')).toHaveLength(1)
    expect(state.items).toHaveLength(2); expect(clearCart).not.toHaveBeenCalled()
  })

  it('recovers the same reserved-points attempt after reload even when available balance is now debited', async () => {
    const snapshot = { locale: 'nl', country: 'NL', loyaltyPoints: 100, lines: [{ variantId: 'mose-stock', quantity: 1 }, { variantId: 'tapstitch', quantity: 1 }] }
    sessionStorage.setItem('mose-shopify-checkout-attempt-v1', JSON.stringify({ snapshot: JSON.stringify(snapshot), attemptId, locked: true }))
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/api/loyalty'
      ? { ok: true, status: 200, json: async () => ({ points_balance: 0, tier: 'bronze' }) }
      : url.endsWith('/session') ? { ok: true, json: async () => ({ ready: true }) }
      : { ok: false, status: 409, json: async () => ({ code: 'ATTEMPT_PENDING' }) }))
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    expect(await screen.findByLabelText('Punten gebruiken')).toHaveValue(100)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    await screen.findByRole('alert')
    const post = fetch.mock.calls.find(call => call[0] === '/api/shopify/checkout')!
    expect(JSON.parse(post[1].body)).toMatchObject({ attemptId, loyaltyPoints: 100 })
    expect(clearCart).not.toHaveBeenCalled()
  })

  it('does not issue a cart when the browser cannot durably retain its attempt ID', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => { throw new Error('Storage blocked') } })
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ready: true }) })
    vi.stubGlobal('fetch', fetch)
    render(<ShopifyCheckoutHandoff />)
    fireEvent.click(screen.getByRole('button', { name: 'Veilig verder naar betalen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Je browser kan de veilige betaalpoging niet bewaren.')
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][0]).toBe('/api/shopify/session')
    expect(clearCart).not.toHaveBeenCalled()
  })

})
