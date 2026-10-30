/**
 * Gift card utilities (cadeaubonnen).
 *
 * Design:
 *  - Codes are bearer instruments. We store only a SHA-256 hash in DB
 *    (plus the last 4 chars for admin display) and reveal the plaintext
 *    code only once to the recipient (and briefly in the admin create
 *    response so the operator can copy it).
 *  - Balance operations are atomic via Postgres functions defined in
 *    `supabase/migrations/20260422160000_gift_cards.sql`:
 *      - reserve_gift_card_balance(p_card_id, p_order_id, p_amount)
 *      - commit_gift_card_redemptions_for_order(p_order_id)
 *      - reverse_gift_card_redemptions_for_order(p_order_id)
 *  - `issueGiftCardsForOrder(orderId)` is idempotent via
 *    `orders.gift_cards_issued_at` inside the same database transaction as every unit.
 */

import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const GIFT_CARD_CODE_PREFIX = 'MOSE'
export const GIFT_CARD_CODE_GROUPS = 4
export const GIFT_CARD_GROUP_SIZE = 4
// Crockford-ish alphabet: no 0/O/1/I/L to avoid transcription mistakes.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const MAX_DELIVERY_ATTEMPTS = 5

// -----------------------------------------------------------------------------
// Code generation / formatting
// -----------------------------------------------------------------------------

export function generateGiftCardCode(): string {
  const groups: string[] = [GIFT_CARD_CODE_PREFIX]
  for (let g = 0; g < GIFT_CARD_CODE_GROUPS; g++) {
    let chunk = ''
    for (let i = 0; i < GIFT_CARD_GROUP_SIZE; i++) {
      const idx = crypto.randomInt(0, CODE_ALPHABET.length)
      chunk += CODE_ALPHABET[idx]
    }
    groups.push(chunk)
  }
  return groups.join('-')
}

export function normalizeGiftCardCode(raw: string): string {
  if (!raw) return ''
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function hashGiftCardCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeGiftCardCode(code))
    .digest('hex')
}

export function getCodeLast4(code: string): string {
  const n = normalizeGiftCardCode(code)
  return n.slice(-4)
}

export function maskGiftCardCode(code: string): string {
  const n = normalizeGiftCardCode(code)
  if (n.length <= 4) return n
  return `${GIFT_CARD_CODE_PREFIX}-XXXX-XXXX-${n.slice(-4)}`
}

export function maskFromLast4(last4: string): string {
  return `${GIFT_CARD_CODE_PREFIX}-XXXX-XXXX-${(last4 || '').slice(-4)}`
}

// -----------------------------------------------------------------------------
// Lookup
// -----------------------------------------------------------------------------

export interface GiftCardRow {
  id: string
  code_hash: string
  code_last4: string
  initial_amount: number
  balance: number
  currency: string
  status: 'active' | 'depleted' | 'expired' | 'cancelled'
  expires_at: string | null
  source: 'purchase' | 'admin' | 'refund'
  purchased_by_email: string | null
  purchased_by_order_id: string | null
  recipient_email: string | null
  recipient_name: string | null
  sender_name: string | null
  personal_message: string | null
  scheduled_send_at: string | null
  delivered_at: string | null
  delivery_attempts: number
  last_delivery_error: string | null
  created_by: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export async function findActiveGiftCardByCode(
  supabase: SupabaseClient,
  code: string
): Promise<
  | { ok: true; card: GiftCardRow }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'depleted' }
> {
  const hash = hashGiftCardCode(code)
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('code_hash', hash)
    .maybeSingle()

  if (error || !data) return { ok: false, reason: 'not_found' }
  const card = data as GiftCardRow

  if (card.status === 'cancelled') return { ok: false, reason: 'inactive' }
  if (card.status === 'expired') return { ok: false, reason: 'expired' }

  if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) {
    await supabase
      .from('gift_cards')
      .update({ status: 'expired' })
      .eq('id', card.id)
    return { ok: false, reason: 'expired' }
  }

  if (card.status === 'depleted' || Number(card.balance) <= 0) {
    return { ok: false, reason: 'depleted' }
  }

  return { ok: true, card }
}

