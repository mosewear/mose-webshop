import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, randomUUID, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { storefront } from '@/lib/shopify/client'
import { CART_CREATE, VARIANTS_QUERY } from '@/lib/shopify/queries'
import { assertCheckoutUrl, authorizeLines, checkoutInput, moneyToCents } from '@/lib/shopify/policy'
import { readLimitedBody } from '@/lib/shopify/http'
import { SHOPIFY_SESSION_COOKIE, validShopifySession } from '@/lib/shopify/session'
import { assertCurrentLocalCatalog } from '@/lib/shopify/local-checkout'
import { decideCheckoutAttempt } from '@/lib/shopify/attempts'
import { assertInventoryEvidence } from '@/lib/shopify/inventory'
import { adminCredentialsConfigured } from '@/lib/shopify/admin-auth'

export const runtime = 'nodejs'
type Variant = { id: string; availableForSale: boolean; quantityAvailable: number | null; price: { amount: string; currencyCode: string } }
type CreatedCart = { cartCreate: {
  cart: null | { id: string; checkoutUrl: string; totalQuantity: number; cost: { subtotalAmount: { amount: string; currencyCode: string } }; lines: { nodes: { quantity: number; merchandise: { id: string } }[] } }
  userErrors: unknown[]; warnings: unknown[]
} }

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  const sessionToken = request.cookies.get(SHOPIFY_SESSION_COOKIE)?.value
  const respond = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers })
  if (process.env.SHOPIFY_CHECKOUT_ENABLED !== 'true' || process.env.SHOPIFY_BENEFITS_VERIFIED !== 'true') {
    return respond({ error: 'Deze bestelroute is nog niet beschikbaar.', code: 'CHECKOUT_DISABLED' }, 503)
  }
  let origin: string
  try { origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').origin } catch {
    return respond({ error: 'Afrekenen is tijdelijk niet beschikbaar.', code: 'CONFIGURATION_UNAVAILABLE' }, 503)
  }
  if (request.headers.get('origin') !== origin) return respond({ error: 'Ongeldige aanvraag.' }, 403)
  if (!validShopifySession(sessionToken)) return respond({ error: 'Start eerst een veilige afrekensessie.', code: 'SESSION_REQUIRED', retrySafe: true }, 409)
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
    if (!secret || secret.length < 32 || !process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || !adminCredentialsConfigured()) throw new Error('NOT_CONFIGURED')
    // Only a server-verified Supabase identity can own an account order. Guests need no Auth call.
    let userId: string | null = null
    if (request.cookies.getAll().some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))) {
      const auth = await createClient()
      const { data: identity, error: authError } = await auth.auth.getUser()
      if (authError || !identity.user) return respond({ error: 'Log opnieuw in om je bestelling aan je account te koppelen.', code: 'ACCOUNT_SESSION_INVALID' }, 401)
      userId = identity.user.id
    }
    db = createServiceClient()
    const readiness = await db.from('shopify_integration_state').select('*').eq('id', 1).single()
    const state = readiness.data
    const gates = ['app_installed', 'checkout_enabled', 'catalog_verified', 'inventory_verified', 'benefits_verified', 'fulfillment_verified', 'market_verified']
    const lastSync = Date.parse(state?.last_reconciled_at ?? '')
    const lastWorker = Date.parse(state?.last_worker_at ?? '')
    if (readiness.error || !state || gates.some(key => state[key] !== true) ||
      !Number.isFinite(lastSync) || lastSync > Date.now() + 60_000 || Date.now() - lastSync > 15 * 60_000 ||
      !Number.isFinite(lastWorker) || lastWorker > Date.now() + 60_000 || Date.now() - lastWorker > 15 * 60_000) {
      return respond({ error: 'Afrekenen is tijdelijk niet beschikbaar. Je winkelmand blijft bewaard.', code: 'CHECKOUT_NOT_READY' }, 503)
    }
    const healthResult = await db.rpc('shopify_queue_health')
    const health = healthResult.data?.[0]
    const oldest = health?.oldest_pending_at ? Date.parse(health.oldest_pending_at) : null
    const deadLetters = Number(health?.dead_letter_count)
    const pending = Number(health?.pending_count)
    if (healthResult.error || !health || health.dead_letter_count == null || health.pending_count == null || !Number.isSafeInteger(deadLetters) || deadLetters !== 0 ||
      !Number.isSafeInteger(pending) || pending < 0 ||
      (pending > 0 && (oldest === null || !Number.isFinite(oldest) || oldest > Date.now() + 60_000 || Date.now() - oldest > 15 * 60_000))) {
      return respond({ error: 'Afrekenen is tijdelijk niet beschikbaar. Je winkelmand blijft bewaard.', code: 'ORDER_SYNC_NOT_READY' }, 503)
    }
    const { data, error } = await db.from('shopify_variant_mappings').select('*').in('mose_variant_id', input.lines.map(l => l.variantId))
    if (error) throw new Error('MAPPING_UNAVAILABLE')
    let lines: ReturnType<typeof authorizeLines>
    try { lines = authorizeLines(input, data ?? []) } catch {
      return respond({ error: 'Een artikel is nog niet beschikbaar voor deze bestelroute.', code: 'VARIANT_NOT_RELEASED' }, 409)
    }
    const inventory = await db.rpc('shopify_inventory_evidence', { p_ids: lines.map(line => line.localVariantId) })
    try {
      if (inventory.error || !Array.isArray(inventory.data)) throw new Error('INVENTORY_UNAVAILABLE')
      assertInventoryEvidence(lines, inventory.data, Date.now(), new Map<string, string>((data ?? []).map(mapping => [mapping.mose_variant_id, mapping.inventory_revision])))
    } catch {
      return respond({ error: 'Voorraad wordt gecontroleerd. Je winkelmand blijft bewaard.', code: 'INVENTORY_NOT_READY' }, 409)
    }
    // Read current local publication and price from the variant's database parent, never a client product ID.
    const localVariants = await db.from('product_variants')
      .select('id,product_id,is_available,price_adjustment,presale_enabled,presale_stock_quantity')
      .in('id', lines.map(line => line.localVariantId))
    if (localVariants.error) throw new Error('LOCAL_CATALOG_UNAVAILABLE')
    const productIds = [...new Set((localVariants.data ?? []).map(variant => variant.product_id as string))]
    if (!productIds.length) return respond({ error: 'Een artikel is niet meer beschikbaar. Controleer je winkelmand.', code: 'LOCAL_CATALOG_CHANGED' }, 409)
    const localProducts = await db.from('products').select('id,status,is_active,is_gift_card,base_price,sale_price').in('id', productIds)
    if (localProducts.error) throw new Error('LOCAL_CATALOG_UNAVAILABLE')
    try { assertCurrentLocalCatalog(lines, localVariants.data ?? [], localProducts.data ?? [], data ?? []) } catch {
      return respond({ error: 'Prijs of beschikbaarheid is gewijzigd. Vernieuw je winkelmand.', code: 'LOCAL_CATALOG_CHANGED' }, 409)
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
    const fingerprint = createHash('sha256').update(JSON.stringify({ locale: input.locale, country: input.country, lines, userId })).digest('hex')
    const booking = await db.rpc('reserve_shopify_checkout', {
      p_id: input.attemptId, p_session: createHmac('sha256', secret).update(sessionToken).digest('hex'),
      p_fingerprint: fingerprint, p_buyer: createHmac('sha256', secret).update(buyerIp).digest('hex'),
      p_snapshot: { locale: input.locale, country: input.country, lines }, p_lease: lease,
    })
    if (booking.error) {
      if (booking.error.message?.includes('CHECKOUT_RATE_LIMIT')) return respond({ error: 'Te veel afrekenpogingen. Probeer het over een minuut opnieuw.', code: 'RATE_LIMIT' }, 429)
      throw new Error('ATTEMPT_UNAVAILABLE')
    }
    const decision = decideCheckoutAttempt(booking.data?.[0], fingerprint, lease)
    if (decision.kind === 'reject') return respond({
      error: decision.retrySafe ? 'Deze afrekenpoging kan veilig opnieuw worden gestart.' : 'Deze afrekenpoging moet eerst worden gecontroleerd. Je winkelmand blijft bewaard.',
      code: decision.code, retrySafe: decision.retrySafe,
    }, 409)
    if (decision.kind === 'reuse') return respond({ checkoutUrl: assertCheckoutUrl(decision.url, process.env.SHOPIFY_CHECKOUT_HOST), attemptId: input.attemptId })
    reserved = true
    const attributes = [{ key: 'mose_source', value: 'unified-checkout' }, { key: 'mose_attempt', value: input.attemptId }]
    if (userId) {
      const proof = randomBytes(32).toString('hex')
      const owner = await db.from('shopify_checkout_owners').insert({ attempt_id: input.attemptId, user_id: userId, proof })
      if (owner.error) throw new Error('ACCOUNT_LINK_UNAVAILABLE')
      attributes.push({ key: 'mose_account_proof', value: proof })
    }
    const created = await storefront<CreatedCart>(CART_CREATE, {
      ...context, input: {
        buyerIdentity: { countryCode: 'NL' },
        lines: lines.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })),
        attributes,
      },
    }, buyerIp)
    const { cart, userErrors, warnings } = created.cartCreate
    if (!cart && userErrors.length) {
      const failed = await db.rpc('finish_shopify_checkout', { p_id: input.attemptId, p_lease: lease, p_status: 'failed', p_error: 'CART_REJECTED' })
      if (failed.error || failed.data !== true) throw new Error('ATTEMPT_SAVE_FAILED')
      return respond({ error: 'Shopify kon deze winkelmand niet aanmaken. Controleer je artikelen en probeer opnieuw.', code: 'ATTEMPT_FAILED', retrySafe: true }, 409)
    }
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
