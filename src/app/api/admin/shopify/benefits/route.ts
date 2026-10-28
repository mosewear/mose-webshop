import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { readLimitedBody } from '@/lib/shopify/http'
import { listBenefitRecoveries, readBenefitLiabilities, recoverRejectedBenefits } from '@/lib/shopify/benefit-recovery'
import { safeWorkerError } from '@/lib/shopify/worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
const headers = { 'Cache-Control': 'private, no-store' }
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers })

export async function GET() {
  const auth = await requireAdmin(['admin'])
  if (!auth.authorized) return reply({ error: 'Geen toegang.' }, 403)
  try {
    const db = createServiceClient()
    const [liabilities, attempts] = await Promise.all([readBenefitLiabilities(db), listBenefitRecoveries(db)])
    return reply({ enabled: process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED === 'true', liabilities, attempts })
  } catch { return reply({ error: 'Hersteloverzicht is tijdelijk niet beschikbaar.' }, 503) }
}

/** Explicit authenticated administrator action. There is no endpoint for a
 * browser to manufacture a no-cart proof. Existing actual protocol proof is
 * required before any provider call or point/use restoration. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['admin'])
  if (!auth.authorized) return reply({ error: 'Geen toegang.' }, 403)
  let origin: string
  try { origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').origin }
  catch { return reply({ error: 'Configuratie ontbreekt.' }, 503) }
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'Ongeldige aanvraag.' }, 403)
  if (process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED !== 'true') return reply({ error: 'Herstelacties zijn nog niet vrijgegeven.', code: 'BENEFIT_RECOVERY_DISABLED' }, 503)
  let input: { attemptId: string }
  try { input = z.object({ attemptId: z.string().uuid() }).strict().parse(JSON.parse((await readLimitedBody(request, 1000)).toString('utf8'))) }
  catch { return reply({ error: 'Ongeldige herstelreferentie.' }, 400) }
  try {
    const result = await recoverRejectedBenefits(createServiceClient(), input.attemptId, { deadline: Date.now() + 90_000 })
    return reply(result)
  } catch (error) {
    // Only fixed uppercase error codes may be surfaced; never provider messages,
    // customer identities, coupon capabilities or raw database details.
    return reply({ error: 'De reservering blijft vastgehouden totdat herstel is bewezen.', code: safeWorkerError(error) }, 409)
  }
}
