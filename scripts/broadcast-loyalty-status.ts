/**
 * Standalone Loyalty Status broadcast runner.
 *
 * Usage:
 *   npx tsx scripts/broadcast-loyalty-status.ts --dry            # preview counts
 *   npx tsx scripts/broadcast-loyalty-status.ts --test=foo@bar   # 1 test-mail
 *   npx tsx scripts/broadcast-loyalty-status.ts --send           # echt sturen (batch 100)
 *   npx tsx scripts/broadcast-loyalty-status.ts --send --batch=250
 *   npx tsx scripts/broadcast-loyalty-status.ts --reset          # wis status_mail_sent_at
 *
 * Runs the same logic as POST /api/admin/loyalty/send-status-update
 * but directly against the service-role client, no admin session required.
 */

import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { sendLoyaltyStatusUpdateEmail } from '../src/lib/email'

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1000 } as const
type LoyaltyTier = keyof typeof TIER_THRESHOLDS
function tierFromLifetime(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.gold) return 'gold'
  if (points >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry')
const doSend = args.includes('--send')
const resetProgress = args.includes('--reset')
const testArg = args.find((a) => a.startsWith('--test='))
const testEmail = testArg ? testArg.split('=')[1].toLowerCase() : undefined
const batchArg = args.find((a) => a.startsWith('--batch='))
const batchSize = Math.min(
  Math.max(parseInt(batchArg?.split('=')[1] ?? '100', 10) || 100, 1),
  500
)

if (!dryRun && !doSend && !testEmail && !resetProgress) {
  console.error(
    '[broadcast] Specify --dry, --test=<email>, --send, or --reset. Aborting.'
  )
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[broadcast] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  if (resetProgress && !testEmail) {
    const { error } = await supabase
      .from('loyalty_points')
      .update({ status_mail_sent_at: null })
      .not('email', 'is', null)
    if (error) throw error
    console.log('[broadcast] Reset status_mail_sent_at for all rows.')
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('email, user_id, total, status')
    .not('email', 'is', null)
  if (ordersErr) throw ordersErr

  const NON_PAID = new Set([
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
  for (const o of orders || []) {
    if (!o.email) continue
    if (NON_PAID.has((o.status || '').toLowerCase())) continue
    const lc = o.email.toLowerCase()
    const add = Math.max(Math.floor(Number(o.total) || 0), 0)
    const ex = aggregated.get(lc)
    if (ex) {
      ex.lifetime += add
      if (!ex.userId && o.user_id) ex.userId = o.user_id
    } else {
      aggregated.set(lc, { email: o.email, userId: o.user_id || null, lifetime: add })
    }
  }

  const { data: existingRows, error: existingErr } = await supabase
    .from('loyalty_points')
    .select(
      'id, email, user_id, points_balance, lifetime_points, tier, status_mail_sent_at, status_mail_count, last_tier_mailed'
    )
  if (existingErr) throw existingErr

  const byEmail = new Map<string, any>()
  for (const r of existingRows || []) {
    if (r.email) byEmail.set(r.email.toLowerCase(), r)
  }

  const toInsert: any[] = []
  for (const [lc, agg] of aggregated) {
    if (byEmail.has(lc)) continue
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
    const { error } = await supabase.from('loyalty_points').insert(toInsert)
    if (error) console.warn('[broadcast] Insert missing rows warning:', error.message)
  }

  const { data: allRows } = await supabase
    .from('loyalty_points')
    .select(
      'id, email, user_id, points_balance, lifetime_points, tier, status_mail_sent_at, status_mail_count, last_tier_mailed'
    )

  const recipients = (allRows || []).filter((row) => {
    if (!row.email) return false
    if (testEmail) return row.email.toLowerCase() === testEmail
    if (row.status_mail_sent_at && !resetProgress) return false
    return true
  })

  const selected = testEmail
    ? recipients
    : recipients.slice(0, batchSize)

  // Per ontvanger: zoek de meest recente order op om een echte naam te
  // hebben (anders krijgt de hero "Status,\n<email-localpart>.")
  const namesByEmail = new Map<string, string>()
  const targetEmails = selected.map((r) => r.email).filter(Boolean) as string[]
  if (targetEmails.length > 0) {
    const lcEmails = targetEmails.map((e) => e.toLowerCase())
    const { data: orderRows } = await supabase
      .from('orders')
      .select('email, shipping_address, created_at')
      .in('email', targetEmails)
      .order('created_at', { ascending: false })
    for (const o of orderRows || []) {
      if (!o?.email) continue
      const lc = o.email.toLowerCase()
      if (!lcEmails.includes(lc) || namesByEmail.has(lc)) continue
      const sa: any = o.shipping_address || {}
      const candidate =
        sa.firstName ||
        (typeof sa.name === 'string' ? sa.name.split(' ')[0] : '') ||
        ''
      const trimmed = candidate.trim()
      if (trimmed) namesByEmail.set(lc, trimmed)
    }

    // Fallback via profiles voor wie nog geen naam heeft
    const missing = lcEmails.filter((e) => !namesByEmail.has(e))
    if (missing.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, first_name, full_name')
        .in('email', missing)
      for (const p of profiles || []) {
        if (!p?.email) continue
        const lc = p.email.toLowerCase()
        const name =
          (p as any).first_name ||
          (typeof (p as any).full_name === 'string'
            ? (p as any).full_name.split(' ')[0]
            : '') ||
          ''
        const trimmed = String(name).trim()
        if (trimmed) namesByEmail.set(lc, trimmed)
      }
    }
  }

  console.log('[broadcast] Summary:')
  console.log(`  total loyalty rows     : ${allRows?.length || 0}`)
  console.log(`  distinct paid emails   : ${aggregated.size}`)
  console.log(`  missing rows inserted  : ${toInsert.length}`)
  console.log(`  candidates after filter: ${recipients.length}`)
  console.log(`  selected for this run  : ${selected.length}`)
  if (selected.length) {
    console.log(`  sample                 : ${selected.slice(0, 5).map((r) => r.email).join(', ')}`)
  }

  if (dryRun) {
    console.log('[broadcast] Dry run complete. No mails sent.')
    return
  }

  if (!testEmail && !doSend) {
    console.log('[broadcast] Nothing sent (missing --send or --test=...).')
    return
  }

  let sent = 0
  let failed = 0
  const errors: Array<{ email: string; message: string }> = []

  for (const row of selected) {
    try {
      const lc = row.email.toLowerCase()
      const lookedUp = namesByEmail.get(lc)
      const fallback = row.email.split('@')[0]
      // Capitaliseer email-localpart als laatste redmiddel ("mjgtrip" → "Mjgtrip")
      const niceFallback = fallback
        ? fallback.charAt(0).toUpperCase() + fallback.slice(1)
        : 'Klant'
      const name = lookedUp || niceFallback
      const result = await sendLoyaltyStatusUpdateEmail({
        customerEmail: row.email,
        customerName: name,
        tier: (row.tier as any) || 'bronze',
        pointsBalance: row.points_balance || 0,
        lifetimePoints: row.lifetime_points || 0,
        variant: 'broadcast',
        locale: 'nl',
      })
      if (result?.success) {
        sent++
        await supabase
          .from('loyalty_points')
          .update({
            status_mail_sent_at: new Date().toISOString(),
            status_mail_count: (row.status_mail_count || 0) + 1,
            last_tier_mailed: row.tier || 'bronze',
          })
          .eq('id', row.id)
      } else {
        failed++
        errors.push({ email: row.email, message: (result as any)?.error || 'unknown' })
      }
    } catch (err: any) {
      failed++
      errors.push({ email: row.email, message: err?.message || String(err) })
    }
  }

  console.log(`[broadcast] Sent: ${sent} / Failed: ${failed}`)
  if (errors.length) {
    console.log('[broadcast] First errors:')
    for (const e of errors.slice(0, 10)) console.log(`  ${e.email}: ${e.message}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[broadcast] Fatal:', err)
    process.exit(1)
  })
