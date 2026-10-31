// Verified MOSE Shopify checkout domains. Share this public allowlist between
// server validation and browser handoff so deploy-time environment differences
// cannot reject a checkout that the server has already safely issued.
export const MOSE_CHECKOUT_HOSTS = [
  'hp5szr-te.myshopify.com',
  'mosewear.myshopify.com',
  'checkout.mosewear.com',
] as const
