import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { createServiceClient } from '@/lib/supabase/service'
import { storefront } from '@/lib/shopify/client'
import { CART_CREATE, VARIANTS_QUERY } from '@/lib/shopify/queries'
import { assertCheckoutUrl, authorizeLines, checkoutInput, moneyToCents } from '@/lib/shopify/policy'
import { readLimitedBody } from '@/lib/shopify/http'

export const runtime = 'nodejs'
const COOKIE = 'mose_shopify_session'
type Variant = { id: string; availableForSale: boolean; quantityAvailable: number | null; price: { amount: string; currencyCode: string } }
type CreatedCart = { cartCreate: {
  cart: null | { id: string; checkoutUrl: string; totalQuantity: number; cost: { subtotalAmount: { amount: string; currencyCode: string } }; lines: { nodes: { quantity: number; merchandise: { id: string } }[] } }
  userErrors: unknown[]; warnings: unknown[]
} }

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const session = request.cookies.get(COOKIE)?.value
  const sessionToken = session && /^[a-f0-9]{64}$/.test(session) ? session : randomBytes(32).toString('hex')
  const respond = (body: Record<string, unknown>, status = 200) => {
    const response = NextResponse.json(body, { status, headers })
    response.cookies.set(COOKIE, sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 86400 })
    return response
  }
  if (process.env.SHOPIFY_CHECKOUT_ENABLED !== 'true' || process.env.SHOPIFY_BENEFITS_VERIFIED !== 'true') {
    return respond({ error: 'Deze bestelroute is nog niet beschikbaar.', code: 'CHECKOUT_DISABLED' }, 503)
  }
  let origin: string
  try { origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').origin } catch {
    return respond({ error: 'Afrekenen is tijdelijk niet beschikbaar.', code: 'CONFIGURATION_UNAVAILABLE' }, 503)
  }
  if (request.headers.get('origin') !== origin) return respond({ error: 'Ongeldige aanvraag.' }, 403)
  let parsed: ReturnType<typeof checkoutInput.safeParse>
  try { parsed = checkoutInput.safeParse(JSON.parse((await readLimitedBody(request, 12_000)).toString('utf8'))) } catch (error) {
    return respond({ error: 'Ongeldige winkelmand.' }, error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400)
  }
  if (!parsed.success) return respond({ error: 'Ongeldige winkelmand.' }, 400)

  const input = parsed.data
  const lease = randomUUID()
  let reserved = false
  let db: ReturnType<typeof createServiceClient> | undefined
  try {
    const cutoff = Date.parse(process.env.SHOPIFY_CUTOVER_AT ?? '')
    if (!Number.isFinite(cutoff) || cutoff > Date.now()) throw new Error('CUTOVER_NOT_READY')
    const secret = process.env.SHOPIFY_SESSION_SECRET
    if (!secret || secret.length < 32 || !process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) throw new Error('NOT_CONFIGURED')
    db = createServiceClient()
    const readiness = await db.from('shopify_integration_state').select('*').eq('id', 1).single()
    const state = readiness.data
    const gates = ['app_installed', 'checkout_enabled', 'catalog_verified', 'inventory_verified', 'benefits_verified', 'fulfillment_verified', 'market_verified']
    const lastSync = Date.parse(state?.last_reconciled_at ?? '')
    if (readiness.error || !state || gates.some(key => state[key] !== true) ||
      !Number.isFinite(lastSync) || lastSync > Date.now() + 60_000 || Date.now() - lastSync > 15 * 60_000) {
      return respond({ error: 'Afrekenen is tijdelijk niet beschikbaar. Je winkelmand blijft bewaard.', code: 'CHECKOUT_NOT_READY' }, 503)
    }
    const { data, error } = await db.from('shopify_variant_mappings').select('*').in('mose_variant_id', input.lines.map(l => l.variantId))
    if (error) throw new Error('MAPPING_UNAVAILABLE')
    let lines: ReturnType<typeof authorizeLines>
    try { lines = authorizeLines(input, data ?? []) } catch {
      return respond({ error: 'Een artikel is nog niet beschikbaar voor deze bestelroute.', code: 'VARIANT_NOT_RELEASED' }, 409)
    }
    // Vercel replaces this platform header. No arbitrary X-Forwarded-For fallback.
    const buyerIp = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : process.env.SHOPIFY_DEV_BUYER_IP
    if (!buyerIp || !isIP(buyerIp)) throw new Error('BUYER_IP_UNAVAILABLE')
    const context = { country: 'NL', language: input.locale.toUpperCase() }
    const result = await storefront<{ nodes: (Variant | null)[] }>(VARIANTS_QUERY, { ...context, ids: lines.map(l => l.merchandiseId) }, buyerIp)
    for (const line of lines) {
      const variant = result.nodes.find(v => v?.id === line.merchandiseId)
      if (!variant || !variant.availableForSale || variant.price.currencyCode !== 'EUR' ||
        moneyToCents(variant.price.amount) !== line.expectedPriceCents ||
        (variant.quantityAvailable !== null && variant.quantityAvailable < line.quantity)) {
        return respond({ error: 'Prijs of beschikbaarheid is gewijzigd. Vernieuw je winkelmand.', code: 'CART_CHANGED' }, 409)
      }
    }
    const fingerprint = createHash('sha256').update(JSON.stringify({ locale: input.locale, country: input.country, lines })).digest('hex')
    const booking = await db.rpc('reserve_shopify_checkout', {
      p_id: input.attemptId, p_session: createHmac('sha256', secret).update(sessionToken).digest('hex'),
      p_fingerprint: fingerprint, p_buyer: createHmac('sha256', secret).update(buyerIp).digest('hex'),
      p_snapshot: { locale: input.locale, country: input.country, lines }, p_lease: lease,
    })
    if (booking.error) {
      if (booking.error.message?.includes('CHECKOUT_RATE_LIMIT')) return respond({ error: 'Te veel afrekenpogingen. Probeer het over een minuut opnieuw.', code: 'RATE_LIMIT' }, 429)
      throw new Error('ATTEMPT_UNAVAILABLE')
    }
    const attempt = booking.data?.[0]
    if (!attempt || Date.parse(attempt.expires_at) <= Date.now()) return respond({ error: 'Deze afrekenpoging hoort niet meer bij je winkelmand.', code: 'ATTEMPT_CONFLICT' }, 409)
    if (attempt.status === 'ready') return respond({ checkoutUrl: assertCheckoutUrl(attempt.checkout_url, process.env.SHOPIFY_CHECKOUT_HOST), attemptId: input.attemptId })
    if (attempt.lease_token !== lease || attempt.status !== 'creating') {
      return respond({ error: 'Deze afrekenpoging wordt nog gecontroleerd. Je winkelmand blijft bewaard.', code: 'ATTEMPT_PENDING' }, 409)
    }
    reserved = true
    const created = await storefront<CreatedCart>(CART_CREATE, {
      ...context, input: {
        buyerIdentity: { countryCode: 'NL' },
        lines: lines.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })),
        attributes: [{ key: 'mose_source', value: 'unified-checkout' }, { key: 'mose_attempt', value: input.attemptId }],
      },
    }, buyerIp)
    const { cart, userErrors, warnings } = created.cartCreate
    if (!cart || userErrors.length || warnings.length || cart.cost.subtotalAmount.currencyCode !== 'EUR' ||
      cart.totalQuantity !== lines.reduce((n, l) => n + l.quantity, 0) || cart.lines.nodes.length !== lines.length ||
      lines.some(l => !cart.lines.nodes.some(c => c.merchandise.id === l.merchandiseId && c.quantity === l.quantity))) throw new Error('CART_MISMATCH')
    moneyToCents(cart.cost.subtotalAmount.amount)
    const checkoutUrl = assertCheckoutUrl(cart.checkoutUrl, process.env.SHOPIFY_CHECKOUT_HOST)
    const saved = await db.rpc('finish_shopify_checkout', { p_id: input.attemptId, p_lease: lease, p_status: 'ready', p_cart_id: cart.id, p_checkout_url: checkoutUrl })
    if (saved.error || saved.data !== true) throw new Error('ATTEMPT_SAVE_FAILED')
    return respond({ checkoutUrl, attemptId: input.attemptId })
  } catch {
    if (reserved && db) {
      // Unknown is intentional: never recreate a cart automatically after an uncertain mutation.
      try {
        await db.rpc('finish_shopify_checkout', { p_id: input.attemptId, p_lease: lease, p_status: 'unknown', p_error: 'CHECKOUT_OUTCOME_UNKNOWN' })
      } catch { /* Storage failure leaves the durable creating state blocked; never return an unpersisted URL. */ }
    }
    return respond({ error: 'Afrekenen lukt nu niet. Je winkelmand is behouden.', code: reserved ? 'ATTEMPT_PENDING' : 'CHECKOUT_UNAVAILABLE' }, 503)
  }
}
