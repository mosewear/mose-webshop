import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'
import { processReturnRefund } from '@/lib/process-return-refund'

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
      // order_items MOET genest worden meegehaald. `orders!inner(*)` levert
      // alleen de kolommen van de orders-tabel, en order_items is een aparte
      // tabel. Daardoor was returnRecord.orders.order_items undefined en gooide
      // de .find() hieronder een TypeError: de retour bleef hangen op
      // return_received, zonder voorraadcorrectie en zonder terugbetaling.
      .select('*, orders!inner(*, order_items(*))')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    const allowedSourceStatuses = [
      'return_in_transit',
      'return_label_generated',
      'return_approved', // in-store drop-off start
    ]
    if (!allowedSourceStatuses.includes(returnRecord.status)) {
      return NextResponse.json({
        error: `Cannot confirm receipt. Return status must be one of ${allowedSourceStatuses.join(', ')}, current: ${returnRecord.status}`,
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

    // Update stock (items terug naar inventory).
    //
    // Per item afgeschermd: een mislukte voorraadcorrectie mag de
    // terugbetaling hieronder NIET blokkeren. Precies dat ging eerder mis,
    // waardoor een klant zijn geld niet terugkreeg omdat een voorraadregel
    // struikelde.
    const returnItems = (returnRecord.return_items as any[]) ?? []
    const orderItems = (returnRecord.orders?.order_items as any[]) ?? []
    const restockFouten: string[] = []

    for (const returnItem of returnItems) {
      try {
        const orderItem = orderItems.find((item: any) => item.id === returnItem.order_item_id)
        if (!orderItem?.variant_id) {
          restockFouten.push(`orderregel ${returnItem.order_item_id} niet gevonden of zonder variant`)
          continue
        }
        const { error: stockError } = await supabase.rpc('increment_variant_stock', {
          variant_id: orderItem.variant_id,
          quantity: returnItem.quantity,
        })
        if (stockError) restockFouten.push(`${orderItem.variant_id}: ${stockError.message}`)
      } catch (err: any) {
        restockFouten.push(`${returnItem.order_item_id}: ${err?.message || 'onbekende fout'}`)
      }
    }

    if (restockFouten.length) {
      console.error('Voorraadcorrectie bij retour deels mislukt:', restockFouten)
    }

    // Update order status naar return_received
    try {
      await updateOrderStatusForReturn(returnRecord.order_id, 'return_received')
    } catch (error) {
      console.error('Error updating order status:', error)
    }

    // Auto-refund: zodra we de retour als ontvangen markeren,
    // wordt het geld direct via Stripe naar de klant teruggestort.
    // Helper is volledig idempotent en faalt zacht als er geen
    // payment-intent/refundbedrag is.
    let refundOutcome: any = null
    try {
      refundOutcome = await processReturnRefund(id)
    } catch (refundErr) {
      console.error('Auto-refund after confirm-received failed:', refundErr)
    }

    // Haal de definitieve record opnieuw op (refund-helper kan status hebben gewijzigd)
    const { data: finalReturn } = await supabase
      .from('returns')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      return: finalReturn || updatedReturn,
      refund: refundOutcome,
      // Expliciet teruggeven zodat de admin ziet dat de retour wél verwerkt is
      // maar de voorraad handmatige aandacht nodig heeft, in plaats van dat
      // stilletjes in de serverlog te laten verdwijnen.
      restockWarnings: restockFouten.length ? restockFouten : undefined,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/confirm-received:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}

