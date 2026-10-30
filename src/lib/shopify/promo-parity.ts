import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReadinessCheck } from '@/lib/shopify-readiness'
import { LOYALTY_CONFIG } from '@/lib/loyalty'

export const PROMO_PARITY_API_VERSION = '2026-10'
export const PROMO_PARITY_CONTRACT = 'native-order-percentage-floor-physical-v2'
type Row = Record<string, unknown>
export type PromoParitySnapshot = { complete: boolean; promotions: Row[]; products: Row[]; variants: Row[]; mappings: Row[]; tiers: Row[]; settings?: unknown }
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])) : value
const semanticPromo = (p: Row) => Object.fromEntries(Object.entries(p).filter(([key])=>!['usage_count','updated_at','created_at','created_by','description','subscriber_id'].includes(key)))
export function promoParityFingerprint(s: PromoParitySnapshot) {
  return createHash('sha256').update(JSON.stringify(stable({contract:PROMO_PARITY_CONTRACT,apiVersion:PROMO_PARITY_API_VERSION,promotions:s.promotions.map(semanticPromo),products:s.products,variants:s.variants,mappings:s.mappings,tiers:s.tiers,settings:s.settings??LOYALTY_CONFIG}))).digest('hex')
}
const promoFields = new Set(['id','code','description','discount_type','discount_value','min_order_value','usage_limit','usage_count','expires_at','is_active','created_at','updated_at','created_by','subscriber_id','applies_to_sale_items'])
export function promoParityRequirements(s: PromoParitySnapshot): string[] | null {
  if(!s.complete||s.tiers.length)return null
  // This evidence covers the physical-only checkout contract. Gift lines are
  // rejected by quoteCheckoutBenefits; digital sale/balances have independent
  // release gates. Keep gift rows in the fingerprint so a changed catalogue
  // still invalidates evidence without conflating separate obligations.
  const sale=s.products.filter(p=>p.is_gift_card!==true).some(p=>p.sale_price!=null&&Number(p.sale_price)>0&&Number(p.sale_price)<Number(p.base_price))
  for(const p of s.promotions){
    if(Object.keys(p).some(k=>!promoFields.has(k))||p.discount_type!=='percentage'||p.is_active!==true||
      !Number.isFinite(Number(p.discount_value))||Number(p.discount_value)<=0||Number(p.discount_value)>100||
      Number(p.min_order_value??0)!==0||!(p.usage_limit===null||p.usage_limit===1)||
      !Number.isSafeInteger(p.usage_count)||Number(p.usage_count)<0||typeof p.applies_to_sale_items!=='boolean'||
      (p.expires_at!==null&&(typeof p.expires_at!=='string'||!Number.isFinite(Date.parse(p.expires_at))))||
      (sale&&p.applies_to_sale_items===false))return null
  }
  return [...new Set(s.promotions.map(p=>`percentage:${Number(p.discount_value)}`)), 'rounding-multi-line','tier-silver','tier-gold','points-100'].sort()
}
export function evaluatePromoParity(s: PromoParitySnapshot,evidence: Row|null,now=Date.now()):ReadinessCheck['status']{
  if(!s.complete)return 'unknown'
  if(!s.promotions.length)return 'verified'
  const requirements=promoParityRequirements(s)
  if(!requirements)return 'missing'
  if(!evidence)return 'unknown'
  if(evidence.api_version!==PROMO_PARITY_API_VERSION||evidence.contract_version!==PROMO_PARITY_CONTRACT||evidence.config_fingerprint!==promoParityFingerprint(s))return 'missing'
  const verified=Date.parse(String(evidence.verified_at)),expiry=Date.parse(String(evidence.expires_at))
  if(!Number.isFinite(verified)||!Number.isFinite(expiry)||verified>now||expiry<=now||expiry-verified>86400000||expiry<=verified)return 'missing'
  if(!Array.isArray(evidence.probe_results))return 'unknown'
  const probes=evidence.probe_results as Row[]
  for(const key of requirements){
    const cases=probes.filter(p=>p.case_id===key)
    if(cases.length!==1)return 'missing'
    const p=cases[0],observed=Date.parse(String(p.observed_at))
    if(!Number.isSafeInteger(p.expected_cents)||Number(p.expected_cents)<0||p.expected_cents!==p.actual_cents||
      typeof p.cart_hash!=='string'||!/^[a-f0-9]{64}$/.test(p.cart_hash)||!Number.isFinite(observed)||observed>verified||verified-observed>3600000)return 'missing'
  }
  return 'verified'
}
/** Service-side rows only; missing schema or truncated data never grants readiness. */
export async function readPromoParitySnapshot(db:SupabaseClient,now=Date.now()):Promise<{snapshot:PromoParitySnapshot;evidence:Row|null}|null>{
  try{
    const signal=AbortSignal.timeout(10000)
    const [promos,products,tiers]=await Promise.all([
      db.from('promo_codes').select('*',{count:'exact'}).eq('is_active',true).or(`expires_at.is.null,expires_at.gt.${new Date(now).toISOString()}`).limit(1000).abortSignal(signal),
      db.from('products').select('id,is_gift_card,base_price,sale_price',{count:'exact'}).eq('is_active',true).eq('status','active').limit(1000).abortSignal(signal),
      db.from('product_quantity_discounts').select('*',{count:'exact'}).eq('is_active',true).limit(1000).abortSignal(signal),
    ])
    const complete=(r:{error:unknown;count:number|null;data:unknown[]|null})=>!r.error&&r.count!==null&&r.data?.length===r.count
    if(!complete(promos)||!complete(products)||!complete(tiers))return null
    const ids=products.data!.map(p=>p.id)
    const [variants,mappings,evidence]=await Promise.all([
      db.from('product_variants').select('id,product_id,is_available,price_adjustment,presale_enabled,presale_stock_quantity',{count:'exact'}).in('product_id',ids).eq('is_available',true).limit(1000).abortSignal(signal),
      db.from('shopify_variant_mappings').select('mose_variant_id,mose_product_id,shopify_variant_id,shopify_product_id,price_eur_cents',{count:'exact'}).in('mose_product_id',ids).limit(1000).abortSignal(signal),
      db.from('shopify_promo_parity_evidence').select('*').eq('contract_version',PROMO_PARITY_CONTRACT).abortSignal(signal).maybeSingle(),
    ])
    if(!complete(variants)||!complete(mappings))return null
    const snapshot:PromoParitySnapshot={complete:true,promotions:promos.data!.filter(p=>p.usage_limit===null||p.usage_count<p.usage_limit),products:products.data!,variants:variants.data!,mappings:mappings.data!,tiers:tiers.data!.filter(t=>ids.includes(t.product_id))}
    return {snapshot,evidence:evidence.error?null:evidence.data}
  }catch{return null}
}

export async function readPromoParity(db:SupabaseClient,now=Date.now()):Promise<ReadinessCheck['status']>{
  const result=await readPromoParitySnapshot(db,now)
  return result?evaluatePromoParity(result.snapshot,result.evidence,now):'unknown'
}
