import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { storefront } from '@/lib/shopify/client'
import { CART_CREATE } from '@/lib/shopify/queries'
import { BENEFITS_CART_QUERY, assertCartBenefits } from '@/lib/shopify/benefits'
import { assertCheckoutUrl, moneyToCents } from '@/lib/shopify/policy'
import { SHOPIFY_SESSION_COOKIE, validShopifySession } from '@/lib/shopify/session'
import { readLimitedBody } from '@/lib/shopify/http'
import { decideCheckoutAttempt } from '@/lib/shopify/attempts'
import { sampleCatalog, sampleInput, selectSampleLines, assertSampleAvailability, SAMPLE_VARIANTS_QUERY, type SampleVariant } from '@/lib/shopify/admin-samples'

export const runtime='nodejs'
const headers={'Cache-Control':'no-store'}
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers})
const enabled=()=>process.env.SHOPIFY_SAMPLE_CHECKOUT_ENABLED==='true' && Boolean(process.env.SHOPIFY_SAMPLE_BRANDING_REFERENCE?.trim())
export async function GET(){
 const auth=await requireAdmin(['admin'])
 if(!auth.authorized)return reply({error:'Niet toegestaan'},403)
 return reply({enabled:enabled(),models:sampleCatalog.map(p=>({model:p.model,name:p.name,priceCents:p.priceCents,variants:p.variants.map(v=>({localId:v.localId,color:v.color,size:v.size}))}))})
}
type Created={cartCreate:{cart:null|{id:string;checkoutUrl:string;totalQuantity:number;cost:{subtotalAmount:{amount:string;currencyCode:string}};lines:{nodes:{quantity:number;merchandise:{id:string}}[]}};userErrors:unknown[];warnings:unknown[]}}
/** Private pre-approval path. Does not release public mappings, change stock,
 * award physical sample approval, charge a card or pay the supplier. */
