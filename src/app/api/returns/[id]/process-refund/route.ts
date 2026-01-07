import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { sendReturnRefundedEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

// POST /api/returns/[id]/process-refund - Admin start refund voor originele items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { authorized } = await requireAdmin()

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { admin_notes } = body

    const supabase = await createClient()

    // Haal retour op
    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('*, orders!inner(*)')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    if (returnRecord.status !== 'return_received') {
      return NextResponse.json({ 
        error: `Cannot process refund. Return status must be 'return_received', current: ${returnRecord.status}` 
      }, { status: 400 })
    }

    // Check of er al een refund is
    if (returnRecord.stripe_refund_id) {
      return NextResponse.json({ 
        error: 'Refund already processed' 
      }, { status: 400 })
    }

    // Check of order een payment intent heeft
    if (!returnRecord.orders.stripe_payment_intent_id) {
      return NextResponse.json({ 
        error: 'Order has no payment intent' 
      }, { status: 400 })
    }

    // Bereken refund amount (alleen items, geen label kosten)
    const refundAmount = returnRecord.refund_amount || 0
    const refundAmountCents = Math.round(refundAmount * 100)

    if (refundAmountCents <= 0) {
      return NextResponse.json({ 
        error: 'Refund amount must be greater than 0' 
      }, { status: 400 })
    }

    // Maak Stripe refund aan
    const refund = await stripe.refunds.create({
      payment_intent: returnRecord.orders.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        return_id: id,
        order_id: returnRecord.order_id,
        type: 'return_refund',
        refund_amount: refundAmount.toString(),
      },
    })

    // Update return met refund informatie
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'refund_processing',
        stripe_refund_id: refund.id,
        stripe_refund_status: refund.status,
        admin_notes: admin_notes || returnRecord.admin_notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating return with refund:', updateError)
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 })
    }

    // Als refund direct succeeded is (meestal het geval)
    if (refund.status === 'succeeded') {
      const { data: finalReturn } = await supabase
        .from('returns')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          stripe_refund_status: 'succeeded',
        })
        .eq('id', id)
        .select()
        .single()

      // Verstuur email naar klant
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('email, shipping_address')
          .eq('id', returnRecord.order_id)
          .single()

        if (order) {
          const shippingAddress = order.shipping_address as any
          
          await sendReturnRefundedEmail({
            customerEmail: order.email,
            customerName: shippingAddress?.name || 'Klant',
            returnId: id,
            orderId: returnRecord.order_id,
            refundAmount: refundAmount,
          })
        }
      } catch (emailError) {
        console.error('Error sending return refunded email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      refund_status: refund.status,
      refund_amount: refundAmount,
      return: updatedReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/process-refund:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

