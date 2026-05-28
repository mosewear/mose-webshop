/**
 * Postmark webhook receiver.
 *
 * Postmark POSTs JSON to this endpoint whenever a sent message ends up
 * bouncing, gets flagged as spam, or the recipient uses the one-click
 * unsubscribe link in the List-Unsubscribe header. The handler writes
 * those signals into our suppression registry so the next send to the
 * same address is silently skipped — exactly the deliverability hygiene
 * that was missing under Resend (and what got us suspended there).
 *
 * Configure in Postmark dashboard → Servers → Webhooks:
 *   URL          : https://www.mosewear.com/api/postmark-webhook
 *   HTTP Auth    : Basic — username = POSTMARK_WEBHOOK_USER,
 *                          password = POSTMARK_WEBHOOK_PASSWORD
 *   Triggers     : Bounce + SpamComplaint + SubscriptionChange
 *   Include data : "Include bounce content in payload" = on
 *
 * Postmark sends ONE event per request. We never throw — even a payload
 * we don't recognise gets a 200 so Postmark doesn't pile up retries
 * (their dashboard already surfaces our parse failure if needed).
 *
 * Reference payloads:
 *   https://postmarkapp.com/developer/webhooks/bounce-webhook
 *   https://postmarkapp.com/developer/webhooks/spam-complaint-webhook
 *   https://postmarkapp.com/developer/webhooks/subscription-change-webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { addSuppression, type SuppressionReason } from '@/lib/email-suppression'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/** Postmark "hard" bounce types. Soft bounces (transient) are ignored. */
const HARD_BOUNCE_TYPES = new Set<string>([
  'HardBounce',
  'BadEmailAddress',
  'ManuallyDeactivated',
  'Unknown',
  'SpamNotification',
  'OpenRelayTest',
  'Unsubscribe',
  'AddressChange',
  'DnsError',
  'Blocked',
  'SMTPApiError',
])

interface BouncePayload {
  RecordType: 'Bounce'
  ID?: number
  Type?: string
  TypeCode?: number
  Email?: string
  MessageID?: string
  Description?: string
  Details?: string
  Subject?: string
  Inactive?: boolean
}

interface SpamComplaintPayload {
  RecordType: 'SpamComplaint'
  ID?: number
  Type?: string
  Email?: string
  MessageID?: string
  Description?: string
  Details?: string
}

interface SubscriptionChangePayload {
  RecordType: 'SubscriptionChange'
  Recipient?: string
  MessageID?: string
  /** "true" when the recipient unsubscribed, "false" when re-subscribed. */
  SuppressSending?: boolean
  SuppressionReason?: string
  ChangedAt?: string
  Origin?: string
}

type PostmarkWebhookPayload =
  | BouncePayload
  | SpamComplaintPayload
  | SubscriptionChangePayload
  | { RecordType?: string; [key: string]: unknown }

function verifyBasicAuth(req: NextRequest): boolean {
  const expectedUser = process.env.POSTMARK_WEBHOOK_USER
  const expectedPass = process.env.POSTMARK_WEBHOOK_PASSWORD
  // If neither is configured we refuse all requests — fail closed
  // instead of accidentally accepting raw internet traffic in case
  // someone misconfigures Vercel envs.
  if (!expectedUser || !expectedPass) return false

  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return false

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8')
    const sep = decoded.indexOf(':')
    if (sep === -1) return false
    const user = decoded.slice(0, sep)
    const pass = decoded.slice(sep + 1)
    return user === expectedUser && pass === expectedPass
  } catch {
    return false
  }
}

async function clearSuppression(email: string): Promise<void> {
  const normalised = email.trim().toLowerCase()
  if (!normalised) return
  try {
    const supabase = createServiceClient()
    await supabase
      .from('email_suppressions')
      .delete()
      .eq('email', normalised)
    await supabase
      .from('newsletter_subscribers')
      .update({
        suppressed_at: null,
        suppression_reason: null,
      })
      .eq('email', normalised)
  } catch (err) {
    console.error('[postmark-webhook] clearSuppression failed', err)
  }
}

export async function POST(req: NextRequest) {
  if (!verifyBasicAuth(req)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 },
    )
  }

  let payload: PostmarkWebhookPayload
  try {
    payload = (await req.json()) as PostmarkWebhookPayload
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    )
  }

  const recordType =
    typeof payload?.RecordType === 'string' ? payload.RecordType : null

  try {
    if (recordType === 'Bounce') {
      const p = payload as BouncePayload
      if (!p.Email) {
        return NextResponse.json({ ok: true, ignored: 'no_email' })
      }
      const isHard = p.Type ? HARD_BOUNCE_TYPES.has(p.Type) : true
      if (!isHard) {
        // Soft bounce — Postmark will keep retrying. We don't
        // suppress on a single transient failure.
        console.log('[postmark-webhook] ignoring soft bounce', {
          email: p.Email,
          type: p.Type,
        })
        return NextResponse.json({ ok: true, ignored: 'soft_bounce' })
      }
      const reason: SuppressionReason =
        p.Type === 'SpamNotification' ? 'spam_complaint' : 'hard_bounce'
      await addSuppression({
        email: p.Email,
        reason,
        source: 'postmark_webhook',
        providerMessageId: p.MessageID ?? null,
        details: {
          type: p.Type,
          description: p.Description,
          details: p.Details,
          subject: p.Subject,
          inactive: p.Inactive,
          id: p.ID,
        },
      })
      return NextResponse.json({ ok: true, suppressed: p.Email, reason })
    }

    if (recordType === 'SpamComplaint') {
      const p = payload as SpamComplaintPayload
      if (!p.Email) {
        return NextResponse.json({ ok: true, ignored: 'no_email' })
      }
      await addSuppression({
        email: p.Email,
        reason: 'spam_complaint',
        source: 'postmark_webhook',
        providerMessageId: p.MessageID ?? null,
        details: {
          type: p.Type,
          description: p.Description,
          details: p.Details,
          id: p.ID,
        },
      })
      return NextResponse.json({ ok: true, suppressed: p.Email })
    }

    if (recordType === 'SubscriptionChange') {
      const p = payload as SubscriptionChangePayload
      const email = p.Recipient || ''
      if (!email) {
        return NextResponse.json({ ok: true, ignored: 'no_recipient' })
      }
      if (p.SuppressSending) {
        await addSuppression({
          email,
          reason: 'manual',
          source: 'postmark_subscription_change',
          providerMessageId: p.MessageID ?? null,
          details: {
            suppression_reason: p.SuppressionReason,
            origin: p.Origin,
            changed_at: p.ChangedAt,
          },
        })
        return NextResponse.json({ ok: true, suppressed: email })
      }
      // Re-subscribed via Postmark dashboard — clear the local
      // suppression to mirror.
      await clearSuppression(email)
      return NextResponse.json({ ok: true, reactivated: email })
    }

    console.warn('[postmark-webhook] unhandled record type', recordType)
    return NextResponse.json({ ok: true, ignored: recordType || 'unknown' })
  } catch (err) {
    console.error('[postmark-webhook] handler error', err)
    // Still return 200 so Postmark doesn't retry — the suppression
    // helper already logs its own errors and the next bounce report
    // will catch us up.
    return NextResponse.json({ ok: true, error: 'handler_error' })
  }
}

export async function GET() {
  // Postmark dashboard "Send test request" sometimes uses GET; respond
  // 200 so the test passes without exposing whether the basic-auth
  // creds are configured.
  return NextResponse.json({ ok: true, service: 'postmark-webhook' })
}
