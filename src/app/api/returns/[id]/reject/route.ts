import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { sendReturnRejectedEmail } from '@/lib/email'

// POST /api/returns/[id]/reject - Admin wijst retour af
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
    const { rejection_reason, admin_notes } = body

    if (!rejection_reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

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

    if (returnRecord.status !== 'return_requested') {
      return NextResponse.json({ 
        error: `Cannot reject return with status ${returnRecord.status}` 
      }, { status: 400 })
    }

    // Update status
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'return_rejected',
        admin_notes: `${rejection_reason}\n\n${admin_notes || ''}`.trim(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting return:', updateError)
      return NextResponse.json({ error: 'Failed to reject return' }, { status: 500 })
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
        
        await sendReturnRejectedEmail({
          customerEmail: order.email,
          customerName: shippingAddress?.name || 'Klant',
          returnId: id,
          orderId: updatedReturn.order_id,
          rejectionReason: rejection_reason,
        })
      }
    } catch (emailError) {
      console.error('Error sending return rejected email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      return: updatedReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/reject:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

