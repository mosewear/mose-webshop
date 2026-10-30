import { NextRequest, NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { z } from 'zod'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { readLimitedBody } from '@/lib/shopify/http'
import { resolveNativeGiftVariant } from '@/lib/shopify/native-gift-catalog'
import { NATIVE_GIFT_PRODUCT_ID } from '@/lib/shopify/native-gift-input'
export const runtime='nodejs'
/** Controlled catalog preparation only: never creates a cart, payment or code. */
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'}
  const {authorized}=await requireAdmin(['admin','manager'])
  if(!authorized)return NextResponse.json({error:'Geen toegang.'},{status:403,headers})
  let origin:string
  try{origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.mosewear.com').origin}catch{return NextResponse.json({error:'Configuratie ontbreekt.'},{status:503,headers})}
  if(request.headers.get('origin')!==origin)return NextResponse.json({error:'Ongeldige aanvraag.'},{status:403,headers})
  try{
    const input=z.object({amountCents:z.number().int().min(2000).max(100000)}).strict().parse(JSON.parse((await readLimitedBody(request,1024)).toString('utf8')))
    const buyerIp=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim():process.env.SHOPIFY_DEV_BUYER_IP
    if(!buyerIp||!isIP(buyerIp))throw new Error('BUYER_CONTEXT_REQUIRED')
    const result=await resolveNativeGiftVariant(createServiceClient(),{productId:NATIVE_GIFT_PRODUCT_ID,amountCents:input.amountCents,buyerIp})
    return NextResponse.json(result,{headers})
  }catch{return NextResponse.json({error:'Bedragvariant kon niet worden bevestigd. Er is geen betaalorder gemaakt.'},{status:409,headers})}
}
