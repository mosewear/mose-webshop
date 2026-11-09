import { storefront } from './client'
import { assertCreatedCartLines, cartLineKey } from './cart-line-proof'
import { assertCheckoutUrl, moneyToCents } from './policy'

type Line = { merchandiseId: string; quantity: number; attributes?: { key: string; value: string }[] }
type Cart = {
  id: string
  checkoutUrl: string
  discountCodes: { code: string; applicable: boolean }[]
  appliedGiftCards: { id: string }[]
  cost: { subtotalAmount: { amount: string; currencyCode: string } }
  lines: { pageInfo: { hasNextPage: boolean }; nodes: {
    id: string; quantity: number; attributes: { key: string; value: string }[]; merchandise: { id: string }
  }[] }
}

const fields = `id checkoutUrl discountCodes { code applicable } appliedGiftCards { id }
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) { pageInfo { hasNextPage } nodes {
    id quantity attributes { key value } merchandise { ... on ProductVariant { id } }
  } }`
const context = '@inContext(country: $country, language: $language)'
const query = `query MoseOpenCart($id: ID!, $country: CountryCode!, $language: LanguageCode!) ${context} {
  cart(id: $id) { ${fields} }
}`
const mutations = {
  cartLinesUpdate: ['[CartLineUpdateInput!]!', 'lines'],
  cartLinesAdd: ['[CartLineInput!]!', 'lines'],
  cartLinesRemove: ['[ID!]!', 'lineIds'],
} as const

function assertOpenCart(cart: Cart | null, id: string): asserts cart is Cart {
  if (!cart || cart.id !== id || cart.lines.pageInfo.hasNextPage) throw new Error('CART_REVISION_NOT_AVAILABLE')
}

export async function reviseShopifyCart(input: {
  id: string; country: string; language: string; buyerIp: string
  previous: Line[]; desired: Line[]; currency: string; subtotal: number; codes?: string[]
  beforeMutation: () => void
}) {
  const { id, country, language, buyerIp, previous, desired } = input
  const variables = { id, country, language }
  let { cart } = await storefront<{ cart: Cart | null }>(query, variables, buyerIp)
  assertOpenCart(cart, id)
  assertCreatedCartLines(cart.lines.nodes, previous)
  const codes = input.codes ?? []
  if (cart.discountCodes.length !== codes.length || codes.some(code => !cart!.discountCodes.some(actual => actual.code === code && actual.applicable))) {
    throw new Error('CART_REVISION_DISCOUNT_CHANGED')
  }
  const giftCardIds = cart.appliedGiftCards.map(card => card.id).sort()
  const current = new Map(cart.lines.nodes.map(line => [cartLineKey(line.merchandise.id, line.attributes), line]))
  const lineKey = (line: Line) => cartLineKey(line.merchandiseId, line.attributes)
  const desiredKeys = new Set(desired.map(lineKey))
  const removed = [...current].filter(([key]) => !desiredKeys.has(key)).map(([, line]) => line.id)
  const added = desired.filter(line => !current.has(lineKey(line)))
    .map(({ merchandiseId, quantity, attributes }) => ({ merchandiseId, quantity, ...(attributes?.length ? { attributes } : {}) }))
  const updates = desired.flatMap(line => {
    const existing = current.get(lineKey(line))
    return existing && existing.quantity !== line.quantity ? [{ id: existing.id, quantity: line.quantity }] : []
  })
  async function mutate(operation: keyof typeof mutations, lines: unknown[]) {
    if (!lines.length) return
    const [type, argument] = mutations[operation]
    input.beforeMutation()
    const result = await storefront<Record<typeof operation, { cart: Cart | null; userErrors: unknown[]; warnings: unknown[] }>>(
      `mutation MoseReviseCart($id: ID!, $lines: ${type}, $country: CountryCode!, $language: LanguageCode!) ${context} {
        ${operation}(cartId: $id, ${argument}: $lines) { cart { ${fields} } userErrors { code } warnings { code } }
      }`, { ...variables, lines }, buyerIp)
    const response = result[operation]
    if (response.userErrors.length || response.warnings.length) throw new Error(`CART_REVISION_REJECTED_${operation.toUpperCase()}`)
    assertOpenCart(response.cart, id)
    cart = response.cart
  }

  // Keep the original lines intact if Shopify rejects a new variant.
  await mutate('cartLinesAdd', added)
  assertOpenCart(cart, id)
  if (added.length) {
    const addedIds = new Set(added.map(lineKey))
    assertCreatedCartLines(cart.lines.nodes.filter(line => addedIds.has(cartLineKey(line.merchandise.id, line.attributes))), added)
    assertCreatedCartLines(cart.lines.nodes.filter(line => !addedIds.has(cartLineKey(line.merchandise.id, line.attributes))), previous)
  }
  await mutate('cartLinesUpdate', updates)
  await mutate('cartLinesRemove', removed)
  assertOpenCart(cart, id)
  assertCreatedCartLines(cart.lines.nodes, desired)
  if (JSON.stringify(cart.appliedGiftCards.map(card => card.id).sort()) !== JSON.stringify(giftCardIds)) throw new Error('CART_REVISION_GIFT_TENDER_CHANGED')
  const subtotal = cart.cost.subtotalAmount
  if (subtotal.currencyCode !== input.currency || moneyToCents(subtotal.amount) !== input.subtotal) throw new Error('CART_REVISION_PRICE_CHANGED')
  return assertCheckoutUrl(cart.checkoutUrl, process.env.SHOPIFY_CHECKOUT_HOST)
}
