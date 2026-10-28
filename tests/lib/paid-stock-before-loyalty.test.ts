// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
const mocks=vi.hoisted(()=>({stock:vi.fn(),loyalty:vi.fn()}))
vi.mock('@/lib/order-stock',()=>({applyInventoryDecrementForPaidOrder:mocks.stock}))
vi.mock('@/lib/atomic-legacy-loyalty',()=>({atomicLoyaltyEnabled:()=>true,atomicLegacyLoyalty:mocks.loyalty}))
vi.mock('@/lib/email',()=>({sendOrderConfirmationEmail:vi.fn()}))
vi.mock('@/lib/push-notifications',()=>({sendOrderNotificationToAdmins:vi.fn()}))
vi.mock('@/lib/gift-card-processing',()=>({processGiftCardsForPaidOrder:vi.fn()}))
vi.mock('@/lib/meta/capi',()=>({sendServerPurchaseEvent:vi.fn()}))
import { fulfillPaidOrder } from '@/lib/fulfill-paid-order'
const order={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'synthetic@example.test',payment_status:'paid',total:75,last_email_sent_at:'2026-10-28T10:00:00Z'}
function db(paid=true){
 const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{...order,payment_status:paid?'paid':'pending'},error:null}),update:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:order,error:null})}
 return {from:vi.fn(()=>query)} as unknown as SupabaseClient
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('LEGACY_INVENTORY_ATOMIC_ENABLED','true');mocks.stock.mockResolvedValue({ok:true});mocks.loyalty.mockRejectedValue(new Error('retry ledger'))})
afterEach(()=>vi.unstubAllEnvs())
describe('paid physical obligations precede independent loyalty retries',()=>{
 it('records stock before a late already-paid loyalty rescue can fail',async()=>{
  expect(await fulfillPaidOrder({supabase:db(),orderId:order.id})).toMatchObject({ok:false,reason:'LOYALTY_RETRY_REQUIRED'})
  expect(mocks.stock.mock.invocationCallOrder[0]).toBeLessThan(mocks.loyalty.mock.invocationCallOrder[0])
 })
 it('keeps an unknown stock outcome retryable before starting any loyalty posting',async()=>{
  mocks.stock.mockResolvedValue({ok:false,reason:'unknown'})
  expect(await fulfillPaidOrder({supabase:db(),orderId:order.id})).toMatchObject({ok:false,reason:'INVENTORY_RETRY_REQUIRED'})
  expect(mocks.loyalty).not.toHaveBeenCalled()
 })
 it('queues a newly captured paid obligation before notification or loyalty processing',async()=>{
  mocks.stock.mockResolvedValue({ok:false,reason:'unknown'})
  expect(await fulfillPaidOrder({supabase:db(false),orderId:order.id})).toMatchObject({ok:false,reason:'INVENTORY_RETRY_REQUIRED'})
  expect(mocks.loyalty).not.toHaveBeenCalled()
 })
})
