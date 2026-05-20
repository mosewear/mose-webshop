/**
 * Returns the pricing/offer context for a single product so the admin
 * UI can preview the auto-generated Meta copy before publishing.
 *
 * Read-only, admin-gated. Always loads fresh from the DB.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { getPricingContext } from '@/lib/ai/pricing-context'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const productId = req.nextUrl.searchParams.get('product_id')?.trim()
  if (!productId) {
    return NextResponse.json({ error: 'product_id verplicht' }, { status: 400 })
  }

  try {
    const pricing = await getPricingContext(productId)
    return NextResponse.json({ pricing })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
