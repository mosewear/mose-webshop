// Load environment variables first
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env.production.local' })
require('dotenv').config({ path: '.env' })

import {
  sendOrderConfirmationEmail,
  sendShippingConfirmationEmail,
  sendOrderProcessingEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendAbandonedCartEmail,
  sendBackInStockEmail,
  sendContactFormEmail
} from './src/lib/email'
import { getPublicSiteUrl } from './src/lib/site-url'

const testEmail = 'h.schlimback@gmail.com'
const testName = 'Rick Schlimback'
const testOrderId = 'test-order-12345678'
const testTrackingCode = 'TEST123456789'
const siteUrl = getPublicSiteUrl()

async function sendTestEmails() {
  console.log('📧 Starting to send test emails...\n')

  try {
    // 1. Order Confirmation Email
    console.log('1️⃣ Sending Order Confirmation Email...')
    await sendOrderConfirmationEmail({
      customerName: testName,
      customerEmail: testEmail,
      orderId: testOrderId,
      orderTotal: 89.99,
      subtotal: 79.99,
      shippingCost: 5.00,
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
      },
      promoCode: 'TEST10',
      discountAmount: 10.00,
      locale: 'nl'
    })
    console.log('✅ Order Confirmation Email sent\n')

    // 2. Order Processing Email
    console.log('2️⃣ Sending Order Processing Email...')
    await sendOrderProcessingEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      orderTotal: 89.99,
      estimatedShipDate: 'Binnen 1-2 werkdagen'
    })
    console.log('✅ Order Processing Email sent\n')

    // 3. Shipping Confirmation Email
    console.log('3️⃣ Sending Shipping Confirmation Email...')
    await sendShippingConfirmationEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      trackingCode: testTrackingCode,
      trackingUrl: `${siteUrl}/track/${testTrackingCode}`,
      carrier: 'DHL',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    })
    console.log('✅ Shipping Confirmation Email sent\n')

    // 4. Order Delivered Email
    console.log('4️⃣ Sending Order Delivered Email...')
    await sendOrderDeliveredEmail({
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
    console.log('✅ Order Delivered Email sent\n')

    // 5. Order Cancelled Email
    console.log('5️⃣ Sending Order Cancelled Email...')
    await sendOrderCancelledEmail({
      customerEmail: testEmail,
      customerName: testName,
      orderId: testOrderId,
      orderTotal: 89.99,
      cancellationReason: 'Test annulering'
    })
    console.log('✅ Order Cancelled Email sent\n')

    // 6. Abandoned Cart Email
    console.log('6️⃣ Sending Abandoned Cart Email...')
    await sendAbandonedCartEmail({
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
    console.log('✅ Abandoned Cart Email sent\n')

    // 7. Back In Stock Email
    console.log('7️⃣ Sending Back In Stock Email...')
    await sendBackInStockEmail({
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
    console.log('✅ Back In Stock Email sent\n')

    // 8. Contact Form Email
    console.log('8️⃣ Sending Contact Form Email...')
    await sendContactFormEmail({
      name: testName,
      email: testEmail,
      subject: 'product',
      message: 'Dit is een test bericht vanuit het contactformulier om te testen of de dark mode logo\'s correct werken.'
    })
    console.log('✅ Contact Form Email sent\n')

    console.log('🎉 All test emails sent successfully!')
    console.log(`📬 Check your inbox at ${testEmail}`)
  } catch (error) {
    console.error('❌ Error sending test emails:', error)
    process.exit(1)
  }
}

sendTestEmails()
