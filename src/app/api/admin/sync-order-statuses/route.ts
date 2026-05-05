import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  syncOrderStatusFromSendcloud,
  syncStuckOrders,
} from '@/lib/sync-order-statuses'

/**
 * Admin handmatige status-sync.
 *
 * Twee modes:
 *  - `{ orderId: "<uuid>" }` → sync alleen deze ene order
 *  - `{}` of `{ all: true }` → bulk-sync van alle stuck orders
 *
 * Gemaakt zodat we tijdens een incident niet hoeven te wachten op de
 * volgende cron-tick — beheerders kunnen direct vanuit /admin/orders
 * de boel rechttrekken.
 *
 * Auth via `requireAdmin(['admin'])`. De rol `manager` wordt bewust
 * uitgesloten omdat dit endpoint zowel naar Sendcloud praat (kosten
 * implicaties) als delivered-mails kan triggeren.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin'])
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''

    if (orderId) {
      const result = await syncOrderStatusFromSendcloud(orderId)
      return NextResponse.json({ mode: 'single', result })
    }

    const paidWithinDays =
      typeof body.paidWithinDays === 'number' ? body.paidWithinDays : 60
    const maxOrders =
      typeof body.maxOrders === 'number' ? body.maxOrders : 100

    const result = await syncStuckOrders({ paidWithinDays, maxOrders })
    return NextResponse.json({ mode: 'bulk', ...result })
  } catch (error: any) {
    console.error('[Admin Sync] Unhandled error:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    )
  }
}
