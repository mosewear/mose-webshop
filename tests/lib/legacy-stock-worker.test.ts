// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
import { runLegacyStockWorker } from '@/lib/shopify/legacy-stock-worker'
import { applyInventoryDecrementForPaidOrder } from '@/lib/order-stock'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminExecutor } from '@/lib/shopify/orders'
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const event = { id, order_id: id, variant_id: id, generation: id, inventory_item_id: 'gid://shopify/InventoryItem/1',
  location_id: 'gid://shopify/Location/2', delta: -2, lease_token: id }
function fixture(item: typeof event & { expected_quantity?: number; target_quantity?: number } = event) {
  const rpc = vi.fn().mockResolvedValue({data:null,error:null}).mockResolvedValueOnce({data:[item],error:null}).mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:[],error:null})
  const maybeSingle=vi.fn().mockResolvedValue({data:[{generation:id,inventory_item_id:event.inventory_item_id,location_id:event.location_id}],error:null})
  const eq=vi.fn(()=>({limit:maybeSingle})),select=vi.fn(()=>({eq})),from=vi.fn(()=>({select}))
  return {db:{rpc,from} as unknown as SupabaseClient,rpc,maybeSingle}
}
afterEach(()=>vi.unstubAllEnvs())
describe('legacy paid stock and Shopify bridge',()=>{
 it('uses exactly one atomic RPC without falling back after an uncertain error',async()=>{
  vi.stubEnv('LEGACY_INVENTORY_ATOMIC_ENABLED','true')
  const rpc=vi.fn().mockResolvedValue({error:{message:'connection interrupted'},data:null}),from=vi.fn()
  expect(await applyInventoryDecrementForPaidOrder({rpc,from} as unknown as SupabaseClient,id)).toMatchObject({ok:false,reason:'ATOMIC_INVENTORY_RETRY_REQUIRED'})
  expect(from).not.toHaveBeenCalled();expect(rpc).toHaveBeenCalledWith('apply_legacy_paid_stock',{p_order:id})
 })
 it('replays the exact durable idempotency key and negative delta, never an absolute stock quantity',async()=>{
  const {db,rpc}=fixture(),execute=vi.fn().mockResolvedValue({inventoryAdjustQuantities:{inventoryAdjustmentGroup:{referenceDocumentUri:`mose://legacy-stock/${id}`},userErrors:[]}})
  expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toEqual({processed:1,failed:0,leaseLost:0})
  expect(execute).toHaveBeenCalledWith(expect.stringContaining('@idempotent(key: $key)'),{key:id,input:{name:'available',reason:'correction',referenceDocumentUri:`mose://legacy-stock/${id}`,changes:[{inventoryItemId:event.inventory_item_id,locationId:event.location_id,delta:-2,changeFromQuantity:null}]}})
  expect(rpc).toHaveBeenCalledWith('finish_legacy_stock_delta',{p_id:id,p_lease:id,p_error:null})
 })
 it('uses compare-and-swap for an absolute admin stock count', async () => {
  const {db}=fixture({...event,expected_quantity:5,target_quantity:3})
  const execute=vi.fn().mockResolvedValue({inventorySetQuantities:{inventoryAdjustmentGroup:{referenceDocumentUri:`mose://legacy-stock/${id}`},userErrors:[]}})
  expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toMatchObject({processed:1,failed:0})
  expect(execute).toHaveBeenCalledWith(expect.stringContaining('inventorySetQuantities'),{key:id,input:{name:'available',reason:'correction',referenceDocumentUri:`mose://legacy-stock/${id}`,quantities:[{inventoryItemId:event.inventory_item_id,locationId:event.location_id,quantity:3,changeFromQuantity:5}]}})
 })
 it('keeps a stale compare-and-swap visible for reconciliation instead of changing its expected quantity', async () => {
  const {db,rpc}=fixture({...event,expected_quantity:5,target_quantity:3})
  const execute=vi.fn().mockResolvedValue({inventorySetQuantities:{inventoryAdjustmentGroup:null,userErrors:[{code:'CHANGE_FROM_QUANTITY_STALE'}]}})
  expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toMatchObject({processed:0,failed:1})
  expect(rpc).toHaveBeenCalledWith('finish_legacy_stock_delta',{p_id:id,p_lease:id,p_error:'STOCK_COMPARE_FAILED_REVIEW_REQUIRED'})
  expect(rpc).not.toHaveBeenCalledWith('mark_legacy_stock_worker')
 })
 it('does not mutate a changed ownership route',async()=>{
  const {db,maybeSingle}=fixture();maybeSingle.mockResolvedValue({data:[{generation:'new'}],error:null})
  const execute=vi.fn();expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toEqual({processed:0,failed:1,leaseLost:0});expect(execute).not.toHaveBeenCalled()
 })
 it('keeps timeouts and unconfirmed provider responses pending for the same-key retry',async()=>{
  for(const response of [new Error('timeout'),{inventoryAdjustQuantities:{inventoryAdjustmentGroup:null,userErrors:[]}}, {inventoryAdjustQuantities:{inventoryAdjustmentGroup:null,userErrors:[{code:'ACCESS_DENIED'}]}}]){
   const {db,rpc}=fixture(),execute= response instanceof Error?vi.fn().mockRejectedValue(response):vi.fn().mockResolvedValue(response)
   expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toMatchObject({failed:1,processed:0})
   expect(rpc).toHaveBeenCalledWith('finish_legacy_stock_delta',{p_id:id,p_lease:id,p_error:'STOCK_DELTA_RETRY_REQUIRED'})
  }
 })
 it('does not call a lost acknowledgement a completed adjustment',async()=>{
  const {db,rpc}=fixture();rpc.mockReset().mockResolvedValueOnce({data:[event],error:null}).mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:[],error:null})
  const execute=vi.fn().mockResolvedValue({inventoryAdjustQuantities:{inventoryAdjustmentGroup:{referenceDocumentUri:`mose://legacy-stock/${id}`},userErrors:[]}})
  expect(await runLegacyStockWorker(db,execute as AdminExecutor)).toMatchObject({processed:0,leaseLost:1})
 })
})
