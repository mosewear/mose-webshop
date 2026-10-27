import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

class TestBroadcastChannel {
  static current: TestBroadcastChannel
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  constructor() { TestBroadcastChannel.current = this }
  receive(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}

const item = { productId: 'p', variantId: 'v', slug: 'hoodie', name: 'Hoodie', size: 'M', color: 'Black', colorHex: '#000', quantity: 1, price: 75, image: '', stock: 5, sku: 'sku' }

describe('cross-tab cart updates', () => {
  beforeEach(() => {
    vi.resetModules()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('notifies subscribers and persists a remote update without broadcasting an echo', async () => {
    const { useCart } = await import('@/store/cart')
    const listener = vi.fn()
    const unsubscribe = useCart.subscribe(listener)
    TestBroadcastChannel.current.receive({ type: 'UPDATE', items: [item] })
    expect(useCart.getState().items).toEqual([item])
    expect(listener).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem('mose-cart')!).state.items).toEqual([item])
    expect(TestBroadcastChannel.current.postMessage).not.toHaveBeenCalled()
    unsubscribe()
  })
  it('reactively clears the receiving tab and does not echo the clear', async () => {
    const { useCart } = await import('@/store/cart')
    useCart.setState({ items: [item] })
    const listener = vi.fn()
    const unsubscribe = useCart.subscribe(listener)
    TestBroadcastChannel.current.receive({ type: 'CLEAR' })
    expect(useCart.getState().items).toEqual([])
    expect(listener).toHaveBeenCalledOnce()
    expect(TestBroadcastChannel.current.postMessage).not.toHaveBeenCalled()
    unsubscribe()
  })
  it('ignores malformed incoming data instead of corrupting the saved cart', async () => {
    const { useCart } = await import('@/store/cart')
    useCart.setState({ items: [item] })
    for (const payload of [null, { type: 'UPDATE', items: {} }, { type: 'UPDATE', items: [{ ...item, quantity: -1 }] }]) {
      TestBroadcastChannel.current.receive(payload)
    }
    expect(useCart.getState().items).toEqual([item])
  })

  it('accepts the legacy recovery CLEAR then UPDATE sequence when an old order has no slug', async () => {
    const { useCart } = await import('@/store/cart')
    useCart.setState({ items: [item] })
    const legacyRecoveredItem: Partial<typeof item> = { ...item }
    delete legacyRecoveredItem.slug
    TestBroadcastChannel.current.receive({ type: 'CLEAR' })
    TestBroadcastChannel.current.receive({ type: 'UPDATE', items: [legacyRecoveredItem] })
    expect(useCart.getState().items).toEqual([{ ...legacyRecoveredItem, slug: '' }])
    expect(JSON.parse(localStorage.getItem('mose-cart')!).state.items).toHaveLength(1)
    expect(TestBroadcastChannel.current.postMessage).not.toHaveBeenCalled()
  })
})
