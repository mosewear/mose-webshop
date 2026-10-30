export const VARIANTS_QUERY = `query MoseVariants($ids: [ID!]!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  nodes(ids: $ids) { ... on ProductVariant {
    id availableForSale quantityAvailable price { amount currencyCode }
    product { id title }
  } }
}`

export const CART_CREATE = `mutation MoseCart($input: CartInput!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  cartCreate(input: $input) {
    cart { id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } }
      lines(first: 100) { nodes { quantity attributes { key value } merchandise { ... on ProductVariant { id } } } }
    }
    userErrors { field message code }
    warnings { code message target }
  }
}`
