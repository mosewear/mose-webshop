import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { sendReturnApprovedEmail } from '@/lib/email'
import { processReturnRefund } from '@/lib/process-return-refund'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

// POST /api/returns/[id]/approve
//
// Final approval after the items have been received and inspected.
// Status moet `return_received` of `return_approved` zijn — bij beide
// triggeren we direct de Stripe-refund zodat het geld automatisch wordt
// teruggestort aan de klant. Helper is idempotent dus dubbele klikken
// veroorzaken geen dubbele refund.
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

    const body = await req.json().catch(() => ({}))
    const { admin_notes } = body || {}

    const supabase = await createClient()

    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    const allowedSourceStatuses = ['return_received', 'return_approved']
    if (!allowedSourceStatuses.includes(returnRecord.status)) {
      return NextResponse.json(
        {
          error: `Cannot approve return with status ${returnRecord.status}. Return moet eerst ontvangen zijn.`,
        },
        { status: 400 }
      )
    }

    // Mark as approved (idempotent: als al approved skippen we de update niet
    // omdat we ook de notes willen kunnen bijwerken).
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'return_approved',
        approved_at: returnRecord.approved_at || new Date().toISOString(),
        admin_notes: admin_notes || returnRecord.admin_notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving return:', updateError)
      return NextResponse.json({ error: 'Failed to approve return' }, { status: 500 })
    }

    // Sync order status.
    try {
      await updateOrderStatusForReturn(returnRecord.order_id, 'return_approved')
    } catch (err) {
      console.error('Error updating order status after approve:', err)
    }

    // E-mail "Retour goedgekeurd" — alleen wanneer dit de eerste keer is dat
    // we naar `return_approved` springen, niet bij hercheck.
    if (returnRecord.status !== 'return_approved') {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('email, shipping_address')
          .eq('id', updatedReturn.order_id)
          .single()

        if (order) {
          const shippingAddress = order.shipping_address as any
          const returnItems = (updatedReturn.return_items as any[]) || []

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
      }
    }

    // Direct na goedkeuring → automatisch geld terugstorten.
    let refundOutcome: any = null
    try {
      refundOutcome = await processReturnRefund(id)
    } catch (refundErr) {
      console.error('Auto-refund after approve failed:', refundErr)
    }

    const { data: finalReturn } = await supabase
      .from('returns')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      return: finalReturn || updatedReturn,
      refund: refundOutcome,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/approve:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
