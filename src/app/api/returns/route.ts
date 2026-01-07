import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/settings'
import { sendReturnApprovedEmail, sendReturnRequestedEmail } from '@/lib/email'
import Stripe from 'stripe'

// GET /api/returns - Haal alle retouren op voor ingelogde gebruiker of admin
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.is_admin === true

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('returns')
      .select(`
        *,
        orders!inner(
          id,
          email,
          total,
          status,
          created_at,
          delivered_at,
          shipping_address
        )
      `)
      .order('created_at', { ascending: false })

    // If not admin, only show own returns
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: returns, error } = await query

    if (error) {
      console.error('Error fetching returns:', error)
      return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 })
    }

    return NextResponse.json({ returns: returns || [] })
  } catch (error: any) {
    console.error('Error in GET /api/returns:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/returns - Maak nieuwe retour aan
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { order_id, return_items, return_reason, customer_notes } = body

    // Validatie
    if (!order_id || !return_items || !Array.isArray(return_items) || return_items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!return_reason) {
      return NextResponse.json({ error: 'Return reason is required' }, { status: 400 })
    }

    // Haal order op
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check of order delivered is
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order must be delivered before returning' }, { status: 400 })
    }

    // Check return deadline
    const settings = await getSiteSettings()
    const returnDays = settings.return_days || 14
    const returnsAutoApprove =
      (settings as any).returns_auto_approve === true || (settings as any).returns_auto_approve === 'true'
    
    // Get return label costs from settings
    const returnLabelCostExclBtw = settings.return_label_cost_excl_btw || 6.50
    const returnLabelCostInclBtw = settings.return_label_cost_incl_btw || 7.87
    
    if (order.delivered_at) {
      const deliveredDate = new Date(order.delivered_at)
      const deadline = new Date(deliveredDate)
      deadline.setDate(deadline.getDate() + returnDays)
      
      if (new Date() > deadline) {
        return NextResponse.json({ 
          error: `Return deadline has passed. You have ${returnDays} days from delivery date.` 
        }, { status: 400 })
      }
    }

    // Valideer return items
    const orderItemIds = order.order_items.map((item: any) => item.id)
    let totalRefundAmount = 0

    for (const returnItem of return_items) {
      if (!orderItemIds.includes(returnItem.order_item_id)) {
        return NextResponse.json({ 
          error: `Order item ${returnItem.order_item_id} not found in order` 
        }, { status: 400 })
      }

      const orderItem = order.order_items.find((item: any) => item.id === returnItem.order_item_id)
      if (returnItem.quantity > orderItem.quantity) {
        return NextResponse.json({ 
          error: `Quantity ${returnItem.quantity} exceeds order quantity ${orderItem.quantity}` 
        }, { status: 400 })
      }

      totalRefundAmount += orderItem.price_at_purchase * returnItem.quantity
    }

    // Check of er al een actieve retour is voor deze order
    const { data: existingReturns } = await supabase
      .from('returns')
      .select('id, status')
      .eq('order_id', order_id)
      .in('status', ['return_requested', 'return_approved', 'return_label_payment_pending', 'return_label_payment_completed', 'return_label_generated', 'return_in_transit', 'return_received', 'refund_processing'])

    if (existingReturns && existingReturns.length > 0) {
      return NextResponse.json({ 
        error: 'An active return already exists for this order' 
      }, { status: 400 })
    }

    // Maak retour aan
    const { data: returnRecord, error: insertError } = await supabase
      .from('returns')
      .insert({
        order_id,
        user_id: user.id,
        ...(returnsAutoApprove
          ? {
              // Direct goedkeuren voor snelle flow
              status: 'return_approved',
              approved_at: new Date().toISOString(),
            }
          : {
              status: 'return_requested',
            }),
        return_reason,
        customer_notes: customer_notes || null,
        return_items: return_items,
        refund_amount: totalRefundAmount,
        return_label_cost_excl_btw: returnLabelCostExclBtw,
        return_label_cost_incl_btw: returnLabelCostInclBtw,
        total_refund: totalRefundAmount, // Label kosten worden later afgetrokken bij refund
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating return:', insertError)
      return NextResponse.json({ error: 'Failed to create return' }, { status: 500 })
    }

    // Update order has_returns flag
    await supabase
      .from('orders')
      .update({ has_returns: true })
      .eq('id', order_id)

    // Maak alvast een Payment Intent aan voor het retourlabel als auto-approve aan staat,
    // zodat de klant direct kan betalen
    if (returnsAutoApprove) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
        const amount = Math.round(returnLabelCostInclBtw * 100)
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'eur',
          metadata: {
            return_id: returnRecord.id,
            order_id,
            type: 'return_label_payment',
            user_id: user.id,
          },
          description: `Retourlabel kosten - Return ${returnRecord.id.slice(0, 8).toUpperCase()}`,
          receipt_email: order.email,
        })

        // Sla intent op
        await supabase
          .from('returns')
          .update({
            return_label_payment_intent_id: paymentIntent.id,
            return_label_payment_status: 'pending',
          })
          .eq('id', returnRecord.id)
      } catch (piError) {
        console.error('Error creating payment intent on creation:', piError)
        // Niet falen; klant kan via details alsnog intent laten (her)aanmaken
      }
    }

    // Verstuur emails naar klant (requested + approved met link)
    try {
      const shippingAddress = order.shipping_address as any
      const returnItemsForEmail = return_items.map((item: any) => {
        const orderItem = order.order_items.find((oi: any) => oi.id === item.order_item_id)
        return {
          product_name: orderItem?.product_name || 'Product',
          quantity: item.quantity,
          size: orderItem?.size || '',
          color: orderItem?.color || '',
        }
      })

      // Stuur altijd "aangevraagd"
      await sendReturnRequestedEmail({
        customerEmail: order.email,
        customerName: shippingAddress?.name || 'Klant',
        returnId: returnRecord.id,
        orderId: order_id,
        returnReason: return_reason,
        returnItems: returnItemsForEmail,
      })

      // Alleen bij auto-approve direct de goedkeuringsmail met betaallink
      if (returnsAutoApprove) {
        await sendReturnApprovedEmail({
          customerEmail: order.email,
          customerName: shippingAddress?.name || 'Klant',
          returnId: returnRecord.id,
          orderId: order_id,
          returnItems: returnItemsForEmail.map(({ product_name, quantity }) => ({ product_name, quantity })),
          refundAmount: totalRefundAmount,
        })
      }
    } catch (emailError) {
      console.error('Error sending return requested email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      return_id: returnRecord.id,
      status: returnRecord.status,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

