import { NextResponse } from 'next/server'
import {
  sendOrderConfirmationEmail,
  sendShippingConfirmationEmail,
  sendOrderProcessingEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendAbandonedCartEmail,
  sendBackInStockEmail,
  sendContactFormEmail
} from '@/lib/email'

const testEmail = 'h.schlimback@gmail.com'
const testName = 'Rick Schlimback'
const testOrderId = 'test-order-12345678'
const testTrackingCode = 'TEST123456789'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

export async function GET() {
  try {
    const results = []

    // 1. Order Confirmation Email
    console.log('1️⃣ Sending Order Confirmation Email...')
    const result1 = await sendOrderConfirmationEmail({
      customerName: testName,
      customerEmail: testEmail,
      orderId: testOrderId,
      orderTotal: 89.99,
      orderItems: [
        {
          name: 'MOSE Classic Hoodie Zwart',
          size: 'M',
          color: 'Zwart',
          quantity: 1,
          price: 79.99,
          imageUrl: '/hoodieblack.png'
        }
      ],
      shippingAddress: {
        name: testName,
        address: '1 Oostersingel',
        city: 'Groningen',
        postalCode: '9713EW'
      }
    })
    results.push({ email: 'Order Confirmation', success: result1.success })

    // 2. Order Processing Email
    console.log('2️⃣ Sending Order Processing Email...')
    const result2 = await sendOrderProcessingEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      orderTotal: 89.99,
      estimatedShipDate: 'Binnen 1-2 werkdagen'
    })
    results.push({ email: 'Order Processing', success: result2.success })

    // 3. Shipping Confirmation Email
    console.log('3️⃣ Sending Shipping Confirmation Email...')
    const result3 = await sendShippingConfirmationEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      trackingCode: testTrackingCode,
      trackingUrl: `${siteUrl}/track/${testTrackingCode}`,
      carrier: 'DHL',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    })
    results.push({ email: 'Shipping Confirmation', success: result3.success })

    // 4. Order Delivered Email
    console.log('4️⃣ Sending Order Delivered Email...')
    const result4 = await sendOrderDeliveredEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      orderItems: [
        {
          product_id: 'test-product-1',
          product_name: 'MOSE Classic Hoodie Zwart',
          image_url: '/hoodieblack.png'
        }
      ],
      deliveryDate: new Date().toISOString()
    })
    results.push({ email: 'Order Delivered', success: result4.success })

    // 5. Order Cancelled Email
    console.log('5️⃣ Sending Order Cancelled Email...')
    const result5 = await sendOrderCancelledEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      orderTotal: 89.99,
      cancellationReason: 'Test annulering'
    })
    results.push({ email: 'Order Cancelled', success: result5.success })

    // 6. Abandoned Cart Email
    console.log('6️⃣ Sending Abandoned Cart Email...')
    const result6 = await sendAbandonedCartEmail({
      customerName: testName,
      customerEmail: testEmail,
      orderId: testOrderId,
      orderTotal: 79.99,
      orderItems: [
        {
          name: 'MOSE Classic Hoodie Zwart',
          size: 'M',
          color: 'Zwart',
          quantity: 1,
          price: 79.99,
          imageUrl: '/hoodieblack.png'
        }
      ],
      checkoutUrl: `${siteUrl}/checkout?recover=${testOrderId}`,
      hoursSinceAbandoned: 2,
      freeShippingThreshold: 100,
      returnDays: 14
    })
    results.push({ email: 'Abandoned Cart', success: result6.success })

    // 7. Back In Stock Email
    console.log('7️⃣ Sending Back In Stock Email...')
    const result7 = await sendBackInStockEmail({
      customerEmail: testEmail,
      productName: 'MOSE Classic Hoodie Zwart',
      productSlug: 'mose-classic-hoodie-zwart',
      productImageUrl: '/hoodieblack.png',
      productPrice: 79.99,
      variantInfo: {
        size: 'M',
        color: 'Zwart'
      }
    })
    results.push({ email: 'Back In Stock', success: result7.success })

    // 8. Contact Form Email
    console.log('8️⃣ Sending Contact Form Email...')
    const result8 = await sendContactFormEmail({
      name: testName,
      email: testEmail,
      subject: 'product',
      message: 'Dit is een test bericht vanuit het contactformulier om te testen of de dark mode logo\'s correct werken.'
    })
    results.push({ email: 'Contact Form', success: result8.success })

    return NextResponse.json({
      success: true,
      message: 'All test emails sent!',
      results,
      testEmail
    })
  } catch (error: any) {
    console.error('Error sending test emails:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

