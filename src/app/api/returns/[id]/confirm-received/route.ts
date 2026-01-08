import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

// POST /api/returns/[id]/confirm-received - Admin bevestigt ontvangst retour
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

    if (returnRecord.status !== 'return_in_transit' && returnRecord.status !== 'return_label_generated') {
      return NextResponse.json({ 
        error: `Cannot confirm receipt. Return status must be 'return_in_transit' or 'return_label_generated', current: ${returnRecord.status}` 
      }, { status: 400 })
    }

    // Update status
    const { data: updatedReturn, error: updateError } = await supabase
      .from('returns')
      .update({
        status: 'return_received',
        received_at: new Date().toISOString(),
        admin_notes: admin_notes || returnRecord.admin_notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error confirming return receipt:', updateError)
      return NextResponse.json({ error: 'Failed to confirm receipt' }, { status: 500 })
    }

    // Update stock (items terug naar inventory)
    const returnItems = returnRecord.return_items as any[]
    for (const returnItem of returnItems) {
      const orderItem = returnRecord.orders.order_items.find((item: any) => item.id === returnItem.order_item_id)
      if (orderItem && orderItem.variant_id) {
        // Verhoog stock van variant
        await supabase.rpc('increment_variant_stock', {
          variant_id: orderItem.variant_id,
          quantity: returnItem.quantity,
        })
      }
    }

    // Update order status naar return_received
    try {
      await updateOrderStatusForReturn(returnRecord.order_id, 'return_received')
    } catch (error) {
      console.error('Error updating order status:', error)
    }

    return NextResponse.json({
      success: true,
      return: updatedReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/confirm-received:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