export async function POST(request:NextRequest){
 const auth=await requireAdmin(['admin'])
 if(!auth.authorized || !auth.user)return reply({error:'Niet toegestaan'},403)
 let origin:string
 try{origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.mosewear.com').origin}catch{return reply({error:'Configuratie ontbreekt'},503)}
 if(request.headers.get('origin')!==origin || request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Ongeldige aanvraag'},403)
 if(!enabled())return reply({error:'De private samplebestelling is nog niet vrijgegeven.',code:'SAMPLE_DISABLED'},503)
 const session=request.cookies.get(SHOPIFY_SESSION_COOKIE)?.value
 if(!validShopifySession(session))return reply({error:'Start eerst een veilige sessie.',code:'SESSION_REQUIRED'},409)
 const secret=process.env.SHOPIFY_SESSION_SECRET
 if(!secret || secret.length<32 || !process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN)return reply({error:'Serverconfiguratie ontbreekt.'},503)
 let input:ReturnType<typeof sampleInput.parse>
 try{input=sampleInput.parse(JSON.parse((await readLimitedBody(request,4000)).toString('utf8')))}catch{return reply({error:'Kies precies één kleur/maat per model en bevestig de kosten.'},400)}
 let lines:ReturnType<typeof selectSampleLines>
 try{lines=selectSampleLines(input.variants)}catch{return reply({error:'Kies precies één variant van elk van de acht modellen.'},400)}
 const buyerIp=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim():process.env.SHOPIFY_DEV_BUYER_IP
 if(!buyerIp || !isIP(buyerIp))return reply({error:'Veilige kopersessie ontbreekt.'},503)
 const db=createServiceClient(),lease=randomUUID()
 let reserved=false
 let providerCartId:string|null=null
 try{
  const state=await db.from('shopify_integration_state').select('app_installed').eq('id',1).single()
  if(state.error || state.data?.app_installed!==true)return reply({error:'Shopify-koppeling is nog niet gecontroleerd.',code:'SAMPLE_NOT_READY'},503)
  const availability=await storefront<{nodes:(SampleVariant|null)[]}>(SAMPLE_VARIANTS_QUERY,{ids:lines.map(l=>l.merchandiseId)},buyerIp)
  try{assertSampleAvailability(lines,availability.nodes)}catch{return reply({error:'Een sample is niet bestelbaar of de bron/prijs is gewijzigd. Vernieuw de productkoppeling.',code:'SAMPLE_UNAVAILABLE'},409)}
  const fingerprint=createHash('sha256').update(JSON.stringify({purpose:'admin-sample',user:auth.user.id,lines})).digest('hex')
  const booked=await db.rpc('reserve_shopify_checkout',{p_id:input.attemptId,p_session:createHmac('sha256',secret).update(session).digest('hex'),p_fingerprint:fingerprint,p_buyer:createHmac('sha256',secret).update(buyerIp).digest('hex'),p_snapshot:{purpose:'admin-sample',country:'NL',locale:'nl',lines,brandingReference:process.env.SHOPIFY_SAMPLE_BRANDING_REFERENCE},p_lease:lease})
  if(booked.error){if(booked.error.message?.includes('CHECKOUT_RATE_LIMIT'))return reply({error:'Te veel pogingen; probeer later opnieuw.'},429);throw new Error('ATTEMPT_UNAVAILABLE')}
  const decision=decideCheckoutAttempt(booked.data?.[0],fingerprint,lease)
  if(decision.kind==='reject')return reply({error:'Deze poging moet eerst worden gecontroleerd. Start geen tweede bestelling.',code:decision.code,retrySafe:decision.retrySafe},409)
  if(decision.kind==='reuse')return reply({checkoutUrl:assertCheckoutUrl(decision.url,process.env.SHOPIFY_CHECKOUT_HOST),attemptId:input.attemptId})
  reserved=true
  const proof=randomBytes(32).toString('hex')
  const owner=await db.from('shopify_checkout_owners').insert({attempt_id:input.attemptId,user_id:auth.user.id,proof})
  if(owner.error)throw new Error('ACCOUNT_LINK_UNAVAILABLE')
  const created=await storefront<Created>(CART_CREATE,{country:'NL',language:'NL',input:{buyerIdentity:{countryCode:'NL'},lines:lines.map(l=>({merchandiseId:l.merchandiseId,quantity:1})),attributes:[{key:'mose_source',value:'unified-checkout'},{key:'mose_order_kind',value:'admin-sample'},{key:'mose_attempt',value:input.attemptId},{key:'mose_account_proof',value:proof}]}},buyerIp)
  const {cart,userErrors,warnings}=created.cartCreate
  // Keep provider evidence even when price, benefits or URL validation fails.
  // The recovery identifier stays server-side; an unchecked URL is never saved.
  providerCartId=typeof cart?.id==='string' && cart.id.startsWith('gid://shopify/Cart/')?cart.id:null
  if(!cart && userErrors.length){const saved=await db.rpc('finish_shopify_checkout',{p_id:input.attemptId,p_lease:lease,p_status:'failed',p_error:'SAMPLE_CART_REJECTED'});if(saved.error||saved.data!==true)throw new Error('SAVE_FAILED');return reply({error:'Shopify heeft de samplewinkelmand geweigerd.',code:'ATTEMPT_FAILED',retrySafe:true},409)}
  if(!cart || userErrors.length || warnings.length || cart.totalQuantity!==8 || cart.lines.nodes.length!==8 || cart.cost.subtotalAmount.currencyCode!=='EUR' || moneyToCents(cart.cost.subtotalAmount.amount)!==lines.reduce((s,l)=>s+l.expectedPriceCents,0) || lines.some(l=>!cart.lines.nodes.some(n=>n.merchandise.id===l.merchandiseId && n.quantity===1)))throw new Error('SAMPLE_CART_MISMATCH')
  // Shopify subtotal precedes order-level discounts. Inspect every actual
  // allocation even for a deliberately undiscounted private sample cart.
  const benefits = await storefront<{cart:null|{id:string}}>(BENEFITS_CART_QUERY,{id:cart.id},buyerIp)
  if (benefits.cart?.id !== cart.id) throw new Error('SAMPLE_CART_MISMATCH')
  assertCartBenefits(benefits.cart,[],{lines:lines.map(l=>({variantId:l.merchandiseId,quantity:1,unitCents:l.expectedPriceCents})),payableMerchandiseCents:lines.reduce((sum,l)=>sum+l.expectedPriceCents,0)})
  const checkoutUrl=assertCheckoutUrl(cart.checkoutUrl,process.env.SHOPIFY_CHECKOUT_HOST)
  const saved=await db.rpc('finish_shopify_checkout',{p_id:input.attemptId,p_lease:lease,p_status:'ready',p_cart_id:cart.id,p_checkout_url:checkoutUrl})
  if(saved.error||saved.data!==true)throw new Error('SAVE_FAILED')
  return reply({checkoutUrl,attemptId:input.attemptId})
 }catch{
  if(reserved){try{await db.rpc('finish_shopify_checkout',{p_id:input.attemptId,p_lease:lease,p_status:'unknown',p_cart_id:providerCartId,p_error:'SAMPLE_OUTCOME_UNKNOWN'})}catch{/* uncertain cart must never be recreated */}}
  return reply({error:reserved?'Uitkomst nog onbekend. Gebruik dezelfde poging; maak geen tweede bestelling.':'Samplebestelling nog niet beschikbaar.',code:reserved?'ATTEMPT_PENDING':'SAMPLE_NOT_READY'},503)
 }
}
