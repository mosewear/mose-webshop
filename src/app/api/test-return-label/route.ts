/**
 * TEST ENDPOINT - Voor lokaal testen zonder betaling
 * 
 * Optie 1: Test met bestaande return uit database
 *   POST /api/test-return-label
 *   Body: { returnId: "uuid" }
 * 
 * Optie 2: Test met mock data (geen database nodig)
 *   POST /api/test-return-label
 *   Body: { useMockData: true }
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
        { error: 'Sendcloud niet geconfigureerd. Zorg dat SENDCLOUD_PUBLIC_KEY en SENDCLOUD_SECRET_KEY in .env.local staan' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { returnId, useMockData } = body

    let order: any
    let returnItems: any[]
    let testReturnId: string

    if (useMockData) {
      // Gebruik mock data - geen database nodig
      console.log('🧪 TEST: Using MOCK DATA')
      testReturnId = `test-return-${Date.now()}`
      
      // Mock order (zoals het in de database staat)
      order = {
        id: 'test-order-' + Date.now(),
        email: 'test@mosewear.nl',
        shipping_address: {
          name: 'Rick Schlimback',
          address: 'Helper Brink 27a',
          city: 'Groningen',
          postalCode: '9722 EG',
          country: 'NL',
          phone: '+31 6 43219739',
        },
        order_items: [
          {
            id: 'test-order-item-1',
            product_name: 'MOSE T-Shirt',
            quantity: 1,
            price_at_purchase: 29.95,
          },
        ],
      }

      returnItems = [
        {
          order_item_id: 'test-order-item-1',
          quantity: 1,
          product_name: 'MOSE T-Shirt',
        },
      ]

      console.log('🧪 Mock Order ID:', order.id)
      console.log('🧪 Mock Return ID:', testReturnId)
      console.log('🧪 Mock Customer:', order.shipping_address.name)
      console.log('🧪 Mock Address:', order.shipping_address.address)
    } else {
      // Gebruik echte data uit database
      if (!returnId) {
        return NextResponse.json({ 
          error: 'returnId is verplicht OF gebruik { useMockData: true } voor mock data' 
        }, { status: 400 })
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
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', returnRecord.order_id)
        .single()

      if (orderError || !orderData) {
        return NextResponse.json(
          { error: 'Order niet gevonden', details: orderError },
          { status: 404 }
        )
      }

      order = orderData
      returnItems = returnRecord.return_items as any[]
      testReturnId = returnId

      console.log('🧪 TEST: Using REAL DATA from database')
      console.log('🧪 Return ID:', returnId)
      console.log('🧪 Order ID:', order.id)
    }

    console.log('🧪 Shipping address:', order.shipping_address)
    console.log('🧪 Return items count:', returnItems.length)
    console.log('')

    // Test label generatie
    console.log('🔄 Attempting to create return label...\n')
    const labelData = await createReturnLabel(
      testReturnId,
      order,
      returnItems
    )

    console.log('\n✅ TEST: Label created successfully!')
    console.log('🧪 Label URL:', labelData.label_url)
    console.log('🧪 Tracking code:', labelData.tracking_code)
    console.log('🧪 Tracking URL:', labelData.tracking_url)

    return NextResponse.json({
      success: true,
      data: labelData,
      testReturnId: useMockData ? testReturnId : undefined,
    })
  } catch (error: any) {
    console.error('\n❌ TEST: Error creating return label:', error)
    return NextResponse.json(
      {
        error: error.message || 'Fout bij aanmaken test label',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

