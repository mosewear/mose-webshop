/**
 * TEST ENDPOINT - Verwijder dit na testen!
 * 
 * Test endpoint om retourlabel generatie lokaal te testen zonder echte betaling
 * 
 * Usage: POST /api/test-return-label
 * Body: { returnId: "uuid" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReturnLabel, isSendcloudConfigured } from '@/lib/sendcloud'

export async function POST(req: NextRequest) {
  try {
    // Alleen in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    if (!isSendcloudConfigured()) {
      return NextResponse.json(
        { error: 'Sendcloud niet geconfigureerd' },
        { status: 500 }
      )
    }

    const { returnId } = await req.json()

    if (!returnId) {
      return NextResponse.json({ error: 'returnId is verplicht' }, { status: 400 })
    }

    const supabase = await createClient()

    // Haal return op met order en items
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .select('*, orders!inner(*)')
      .eq('id', returnId)
      .single()

    if (returnError || !returnRecord) {
      return NextResponse.json(
        { error: 'Return niet gevonden', details: returnError },
        { status: 404 }
      )
    }

    // Haal order items op
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', returnRecord.order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order niet gevonden', details: orderError },
        { status: 404 }
      )
    }

    console.log('🧪 TEST: Attempting to create return label...')
    console.log('🧪 Return ID:', returnId)
    console.log('🧪 Order ID:', order.id)
    console.log('🧪 Shipping address:', order.shipping_address)

    // Test label generatie
    const labelData = await createReturnLabel(
      returnId,
      order,
      returnRecord.return_items as any[]
    )

    console.log('✅ TEST: Label created successfully!')
    console.log('🧪 Label URL:', labelData.label_url)
    console.log('🧪 Tracking code:', labelData.tracking_code)

    return NextResponse.json({
      success: true,
      data: labelData,
    })
  } catch (error: any) {
    console.error('❌ TEST: Error creating return label:', error)
    return NextResponse.json(
      {
        error: error.message || 'Fout bij aanmaken test label',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