// -----------------------------------------------------------------------------
// Atomic balance ops (wrappers around Postgres RPC)
// -----------------------------------------------------------------------------

export async function reserveGiftCardBalance(
  supabase: SupabaseClient,
  params: { cardId: string; orderId: string; amount: number }
): Promise<{ ok: true; redemptionId: string } | { ok: false; error: string }> {
  const { cardId, orderId, amount } = params
  const rounded = Math.round(amount * 100) / 100
  if (rounded <= 0) return { ok: false, error: 'amount must be positive' }

  const { data, error } = await supabase.rpc('reserve_gift_card_balance', {
    p_card_id: cardId,
    p_order_id: orderId,
    p_amount: rounded,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, redemptionId: data as unknown as string }
}

export async function commitGiftCardRedemptionsForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'commit_gift_card_redemptions_for_order',
    { p_order_id: orderId }
  )
  if (error) {
    console.error('commitGiftCardRedemptionsForOrder error:', error)
    return 0
  }
  return Number(data) || 0
}

export async function reverseGiftCardRedemptionsForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'reverse_gift_card_redemptions_for_order',
    { p_order_id: orderId }
  )
  if (error) {
    console.error('reverseGiftCardRedemptionsForOrder error:', error)
    return 0
  }
  return Number(data) || 0
}

// -----------------------------------------------------------------------------
// Creation helpers
// -----------------------------------------------------------------------------

export interface CreateGiftCardInput {
  amount: number
  currency?: string
  expiresAt?: string | null
  validityMonths?: number | null
  source: 'purchase' | 'admin' | 'refund'
  purchasedByEmail?: string | null
  purchasedByOrderId?: string | null
  recipientEmail?: string | null
  recipientName?: string | null
  senderName?: string | null
  personalMessage?: string | null
  scheduledSendAt?: string | null
  createdBy?: string | null
  adminNotes?: string | null
}

export interface CreatedGiftCard {
  id: string
  code: string
  last4: string
  expiresAt: string | null
  initialAmount: number
}

/**
 * Create a gift card with a freshly generated code. Handles collisions
 * on `code_hash` by retrying a few times.
 */
export async function createGiftCard(
  supabase: SupabaseClient,
  input: CreateGiftCardInput
): Promise<CreatedGiftCard> {
  const amount = Math.round(input.amount * 100) / 100
  if (amount <= 0) throw new Error('Gift card amount must be positive')

  let expiresAt: string | null = null
  if (input.expiresAt) {
    expiresAt = new Date(input.expiresAt).toISOString()
  } else if (input.validityMonths && input.validityMonths > 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + input.validityMonths)
    expiresAt = d.toISOString()
  }

  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGiftCardCode()
    const code_hash = hashGiftCardCode(code)
    const code_last4 = getCodeLast4(code)

    const isScheduled =
      !!input.scheduledSendAt && new Date(input.scheduledSendAt).getTime() > Date.now()

    const { data, error } = await supabase
      .from('gift_cards')
      .insert({
        code_hash,
        code_last4,
        // Only keep the plaintext code when we still need it for a future
        // scheduled delivery. Cleared once the e-mail is sent.
        pending_delivery_code: isScheduled ? code : null,
        initial_amount: amount,
        balance: amount,
        currency: input.currency || 'EUR',
        status: 'active',
        expires_at: expiresAt,
        source: input.source,
        purchased_by_email: input.purchasedByEmail ?? null,
        purchased_by_order_id: input.purchasedByOrderId ?? null,
        recipient_email: input.recipientEmail ?? null,
        recipient_name: input.recipientName ?? null,
        sender_name: input.senderName ?? null,
        personal_message: input.personalMessage ?? null,
        scheduled_send_at: input.scheduledSendAt ?? null,
        created_by: input.createdBy ?? null,
        admin_notes: input.adminNotes ?? null,
      })
      .select('id, expires_at, initial_amount')
      .single()

    if (!error && data) {
      return {
        id: data.id as string,
        code,
        last4: code_last4,
        expiresAt: (data.expires_at as string | null) ?? null,
        initialAmount: Number(data.initial_amount),
      }
    }

    lastError = error
    const message = (error?.message || '').toLowerCase()
    if (!message.includes('code_hash') && !message.includes('duplicate')) break
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to create gift card')
}

