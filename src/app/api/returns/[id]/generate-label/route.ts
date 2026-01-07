import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReturnLabel, isSendcloudConfigured } from '@/lib/sendcloud'
import { requireAdmin } from '@/lib/supabase/admin'
import { sendReturnLabelGeneratedEmail } from '@/lib/email'

// POST /api/returns/[id]/generate-label - Genereer retourlabel (automatisch na betaling of handmatig door admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check of dit automatisch wordt aangeroepen (via webhook) of handmatig door admin
    const authHeader = req.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET
    
    console.log('🔍 Generate label endpoint called:')
    console.log(`   Return ID: ${id}`)
    console.log(`   Authorization header present: ${!!authHeader}`)
    console.log(`   INTERNAL_API_SECRET present: ${!!internalSecret}`)
    if (authHeader) {
      console.log(`   Auth header starts with Bearer: ${authHeader.startsWith('Bearer ')}`)
      console.log(`   Auth header length: ${authHeader.length}`)
    }
    if (internalSecret) {
      console.log(`   INTERNAL_API_SECRET length: ${internalSecret.length}`)
      const expectedAuth = `Bearer ${internalSecret}`
      console.log(`   Expected auth length: ${expectedAuth.length}`)
      console.log(`   Auth matches: ${authHeader === expectedAuth}`)
    }
    
    const isWebhookCall = authHeader === `Bearer ${internalSecret}`

    let isAdmin = false
    if (!isWebhookCall) {
      const { authorized } = await requireAdmin()
      isAdmin = authorized
      if (!isAdmin) {
        console.error('❌ Unauthorized: Not webhook call and not admin')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log('✅ Webhook call authenticated')
    }

    if (!isSendcloudConfigured()) {
      return NextResponse.json(
        { error: 'Sendcloud niet geconfigureerd' },
        { status: 500 }
      )
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

    // Check of betaling is voltooid (voor automatische calls)
    if (isWebhookCall && returnRecord.status !== 'return_label_payment_completed') {
      return NextResponse.json({ 
        error: `Cannot generate label. Payment not completed. Current status: ${returnRecord.status}` 
      }, { status: 400 })
    }

    // Check of label al is gegenereerd
    if (returnRecord.return_label_url) {
      return NextResponse.json({
        success: true,
        label_url: returnRecord.return_label_url,
        tracking_code: returnRecord.return_tracking_code,
        tracking_url: returnRecord.return_tracking_url,
        message: 'Label already generated',
      })
    }

    // Haal order items op
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', returnRecord.order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Genereer retourlabel
    const labelData = await createReturnLabel(
      id,
      order,
      returnRecord.return_items as any[]
    )

    // Update return met label informatie
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'return_label_generated',
        sendcloud_return_id: labelData.sendcloud_return_id,
        return_tracking_code: labelData.tracking_code,
        return_tracking_url: labelData.tracking_url,
        return_label_url: labelData.label_url,
        label_generated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating return with label:', updateError)
      return NextResponse.json({ error: 'Failed to update return' }, { status: 500 })
    }

    // Verstuur email naar klant met label
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('email, shipping_address')
        .eq('id', updatedReturn.order_id)
        .single()

      if (order) {
        const shippingAddress = order.shipping_address as any
        
        await sendReturnLabelGeneratedEmail({
          customerEmail: order.email,
          customerName: shippingAddress?.name || 'Klant',
          returnId: id,
          orderId: updatedReturn.order_id,
          trackingCode: labelData.tracking_code,
          trackingUrl: labelData.tracking_url,
          labelUrl: labelData.label_url,
        })
      }
    } catch (emailError) {
      console.error('Error sending return label email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      label_url: labelData.label_url,
      tracking_code: labelData.tracking_code,
      tracking_url: labelData.tracking_url,
      return: updatedReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/generate-label:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

