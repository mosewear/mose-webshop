import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { giftCardCartKey } from '@/lib/gift-card-cart-key'
beforeEach(() => vi.stubGlobal('crypto', webcrypto))
afterEach(() => vi.unstubAllGlobals())
const recipient = {recipientEmail: 'long-recipient-address@example.com', recipientName: 'Anne', senderName: 'Rick', personalMessage: 'Veel plezier!', scheduledSendAt: '2026-11-05'}
it('separates gifts that shared the old truncated key but have different messages, recipients, senders or dates', async () => {
 const baseline = await giftCardCartKey('gift', 50, recipient)
 for (const changed of [{personalMessage:'Gefeliciteerd!'}, {recipientName:'Sam'}, {senderName:'Irm'}, {scheduledSendAt:'2026-11-06'}, {recipientEmail:'other@example.com'}]) {
  expect(await giftCardCartKey('gift', 50, {...recipient,...changed})).not.toBe(baseline)
 }
 expect(baseline).toMatch(/^giftcard:gift:[a-f0-9]{64}$/)
 expect(baseline).not.toContain(recipient.recipientEmail)
})
it('keeps identical gifts mergeable and includes amount and product in identity', async () => {
 const a=await giftCardCartKey('gift',50,recipient)
 expect(await giftCardCartKey('gift',50,{...recipient})).toBe(a)
 expect(await giftCardCartKey('gift',51,recipient)).not.toBe(a)
 expect(await giftCardCartKey('other',50,recipient)).not.toBe(a)
 expect(await giftCardCartKey('gift',50,null)).not.toBe(a)
})
it('preserves Unicode and does not confuse delimiter-containing fields', async () => {
 const a=await giftCardCartKey('gift',50,{recipientName:'Zoë|李',senderName:'🎁'})
 const b=await giftCardCartKey('gift',50,{recipientName:'Zoë',senderName:'李|🎁'})
 expect(a).not.toBe(b)
})
