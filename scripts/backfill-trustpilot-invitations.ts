/**
 * One-shot Trustpilot review invitation backfill.
 *
 * Context: the original client-side Trustpilot `tp('createInvitation')` flow
 * silently dropped invitations for ~every real order because (a) the
 * `DOMContentLoaded` listener was registered too late under `afterInteractive`,
 * (b) `tp.min.js` only loaded on full cookie consent and (c) there was a
 * one-shot race check with no retry. We now BCC Trustpilot AFS from the
 * server-side "order delivered" e-mail. This script catches up all the
 * historical orders that never got a review invitation.
 *
 * Usage:
 *   npx tsx scripts/backfill-trustpilot-invitations.ts --dry
 *   npx tsx scripts/backfill-trustpilot-invitations.ts --send
 *   npx tsx scripts/backfill-trustpilot-invitations.ts --send --scope=all-paid
 *   npx tsx scripts/backfill-trustpilot-invitations.ts --send --batch=25
 *   npx tsx scripts/backfill-trustpilot-invitations.ts --send --only=<orderId>
 *
 * Scope (default: delivered):
 *   delivered  - payment_status = paid AND status = delivered
 *   all-paid   - payment_status = paid AND status IN (paid, processing, shipped, delivered)
 *                (shipped-but-not-delivered orders still get the delivered
 *                e-mail; Trustpilot portal delay means the review request
 *                won't go out for several days, by which time delivery is
 *                normally complete.)
 *
 * Idempotent: skips orders where `review_invitation_sent_at` is already set.
 * Re-run safe: failures do not mark the order, so they are retried next run.
 */

import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })
// Fall back to .env.vercel for vars like NEXT_PUBLIC_SUPABASE_URL or
// RESEND_API_KEY that only live there on developer machines.
config({ path: path.resolve(process.cwd(), '.env.vercel') })

import { createClient } from '@supabase/supabase-js'
import { sendOrderDeliveredEmail } from '../src/lib/email'
import { logEmail } from '../src/lib/email-logger'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry')
const doSend = args.includes('--send')
const scopeArg = args.find((a) => a.startsWith('--scope='))
const scope: 'delivered' | 'all-paid' =
  scopeArg?.split('=')[1] === 'all-paid' ? 'all-paid' : 'delivered'
const batchArg = args.find((a) => a.startsWith('--batch='))
const batchSize = Math.min(
  Math.max(parseInt(batchArg?.split('=')[1] ?? '50', 10) || 50, 1),
  200
)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyOrderId = onlyArg?.split('=')[1]

if (!dryRun && !doSend) {
  console.error('[backfill] Specify --dry or --send. Aborting.')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TRUSTPILOT_AFS_BCC_EMAIL = process.env.TRUSTPILOT_AFS_BCC_EMAIL?.trim()
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[backfill] Missing Supabase credentials in .env.local. Aborting.')
  process.exit(1)
}

