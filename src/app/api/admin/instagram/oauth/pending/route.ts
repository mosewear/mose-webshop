import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  OAUTH_PENDING_COOKIE,
  parsePendingPayload,
} from '@/lib/instagram/oauth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/instagram/oauth/pending
 *
 * Geeft de pending OAuth kandidatenlijst terug (als die bestaat) zodat
 * /admin/instagram de picker-UI kan renderen wanneer je meerdere FB
 * Pages met IG-account beheert. Zonder pending = lege lijst.
 *
 * De long-lived user token komt natuurlijk NIET mee terug in deze
 * response - die blijft alleen in de httpOnly cookie staan.
 */
export async function GET(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !adminUser) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const pendingCookie = req.cookies.get(OAUTH_PENDING_COOKIE)?.value
  const pending = parsePendingPayload(pendingCookie)

  if (!pending || pending.adminUserId !== adminUser.id) {
    return NextResponse.json(
      { success: true, pending: null },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    {
      success: true,
      pending: {
        candidates: pending.candidates.map((c) => ({
          page_id: c.page_id,
          page_name: c.page_name,
          ig_business_account_id: c.ig_business_account_id,
          ig_username: c.ig_username,
        })),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
