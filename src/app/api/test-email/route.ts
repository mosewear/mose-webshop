import { NextRequest, NextResponse } from 'next/server'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 TEST: Sending test order confirmation email...')
    console.log('🔑 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('🔑 RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length)
    
    const result = await sendOrderConfirmationEmail({
      customerName: 'Test User',
      customerEmail: 'h.schlimback@gmail.com',
      orderId: 'TEST-ORDER-123',
      orderTotal: 99.99,
      orderItems: [
        {
          name: 'Test Product',
          size: 'M',
          color: 'Black',
          quantity: 1,
          price: 99.99,
        }
      ],
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 1',
        city: 'Test City',
        postalCode: '1234AB',
      }
    })
    
    console.log('📧 TEST: Email result:', result)
    
    return NextResponse.json({
      success: result.success,
      result: result,
      env: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyLength: process.env.RESEND_API_KEY?.length,
      }
    })
  } catch (error: any) {
    console.error('❌ TEST: Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}

