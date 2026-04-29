import { NextRequest, NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/server'

/**
 * Heartbeat endpoint - upserts (sessionId, productId) into product_active_views
 * via the SECURITY DEFINER RPC `track_product_view`. Cleans up stale rows
 * for the same product on every call so the table stays small.
 *
 * The session ID is generated client-side (sessionStorage) and is NOT a
 * stable identifier - it's only used to count distinct concurrent
 * visitors and is wiped when the tab closes.
 */
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  let sessionId: string | null = null
  try {
    const body = await req.json()
    sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
  } catch {
    // No body or invalid JSON - treat as missing session id.
  }

  // Validate: short, ascii, length-bounded. Anything else is rejected so we
  // never write malicious bytes into Postgres.
  if (
    !sessionId ||
    sessionId.length < 8 ||
    sessionId.length > 64 ||
    !/^[a-zA-Z0-9_-]+$/.test(sessionId)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const supabase = createAnonClient()
    const { error } = await supabase.rpc('track_product_view', {
      p_product_id: id,
      p_session_id: sessionId,
    })
    if (error) {
      // Don't leak DB errors to the client - heartbeats are fire-and-forget.
      return NextResponse.json({ ok: false }, { status: 200 })
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
