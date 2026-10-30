// @vitest-environment node
import { describe,it,expect,vi } from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/supabase/service',()=>({createServiceClient:vi.fn()}))
import { productionPresentation,validateProductionObservation } from '@/lib/tapstitch-production'
import { verifiedRunObservations,productionGoal } from '@/lib/tapstitch-cloud'
const id='1565591867570204672',runId='025a0b20-fa68-4a42-843b-cf1ae91ab4b6'
const observation={supplier_order_id:id,shopify_order_name:'#1001',status:'In Production',header_text:`Order #${id} #1001 In Production`,source_url:`https://www.tapstitch.com/order/detail/${id}?tabindex=1`}
const started='2026-10-30T07:00:00Z',finished='2026-10-30T07:00:22Z',now=Date.parse('2026-10-30T07:01:00Z')
const targets=[{id:'gid://shopify/Order/8302363115847',name:'#1001',supplierId:id}]
const run={run_id:runId,status:'COMPLETED',created_at:started,finished_at:finished,num_of_steps:3,profile_id:'prof_mose',result:{orders:[observation],errors:[]}}
describe('supplier evidence identity',()=>{
 it('accepts the independently proven header and removes irrelevant URL query parameters',()=>{
  expect(validateProductionObservation(observation,'#1001',id).source_url).toBe(`https://www.tapstitch.com/order/detail/${id}`)
 })
 it.each([
  {...observation,shopify_order_name:'#1002'},
  {...observation,source_url:`https://attacker.example/order/detail/${id}`},
  {...observation,source_url:`https://www.tapstitch.com/order/detail/${id}0`},
  {...observation,status:'Delivered'},
  {...observation,header_text:`Order #${id} #1001 In Review In Production Quality Check Shipped Delivered`},
  {...observation,status:'Something New'},
 ])('rejects wrong orders, hostile source URLs, unknown stages and static progress legends',value=>{
  expect(()=>validateProductionObservation(value,'#1001',id)).toThrow()
 })
 it('cannot attach another supplier order to an already bound order',()=>{
  expect(()=>validateProductionObservation(observation,'#1001',id+'1')).toThrow('SUPPLIER_ORDER_MISMATCH')
 })
})
describe('cloud completion verification',()=>{
 it('retains source identity and the actual provider completion timestamp',()=>{
  const result=verifiedRunObservations(run,targets,runId,started,'prof_mose',now)
  expect(result.orders[0]).toMatchObject({shopify_order_id:targets[0].id,observed_at:finished,run_id:runId,status:'In Production'})
  expect(result.steps).toBe(3)
 })
 it.each([
  {...run,status:'RUNNING'},
  {...run,run_id:'125a0b20-fa68-4a42-843b-cf1ae91ab4b6'},
  {...run,profile_id:'prof_other'},
  {...run,finished_at:'2026-10-30T08:00:00Z'},
  {...run,finished_at:'2026-10-30T06:59:59Z'},
  {...run,created_at:'2026-10-29T07:00:00Z'},
  {...run,result:{orders:[],errors:[]}},
  {...run,result:{orders:[observation,observation],errors:[]}},
  {...run,result:{orders:[observation],errors:[{shopify_order_name:'#1001',error:'missing'}]}},
 ])('does not publish untrusted, incomplete, duplicate or time-invalid results',value=>{
  expect(()=>verifiedRunObservations(value,targets,runId,started,'prof_mose',now)).toThrow()
 })
 it('can report one failed order without fabricating its stage',()=>{
  const result=verifiedRunObservations({...run,result:{orders:[],errors:[{shopify_order_name:'#1001',error:'login_required'}]}},targets,runId,started,'prof_mose',now)
  expect(result.orders).toEqual([]);expect(result.failed).toBe(1)
 })
 it('keeps the browser scope read only without customer details',()=>{
  const goal=productionGoal('request-id',targets)
  expect(goal).toContain('No payments');expect(goal).toContain('Ignore item progress legends')
  expect(goal).not.toContain('email');expect(goal).not.toContain('address')
 })
})
describe('freshness without shipping inference',()=>{
 it('shows source time and a warning after eight hours without changing the last known status',()=>{
  const row={...validateProductionObservation(observation,'#1001',id),shopify_order_id:targets[0].id,run_id:runId,observed_at:finished}
  expect(productionPresentation(row,now)).toMatchObject({production_status:'In productie',production_stale:false})
  expect(productionPresentation(row,now+9*3600000)).toMatchObject({production_status:'In productie',production_stale:true})
 })
 it('does not invent production when there is no observed source',()=>{
  expect(productionPresentation(undefined).production_status).toBe('Productie niet afzonderlijk gemeld')
 })
 it('keeps completed production final; shipping and delivery continue through their separate carrier source',()=>{
  const row={...validateProductionObservation({...observation,status:'Shipped',header_text:`Order #${id} #1001 Shipped`},'#1001',id),shopify_order_id:targets[0].id,run_id:runId,observed_at:finished}
  expect(productionPresentation(row,now+90*86400000)).toMatchObject({production_status:'Productie afgerond · verzending gemeld',production_stale:false})
 })
})
