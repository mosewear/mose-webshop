import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { deliverDueScheduledGiftCards } from '@/lib/gift-card-processing'

/**
 * Cron: deliver scheduled gift-card e-mails whose `scheduled_send_at`
 * is in the past. Triggered by Vercel Cron (see vercel.json) OR manually
 * by an authorised admin for testing.
 */
async function handle(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const cronSecret = process.env.CRON_SECRET
    const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCron) {
      const { authorized } = await requireAdmin(['admin'])
      if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = createServiceRoleClient()
    const sent = await deliverDueScheduledGiftCards(supabase as any, 'nl', 100)

    return NextResponse.json({ success: true, sent })
  } catch (error: any) {
    console.error('[gift-cards/cron] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
