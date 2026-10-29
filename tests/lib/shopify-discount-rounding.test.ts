import { expect, it } from 'vitest'
import { shopifyPercentageDiscountCents } from '@/lib/shopify/discount-rounding'
it.each([
  [19700,7.5,1477], [13800,7.5,1035], [15800,7.5,1185], [11800,7.5,885],
  [7900,7.5,592], [5900,7.5,442], [21700,7.5,1627],
  [7900,7.3,576], [7900,8.1,639], [7900,7.7,608],
  [7848,10,784], [100,29,29], [100000000,0.000001,1], [100000000,1e-7,0], [0,10,0], [7900,100,7900],
])('quotes %i cents at %s percent as %i native cents', (subtotal, rate, expected) => {
  expect(shopifyPercentageDiscountCents(subtotal,rate)).toBe(expected)
})
it.each([[NaN,10],[-1,10],[1.5,10],[100000001,10],[100,Infinity],[100,-1],[100,101]])('rejects invalid financial inputs', (subtotal,rate)=>{
  expect(()=>shopifyPercentageDiscountCents(subtotal,rate)).toThrow('BENEFITS_INVALID_PERCENTAGE')
})
