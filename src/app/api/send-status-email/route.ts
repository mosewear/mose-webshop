import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  sendOrderProcessingEmail, 
  sendOrderDeliveredEmail, 
  sendOrderCancelledEmail,
  sendShippingConfirmationEmail,
  sendReturnRequestedEmail,
  sendReturnApprovedEmail,
  sendReturnRefundedEmail
} from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { getEmailTypeForStatusChange } from '@/lib/order-utils'

export async function POST(req: NextRequest) {
  try {
    const { orderId, oldStatus, newStatus } = await req.json()

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'Order ID and new status are required' },
        { status: 400 }
      )
    }

    // Get order details from Supabase
    const supabase = await createClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const shippingAddress = order.shipping_address as any
    const customerName = shippingAddress?.name || 'Klant'
    const customerEmail = order.email

    // Determine which email to send
    const emailType = getEmailTypeForStatusChange(oldStatus, newStatus)
    
    if (!emailType) {
      return NextResponse.json({
        success: true,
        message: 'No email needed for this status change',
      })
    }

    let result: any
    let emailSubject = ''

    // Send appropriate email based on new status
    switch (emailType) {
      case 'processing':
        emailSubject = `Je bestelling wordt voorbereid #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendOrderProcessingEmail({
          customerEmail,
          customerName,
          orderId: order.id,
          orderTotal: order.total,
          estimatedShipDate: order.estimated_delivery_date
            ? new Date(order.estimated_delivery_date).toLocaleDateString('nl-NL')
            : undefined,
        })
        break

      case 'shipped':
        emailSubject = `Je bestelling is verzonden #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendShippingConfirmationEmail({
          customerEmail,
          customerName,
          orderId: order.id,
          trackingCode: order.tracking_code || 'Wordt nog toegevoegd',
          trackingUrl: order.tracking_url,
          carrier: order.carrier,
          estimatedDelivery: order.estimated_delivery_date
            ? new Date(order.estimated_delivery_date).toLocaleDateString('nl-NL')
            : undefined,
        })
        break

      case 'delivered':
        emailSubject = `Je pakket is bezorgd #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendOrderDeliveredEmail({
          customerEmail,
          customerName,
          orderId: order.id,
          orderItems: order.order_items.map((item: any) => ({
            product_id: item.product_id || '',
            product_name: item.product_name,
            image_url: item.image_url,
          })),
          shippingAddress: order.shipping_address,
          deliveryDate: new Date().toISOString(),
        })
        break

      case 'cancelled':
        emailSubject = `Order geannuleerd #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendOrderCancelledEmail({
          customerEmail,
          customerName,
          orderId: order.id,
          orderTotal: order.total,
          cancellationReason: order.internal_notes || undefined,
        })
        break

      case 'return_requested':
        emailSubject = `Retourverzoek ontvangen #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendReturnRequestedEmail({
          customerEmail,
          customerName,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          returnNumber: order.id.slice(0, 8).toUpperCase(),
          items: order.order_items.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
          })),
        })
        break

      case 'return_approved':
        emailSubject = `Je retour is goedgekeurd #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendReturnApprovedEmail({
          customerEmail,
          customerName,
          returnNumber: order.id.slice(0, 8).toUpperCase(),
          refundAmount: order.total,
          items: order.order_items.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
          })),
        })
        break

      case 'return_refunded':
        emailSubject = `Terugbetaling voltooid #${order.id.slice(0, 8).toUpperCase()}`
        result = await sendReturnRefundedEmail({
          customerEmail,
          customerName,
          returnNumber: order.id.slice(0, 8).toUpperCase(),
          refundAmount: order.total,
        })
        break

      default:
        return NextResponse.json({
          success: false,
          message: `No email template for status: ${emailType}`,
        })
    }

    // Log email to database
    await logEmail({
      orderId: order.id,
      emailType,
      recipientEmail: customerEmail,
      subject: emailSubject,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.error ? JSON.stringify(result.error) : undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      emailType,
    })
  } catch (error: any) {
    console.error('Error in send-status-email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

