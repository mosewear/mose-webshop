/**
 * Orchestration helpers for gift-card side-effects of an order:
 *  - issuing gift-card codes after payment (idempotent)
 *  - sending delivery e-mails (either immediately or when
 *    `scheduled_send_at` is due)
 *  - committing/reversing redemptions when an order is paid/refunded
 *
 * Kept separate from [src/lib/gift-cards.ts] so that file stays
 * dependency-light (no React Email / settings imports) for cron use.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  commitGiftCardRedemptionsForOrder,
  hashGiftCardCode,
  issueGiftCardsForOrder,
  reverseGiftCardRedemptionsForOrder,
  shouldSendNow,
  type IssuedGiftCardEmailPayload,
} from '@/lib/gift-cards'

async function markDelivered(supabase: SupabaseClient, cardId: string) {
  await supabase
    .from('gift_cards')
    .update({
      delivered_at: new Date().toISOString(),
      last_delivery_error: null,
      pending_delivery_code: null,
    })
    .eq('id', cardId)
}

async function markFailed(
  supabase: SupabaseClient,
  cardId: string,
  err: unknown
) {
  const { data: fresh } = await supabase
    .from('gift_cards')
    .select('delivery_attempts')
    .eq('id', cardId)
    .maybeSingle()
  await supabase
    .from('gift_cards')
    .update({
      delivery_attempts: (fresh?.delivery_attempts || 0) + 1,
      last_delivery_error: String(
        (err as any)?.message || (typeof err === 'string' ? err : JSON.stringify(err))
      ).slice(0, 500),
    })
    .eq('id', cardId)
}

async function sendCardEmail(
  payload: IssuedGiftCardEmailPayload,
  locale: string,
  orderId?: string | null
) {
  const { sendGiftCardDeliveryEmail } = await import('@/lib/email')
  return sendGiftCardDeliveryEmail({
    toEmail: payload.recipientEmail,
    code: payload.code,
    amount: payload.amount,
    currency: payload.currency,
    expiresAt: payload.expiresAt,
    recipientName: payload.recipientName,
    senderName: payload.senderName,
    personalMessage: payload.personalMessage,
    locale,
    orderId: orderId ?? null,
  })
}

async function deliverIssuedGiftCard(
  supabase: SupabaseClient,
  payload: IssuedGiftCardEmailPayload,
  locale: string,
  orderId?: string | null
) {
  const hash = hashGiftCardCode(payload.code)
  const { data: row } = await supabase
    .from('gift_cards')
    .select('id')
    .eq('code_hash', hash)
    .maybeSingle()
  const cardId = row?.id
  if (!cardId) return

  try {
    const result = await sendCardEmail(payload, locale, orderId)
    if (result?.success) {
      await markDelivered(supabase, cardId)
    } else {
      await markFailed(supabase, cardId, result?.error || 'send failed')
    }
  } catch (err) {
    console.error('[gift-cards] delivery failed:', err)
    await markFailed(supabase, cardId, err)
  }
}

/**
 * Called after an order becomes paid: issues gift cards for this order
 * (idempotent) and sends delivery e-mails for any that should go out now
 * (no scheduled_send_at, or scheduled_send_at already in the past).
 */
export async function processGiftCardsForPaidOrder(
  supabase: SupabaseClient,
  orderId: string,
  locale: string = 'nl'
): Promise<{ issued: number; delivered: number }> {
  const { issued } = await issueGiftCardsForOrder(supabase, orderId)

  let delivered = 0
  for (const payload of issued) {
    const scheduledInFuture =
      payload.scheduledSendAt &&
      new Date(payload.scheduledSendAt).getTime() > Date.now()
    if (scheduledInFuture) continue
    await deliverIssuedGiftCard(supabase, payload, locale, orderId)
    delivered += 1
  }

  // Commit any gift-card redemptions that were reserved at checkout
  // (phase 3 redemption flow — no-op when no reservations exist).
  await commitGiftCardRedemptionsForOrder(supabase, orderId)

  return { issued: issued.length, delivered }
}

/**
 * Called when an order is cancelled or refunded in full: return any
 * committed/reserved gift-card balance to the card.
 */
export async function reverseGiftCardsForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<number> {
  return reverseGiftCardRedemptionsForOrder(supabase, orderId)
}

/**
 * Cron-style entry point: look for gift cards whose `scheduled_send_at`
 * has come due and deliver their e-mails using the `pending_delivery_code`
 * stored at issuance time.
 */
export async function deliverDueScheduledGiftCards(
  supabase: SupabaseClient,
  locale: string = 'nl',
  limit: number = 100
): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('gift_cards')
    .select(
      'id, pending_delivery_code, initial_amount, currency, expires_at, recipient_email, recipient_name, sender_name, personal_message, scheduled_send_at, delivered_at, delivery_attempts, purchased_by_order_id'
    )
    .lte('scheduled_send_at', nowIso)
    .is('delivered_at', null)
    .lt('delivery_attempts', 5)
    .not('pending_delivery_code', 'is', null)
    .limit(limit)

  if (error || !data) {
    if (error) console.error('[gift-cards] scheduled lookup error:', error)
    return 0
  }

  let sent = 0
  for (const card of data as any[]) {
    if (!shouldSendNow(card)) continue
    const toEmail: string = card.recipient_email || ''
    if (!toEmail || !card.pending_delivery_code) continue

    // Resolve the locale for this card: prefer the originating order's
    // locale so recipients always see the language the purchaser used.
    let cardLocale = locale
    if (card.purchased_by_order_id) {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('locale')
          .eq('id', card.purchased_by_order_id)
          .maybeSingle()
        if (order && typeof (order as any).locale === 'string' && (order as any).locale) {
          cardLocale = (order as any).locale
        }
      } catch {
        /* swallow — fall back to default locale */
      }
    }

    const payload: IssuedGiftCardEmailPayload = {
      code: card.pending_delivery_code,
      amount: Number(card.initial_amount),
      currency: card.currency || 'EUR',
      expiresAt: card.expires_at,
      recipientEmail: toEmail,
      recipientName: card.recipient_name,
      senderName: card.sender_name,
      personalMessage: card.personal_message,
      purchaserEmail: '',
      scheduledSendAt: card.scheduled_send_at,
    }

    try {
      const result = await sendCardEmail(payload, cardLocale, card.purchased_by_order_id)
      if (result?.success) {
        await markDelivered(supabase, card.id)
        sent += 1
      } else {
        await markFailed(supabase, card.id, result?.error || 'send failed')
      }
    } catch (err) {
      await markFailed(supabase, card.id, err)
    }
  }

  return sent
}
