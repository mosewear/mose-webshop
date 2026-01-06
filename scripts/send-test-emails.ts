/**
 * Script to send all email templates as test emails
 * Run with: npx tsx scripts/send-test-emails.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import {
  sendOrderConfirmationEmail,
  sendShippingConfirmationEmail,
  sendOrderProcessingEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendAbandonedCartEmail,
  sendBackInStockEmail,
  sendContactFormEmail
} from '../src/lib/email'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Check if RESEND_API_KEY is set
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables!')
  console.error('Please set RESEND_API_KEY in .env.local file')
  process.exit(1)
}

const testEmail = 'h.schlimback@gmail.com'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

// Test data
const testOrderItems = [
  {
    name: 'MOSE Classic Hoodie Zwart',
    size: 'M',
    color: 'Zwart',
    quantity: 1,
    price: 79.99,
    imageUrl: '/hoodieblack.png'
  },
  {
    name: 'MOSE Classic T-Shirt',
    size: 'L',
    color: 'Wit',
    quantity: 2,
    price: 29.99,
    imageUrl: '/blacktee.png'
  }
]

const testShippingAddress = {
  name: 'Rick Schlimback',
  address: '1 Oostersingel',
  city: 'Groningen',
  postalCode: '9713EW'
}

async function sendAllTestEmails() {
  console.log('🚀 Starting to send all test emails...\n')

  // 1. Order Confirmation Email
  console.log('📧 Sending Order Confirmation Email...')
  try {
    const result = await sendOrderConfirmationEmail({
      customerName: 'Rick Schlimback',
      customerEmail: testEmail,
      orderId: 'test-order-12345678',
      orderTotal: 139.97,
      orderItems: testOrderItems,
      shippingAddress: testShippingAddress
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  // Wait a bit between emails
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 2. Order Processing Email
  console.log('\n📧 Sending Order Processing Email...')
  try {
    const result = await sendOrderProcessingEmail({
      customerEmail: testEmail,
      customerName: 'Rick Schlimback',
      orderId: 'test-order-12345678',
      orderTotal: 139.97,
      estimatedShipDate: 'Binnen 1-2 werkdagen'
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 3. Shipping Confirmation Email
  console.log('\n📧 Sending Shipping Confirmation Email...')
  try {
    const result = await sendShippingConfirmationEmail({
      customerEmail: testEmail,
      customerName: 'Rick Schlimback',
      orderId: 'test-order-12345678',
      trackingCode: 'TEST123456789',
      trackingUrl: 'https://tracking.example.com/TEST123456789',
      carrier: 'DHL',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 4. Order Delivered Email
  console.log('\n📧 Sending Order Delivered Email...')
  try {
    const result = await sendOrderDeliveredEmail({
      customerEmail: testEmail,
      customerName: 'Rick Schlimback',
      orderId: 'test-order-12345678',
      orderItems: [
        {
          product_id: 'test-1',
          product_name: 'MOSE Classic Hoodie Zwart',
          image_url: '/hoodieblack.png'
        },
        {
          product_id: 'test-2',
          product_name: 'MOSE Classic T-Shirt',
          image_url: '/blacktee.png'
        }
      ],
      deliveryDate: new Date().toISOString()
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 5. Order Cancelled Email
  console.log('\n📧 Sending Order Cancelled Email...')
  try {
    const result = await sendOrderCancelledEmail({
      customerEmail: testEmail,
      customerName: 'Rick Schlimback',
      orderId: 'test-order-12345678',
      orderTotal: 139.97,
      cancellationReason: 'Product niet meer op voorraad'
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 6. Abandoned Cart Email
  console.log('\n📧 Sending Abandoned Cart Email...')
  try {
    const result = await sendAbandonedCartEmail({
      customerName: 'Rick Schlimback',
      customerEmail: testEmail,
      orderId: 'test-order-12345678',
      orderTotal: 139.97,
      orderItems: testOrderItems,
      checkoutUrl: `${siteUrl}/checkout?recover=test-order-12345678`,
      hoursSinceAbandoned: 2,
      freeShippingThreshold: 100,
      returnDays: 14
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 7. Back In Stock Email
  console.log('\n📧 Sending Back In Stock Email...')
  try {
    const result = await sendBackInStockEmail({
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
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // 8. Contact Form Email
  console.log('\n📧 Sending Contact Form Email...')
  try {
    const result = await sendContactFormEmail({
      name: 'Rick Schlimback',
      email: testEmail,
      subject: 'order',
      message: 'Dit is een test bericht van het contactformulier. Ik wil graag weten wanneer mijn bestelling wordt verzonden.'
    })
    console.log(result.success ? '  ✅ Sent successfully' : `  ❌ Error: ${result.error}`)
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
  }

  console.log('\n🎉 All test emails sent! Check your inbox at h.schlimback@gmail.com')
}

// Run the script
sendAllTestEmails().catch(console.error)

