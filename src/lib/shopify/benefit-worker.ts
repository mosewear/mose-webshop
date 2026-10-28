import { createServiceClient } from '@/lib/supabase/service'
import { ShopifyUnavailable } from './client'
import { fetchPromoSettlement } from './promo-settlement'
import { assertSyncBudget, boundedSyncQuery } from './sync-deadline'
import { safeWorkerError } from './worker'
type Options={signal?:AbortSignal;deadline?:number}
type Job={order_id:string;attempt_id:string;source_updated_at:string;lease_token:string}
/** Guest-safe promo accounting: no customer/loyalty row is required. Provider
 * reads and durable settlement only; never a payment or supplier mutation. */
export async function runBenefitWorker(db:ReturnType<typeof createServiceClient>|undefined=undefined,fetchSettlement=fetchPromoSettlement,options:Options={}){
 if(process.env.SHOPIFY_BENEFIT_SYNC_ENABLED!=='true'||process.env.ATOMIC_PROMO_ENABLED!=='true') throw new Error('BENEFIT_WORKER_DISABLED')
 assertSyncBudget(options.signal,options.deadline)
 db??=createServiceClient()
 const health=await boundedSyncQuery(db.rpc('shopify_benefits_health'),options.signal)
 const cutoff=Date.parse(health.data?.[0]?.cutover_at??'')
 if(health.error||!Number.isFinite(cutoff)||cutoff>Date.now()||!health.data?.[0]?.review_reference) throw new Error('BENEFIT_CUTOVER_NOT_VERIFIED')
 const result={processed:0,failed:0,leaseLost:0}
 const deadline=Math.min(Date.now()+50_000,options.deadline??Infinity)
 for(let count=0;count<5&&Date.now()+16_000<deadline;count++){
  assertSyncBudget(options.signal,deadline)
  const claimed=await boundedSyncQuery(db.rpc('claim_shopify_benefits'),options.signal)
  if(claimed.error) throw new Error('BENEFIT_QUEUE_UNAVAILABLE')
  const job=claimed.data?.[0]as Job|undefined
  if(!job) break
  try{
   const query=db.from('shopify_promo_reservations').select('status,code_hash,discount_cents').eq('attempt_id',job.attempt_id)
   const reservation=await(options.signal?query.abortSignal(options.signal):query).single()
   if(reservation.error||!reservation.data?.code_hash||!['reserved','consumed'].includes(reservation.data.status)) throw new Error('PROMO_BINDING_UNAVAILABLE')
   assertSyncBudget(options.signal,deadline-15_000)
   const settlement=await fetchSettlement({orderId:job.order_id,sourceUpdatedAt:job.source_updated_at,attemptId:job.attempt_id,codeHash:reservation.data.code_hash,discountCents:reservation.data.discount_cents})
   assertSyncBudget(options.signal,deadline)
   const saved=await boundedSyncQuery(db.rpc('complete_shopify_benefits',{p_order:job.order_id,p_lease:job.lease_token,p_version:settlement.sourceUpdatedAt,p_code_hash:settlement.codeHash,p_discount:settlement.discountCents}),options.signal)
   if(saved.error) throw new Error('BENEFIT_SETTLEMENT_WRITE_FAILED')
   if(saved.data!==true) result.leaseLost++;else result.processed++
  }catch(error){
   assertSyncBudget(options.signal,deadline)
   const code=safeWorkerError(error)
   if(error instanceof ShopifyUnavailable&&error.code==='SHOPIFY_ACCESS_DENIED'){
    const closed=await boundedSyncQuery(db.from('shopify_integration_state').update({checkout_enabled:false,last_error:code}).eq('id',1),options.signal)
    if(closed.error) throw new Error('BENEFIT_FAIL_CLOSED_WRITE_FAILED')
   }
   const failed=await boundedSyncQuery(db.rpc('fail_shopify_benefits',{p_order:job.order_id,p_lease:job.lease_token,p_error:code}),options.signal)
   if(failed.error) throw new Error('BENEFIT_QUEUE_FAILURE_WRITE_FAILED')
   if(failed.data!==true) result.leaseLost++;else result.failed++
  }
 }
 if(!result.failed&&!result.leaseLost){const beat=await boundedSyncQuery(db.rpc('heartbeat_shopify_benefits'),options.signal);if(beat.error) throw new Error('BENEFIT_HEARTBEAT_FAILED')}
 return result
}
