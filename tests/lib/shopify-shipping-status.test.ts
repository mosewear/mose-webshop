import {describe,it,expect} from 'vitest'
import {shipmentLabel} from '@/lib/shopify/shipping-status'
describe('carrier evidence labels',()=>{
 it('never calls a purchased label shipped or delivered',()=>{
  expect(shipmentLabel('LABEL_PURCHASED')).toBe('Verzendlabel aangemaakt')
  expect(shipmentLabel('LABEL_PRINTED')).toBe('Verzendlabel aangemaakt')
 })
 it('keeps carrier progress and delivery distinct',()=>{
  expect(shipmentLabel('IN_TRANSIT')).toBe('Onderweg')
  expect(shipmentLabel('DELIVERED')).toBe('Afgeleverd')
  expect(shipmentLabel('FAILURE')).toBe('Verzendprobleem')
 })
 it('does not invent a status from an API success or unknown future value',()=>{
  for(const value of [undefined,null,'SUCCESS','FUTURE_STATUS']) expect(shipmentLabel(value)).toBe('Verzendstatus nog niet bevestigd')
 })
})
