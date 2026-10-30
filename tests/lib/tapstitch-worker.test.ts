// @vitest-environment node
import {beforeEach,describe,it,expect,vi} from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/supabase/service',()=>({createServiceClient:vi.fn()}))
import {runTapstitchCloud} from '@/lib/tapstitch-cloud'
const runId='025a0b20-fa68-4a42-843b-cf1ae91ab4b6',supplier='1565591867570204672',orderId='gid://shopify/Order/8302363115847'
const wallet={available_balance:'10',auto_reload:{state:'unconfigured'},rates:{meters:[{label:'TinyFish Agent',unit_amount:'0.016'}]}}
beforeEach(()=>{vi.stubEnv('TAPSTITCH_CLOUD_ENABLED','true');vi.stubEnv('TINYFISH_API_KEY','test-key');vi.stubEnv('TINYFISH_TAPSTITCH_PROFILE_ID','prof_mose')})
function fixture(){
 const state:any={id:1,enabled:true,state:'idle',run_id:null,request_id:null,targets:[],lease_token:null,lease_until:null,next_run_at:new Date(0).toISOString(),started_at:null,last_success_at:null,last_error:null,budget_usd_micros:10000000,spent_usd_micros:0,reserved_usd_micros:0}
 const observations:any[]=[]
 const db:any={rpc:vi.fn(async()=>{
  if(state.lease_token||(!['starting','running'].includes(state.state)&&Date.parse(state.next_run_at)>Date.now())||state.state==='unknown')return{data:[],error:null}
  state.lease_token='lease';state.lease_until=new Date(Date.now()+240000).toISOString();return{data:[structuredClone(state)],error:null}
 }),from:(table:string)=>{
  let patch:any,insert:any,lease:string|undefined
  const q:any={select:()=>q,order:()=>q,limit:()=>q,is:()=>q,gt:()=>q,eq:(key:string,value:string)=>{if(key==='lease_token')lease=value;return q},update:(v:any)=>{patch=v;return q},upsert:(v:any)=>{insert=v;return q},then:(resolve:any)=>{
   if(patch){if(lease!==state.lease_token)return resolve({data:[],error:null});Object.assign(state,patch);return resolve({data:[{id:1}],error:null})}
   if(insert){for(const o of insert)if(!observations.some(x=>x.run_id===o.run_id&&x.shopify_order_id===o.shopify_order_id))observations.push(o);return resolve({data:[],error:null})}
   const data=table==='shopify_order_snapshots'?[{shopify_order_id:orderId,order_name:'#1001',snapshot:{displayFulfillmentStatus:'UNFULFILLED'},cancelled_at:null}]:table==='shopify_order_lines'?[{order_id:orderId}]:table==='tapstitch_order_links'?[{shopify_order_id:orderId,supplier_order_id:supplier}]:[]
   return resolve({data,error:null})
  }};return q
 }}
 const completed=()=>({run_id:runId,status:'COMPLETED',created_at:state.started_at,finished_at:new Date().toISOString(),num_of_steps:3,profile_id:'prof_mose',result:{orders:[{supplier_order_id:supplier,shopify_order_name:'#1001',status:'In Production',header_text:`Order #${supplier} #1001 In Production`,source_url:`https://www.tapstitch.com/order/detail/${supplier}`}],errors:[]}})
 return{db,state,observations,completed}
}
describe('durable cloud collector',()=>{
 it('recovers an accepted start after response loss, without a second billed browser job',async()=>{
  const f=fixture();let posts=0
  const request=vi.fn(async(path:string,init?:RequestInit):Promise<any>=>{
   if(path==='/v1/wallet')return wallet
   if(init?.method==='POST'){posts++;throw Error('connection lost after acceptance')}
   if(path.startsWith('/v1/runs?'))return{data:[{...f.completed(),goal:`MOSE_PRODUCTION_${f.state.request_id}. read only`}],pagination:{has_more:false}}
   return f.completed()
  })
  await expect(runTapstitchCloud(f.db,request)).rejects.toThrow('CLOUD_CHECK_FAILED')
  expect(f.state.state).toBe('starting');expect(f.state.reserved_usd_micros).toBe(2400000)
  await expect(runTapstitchCloud(f.db,request)).resolves.toEqual({recovered:true})
  expect(f.state.state).toBe('running')
  await expect(runTapstitchCloud(f.db,request)).resolves.toEqual({checked:1,failed:0})
  expect(f.observations).toHaveLength(1);expect(posts).toBe(1)
  expect(f.state.spent_usd_micros).toBe(48000);expect(f.state.reserved_usd_micros).toBe(0)
  await expect(runTapstitchCloud(f.db,request)).resolves.toEqual({busyOrNotDue:true})
  expect(posts).toBe(1)
 })
 it('does not start a browser job when the maximum possible charge cannot be reserved',async()=>{
  const f=fixture();f.state.spent_usd_micros=9000000;const request=vi.fn()
  expect(await runTapstitchCloud(f.db,request)).toEqual({budgetExhausted:true})
  expect(request).not.toHaveBeenCalled();expect(f.state.last_error).toBe('CLOUD_BUDGET_EXHAUSTED')
 })
 it.each([
  {...wallet,available_balance:'0.1'},
  {...wallet,auto_reload:{state:'enabled'}},
  {...wallet,rates:{meters:[{label:'TinyFish Agent',unit_amount:'0.1'}]}},
 ])('stops before paid work on low credits, auto reload changes or a changed contract rate',async(value)=>{
  const f=fixture();const request=vi.fn(async()=>value)
  await expect(runTapstitchCloud(f.db,request)).rejects.toThrow()
  expect(request).toHaveBeenCalledOnce();expect(f.state.reserved_usd_micros).toBe(0)
 })
 it('preserves the last data on an unrelated provider run response',async()=>{
  const f=fixture();f.state.state='running';f.state.run_id=runId;f.state.started_at=new Date().toISOString();f.state.targets=[{id:orderId,name:'#1001',supplierId:supplier}];f.state.reserved_usd_micros=2400000
  const request=vi.fn(async()=>({...f.completed(),run_id:'125a0b20-fa68-4a42-843b-cf1ae91ab4b6'}))
  await expect(runTapstitchCloud(f.db,request)).rejects.toThrow('CLOUD_RUN_MISMATCH')
  expect(f.observations).toEqual([]);expect(f.state.reserved_usd_micros).toBe(2400000)
 })
 it('does not silently enable a new paid integration',async()=>{
  vi.stubEnv('TAPSTITCH_CLOUD_ENABLED','false');const f=fixture();const request=vi.fn()
  expect(await runTapstitchCloud(f.db,request)).toEqual({disabled:true});expect(f.db.rpc).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled()
 })
})
