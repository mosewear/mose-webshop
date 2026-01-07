import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

// POST /api/returns/[id]/create-payment-intent - Maak Payment Intent voor retourlabel
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Haal retour op
    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('*, orders!inner(*)')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    // Check of gebruiker eigenaar is
    if (returnRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check of status correct is - klant moet direct kunnen betalen na aanvraag
    if (returnRecord.status !== 'return_label_payment_pending') {
      return NextResponse.json({ 
        error: `Cannot create payment intent. Return status must be 'return_label_payment_pending', current status: ${returnRecord.status}` 
      }, { status: 400 })
    }

    // Check of er al een payment intent is
    if (returnRecord.return_label_payment_intent_id) {
      // Haal bestaande payment intent op
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          returnRecord.return_label_payment_intent_id
        )

        if (existingIntent.status === 'succeeded') {
          return NextResponse.json({ 
            error: 'Payment already completed' 
          }, { status: 400 })
        }

        // Return bestaande client secret
        return NextResponse.json({
          success: true,
          client_secret: existingIntent.client_secret,
          payment_intent_id: existingIntent.id,
          amount: existingIntent.amount,
          return_id: id,
        })
      } catch (error) {
        // Payment intent bestaat niet meer, maak nieuwe
      }
    }

    // Maak nieuwe Payment Intent
    const amount = Math.round(returnRecord.return_label_cost_incl_btw * 100) // €7,87 in cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['ideal', 'card'], // Alleen iDEAL en credit/debit cards (incl. Google Pay & Apple Pay)
      metadata: {
        return_id: id,
        order_id: returnRecord.order_id,
        type: 'return_label_payment',
        user_id: user.id,
      },
      description: `Retourlabel kosten - Return ${id.slice(0, 8).toUpperCase()}`,
      receipt_email: returnRecord.orders.email,
    })

    // Update return met payment intent ID
    const { error: updateError } = await supabase
      .from('returns')
      .update({
        return_label_payment_intent_id: paymentIntent.id,
        return_label_payment_status: 'pending',
        status: 'return_label_payment_pending',
        label_payment_pending_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating return with payment intent:', updateError)
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      return_id: id,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/create-payment-intent:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

