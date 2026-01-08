/**
 * TEST ENDPOINT - Voor lokaal testen zonder betaling
 * 
 * Test V3 Returns API met mock data
 *   POST /api/test-return-label
 *   Body: { useMockData: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createReturnLabelSimple } from '@/lib/sendcloud-return-simple'

export async function POST(req: NextRequest) {
  try {
    // Alleen in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    if (!process.env.SENDCLOUD_PUBLIC_KEY || !process.env.SENDCLOUD_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Sendcloud niet geconfigureerd. Zorg dat SENDCLOUD_PUBLIC_KEY en SENDCLOUD_SECRET_KEY in .env.local staan' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { useMockData } = body

    if (!useMockData) {
      return NextResponse.json({ 
        error: 'Deze test endpoint werkt alleen met mock data. Gebruik: { "useMockData": true }' 
      }, { status: 400 })
    }

    console.log('🧪 ==========================================')
    console.log('🧪 TEST: V3 Returns API with MOCK DATA')
    console.log('🧪 ==========================================')
    
    const testReturnId = `test-return-${Date.now()}`
    
    // Mock order (zoals het in de database staat)
    const mockOrder = {
      id: 'test-order-' + Date.now(),
      email: 'test@mosewear.nl',
      shipping_address: {
        name: 'Rick Schlimback',
        address: 'Helper Brink 27a',
        city: 'Groningen',
        postalCode: '9722 EG',
        country: 'NL',
        phone: '+31643219739',
      },
      order_items: [
        {
          id: 'test-order-item-1',
          product_name: 'MOSE T-Shirt',
          quantity: 1,
          price_at_purchase: 29.95,
          sku: 'MOSE-TS-001',
        },
      ],
    }

    const mockReturnItems = [
      {
        order_item_id: 'test-order-item-1',
        quantity: 1,
        product_name: 'MOSE T-Shirt',
        return_reason_id: '22',
        return_reason: 'Past niet goed',
      },
    ]

    console.log('🧪 Mock Order ID:', mockOrder.id)
    console.log('🧪 Mock Return ID:', testReturnId)
    console.log('🧪 Mock Customer:', mockOrder.shipping_address.name)
    console.log('🧪 Mock Address:', mockOrder.shipping_address.address)
    console.log('')

    // Test SIMPLE method (normaal label maar andersom!)
    console.log('🔄 Calling createReturnLabelSimple...\n')
    
    const labelData = await createReturnLabelSimple(
      testReturnId,
      mockOrder,
      mockReturnItems
    )

    console.log('\n✅ ==========================================')
    console.log('✅ TEST: RETURN LABEL SUCCESS!')
    console.log('✅ ==========================================')
    console.log('   Parcel ID:', labelData.parcel_id)
    console.log('   Label URL:', labelData.label_url || 'Not available yet')
    console.log('   Tracking code:', labelData.tracking_code || 'Not available yet')
    console.log('   Tracking URL:', labelData.tracking_url || 'Not available yet')
    console.log('')
    
    return NextResponse.json({
      success: true,
      message: 'Return label created successfully! 🎉',
      data: {
        parcel_id: labelData.parcel_id,
        label_url: labelData.label_url,
        tracking_code: labelData.tracking_code,
        tracking_url: labelData.tracking_url,
      },
      testReturnId,
      testOrderId: mockOrder.id,
    })
  } catch (error: any) {
    console.error('\n❌ ==========================================')
    console.error('❌ TEST: V3 Returns API test FAILED')
    console.error('❌ ==========================================')
    console.error('   Error:', error.message)
    console.error('   Stack:', error.stack)
    console.error('')
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fout bij aanmaken test label',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

