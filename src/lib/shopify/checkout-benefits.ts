import { createHash, createHmac, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { admin } from './client'
import { quoteCheckoutBenefits } from './benefit-quote'
import { bindAuthenticatedShopifyCustomer } from './customer-binding'
import { reserveAndIssuePromo } from './promo-issuer'
import { CREATE_LOYALTY_DISCOUNT, reserveAndIssueLoyaltyDiscount } from './benefit-issuer'
import type { BenefitLine } from './benefits'
import type { QuantityDiscountTier } from '@/lib/quantity-discount'

type ServerLine=BenefitLine&{productId:string}
type AuthUser={id:string;email?:string;email_confirmed_at?:string|null}
type Expected={code:string;discountCents:number;eligibleVariants:string[]}

/** Fetch before reserving the checkout and include quote/input in fingerprint.
 * Only current DB prices, quantities, publication and mappings may form lines. */
export async function readCheckoutBenefitQuote(db:SupabaseClient,input:{lines:ServerLine[];promoCode?:string;user?:AuthUser|null;points?:number}){
 const ids=[...new Set(input.lines.map(l=>l.productId))]
 const tiers=await db.from('product_quantity_discounts').select('product_id,min_quantity,discount_type,discount_value,is_active').in('product_id',ids).eq('is_active',true)
 if(tiers.error) throw new Error('BENEFIT_TIERS_UNAVAILABLE')
 let promo:Record<string,unknown>|undefined
 if(input.promoCode){
  const code=z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).parse(input.promoCode).toUpperCase()
  const read=await db.from('promo_codes').select('*').eq('code',code).single()
  if(read.error||!read.data) throw new Error('PROMO_NOT_FOUND')
  promo=read.data
  if (['max_discount','max_discount_amount','maximum_discount_amount'].some(key=>promo![key]!=null&&Number(promo![key])>0)) throw new Error('PROMO_ABSOLUTE_CAP_PARITY_REQUIRED')
 }
 let loyalty:{tier:'bronze'|'silver'|'gold'|null;lifetimePoints:number}|undefined
 if(input.user?.email){
  if(!input.user.email_confirmed_at) throw new Error('CUSTOMER_IDENTITY_UNVERIFIED')
  const read=await db.from('loyalty_points').select('user_id,tier,lifetime_points').eq('email',input.user.email).maybeSingle()
  if(read.error) throw new Error('BENEFIT_LOYALTY_UNAVAILABLE')
  if(read.data){
   if(read.data.user_id&&read.data.user_id!==input.user.id) throw new Error('LOYALTY_OWNER_MISMATCH')
   loyalty={tier:z.enum(['bronze','silver','gold']).nullable().parse(read.data.tier),lifetimePoints:z.number().int().nonnegative().parse(read.data.lifetime_points)}
  }
 }
 if((input.points??0)>0&&!input.user) throw new Error('LOYALTY_AUTH_REQUIRED')
 const p=promo
 const quote=quoteCheckoutBenefits({lines:input.lines,tiers:tiers.data as QuantityDiscountTier[],loyalty,points:input.points,
  ...(p?{promo:{id:p.id,active:p.is_active,expiresAt:p.expires_at,type:p.discount_type,value:Number(p.discount_value),minOrderCents:Math.round(Number(p.min_order_value??0)*100),includeSale:p.applies_to_sale_items,usageLimit:p.usage_limit,usageCount:p.usage_count}}:{})})
 let orderWidePromo=!!p
 if(p&&!p.applies_to_sale_items){
  const products=await db.from('products').select('id,base_price,sale_price,is_gift_card',{count:'exact'}).eq('is_active',true)
  if(products.error||!Array.isArray(products.data)) throw new Error('BENEFIT_SALE_CATALOG_UNAVAILABLE')
  if(products.count==null||products.data.length!==products.count) throw new Error('BENEFIT_SALE_CATALOG_TRUNCATED')
  orderWidePromo=!products.data.some(product=>!product.is_gift_card&&product.sale_price!=null&&Number(product.sale_price)>0&&Number(product.sale_price)<Number(product.base_price))
 }
 // Native order percentage combinations preserve source arithmetic only when
 // promo has no excluded lines. Do not silently undergrant a sale basket.
 if(quote.promo&&quote.tierCents>0&&(!orderWidePromo||quote.promo.eligibleVariants.length!==input.lines.length)) throw new Error('MIXED_SALE_TIER_PARITY_REQUIRED')
 const componentCount=quote.staffel.length+Number(quote.tierCents>0)+Number(!!quote.promo)+Number(quote.redemptionCents>0)
 if(componentCount>5) throw new Error('BENEFIT_CODE_LIMIT')
 const expectedSubtotalBeforeOrderCents=quote.subtotalCents-quote.staffelCents-(orderWidePromo?0:(quote.promo?.discountCents??0))
 return {quote,promo,orderWidePromo,expectedSubtotalBeforeOrderCents,lines:input.lines,user:input.user??null,points:input.points??0}
}

