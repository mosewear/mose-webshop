import { NextRequest, NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { storefront } from '@/lib/shopify/client'
import { VARIANTS_QUERY } from '@/lib/shopify/queries'
import { authorizeLines } from '@/lib/shopify/policy'
import { verifyMarketPriceSubtotal, type MarketVariant } from '@/lib/shopify/us-market'
import { readLimitedBody } from '@/lib/shopify/http'

export const runtime = 'nodejs'
const inputSchema = z.object({
  country: z.literal('US'),
  variantIds: z.array(z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/)).min(1).max(30),
}).strict()

/** Read-only Shopify market-price quote for the custom storefront.
 * Display-only. The final payable cart is still checked in checkout/route.ts.
 * Never convert a EUR price on the client, and never disclose admin credentials. */
export async function POST(request: NextRequest) {
  const respond = (body: unknown, status: number) => NextResponse.json(body, {
    status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
  if (process.env.NEXT_PUBLIC_MOSE_US_MARKET_ENABLED !== 'true') return respond({ code: 'US_MARKET_NOT_READY' }, 503)
  const origin = request.headers.get('origin')
  if (origin !== request.nextUrl.origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) return respond({ code: 'INVALID_ORIGIN' }, 403)
  let parsed: z.infer<typeof inputSchema>
  try {
    parsed = inputSchema.parse(JSON.parse((await readLimitedBody(request, 4000)).toString('utf8')))
  } catch { return respond({ code: 'INVALID_INPUT' }, 400) }
  const variantIds = [...new Set(parsed.variantIds)]
  try {
    const db = createServiceClient()
    const mappings = await db.from('shopify_variant_mappings').select('*').in('mose_variant_id', variantIds)
    if (mappings.error || !mappings.data) throw new Error('MAPPING_UNAVAILABLE')
    const authorized = authorizeLines({
      locale: 'en', country: 'US',
      attemptId: '00000000-0000-4000-8000-000000000000',
      lines: variantIds.map(variantId => ({ variantId, quantity: 1 })),
    }, mappings.data)
    const buyerIp = process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      : process.env.SHOPIFY_DEV_BUYER_IP
    if (!buyerIp || !isIP(buyerIp)) throw new Error('BUYER_IP_UNAVAILABLE')
    const priceResult = await storefront<{ nodes: (MarketVariant | null)[] }>(
      VARIANTS_QUERY, { ids: authorized.map(line => line.merchandiseId), country: 'US', language: 'EN' }, buyerIp,
    )
    const market = verifyMarketPriceSubtotal(authorized, priceResult.nodes, 'US')
    const lines = authorized.map(line => ({
      variantId: line.localVariantId,
      unitAmount: (market.perVariantCents[line.merchandiseId] / 100).toFixed(2),
    }))
    return respond({ country: 'US', currency: 'USD', lines }, 200)
  } catch {
    return respond({ code: 'US_MARKET_PRICE_UNAVAILABLE' }, 503)
  }
}
