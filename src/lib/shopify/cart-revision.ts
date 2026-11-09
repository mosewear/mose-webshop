import { storefront } from './client'
import { assertCreatedCartLines } from './cart-line-proof'
import { assertCheckoutUrl, moneyToCents } from './policy'

type Line = { merchandiseId: string; quantity: number }
type Cart = {
  id: string
  checkoutUrl: string
  discountCodes: unknown[]
  appliedGiftCards: unknown[]
  cost: { subtotalAmount: { amount: string; currencyCode: string } }
  lines: { pageInfo: { hasNextPage: boolean }; nodes: {
    id: string; quantity: number; attributes: { key: string; value: string }[]; merchandise: { id: string }
  }[] }
}

const fields = `id checkoutUrl discountCodes { code } appliedGiftCards { id }
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

function assertPlainCart(cart: Cart | null, id: string): asserts cart is Cart {
  if (!cart || cart.id !== id || cart.discountCodes.length || cart.appliedGiftCards.length ||
      cart.lines.pageInfo.hasNextPage || cart.lines.nodes.some(line => line.attributes.length)) {
    throw new Error('CART_REVISION_NOT_AVAILABLE')
  }
}

export async function reviseShopifyCart(input: {
  id: string; country: string; language: string; buyerIp: string
  previous: Line[]; desired: Line[]; currency: string; subtotal: number
  beforeMutation: () => void
}) {
  const { id, country, language, buyerIp, previous, desired } = input
  const variables = { id, country, language }
  let { cart } = await storefront<{ cart: Cart | null }>(query, variables, buyerIp)
  assertPlainCart(cart, id)
  assertCreatedCartLines(cart.lines.nodes, previous)
  const current = new Map(cart.lines.nodes.map(line => [line.merchandise.id, line]))
  const desiredIds = new Set(desired.map(line => line.merchandiseId))
  const removed = cart.lines.nodes.filter(line => !desiredIds.has(line.merchandise.id))
  const added = desired.filter(line => !current.has(line.merchandiseId))
    .map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity }))
  const updates = desired.flatMap(line => {
    const existing = current.get(line.merchandiseId)
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
    assertPlainCart(response.cart, id)
    cart = response.cart
  }

  // Keep the original lines intact if Shopify rejects a new variant.
  await mutate('cartLinesAdd', added)
  assertPlainCart(cart, id)
  if (added.length) {
    const addedIds = new Set(added.map(line => line.merchandiseId))
    assertCreatedCartLines(cart.lines.nodes.filter(line => addedIds.has(line.merchandise.id)), added)
    assertCreatedCartLines(cart.lines.nodes.filter(line => !addedIds.has(line.merchandise.id)), previous)
  }
  await mutate('cartLinesUpdate', updates)
  await mutate('cartLinesRemove', removed.map(line => line.id))
  assertPlainCart(cart, id)
  assertCreatedCartLines(cart.lines.nodes, desired)
  const subtotal = cart.cost.subtotalAmount
  if (subtotal.currencyCode !== input.currency || moneyToCents(subtotal.amount) !== input.subtotal) throw new Error('CART_REVISION_PRICE_CHANGED')
  return assertCheckoutUrl(cart.checkoutUrl, process.env.SHOPIFY_CHECKOUT_HOST)
}
