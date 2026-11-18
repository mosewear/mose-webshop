import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCapiEvent, type CapiEventInput } from './capi'
import { catalogContentId } from '@/lib/catalog-ids'
const money = z.object({ amount: z.string().regex(/^\d+(\.\d+)?$/), currencyCode: z.string().regex(/^[A-Z]{3}$/) })
const schema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/), fullyPaid: z.literal(true), test: z.boolean(), cancelledAt: z.null(),
  displayFinancialStatus: z.literal('PAID'), email: z.string().nullable(),
  totalPriceSet: z.object({ presentmentMoney: money }),
  customAttributes: z.array(z.object({key:z.string(),value:z.string()})),
  lineItems: z.object({nodes:z.array(z.object({quantity:z.number().int().positive(), variant:z.object({id:z.string()}).nullable(),
    customAttributes:z.array(z.object({key:z.string(),value:z.string()})).optional(),
    discountedTotalSet:z.object({presentmentMoney:money}),
  })),pageInfo:z.object({hasNextPage:z.literal(false)})}),
})
export function shopifyPurchasePayload(snapshot: unknown, attribution: { fbc?: string | null; fbp?: string | null; client_ip_address?: string | null; client_user_agent?: string | null; source_url: string; test_event_code?: string | null }, eventTime: number): CapiEventInput {
  const parsed = schema.safeParse(snapshot)
  if (!parsed.success) throw new Error('ORDER_PAYMENT_UNVERIFIED')
  const order = parsed.data
  if (order.test && !attribution.test_event_code) throw new Error('TEST_ORDER_EXCLUDED')
  const total = Number(order.totalPriceSet.presentmentMoney.amount)
  const currency = order.totalPriceSet.presentmentMoney.currencyCode
  if (!Number.isFinite(total) || total < 0 || order.lineItems.nodes.some(l=>l.discountedTotalSet.presentmentMoney.currencyCode!==currency)) throw new Error('ORDER_CURRENCY_UNVERIFIED')
  // Local mappings are resolved by the worker; never use order-line IDs as catalog IDs.
  const contents = order.lineItems.nodes.flatMap(line => {
    const attributes = line.customAttributes ?? []
    const id = attributes.find(a=>a.key==='mose_content_id')?.value
    return id ? [{ id, quantity:line.quantity,item_price:Number(line.discountedTotalSet.presentmentMoney.amount)/line.quantity }] : []
  })
  return {
    event_name:'Purchase', event_id:'shopify:' + order.id.split('/').pop(), event_time:eventTime,
    event_source_url:attribution.source_url,
    user_data:{email:order.email ?? undefined, external_id:order.email ?? undefined, fbc:attribution.fbc ?? undefined, fbp:attribution.fbp ?? undefined,
      client_ip_address:attribution.client_ip_address ?? undefined, client_user_agent:attribution.client_user_agent ?? undefined},
    custom_data:{currency,value:total,order_id:order.id,transaction_id:order.id,num_items:order.lineItems.nodes.reduce((n,l)=>n+l.quantity,0),
      ...(contents.length===order.lineItems.nodes.length?{content_ids:contents.map(l=>l.id),contents,content_type:'product'}:{})},
    test_event_code:attribution.test_event_code ?? undefined,
  }
}

export async function runMetaPurchaseWorker(db=createServiceClient(), send=sendCapiEvent, deadline=Date.now()+55_000) {
  const result={sent:0,skipped:0,failed:0}
  for(let count=0;count<5 && Date.now()+12_000<deadline;count++) {
    const claim=await db.rpc('claim_meta_purchase')
    if(claim.error) throw new Error('META_QUEUE_UNAVAILABLE')
    const job=claim.data?.[0]
    if(!job) break
    try {
      const saved=await db.from('shopify_order_snapshots').select('snapshot').eq('shopify_order_id',job.order_id).single()
      if(saved.error) throw new Error('ORDER_READ_FAILED')
      const snapshot=saved.data.snapshot
      const attempt=snapshot.customAttributes?.filter((a:{key:string})=>a.key==='mose_attempt')
      if(attempt?.length!==1) throw new Error('NO_CONSENT')
      const attribution=await db.from('meta_checkout_attribution').select('*').eq('attempt_id',attempt[0].value).maybeSingle()
      if(attribution.error) throw new Error('ATTRIBUTION_READ_FAILED')
      if(!attribution.data) throw new Error('NO_CONSENT')
      // Resolve authoritative Shopify variants to the same IDs the storefront feed uses.
      const variants=snapshot.lineItems.nodes.map((l:{variant?:{id:string}})=>l.variant?.id).filter(Boolean)
      const mapped=variants.length?await db.from('shopify_variant_mappings').select('shopify_variant_id,mose_variant_id').in('shopify_variant_id',variants):{data:[],error:null}
      if(mapped.error) throw new Error('MAPPING_READ_FAILED')
      const ids=(mapped.data??[]).map(m=>m.mose_variant_id)
      const local=ids.length?await db.from('product_variants').select('id,product_id,color').in('id',ids):{data:[],error:null}
      if(local.error) throw new Error('CATALOG_READ_FAILED')
      for(const line of snapshot.lineItems.nodes) {
        const matches=mapped.data?.filter(m=>m.shopify_variant_id===line.variant?.id) ?? []
        const variant=matches.length===1 ? local.data?.find(v=>v.id===matches[0].mose_variant_id) : undefined
        line.customAttributes=variant?[{key:'mose_content_id',value:catalogContentId(variant.product_id,variant.color)}]:[]
      }
      const payload=shopifyPurchasePayload(snapshot,attribution.data,Math.floor(Date.parse(job.event_time)/1000))
      const delivery=await send(payload)
      if(!delivery.ok || delivery.events_received!==1) throw new Error('META_DELIVERY_REJECTED')
      const done=await db.rpc('finish_meta_purchase',{p_order:job.order_id,p_lease:job.lease_token,p_status:'sent',p_trace:delivery.fbtrace_id})
      if(done.error || done.data!==true) throw new Error('META_ACK_FAILED')
      result.sent++
    } catch(error) {
      const code=error instanceof Error?error.message:'META_WORKER_FAILED'
      const skip=['NO_CONSENT','TEST_ORDER_EXCLUDED'].includes(code)
      const saved=await db.rpc('finish_meta_purchase',{p_order:job.order_id,p_lease:job.lease_token,p_status:skip?'skipped':'pending',p_error:/^[A-Z_]+$/.test(code)?code:'META_WORKER_FAILED'})
      if(saved.error || saved.data!==true) throw new Error('META_RETRY_SAVE_FAILED')
      if(skip) result.skipped++; else result.failed++
    }
  }
  return result
}
