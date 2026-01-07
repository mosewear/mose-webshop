import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { sendReturnApprovedEmail } from '@/lib/email'

// POST /api/returns/[id]/approve - Admin keurt retour goed
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
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    // Retour kan alleen worden goedgekeurd als het al is ontvangen
    if (returnRecord.status !== 'return_received') {
      return NextResponse.json({ 
        error: `Cannot approve return with status ${returnRecord.status}. Return must be received first.` 
      }, { status: 400 })
    }

    // Update status naar goedgekeurd (na beoordeling kleding)
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'return_approved',
        approved_at: new Date().toISOString(),
        admin_notes: admin_notes || returnRecord.admin_notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving return:', updateError)
      return NextResponse.json({ error: 'Failed to approve return' }, { status: 500 })
    }

    // Verstuur email naar klant
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('email, shipping_address')
        .eq('id', updatedReturn.order_id)
        .single()

      if (order) {
        const shippingAddress = order.shipping_address as any
        const returnItems = updatedReturn.return_items as any[]
        
        await sendReturnApprovedEmail({
          customerEmail: order.email,
          customerName: shippingAddress?.name || 'Klant',
          returnId: id,
          orderId: updatedReturn.order_id,
          returnItems: returnItems.map((item: any) => ({
            product_name: item.product_name || 'Product',
            quantity: item.quantity,
          })),
          refundAmount: updatedReturn.refund_amount || 0,
        })
      }
    } catch (emailError) {
      console.error('Error sending return approved email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      return: updatedReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/approve:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

