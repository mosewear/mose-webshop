import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createGiftCard } from '@/lib/gift-cards'

// ---------------------------------------------------------------------------
// GET /api/admin/gift-cards
// List gift cards (optionally filter by status / search).
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('q')?.trim() || ''
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500)

    const supabase = createServiceRoleClient()
    let query = supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && ['active', 'depleted', 'expired', 'cancelled'].includes(status)) {
      query = query.eq('status', status)
    }

    if (search.length > 0) {
      const s = search.toUpperCase()
      const last4 = s.slice(-4)
      query = query.or(
        `code_last4.ilike.%${last4}%,recipient_email.ilike.%${search}%,purchased_by_email.ilike.%${search}%,recipient_name.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/gift-cards] list error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[admin/gift-cards] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/gift-cards
// Create a new gift card (source='admin'). Optionally deliver the code via
// email to the recipient immediately. Returns the plaintext code ONCE so the
// operator can copy it.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
    if (!authorized || !adminUser) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bedrag ontbreekt of is ongeldig' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const card = await createGiftCard(supabase as any, {
      amount,
      currency: body.currency || 'EUR',
      expiresAt: body.expires_at || null,
      validityMonths: Number(body.validity_months) || null,
      source: 'admin',
      purchasedByEmail: null,
      purchasedByOrderId: null,
      recipientEmail: body.recipient_email || null,
      recipientName: body.recipient_name || null,
      senderName: body.sender_name || 'MOSE',
      personalMessage: body.personal_message || null,
      scheduledSendAt: body.scheduled_send_at || null,
      createdBy: adminUser.id,
      adminNotes: body.admin_notes || null,
    })

    let delivered: { success: boolean; error?: unknown } | null = null
    const shouldSendNow =
      body.send_email === true &&
      !!body.recipient_email &&
      !body.scheduled_send_at

    if (shouldSendNow) {
      try {
        const { sendGiftCardDeliveryEmail } = await import('@/lib/email')
        delivered = await sendGiftCardDeliveryEmail({
          toEmail: String(body.recipient_email),
          code: card.code,
          amount: card.initialAmount,
          currency: body.currency || 'EUR',
          expiresAt: card.expiresAt,
          recipientName: body.recipient_name || null,
          senderName: body.sender_name || 'MOSE',
          personalMessage: body.personal_message || null,
          locale: body.locale || 'nl',
          orderId: null,
        })
        if (delivered?.success) {
          await supabase
            .from('gift_cards')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', card.id)
        } else {
          await supabase
            .from('gift_cards')
            .update({
              delivery_attempts: 1,
              last_delivery_error: String(
                (delivered?.error as any)?.message ||
                  delivered?.error ||
                  'send failed'
              ).slice(0, 500),
            })
            .eq('id', card.id)
        }
      } catch (emailErr) {
        console.error('[admin/gift-cards] immediate send error:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: card.id,
        code: card.code, // plaintext — shown ONCE
        last4: card.last4,
        initialAmount: card.initialAmount,
        expiresAt: card.expiresAt,
        delivered: delivered?.success === true,
      },
    })
  } catch (error: any) {
    console.error('[admin/gift-cards] POST unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
