import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { clearOAuthCredentials } from '@/lib/instagram/persistence'
import {
  OAUTH_PENDING_COOKIE,
  OAUTH_STATE_COOKIE,
} from '@/lib/instagram/oauth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/instagram/oauth/disconnect
 *
 * Wist alle gekoppelde credentials. Komt handig bij rotatie van
 * accounts of als per ongeluk het verkeerde account gekoppeld werd.
 * Stripped ook eventuele lopende OAuth state-cookies.
 */
export async function POST() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const error = await clearOAuthCredentials()
  if (error) {
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete(OAUTH_STATE_COOKIE)
  res.cookies.delete(OAUTH_PENDING_COOKIE)
  return res
}
