import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  createParcel,
  formatAddressForSendcloud,
  getDefaultDHLMethodId,
  estimateClothingWeight,
  isSendcloudConfigured,
} from '@/lib/sendcloud'
import { calculateEstimatedDeliveryDate } from '@/lib/order-utils'

export async function POST(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { orderIds } = await req.json()

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Geen order IDs opgegeven' }, { status: 400 })
    }

    if (!isSendcloudConfigured()) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .in('id', orderIds)

      if (updateError) {
        return NextResponse.json(
          { error: 'Kon orders niet bijwerken: ' + updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: orderIds,
        failed: [],
        message: 'Sendcloud niet geconfigureerd. Orders zijn op "In behandeling" gezet. Maak labels individueel aan via de order detailpagina.',
      })
    }

    let methodId: number | null = null
    try {
      methodId = await getDefaultDHLMethodId()
    } catch {
      // Will handle per-order below
    }

    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('id', orderIds)

    if (fetchError || !orders) {
      return NextResponse.json({ error: 'Kon orders niet ophalen' }, { status: 500 })
    }

    const success: string[] = []
    const failed: { id: string; error: string }[] = []

    for (const order of orders) {
      try {
        if (order.delivery_method === 'pickup') {
          failed.push({ id: order.id, error: 'Order staat op afhalen' })
          continue
        }

        if (order.tracking_code) {
          failed.push({ id: order.id, error: 'Heeft al een tracking code' })
          continue
        }

        if (!methodId) {
          failed.push({ id: order.id, error: 'Geen verzendmethode gevonden' })
          continue
        }

        const shippingAddress = order.shipping_address as any
        if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.postalCode) {
          failed.push({ id: order.id, error: 'Onvolledig verzendadres' })
          continue
        }

        const sendcloudAddress = formatAddressForSendcloud({
          name: shippingAddress.name,
          address: shippingAddress.address,
          houseNumber: shippingAddress.houseNumber,
          addition: shippingAddress.addition,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || 'NL',
          email: order.email,
          phone: shippingAddress.phone,
        })

        let totalWeight = 0
        ;(order.order_items || []).forEach((item: any) => {
          const isHoodie = item.product_name.toLowerCase().includes('hoodie')
          totalWeight += estimateClothingWeight(item.quantity, isHoodie ? 'hoodie' : 'tshirt')
        })
        totalWeight = Math.max(0.5, Math.ceil(totalWeight * 10) / 10)

        const parcel = await createParcel({
          ...sendcloudAddress,
          order_number: order.id,
          weight: totalWeight.toString(),
          total_order_value: order.total.toString(),
          shipment: { id: methodId },
          parcel_items: (order.order_items || []).map((item: any) => ({
            description: item.product_name,
            quantity: item.quantity,
            weight: estimateClothingWeight(item.quantity, 'other').toString(),
            value: (item.price_at_purchase * item.quantity).toString(),
            origin_country: 'NL',
          })),
          request_label: true,
          apply_shipping_rules: true,
        })

        const estimatedDelivery = calculateEstimatedDeliveryDate(parcel.carrier.code)
        const labelUrl = parcel.label.normal_printer?.[0] || null

        await supabase
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
          .eq('id', order.id)

        success.push(order.id)
      } catch (err: any) {
        failed.push({ id: order.id, error: err.message || 'Onbekende fout' })
      }
    }

    return NextResponse.json({ success, failed })
  } catch (error: any) {
    console.error('Batch labels error:', error)
    return NextResponse.json(
      { error: error.message || 'Fout bij batch label aanmaak' },
      { status: 500 }
    )
  }
}
