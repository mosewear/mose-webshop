/**
 * Email suppression helper.
 *
 * One source of truth for "are we allowed to email this address?".
 * Consulted by:
 *   * src/lib/email.ts#sendAndLog — pre-send check per recipient
 *   * src/app/api/postmark-webhook/route.ts — writes new suppressions
 *   * any recipient-list builder that loops over addresses outside
 *     of `newsletter_recipients_not_yet_mailed` (e.g. the insider
 *     blast which queries `newsletter_subscribers` directly)
 *
 * Why two storage locations
 * -------------------------
 * `newsletter_subscribers.suppressed_at` flags a known subscriber so
 * the row survives (re-subscription wipes the flag) and the admin
 * subscribers UI can show "bounced" badges. `email_suppressions` is
 * a separate registry for *non-subscriber* addresses we still send
 * to — guest checkouts, back-in-stock requests, contact-form
 * senders — where there's no subscriber row to flag.
 *
 * The Postmark webhook writes to BOTH so a hard bounce on a
 * subscriber address propagates everywhere.
 */

import { createServiceClient } from '@/lib/supabase/service'

export type SuppressionReason =
  | 'hard_bounce'
  | 'spam_complaint'
  | 'manual'
  | 'soft_bounce_threshold'

export interface AddSuppressionInput {
  email: string
  reason: SuppressionReason
  source?: string
  providerMessageId?: string | null
  details?: Record<string, unknown> | null
}

/**
 * Return true when the recipient must NOT receive any further mail.
 * Checks both the newsletter_subscribers flag (suppressed_at) and the
 * non-subscriber email_suppressions registry. The check is
 * case-insensitive — every comparison in the database uses
 * `lower(email)` so we mirror that here.
 *
 * Never throws — on any DB error we return `false` so a transient
 * Supabase outage cannot accidentally cause us to silently drop a
 * critical transactional mail. The webhook will catch us up on the
 * next bounce report anyway.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return false
  const normalised = email.trim().toLowerCase()
  if (!normalised) return false

  try {
    const supabase = createServiceClient()

    // Subscriber row check first — the table is much smaller and the
    // common case (most suppressed addresses are subscribers) hits
    // here.
    const { data: sub, error: subErr } = await supabase
      .from('newsletter_subscribers')
      .select('id, suppressed_at')
      .eq('email', normalised)
      .limit(1)
      .maybeSingle()

    if (!subErr && sub?.suppressed_at) {
      return true
    }

    // Fallback for non-subscribers (guest checkouts etc.).
    const { data: sup, error: supErr } = await supabase
      .from('email_suppressions')
      .select('id')
      .eq('email', normalised)
      .limit(1)
      .maybeSingle()

    if (!supErr && sup?.id) {
      return true
    }

    return false
  } catch (err) {
    console.error('[email-suppression] isEmailSuppressed crashed', err)
    return false
  }
}

/**
 * Register an address as suppressed. Idempotent — calling twice with
 * the same email is a no-op insert on the unique-on-lower(email)
 * index and updates the newsletter_subscribers flag if a matching
 * subscriber exists. Used by the Postmark webhook (per bounce event)
 * and by admin tooling (manual additions).
 *
 * Never throws — on a duplicate, just returns silently.
 */
export async function addSuppression(input: AddSuppressionInput): Promise<void> {
  const email = input.email?.trim().toLowerCase()
  if (!email) return

  try {
    const supabase = createServiceClient()

    const nowIso = new Date().toISOString()

    // Upsert into email_suppressions on lower(email). Postgres treats
    // the unique-on-(lower(email)) index as the conflict target;
    // Supabase JS only supports column-list conflicts, so we use
    // insert + ignore-duplicate semantics via .onConflict('email')
    // with the canonical lowercase value.
    const { error: insertErr } = await supabase
      .from('email_suppressions')
      .upsert(
        {
          email,
          reason: input.reason,
          source: input.source || 'postmark_webhook',
          provider_message_id: input.providerMessageId ?? null,
          details: (input.details ?? null) as never,
        },
        { onConflict: 'email', ignoreDuplicates: false },
      )

    if (insertErr) {
      // Some DBs reject the upsert because we have a UNIQUE on
      // lower(email) (not email). Fall back to manual idempotent
      // insert; a true duplicate just gets logged and dropped.
      const { error: bareInsertErr } = await supabase
        .from('email_suppressions')
        .insert({
          email,
          reason: input.reason,
          source: input.source || 'postmark_webhook',
          provider_message_id: input.providerMessageId ?? null,
          details: (input.details ?? null) as never,
        })
      if (bareInsertErr && !bareInsertErr.message?.toLowerCase().includes('duplicate')) {
        console.error('[email-suppression] insert failed', {
          email,
          reason: input.reason,
          error: bareInsertErr,
        })
      }
    }

    // Mirror onto newsletter_subscribers row if present so the admin
    // UI shows the bounce/complaint inline with the subscriber.
    const isBounce = input.reason === 'hard_bounce'
    const updates: Record<string, unknown> = {
      suppressed_at: nowIso,
      suppression_reason: input.reason,
    }
    if (isBounce) updates.bounced_at = nowIso
    // Spam complaints are also recorded as unsubscribed so the
    // marketing send paths never re-add them on a follow-up signup.
    if (input.reason === 'spam_complaint') {
      updates.status = 'unsubscribed'
      updates.unsubscribed_at = nowIso
    }

    const { error: updateErr } = await supabase
      .from('newsletter_subscribers')
      .update(updates)
      .eq('email', email)

    if (updateErr) {
      console.error('[email-suppression] subscriber update failed', {
        email,
        error: updateErr,
      })
    }
  } catch (err) {
    console.error('[email-suppression] addSuppression crashed', err)
  }
}
