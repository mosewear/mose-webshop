import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { isIP } from 'node:net'
import { resolveNativeGiftVariant } from './native-gift-catalog'
import { NATIVE_GIFT_PRODUCT_ID } from './native-gift-input'
const count=z.number().int().nonnegative()
const healthSchema=z.object({
  issuer:z.enum(['mose','shopify_native']),activatedAt:z.string().datetime({offset:true}).nullable(),
  shopifyProductIds:z.array(z.string().regex(/^gid:\/\/shopify\/Product\/[1-9]\d*$/)),reviewReference:z.string().nullable(),expiryPolicy:z.literal('never').nullable(),
  writerGeneration:z.number().int(),nativeCards:count,balances:count,pendingDelivery:count,pendingLegacyGiftOrders:count,
})
export function nativeGiftCutoverReady(raw:unknown,now=Date.now()){
  const parsed=healthSchema.safeParse(raw)
  if(!parsed.success)return false
  const h=parsed.data,at=Date.parse(h.activatedAt??'')
  return h.issuer==='shopify_native'&&h.expiryPolicy==='never'&&h.writerGeneration===1&&h.nativeCards===0&&h.balances===0&&h.pendingDelivery===0&&h.pendingLegacyGiftOrders===0&&
    Number.isFinite(at)&&at<=now&&h.shopifyProductIds.length>0&&new Set(h.shopifyProductIds).size===h.shopifyProductIds.length&&(h.reviewReference?.trim().length??0)>=20
}
/** Actual DB fences/zero-obligation evidence, never a Boolean release flag. */
export async function assertNativeGiftCutover(db:SupabaseClient,now=Date.now()){
  const result=await db.rpc('native_gift_issuer_health')
  if(result.error||!nativeGiftCutoverReady(result.data,now))throw new Error('NATIVE_GIFT_CUTOVER_NOT_READY')
  return healthSchema.parse(result.data)
}

/** Measured digital release evidence. This is read-only: an admin GET must not
 * provision a denomination. The controlled preparation endpoint does that. */
export async function nativeGiftRuntimeReadiness(db:SupabaseClient,buyerIp:string|undefined,now=Date.now()):Promise<import('@/lib/shopify-readiness').ReadinessCheck>{
  const check:import('@/lib/shopify-readiness').ReadinessCheck={key:'nativeGiftRuntime',label:'Native cadeaubon, exclusieve uitgever en actuele bedragvariant gecontroleerd',status:'unknown'}
  try{
    const products=await db.from('products').select('id',{count:'exact'}).eq('is_gift_card',true).eq('is_active',true).eq('status','active')
    if(products.error||products.count===null||products.data?.length!==products.count)return check
    if(products.count===0){check.status='verified';return check}
    if(products.count!==1||products.data![0].id!==NATIVE_GIFT_PRODUCT_ID||process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED!=='true'){check.status='missing';return check}
    if(!buyerIp||!isIP(buyerIp))return check
    const health=await assertNativeGiftCutover(db,now)
    const proof=await resolveNativeGiftVariant(db,{productId:NATIVE_GIFT_PRODUCT_ID,amountCents:2000,buyerIp,allowCreate:false})
    check.status=proof.nativeGiftCard&&health.shopifyProductIds.includes(proof.shopifyProductId)?'verified':'missing'
  }catch{check.status='missing'}
  return check
}
