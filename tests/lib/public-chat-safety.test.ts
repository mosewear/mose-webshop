import { describe, expect, it } from 'vitest'
import { safeCustomerChatReply, safeCustomerProductDescription } from '@/lib/public-chat-safety'

describe('public chat supplier privacy', () => {
  it('never exposes internal supplier names to customers', () => {
    for (const locale of ['nl', 'en']) {
      const answer = safeCustomerChatReply('We send everything through Tapstitch from China.', locale)
      expect(answer).not.toMatch(/tapstitch|china|supplier|leverancier/i)
      expect(answer).toContain('MOSE')
    }
  })
  it('does not change normal delivery guidance', () => {
    expect(safeCustomerChatReply('Verzendkosten zie je bij het afrekenen.', 'nl'))
      .toBe('Verzendkosten zie je bij het afrekenen.')
  })
  it('removes internal sourcing references from imported product descriptions', () => {
    expect(safeCustomerProductDescription("Tapstitch's Color-Blocked Raglan Long-Sleeve T-Shirt"))
      .toBe('Color-Blocked Raglan Long-Sleeve T-Shirt')
    expect(safeCustomerProductDescription('270 GSM cotton.')).toBe('270 GSM cotton.')
  })
})
