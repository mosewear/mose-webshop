// Both Shopify Netherlands delivery profiles apply this standard rate.
export const SHOPIFY_NL_SHIPPING = { standard: 6.95, freeFrom: 55 } as const

// Small-order production and Special Line transit used in the NL Shopping feed.
export const TAPSTITCH_NL_DELIVERY = { handlingMin: 3, handlingMax: 8, transitMin: 9, transitMax: 14 } as const