async function issueAutomatic(db:SupabaseClient,input:{attemptId:string;checkoutLease:string;secret:string;component:string;basic:Record<string,unknown>;discountCents:number;eligibleVariants:string[]}){
 if(process.env.SHOPIFY_BENEFIT_WRITES_ENABLED!=='true') throw new Error('BENEFIT_WRITES_DISABLED')
 const code=`MOSE-A-${createHmac('sha256',input.secret).update(`automatic:v1:${input.attemptId}:${input.component}`).digest('hex').toUpperCase()}`
 const codeHash=createHash('sha256').update(code).digest('hex')
 const planHash=createHash('sha256').update(JSON.stringify(input.basic)).digest('hex')
 const lease=randomUUID()
 const claim=await db.rpc('claim_shopify_automatic_benefit',{p_attempt:input.attemptId,p_checkout_lease:input.checkoutLease,p_component:input.component,p_lease:lease,p_code_hash:codeHash,p_plan_hash:planHash})
 if(claim.error||claim.data!==true) throw new Error('AUTOMATIC_BENEFIT_ISSUANCE_PENDING')
 const now=Date.now()
 const response=await admin<unknown>(CREATE_LOYALTY_DISCOUNT,{input:{...input.basic,title:'MOSE voordeel',code,startsAt:new Date(now-60_000).toISOString(),endsAt:new Date(now+24*60*60_000).toISOString(),usageLimit:1,combinesWith:{orderDiscounts:true,productDiscounts:true,shippingDiscounts:false}}})
 const payload=z.object({discountCodeBasicCreate:z.object({codeDiscountNode:z.object({id:z.string().regex(/^gid:\/\/shopify\/DiscountCodeNode\/[1-9][0-9]*$/)}).nullable(),userErrors:z.array(z.unknown())})}).parse(response).discountCodeBasicCreate
 if(payload.userErrors.length||!payload.codeDiscountNode) throw new Error('AUTOMATIC_BENEFIT_ISSUANCE_UNCONFIRMED')
 const saved=await db.rpc('bind_shopify_automatic_benefit',{p_attempt:input.attemptId,p_component:input.component,p_lease:lease,p_provider:payload.codeDiscountNode.id})
 if(saved.error||saved.data!==true) throw new Error('AUTOMATIC_BENEFIT_BINDING_UNCONFIRMED')
 return {code,discountCents:input.discountCents,eligibleVariants:input.eligibleVariants}
}

/** Invoke ONLY after durable checkout creation and authenticated owner insertion.
 * All unknown outcomes retain holds; never fall back to a second cart or code.
 * Supply returned codes to CartInput and verify via assertCartBenefits before URL.
 */
export async function issueCheckoutBenefits(db:SupabaseClient,input:Awaited<ReturnType<typeof readCheckoutBenefitQuote>>&{attemptId:string;checkoutLease:string;secret:string}){
 if(input.secret.length<32) throw new Error('BENEFITS_SECRET_REQUIRED')
 const{quote,lines,user}=input
 if(quote.discountCents===0) return [] as Expected[]
 if(process.env.SHOPIFY_BENEFIT_WRITES_ENABLED!=='true') throw new Error('BENEFIT_WRITES_DISABLED')
 let customerId:string|undefined
 if(quote.tierCents>0||quote.redemptionCents>0){
  if(!user) throw new Error('LOYALTY_AUTH_REQUIRED')
  customerId=(await bindAuthenticatedShopifyCustomer(db,user,input.secret)).customerId
 }
 const expected:Expected[]=[]
 const variants=lines.map(l=>l.variantId)
 if(input.promo) expected.push(await reserveAndIssuePromo(db,{attemptId:input.attemptId,checkoutLease:input.checkoutLease,issuanceLease:randomUUID(),secret:input.secret,promo:input.promo,lines,staffelCents:quote.staffelCents,customerId,orderWide:input.orderWidePromo}))
 for(const staffel of quote.staffel){
  const component=`staffel:${createHash('sha256').update(staffel.variantId).digest('hex').slice(0,16)}`
  expected.push(await issueAutomatic(db,{...input,component,discountCents:staffel.totalCents,eligibleVariants:[staffel.variantId],basic:{context:{all:'ALL'},
   customerGets:{items:{products:{productVariantsToAdd:[staffel.variantId]}},value:{discountAmount:{amount:(staffel.perItemCents/100).toFixed(2),appliesOnEachItem:true}}}}}))
 }
 if(quote.tierCents>0){
  const percentage=quote.tier==='gold'?0.10:0.05
  expected.push(await issueAutomatic(db,{...input,component:'tier',discountCents:quote.tierCents,eligibleVariants:variants,basic:{context:{customers:{add:[customerId]}},customerGets:{items:{all:true},value:{percentage}}}}))
 }
 if(quote.redemptionCents>0) expected.push(await reserveAndIssueLoyaltyDiscount(db,{attemptId:input.attemptId,userId:user!.id,customerId:customerId!,points:input.points,checkoutLease:input.checkoutLease,issuanceLease:randomUUID(),secret:input.secret,lines}))
 return expected
}
