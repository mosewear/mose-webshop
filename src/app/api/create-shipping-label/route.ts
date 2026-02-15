import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createParcel,
  formatAddressForSendcloud,
  getDefaultDHLMethodId,
  getShippingMethodsForOrder,
  estimateClothingWeight,
  isSendcloudConfigured,
} from '@/lib/sendcloud'
import { sendShippingConfirmationEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { calculateEstimatedDeliveryDate } from '@/lib/order-utils'

export async function POST(req: NextRequest) {
  try {
    if (!isSendcloudConfigured()) {
      return NextResponse.json(
        { error: 'Sendcloud niet geconfigureerd. Voeg API keys toe aan .env.local' },
        { status: 500 }
      )
    }

    const { orderId, shippingMethodId, sendEmail } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is verplicht' }, { status: 400 })
    }

    const supabase = await createClient()

    // Haal order + items op
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order niet gevonden' }, { status: 404 })
    }

    if (order.delivery_method === 'pickup') {
      return NextResponse.json(
        { error: 'Deze order is ingesteld op afhalen en heeft geen verzendlabel nodig.' },
        { status: 400 }
      )
    }

    // Check of er al een label is
    if (order.tracking_code && order.carrier) {
      return NextResponse.json(
        { error: 'Order heeft al een tracking code' },
        { status: 400 }
      )
    }

    const shippingAddress = order.shipping_address as any

    // Bereken totaal gewicht (schatting op basis van items)
    let totalWeight = 0
    order.order_items.forEach((item: any) => {
      // Schat gewicht op basis van product naam
      const isHoodie = item.product_name.toLowerCase().includes('hoodie')
      const type = isHoodie ? 'hoodie' : 'tshirt'
      totalWeight += estimateClothingWeight(item.quantity, type)
    })

    // Minimaal 0.5kg, afgerond naar boven
    totalWeight = Math.max(0.5, Math.ceil(totalWeight * 10) / 10)

    // Format adres
    const sendcloudAddress = formatAddressForSendcloud({
      name: shippingAddress.name,
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'NL',
      email: order.email,
      phone: shippingAddress.phone,
    })

    // Bepaal shipping method
    let methodId = shippingMethodId
    if (!methodId) {
      try {
        // Gebruik standaard DHL method
        methodId = await getDefaultDHLMethodId()
        if (!methodId) {
          return NextResponse.json(
            { 
              error: 'Geen geschikt verzendmethode gevonden',
              details: 'Controleer of DHL geactiveerd is in je Sendcloud account en of de API credentials correct zijn.'
            },
            { status: 400 }
          )
        }
      } catch (error: any) {
        console.error('Error getting default DHL method:', error)
        return NextResponse.json(
          { 
            error: 'Kon verzendmethode niet ophalen',
            details: error.message || 'Onbekende fout. Controleer Sendcloud API credentials.'
          },
          { status: 400 }
        )
      }
    }

    // Maak parcel aan in Sendcloud
    const parcel = await createParcel({
      ...sendcloudAddress,
      order_number: order.id,
      weight: totalWeight.toString(),
      total_order_value: order.total.toString(),
      shipment: {
        id: methodId,
      },
      parcel_items: order.order_items.map((item: any) => ({
        description: item.product_name,
        quantity: item.quantity,
        weight: (estimateClothingWeight(item.quantity, 'other')).toString(),
        value: (item.price_at_purchase * item.quantity).toString(),
        origin_country: 'NL',
      })),
      request_label: true,
      apply_shipping_rules: true,
    })

    console.log('Sendcloud parcel created:', parcel.id, parcel.tracking_number)

    // Update order in database
    const estimatedDelivery = calculateEstimatedDeliveryDate(parcel.carrier.code)
    const labelUrl = parcel.label.normal_printer?.[0] || null

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_code: parcel.tracking_number,
        tracking_url: parcel.tracking_url,
        carrier: parcel.carrier.name,
        label_url: labelUrl,
        status: 'shipped',
        estimated_delivery_date: estimatedDelivery.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Label aangemaakt maar database update mislukt' },
        { status: 500 }
      )
    }

    // Stuur shipping email als gevraagd
    if (sendEmail) {
      const customerName = shippingAddress.name || 'Klant'

      const emailResult = await sendShippingConfirmationEmail({
        customerEmail: order.email,
        customerName,
        orderId: order.id,
        trackingCode: parcel.tracking_number,
        trackingUrl: parcel.tracking_url,
        carrier: parcel.carrier.name,
        estimatedDelivery: estimatedDelivery.toISOString(),
      })

      await logEmail({
        orderId: order.id,
        emailType: 'shipped',
        recipientEmail: order.email,
        subject: `📦 Je MOSE bestelling #${order.id.slice(0, 8).toUpperCase()} is verzonden!`,
        status: emailResult.success ? 'sent' : 'failed',
        errorMessage: emailResult.error ? String(emailResult.error) : undefined,
      })

      // Update last_email_sent
      await supabase
        .from('orders')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: 'shipped',
        })
        .eq('id', orderId)
    }

    return NextResponse.json({
      success: true,
      data: {
        parcelId: parcel.id,
        trackingNumber: parcel.tracking_number,
        trackingUrl: parcel.tracking_url,
        carrier: parcel.carrier.name,
        labelUrl: labelUrl,
        estimatedDelivery: estimatedDelivery.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Error creating shipping label:', error)
    return NextResponse.json(
      { error: error.message || 'Fout bij aanmaken label' },
      { status: 500 }
    )
  }
}

