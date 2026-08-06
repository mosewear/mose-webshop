/**
 * Idempotent return-label payment fulfillment (Mollie webhook / return URL).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createReturnLabelSimple } from '@/lib/sendcloud-return-simple'
import { sendReturnLabelGeneratedEmail } from '@/lib/email'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

export type FulfillReturnLabelResult =
  | {
      ok: true
      returnId: string
      labelGenerated: boolean
      labelError: string | null
    }
  | { ok: false; reason: string }

export async function fulfillReturnLabelPayment(
  supabase: SupabaseClient,
  returnId: string
): Promise<FulfillReturnLabelResult> {
  const { data: returnRecordBefore, error: fetchError } = await supabase
    .from('returns')
    .select('*, orders!inner(email, shipping_address)')
    .eq('id', returnId)
    .single()

  if (fetchError || !returnRecordBefore) {
    return { ok: false, reason: 'Return not found' }
  }

  // Already completed — still try label if missing
  const alreadyPaid =
    returnRecordBefore.return_label_payment_status === 'completed' ||
    returnRecordBefore.status === 'return_label_payment_completed' ||
    returnRecordBefore.status === 'return_label_generated'

  if (!alreadyPaid) {
    const { error: returnError } = await supabase
      .from('returns')
      .update({
        status: 'return_label_payment_completed',
        return_label_payment_status: 'completed',
        return_label_paid_at: new Date().toISOString(),
      })
      .eq('id', returnId)

    if (returnError) {
      return { ok: false, reason: returnError.message }
    }

    try {
      const { sendReturnRequestedEmail } = await import('@/lib/email')
      const order = returnRecordBefore.orders as any
      const shippingAddress = order.shipping_address as any
      const returnItems = returnRecordBefore.return_items as any[]

      await sendReturnRequestedEmail({
        customerEmail: order.email,
        customerName: shippingAddress?.name || 'Klant',
        returnId,
        orderId: returnRecordBefore.order_id,
        returnReason: returnRecordBefore.return_reason,
        returnItems: (returnItems || []).map((item: any) => ({
          product_name: item.product_name || 'Product',
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
        })),
      })
    } catch (emailError) {
      console.error('[fulfillReturnLabel] return requested email failed:', emailError)
    }
  }

  let labelGenerated = false
  let labelError: string | null = null

  try {
    if (!process.env.SENDCLOUD_PUBLIC_KEY || !process.env.SENDCLOUD_SECRET_KEY) {
      labelError = 'Sendcloud niet geconfigureerd'
    } else {
      const { data: existingReturn } = await supabase
        .from('returns')
        .select('return_label_url')
        .eq('id', returnId)
        .single()

      if (existingReturn?.return_label_url) {
        labelGenerated = true
      } else {
        const { data: returnRecord, error: returnFetchError } = await supabase
          .from('returns')
          .select('*, orders!inner(*)')
          .eq('id', returnId)
          .single()

        if (returnFetchError || !returnRecord) {
          labelError = returnFetchError?.message || 'Return not found'
        } else {
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', returnRecord.order_id)
            .single()

          if (orderError || !order) {
            labelError = orderError?.message || 'Order not found'
          } else {
            const labelData = await createReturnLabelSimple(
              returnId,
              order,
              returnRecord.return_items as any[]
            )

            const { data: updatedReturn, error: updateError } = await supabase
              .from('returns')
              .update({
                status: 'return_label_generated',
                sendcloud_return_id: labelData.parcel_id,
                return_tracking_code: labelData.tracking_number,
                return_tracking_url: labelData.tracking_url,
                return_label_url: labelData.label_url,
                label_generated_at: new Date().toISOString(),
              })
              .eq('id', returnId)
              .select()
              .single()

            if (updateError) {
              labelError = updateError.message
            } else {
              labelGenerated = true
              try {
                await updateOrderStatusForReturn(order.id, 'return_label_generated')
              } catch (error) {
                console.error('[fulfillReturnLabel] order status sync failed:', error)
              }

              try {
                const { data: orderForEmail } = await supabase
                  .from('orders')
                  .select('email, shipping_address')
                  .eq('id', updatedReturn.order_id)
                  .single()

                if (orderForEmail) {
                  const shippingAddress = orderForEmail.shipping_address as any
                  await sendReturnLabelGeneratedEmail({
                    customerEmail: orderForEmail.email,
                    customerName: shippingAddress?.name || 'Klant',
                    returnId,
                    orderId: updatedReturn.order_id,
                    trackingCode: labelData.tracking_number,
                    trackingUrl: labelData.tracking_url,
                    labelUrl: labelData.label_url,
                  })
                }
              } catch (emailError) {
                console.error('[fulfillReturnLabel] label email failed:', emailError)
              }
            }
          }
        }
      }
    }
  } catch (err) {
    labelError = err instanceof Error ? err.message : 'Unknown label error'
  }

  return {
    ok: true,
    returnId,
    labelGenerated,
    labelError,
  }
}
