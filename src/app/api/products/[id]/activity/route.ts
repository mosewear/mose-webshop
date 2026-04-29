import { NextRequest, NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/server'

/**
 * Returns honest activity data for the PDP "live" strip.
 *
 *   { activeViewers: number, sold24h: number }
 *
 * - activeViewers : distinct sessions that hit /heartbeat in the last 60s
 * - sold24h       : SUM(quantity) on PAID orders for this product, last 24h
 *
 * Both come from a single SECURITY DEFINER RPC so RLS never blocks the
 * anon role and the table is locked down.
 *
 * Cache: 30 seconds at the edge so we never hammer Supabase, but the data
 * still feels live. The PDP component additionally polls every 60s.
 */
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ activeViewers: 0, sold24h: 0 }, { status: 400 })
  }

  try {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .rpc('get_product_activity', { p_product_id: id })
      .single()

    if (error || !data) {
      return NextResponse.json(
        { activeViewers: 0, sold24h: 0 },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
        }
      )
    }

    const row = data as { active_viewers: number | string; sold_24h: number | string }
    const activeViewers = Number(row.active_viewers ?? 0) || 0
    const sold24h = Number(row.sold_24h ?? 0) || 0

    return NextResponse.json(
      { activeViewers, sold24h },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
      }
    )
  } catch {
    return NextResponse.json(
      { activeViewers: 0, sold24h: 0 },
      { status: 200 }
    )
  }
}
