import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/supabase/admin'
import { readShopifyAdminOrder, shopifyOrderNumber } from '@/lib/shopify/admin-order-detail'
import {
  createShopifyReturnLabel, downloadShopifyReturnLabel, emailShopifyReturnLabel, readShopifyReturnLabel,
} from '@/lib/shopify/admin-return-label'

export const runtime = 'nodejs'
export const maxDuration = 120
const headers = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { headers, status })
}

export async function GET(_request: NextRequest, context: Context) {
  if (!(await requireAdmin()).authorized) return failure('Geen toegang.', 403)
  const { id } = await context.params
  if (!shopifyOrderNumber.test(id)) return failure('Bestelling niet gevonden.', 404)
  try {
    const record = await readShopifyReturnLabel('gid://shopify/Order/' + id)
    if (!record?.parcel_id) return failure('Geen retourlabel gevonden.', 404)
    const pdf = await downloadShopifyReturnLabel(record.parcel_id)
    return new Response(new Uint8Array(pdf), {
      headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="MOSE-retourlabel.pdf"' },
    })
  } catch {
    return failure('Het retourlabel kan niet worden opgehaald.', 503)
  }
}

const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), grams: z.number().int().min(1).max(20000) }).strict(),
  z.object({ action: z.literal('email') }).strict(),
])

export async function POST(request: NextRequest, context: Context) {
  if (!(await requireAdmin()).authorized) return failure('Geen toegang.', 403)
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) {
    return failure('Ongeldig verzoek.', 403)
  }
  const data = action.safeParse(await request.json().catch(() => null))
  if (!data.success) return failure('Controleer de gekozen actie en het pakketgewicht.', 400)
  const { id } = await context.params
  try {
    const order = await readShopifyAdminOrder(id)
    if (!order) return failure('Bestelling niet gevonden.', 404)
    if (data.data.action === 'create') {
      await createShopifyReturnLabel(order, data.data.grams)
    } else {
      await emailShopifyReturnLabel(order)
    }
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (['ORDER_CANNOT_RETURN', 'RETURN_ADDRESS_INVALID'].includes(code)) {
      return failure('Een retourlabel vereist een betaalde, verzonden bestelling met een volledig Nederlands verzendadres en e-mailadres.', 422)
    }
    if (code === 'RETURN_EMAIL_CHANGED') {
      return failure('Het e-mailadres is gewijzigd sinds de labelaanmaak. Controleer de klantgegevens voordat je de pdf deelt.', 409)
    }
    if (code === 'RETURN_EMAIL_PENDING') {
      return failure('Verzending van de e-mail is niet bevestigd. Controleer het e-maillogboek. Je kunt het label downloaden.', 409)
    }
    if (code === 'RETURN_ALREADY_PENDING' || code === 'SENDCLOUD_CREATE_UNCONFIRMED') {
      return failure('Sendcloud heeft de aanmaak nog niet bevestigd. Controleer de retour in Sendcloud voordat je een nieuw label aanmaakt.', 409)
    }
    if (code === 'SENDCLOUD_CREATE_REJECTED') {
      return failure('Sendcloud heeft de aanvraag geweigerd. Controleer de verzendmethode en accountinstellingen.', 503)
    }
    return failure('De retouractie kon niet worden bevestigd. Vernieuw de bestelling om de actuele status te zien.', 503)
  }
}
