import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  OAUTH_PENDING_COOKIE,
  parsePendingPayload,
} from '@/lib/instagram/oauth'
import { saveOAuthCredentials } from '@/lib/instagram/persistence'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/instagram/oauth/finalize
 *
 * Wordt aangeroepen door de picker-UI op /admin/instagram als de admin
 * meerdere FB-pages heeft. Body: { page_id }. We vinden de bijbehorende
 * candidate uit de pending cookie, slaan op via saveOAuthCredentials en
 * wissen de pending cookie.
 */
export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !adminUser) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  let body: { page_id?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const pageId = typeof body?.page_id === 'string' ? body.page_id.trim() : ''
  if (!pageId) {
    return NextResponse.json(
      { success: false, error: 'page_id is verplicht.' },
      { status: 400 }
    )
  }

  const pendingCookie = req.cookies.get(OAUTH_PENDING_COOKIE)?.value
  const pending = parsePendingPayload(pendingCookie)
  if (!pending) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Geen pending OAuth-sessie gevonden. Start de connect-flow opnieuw.',
      },
      { status: 410 }
    )
  }

  if (pending.adminUserId !== adminUser.id) {
    return NextResponse.json(
      { success: false, error: 'Pending sessie hoort bij een andere admin.' },
      { status: 403 }
    )
  }

  const choice = pending.candidates.find((c) => c.page_id === pageId)
  if (!choice) {
    return NextResponse.json(
      { success: false, error: 'Gekozen page niet in kandidatenlijst.' },
      { status: 400 }
    )
  }

  const saveError = await saveOAuthCredentials(choice)
  if (saveError) {
    return NextResponse.json(
      { success: false, error: saveError },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete(OAUTH_PENDING_COOKIE)
  return res
}