// -----------------------------------------------------------------------------
// Issuance for purchased orders (idempotent)
// -----------------------------------------------------------------------------

export interface GiftCardOrderItemMetadata {
  amount?: number
  recipientName?: string
  recipientEmail?: string
  senderName?: string
  personalMessage?: string
  scheduledSendAt?: string | null
}

export interface IssuedGiftCardEmailPayload {
  code: string
  amount: number
  currency: string
  expiresAt: string | null
  recipientEmail: string
  recipientName: string | null
  senderName: string | null
  personalMessage: string | null
  purchaserEmail: string
  scheduledSendAt: string | null
}

/**
 * Generate + persist gift-card codes for every gift-card order_item on a
 * paid order. Idempotent via `orders.gift_cards_issued_at`.
 *
 * Returns the list of newly issued cards, so the caller can send delivery
 * e-mails (or queue them when `scheduledSendAt` is in the future).
 */
export async function issueGiftCardsForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ issued: IssuedGiftCardEmailPayload[]; skipped: boolean }> {
  // The database locks the paid order, inserts all units and marks issuance in
  // one transaction. Retries return only the existing undelivered capabilities.
  // An application-side timestamp check cannot prevent parallel webhook issues.
  const { data: order, error: orderError } = await supabase
    .from('orders').select('id,payment_status,gift_cards_issued_at').eq('id', orderId).maybeSingle()
  if (orderError || !order) throw new Error('GIFT_ORDER_UNAVAILABLE')
  if (order.payment_status !== 'paid') return { issued: [], skipped: true }
  let units: { orderItemId: string; unitIndex: number; code: string; codeHash: string }[] = []
  if (!order.gift_cards_issued_at) {
    const { data: items, error: itemsError } = await supabase.from('order_items')
      .select('id,quantity').eq('order_id', orderId).eq('is_gift_card', true)
    if (itemsError || !Array.isArray(items)) throw new Error('GIFT_ORDER_ITEMS_UNAVAILABLE')
    units = items.flatMap(item => {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('GIFT_INVALID_QUANTITY')
      return Array.from({ length: item.quantity }, (_, unitIndex) => {
        const code = generateGiftCardCode()
        return { orderItemId: item.id, unitIndex, code, codeHash: hashGiftCardCode(code) }
      })
    })
  }
  const result = await supabase.rpc('issue_paid_order_gift_cards', { p_order_id: orderId, p_units: units })
  if (result.error || !Array.isArray(result.data)) throw new Error('GIFT_ATOMIC_ISSUANCE_UNCONFIRMED')
  const issued = result.data as IssuedGiftCardEmailPayload[]
  return { issued, skipped: issued.length === 0 }
}

// -----------------------------------------------------------------------------
// Misc helpers
// -----------------------------------------------------------------------------

export function shouldSendNow(card: {
  scheduled_send_at: string | null
  delivered_at: string | null
  delivery_attempts: number
}): boolean {
  if (card.delivered_at) return false
  if (card.delivery_attempts >= MAX_DELIVERY_ATTEMPTS) return false
  if (!card.scheduled_send_at) return true
  return new Date(card.scheduled_send_at).getTime() <= Date.now()
}

export function clampRedeemAmount(balance: number, remainingTotal: number): number {
  const b = Math.max(0, Math.round(balance * 100) / 100)
  const r = Math.max(0, Math.round(remainingTotal * 100) / 100)
  return Math.min(b, r)
}
