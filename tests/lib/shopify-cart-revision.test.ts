// @vitest-environment node
import { expect, it, vi } from 'vitest'

const { storefront } = vi.hoisted(() => ({ storefront: vi.fn() }))
vi.mock('@/lib/shopify/client', () => ({ storefront }))
import { reviseShopifyCart } from '@/lib/shopify/cart-revision'

it('sends only Shopify line fields and proves the replacement was added before removing the original', async () => {
  const cartId = 'gid://shopify/Cart/test?key=test'
  const checkoutUrl = 'https://mosewear.myshopify.com/cart/c/test'
  const previous = [{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1 }]
  const desired = [{ merchandiseId: 'gid://shopify/ProductVariant/456', quantity: 1, localVariantId: 'local-456', expectedPriceCents: 3700 }]
  const line = (id: string, merchandiseId: string) => ({ id, quantity: 1, attributes: [], merchandise: { id: merchandiseId } })
  const old = line('old-line', previous[0].merchandiseId)
  const replacement = line('new-line', desired[0].merchandiseId)
  const cart = (nodes: ReturnType<typeof line>[], amount: string) => ({
    id: cartId, checkoutUrl, discountCodes: [], appliedGiftCards: [], lines: { nodes, pageInfo: { hasNextPage: false } },
    cost: { subtotalAmount: { amount, currencyCode: 'EUR' } },
  })
  storefront.mockReset()
    .mockResolvedValueOnce({ cart: cart([old], '89.00') })
    .mockResolvedValueOnce({ cartLinesAdd: { cart: cart([old, replacement], '126.00'), userErrors: [], warnings: [] } })
    .mockResolvedValueOnce({ cartLinesRemove: { cart: cart([replacement], '37.00'), userErrors: [], warnings: [] } })

  await expect(reviseShopifyCart({ id: cartId, country: 'NL', language: 'NL', buyerIp: '127.0.0.1',
    previous, desired, currency: 'EUR', subtotal: 3700, beforeMutation: vi.fn() })).resolves.toBe(checkoutUrl)
  expect(storefront.mock.calls[1][0]).toContain('cartLinesAdd(')
  expect(storefront.mock.calls[1][1].lines).toEqual([{ merchandiseId: desired[0].merchandiseId, quantity: 1 }])
  expect(storefront.mock.calls[2][0]).toContain('cartLinesRemove(')
  expect(storefront.mock.calls[2][1].lines).toEqual(['old-line'])
})
