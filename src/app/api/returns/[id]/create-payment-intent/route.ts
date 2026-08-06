import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  asMolliePayment,
  formatMollieAmount,
  getMollieClient,
  getMollieWebhookUrl,
  getReturnPaymentRedirectUrl,
  mollieLocale,
} from '@/lib/mollie'

// POST /api/returns/[id]/create-payment-intent — Mollie payment for return label
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const locale = body?.locale === 'en' ? 'en' : 'nl'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('*, orders!inner(*)')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    if (returnRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (returnRecord.status !== 'return_label_payment_pending') {
      return NextResponse.json(
        {
          error: `Cannot create payment. Return status must be 'return_label_payment_pending', current status: ${returnRecord.status}`,
        },
        { status: 400 }
      )
    }

    const mollie = getMollieClient()

    if (returnRecord.return_label_payment_intent_id) {
      try {
        const existing = await asMolliePayment(
          mollie.payments.get(returnRecord.return_label_payment_intent_id)
        )
        if (existing.status === 'paid') {
          return NextResponse.json(
            { error: 'Payment already completed' },
            { status: 400 }
          )
        }
        if (
          (existing.status === 'open' || existing.status === 'pending') &&
          existing.getCheckoutUrl()
        ) {
          return NextResponse.json({
            success: true,
            checkoutUrl: existing.getCheckoutUrl(),
            payment_id: existing.id,
            amount: existing.amount,
            return_id: id,
          })
        }
      } catch {
        // create new below
      }
    }

    const amountValue = formatMollieAmount(
      Number(returnRecord.return_label_cost_incl_btw)
    )

    const payment = await asMolliePayment(
      mollie.payments.create({
        amount: { currency: 'EUR', value: amountValue },
        description: `Retourlabel kosten - Return ${id.slice(0, 8).toUpperCase()}`,
        redirectUrl: getReturnPaymentRedirectUrl(id, locale),
        webhookUrl: getMollieWebhookUrl(),
        metadata: {
          return_id: id,
          order_id: returnRecord.order_id,
          type: 'return_label_payment',
          user_id: user.id,
        },
        locale: mollieLocale(locale),
      })
    )

    const checkoutUrl = payment.getCheckoutUrl()
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Mollie did not return a checkout URL' },
        { status: 502 }
      )
    }

    const { error: updateError } = await supabase
      .from('returns')
      .update({
        return_label_payment_intent_id: payment.id,
        return_label_payment_status: 'pending',
        status: 'return_label_payment_pending',
        label_payment_pending_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating return with Mollie payment:', updateError)
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      payment_id: payment.id,
      amount: payment.amount,
      return_id: id,
    })
  } catch (error: unknown) {
    console.error('Error in POST /api/returns/[id]/create-payment-intent:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
