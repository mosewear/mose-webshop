import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendLoyaltyStatusUpdateEmail } from '@/lib/email'

/**
 * Admin broadcast: Loyalty Status Update.
 *
 * Features:
 *   - Collects every unique email from orders (incl. guest checkouts)
 *   - Upserts a loyalty_points row with the correct tier/balance if missing
 *     so we can mail recipients even if they never signed up
 *   - Resume-safe: skips rows where status_mail_sent_at is already in this run
 *   - Supports `testEmail` (send to only one recipient) and `dryRun`
 *
 * Body:
 *   {
 *     testEmail?: string        // stuur alleen naar dit adres (admin preview)
 *     dryRun?: boolean          // alleen tellen, niks versturen
 *     resumeFromMinutes?: number // opnieuw versturen als laatste mail > X minuten terug (default: 0 = altijd opnieuw)
 *     batchSize?: number        // max aantal ontvangers per request (default 100)
 *     resetProgress?: boolean   // wis status_mail_sent_at voor een verse run
 *     locale?: 'nl' | 'en'
 *   }
 */

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1000,
} as const

type LoyaltyTier = keyof typeof TIER_THRESHOLDS

function tierFromLifetime(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.gold) return 'gold'
  if (points >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin()
  if (!authorized || !adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const testEmail: string | undefined = body.testEmail?.trim().toLowerCase()
  const dryRun: boolean = !!body.dryRun
  const resumeFromMinutes: number =
    typeof body.resumeFromMinutes === 'number' ? body.resumeFromMinutes : 0
  const batchSize: number = Math.min(
    Math.max(parseInt(body.batchSize ?? 100, 10) || 100, 1),
    500
  )
  const locale: string = body.locale === 'en' ? 'en' : 'nl'
  const resetProgress: boolean = !!body.resetProgress

  const supabase = createServiceRoleClient()

  // Optioneel: reset status_mail_sent_at zodat een nieuwe run opnieuw begint.
  if (resetProgress && !testEmail) {
    const { error: resetErr } = await supabase
      .from('loyalty_points')
      .update({ status_mail_sent_at: null })
      .not('email', 'is', null)
    if (resetErr) {
      console.error('Reset progress failed:', resetErr)
      return NextResponse.json(
        { error: 'Kon progressie niet resetten', details: resetErr.message },
        { status: 500 }
      )
    }
  }

  // 1) Sync ontbrekende loyalty_points rijen op basis van orders.
  //    We groeperen orders op email (lower) en tellen lifetime points.
  //    Alleen betaalde/verwerkte orders tellen mee.
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('email, user_id, total, status')
    .not('email', 'is', null)

  if (ordersErr) {
    console.error('Failed to fetch orders:', ordersErr)
    return NextResponse.json(
      { error: 'Kon orders niet ophalen', details: ordersErr.message },
      { status: 500 }
    )
  }

  const NON_PAID_STATUSES = new Set([
    'cancelled',
    'payment_pending',
    'failed',
    'refunded',
    'expired',
  ])

  const aggregated = new Map<
    string,
    { email: string; userId: string | null; lifetime: number }
  >()
  for (const order of orders || []) {
    if (!order.email) continue
    if (NON_PAID_STATUSES.has((order.status || '').toLowerCase())) continue
    const emailLc = order.email.toLowerCase()
    const existing = aggregated.get(emailLc)
    const add = Math.max(Math.floor(Number(order.total) || 0), 0)
    if (existing) {
      existing.lifetime += add
      if (!existing.userId && order.user_id) existing.userId = order.user_id
    } else {
      aggregated.set(emailLc, {
        email: order.email,
        userId: order.user_id || null,
        lifetime: add,
      })
    }
  }

  // 2) Haal bestaande loyalty rows op.
  const { data: existingRows, error: existingErr } = await supabase
    .from('loyalty_points')
    .select(
      'id, email, user_id, points_balance, lifetime_points, tier, status_mail_sent_at, status_mail_count, last_tier_mailed'
    )

  if (existingErr) {
    console.error('Failed to fetch loyalty rows:', existingErr)
    return NextResponse.json(
      {
        error: 'Kon loyalty rows niet ophalen',
        details: existingErr.message,
      },
      { status: 500 }
    )
  }

  const existingByEmail = new Map<string, any>()
  for (const row of existingRows || []) {
    if (row.email) existingByEmail.set(row.email.toLowerCase(), row)
  }

  // 3) Maak ontbrekende rows aan (voor guest checkouts zonder loyalty row).
  const toInsert: any[] = []
  for (const [emailLc, agg] of aggregated) {
    if (existingByEmail.has(emailLc)) continue
    const lifetime = agg.lifetime
    toInsert.push({
      email: agg.email,
      user_id: agg.userId,
      points_balance: lifetime,
      lifetime_points: lifetime,
      tier: tierFromLifetime(lifetime),
    })
  }
  if (toInsert.length > 0 && !dryRun) {
    const { error: insertErr } = await supabase
      .from('loyalty_points')
      .insert(toInsert)
    if (insertErr) {
      console.error('Insert missing loyalty rows error:', insertErr)
    }
  }

  // 4) Herlaad rows zodat we ook de net-geïnserte rijen meenemen.
  const { data: allRows } = await supabase
    .from('loyalty_points')
    .select(
      'id, email, user_id, points_balance, lifetime_points, tier, status_mail_sent_at, status_mail_count, last_tier_mailed'
    )

  const recipients = (allRows || []).filter((row) => {
    if (!row.email) return false
    if (testEmail) return row.email.toLowerCase() === testEmail
    if (resumeFromMinutes > 0 && row.status_mail_sent_at) {
      const sentAt = new Date(row.status_mail_sent_at).getTime()
      if (Date.now() - sentAt < resumeFromMinutes * 60 * 1000) return false
    } else if (
      resumeFromMinutes === 0 &&
      row.status_mail_sent_at &&
      !resetProgress
    ) {
      return false
    }
    return true
  })

  const selected = recipients.slice(0, batchSize)

  // 5) Dry run: geef alleen de counts terug.
  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      totalLoyaltyRows: allRows?.length || 0,
      totalOrders: orders?.length || 0,
      missingRowsWouldBeInserted: toInsert.length,
      wouldSendTo: selected.length,
      sampleEmails: selected.slice(0, 5).map((r) => r.email),
    })
  }

  // 6) Test-modus: single email (bestaat de loyalty row niet? verstuur op basis van testEmail met 0 punten).
  if (testEmail && selected.length === 0) {
    await sendLoyaltyStatusUpdateEmail({
      customerEmail: testEmail,
      customerName: testEmail.split('@')[0] || 'Klant',
      tier: 'bronze',
      pointsBalance: 0,
      lifetimePoints: 0,
      variant: 'broadcast',
      locale,
    })
    return NextResponse.json({
      success: true,
      testEmail,
      sentTo: 1,
      message: 'Test-mail verstuurd met fallback (geen loyalty rij gevonden).',
    })
  }

  // 7) Verstuur in batches.
  let sent = 0
  const failures: Array<{ email: string; reason: string }> = []

  for (const row of selected) {
    try {
      const tier = row.tier as LoyaltyTier
      await sendLoyaltyStatusUpdateEmail({
        customerEmail: row.email,
        customerName: row.email.split('@')[0] || 'Klant',
        tier,
        pointsBalance: row.points_balance || 0,
        lifetimePoints: row.lifetime_points || 0,
        previousTier: (row.last_tier_mailed as LoyaltyTier | null) ?? null,
        variant: 'broadcast',
        locale,
      })

      await supabase
        .from('loyalty_points')
        .update({
          status_mail_sent_at: new Date().toISOString(),
          status_mail_count: (row.status_mail_count || 0) + 1,
          last_tier_mailed: tier,
        })
        .eq('id', row.id)

      sent++
    } catch (err: any) {
      console.error(`Failed to send to ${row.email}:`, err)
      failures.push({ email: row.email, reason: err?.message || 'unknown' })
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failedCount: failures.length,
    remaining: Math.max(recipients.length - selected.length, 0),
    failures: failures.slice(0, 10),
  })
}
