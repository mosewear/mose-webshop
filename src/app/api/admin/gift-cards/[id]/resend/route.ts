import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/admin/gift-cards/:id/resend
 *
 * Resend the delivery e-mail. Only works when we still hold the plaintext
 * code (i.e. `pending_delivery_code` is set — the case when the bon was
 * created with a scheduled send-at and hasn't been delivered yet).
 *
 * Once a bon has been delivered once, we deliberately no longer have the
 * plaintext code on file (security), so admins should cancel + re-issue
 * instead. The response makes that clear.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const toEmailOverride =
      typeof body.recipient_email === 'string' && body.recipient_email.trim()
        ? body.recipient_email.trim()
        : null
    const locale = typeof body.locale === 'string' ? body.locale : 'nl'

    const supabase = createServiceRoleClient()
    const { data: card, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !card) {
      return NextResponse.json(
        { success: false, error: 'Cadeaubon niet gevonden' },
        { status: 404 }
      )
    }

    if (!card.pending_delivery_code) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Opnieuw versturen is niet mogelijk: de code is al afgeleverd en wordt niet meer opgeslagen. Maak een nieuwe bon aan.',
        },
        { status: 400 }
      )
    }

    const toEmail = toEmailOverride || card.recipient_email
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: 'Geen ontvanger-e-mail beschikbaar' },
        { status: 400 }
      )
    }

    const { sendGiftCardDeliveryEmail } = await import('@/lib/email')
    const result = await sendGiftCardDeliveryEmail({
      toEmail,
      code: card.pending_delivery_code,
      amount: Number(card.initial_amount),
      currency: card.currency || 'EUR',
      expiresAt: card.expires_at,
      recipientName: card.recipient_name,
      senderName: card.sender_name,
      personalMessage: card.personal_message,
      locale,
      orderId: card.purchased_by_order_id,
    })

    if (result?.success) {
      await supabase
        .from('gift_cards')
        .update({
          delivered_at: new Date().toISOString(),
          last_delivery_error: null,
          pending_delivery_code: null,
        })
        .eq('id', card.id)
      return NextResponse.json({ success: true })
    }

    await supabase
      .from('gift_cards')
      .update({
        delivery_attempts: (card.delivery_attempts || 0) + 1,
        last_delivery_error: String(
          (result as any)?.error?.message || (result as any)?.error || 'send failed'
        ).slice(0, 500),
      })
      .eq('id', card.id)

    return NextResponse.json(
      { success: false, error: 'Verzenden mislukt' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('[admin/gift-cards/:id/resend] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
