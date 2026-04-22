import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  type SlidingWindowEntry,
} from '@/lib/rate-limit-ip'
import { findActiveGiftCardByCode, maskFromLast4 } from '@/lib/gift-cards'

// Per-IP sliding window: 10 attempts / minute to prevent brute force.
const rateLimitMap = new Map<string, SlidingWindowEntry>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 60_000

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!checkSlidingWindowRateLimit(rateLimitMap, ip, MAX_ATTEMPTS, WINDOW_MS)) {
      return NextResponse.json(
        { valid: false, error: 'rate_limited' },
        { status: 429 }
      )
    }

    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'invalid_code' },
        { status: 200 }
      )
    }

    const supabase = createServiceClient()
    const result = await findActiveGiftCardByCode(supabase as any, code)

    if (!result.ok) {
      const reasonToError: Record<string, string> = {
        not_found: 'Onbekende code',
        inactive: 'Cadeaubon is niet meer actief',
        expired: 'Cadeaubon is verlopen',
        depleted: 'Cadeaubon heeft geen saldo meer',
      }
      return NextResponse.json(
        {
          valid: false,
          reason: result.reason,
          error: reasonToError[result.reason] || 'Code ongeldig',
        },
        { status: 200 }
      )
    }

    const card = result.card
    return NextResponse.json({
      valid: true,
      cardId: card.id,
      balance: Number(card.balance),
      currency: card.currency,
      maskedCode: maskFromLast4(card.code_last4),
      expiresAt: card.expires_at,
    })
  } catch (error) {
    console.error('[gift-cards/validate] error:', error)
    return NextResponse.json(
      { valid: false, error: 'server_error' },
      { status: 500 }
    )
  }
}
