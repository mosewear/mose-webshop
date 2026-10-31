import type { GiftCardRecipient } from '@/store/cart'

/** The full delivery payload determines line identity. Hash it so cart IDs never
 * contain recipient details; equal gifts merge, distinct gifts stay separate. */
export async function giftCardCartKey(productId: string, amount: number, recipient: GiftCardRecipient | null) {
  const payload = JSON.stringify([productId, Math.round(amount * 100), recipient?.recipientEmail ?? '',
    recipient?.recipientName ?? '', recipient?.senderName ?? '', recipient?.personalMessage ?? '',
    recipient?.scheduledSendAt ?? ''])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return `giftcard:${productId}:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`
}