if (!TRUSTPILOT_AFS_BCC_EMAIL && doSend) {
  console.error(
    '[backfill] TRUSTPILOT_AFS_BCC_EMAIL is not set. Without it the delivered\n' +
      '  e-mail is sent to the customer but Trustpilot never receives an invitation\n' +
      '  trigger. Set the env var first (Vercel + .env.local) and re-run.'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function resolveLocale(order: any): string {
  const raw = (order.locale || order.language || 'nl') as string
  return raw === 'en' ? 'en' : 'nl'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCandidates() {
  const query = supabase
    .from('orders')
    .select('id, email, shipping_address, locale, status, payment_status, delivered_at, created_at, order_items(*)')
    .eq('payment_status', 'paid')
    .is('review_invitation_sent_at', null)
    .order('created_at', { ascending: true })

  if (scope === 'delivered') {
    query.eq('status', 'delivered')
  } else {
    query.in('status', ['paid', 'processing', 'shipped', 'delivered'])
  }

  if (onlyOrderId) {
    query.eq('id', onlyOrderId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Supabase query failed: ${error.message}`)
  return data || []
}

async function processOrder(order: any): Promise<{ ok: boolean; reason?: string }> {
  const customerName = (order.shipping_address as any)?.name || 'Klant'
  const customerEmail = order.email as string
  if (!customerEmail) {
    return { ok: false, reason: 'no email on order' }
  }

  const locale = resolveLocale(order)

  const orderItems = (order.order_items || []).map((item: any) => ({
    product_id: item.product_id || '',
    product_name: item.product_name,
    image_url: item.image_url
      ? item.image_url.startsWith('http')
        ? item.image_url
        : `${SITE_URL}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`
      : '',
  }))

  const result = await sendOrderDeliveredEmail({
    customerName,
    customerEmail,
    orderId: order.id,
    orderItems,
    shippingAddress: order.shipping_address,
    deliveryDate: order.delivered_at || new Date().toISOString(),
    locale,
  })

  if (!result.success) {
    return {
      ok: false,
      reason:
        (result.error as any)?.message ||
        JSON.stringify(result.error) ||
        'sendOrderDeliveredEmail failed',
    }
  }

  await logEmail({
    orderId: order.id,
    emailType: 'delivered',
    recipientEmail: customerEmail,
    subject: 'Je MOSE pakket is aangekomen!',
    status: 'sent',
    metadata: { source: 'trustpilot-backfill', scope },
  })

  const nowIso = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      last_email_sent_at: nowIso,
      last_email_type: 'delivered',
      review_invitation_sent_at: nowIso,
    })
    .eq('id', order.id)

  if (updateError) {
    return { ok: false, reason: `DB update failed: ${updateError.message}` }
  }

  return { ok: true }
}

async function main() {
  console.log(`[backfill] mode=${dryRun ? 'DRY' : 'SEND'} scope=${scope} batch=${batchSize}${onlyOrderId ? ` only=${onlyOrderId}` : ''}`)
  console.log(`[backfill] TRUSTPILOT_AFS_BCC_EMAIL ${TRUSTPILOT_AFS_BCC_EMAIL ? 'CONFIGURED' : 'NOT SET (dry only)'}`)

  const candidates = await fetchCandidates()
  console.log(`[backfill] Found ${candidates.length} candidate order(s).`)

  if (candidates.length === 0) {
    console.log('[backfill] Nothing to do.')
    return
  }

  if (dryRun) {
    for (const o of candidates.slice(0, 20)) {
      console.log(
        `  - ${o.id.slice(0, 8)} | ${o.email} | status=${o.status} | delivered_at=${o.delivered_at || '-'}`
      )
    }
    if (candidates.length > 20) {
      console.log(`  … and ${candidates.length - 20} more`)
    }
    console.log('[backfill] DRY run complete. Re-run with --send to actually dispatch.')
    return
  }

  let sent = 0
  let failed = 0
  const failures: { id: string; reason: string }[] = []

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    console.log(
      `[backfill] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)} — ${batch.length} order(s)`
    )

    for (const order of batch) {
      try {
        const result = await processOrder(order)
        if (result.ok) {
          sent++
          console.log(`  ✓ ${order.id.slice(0, 8)} | ${order.email}`)
        } else {
          failed++
          failures.push({ id: order.id, reason: result.reason || 'unknown' })
          console.warn(`  ✗ ${order.id.slice(0, 8)} | ${order.email} — ${result.reason}`)
        }
      } catch (err: any) {
        failed++
        failures.push({ id: order.id, reason: err?.message || 'throw' })
        console.error(`  ✗ ${order.id.slice(0, 8)} — ${err?.message || err}`)
      }
      // Small delay to stay well under Resend rate limit.
      await sleep(150)
    }
  }

  console.log('\n[backfill] Done.')
  console.log(`  Sent:   ${sent}`)
  console.log(`  Failed: ${failed}`)
  if (failures.length) {
    console.log('  Failures:')
    for (const f of failures) {
      console.log(`    - ${f.id.slice(0, 8)} — ${f.reason}`)
    }
  }
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err)
  process.exit(1)
})
