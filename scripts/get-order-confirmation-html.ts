/**
 * Script to generate and output the HTML for order confirmation email
 * Run with: npx tsx scripts/get-order-confirmation-html.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Import email functions
import { sendOrderConfirmationEmail } from '../src/lib/email'

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

async function getOrderConfirmationHTML() {
  // Mock Resend to capture HTML
  const originalResend = require('resend').Resend
  let capturedHTML = ''
  
  class MockResend {
    emails = {
      send: async (options: any) => {
        capturedHTML = options.html
        return { data: { id: 'test' }, error: null }
      }
    }
  }
  
  // Temporarily replace Resend
  const ResendModule = require('resend')
  const originalGetResend = require('../src/lib/email').getResend
  require('../src/lib/email').getResend = () => new MockResend()
  
  try {
    await sendOrderConfirmationEmail({
      customerName: 'Rick Schlimback',
      customerEmail: 'test@example.com',
      orderId: 'test-order-12345678',
      orderTotal: 139.97,
      orderItems: testOrderItems,
      shippingAddress: testShippingAddress
    })
    
    // Copy to clipboard (macOS)
    const { execSync } = require('child_process')
    const escapedHTML = capturedHTML.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
    execSync(`echo "${escapedHTML}" | pbcopy`)
    
    console.log('✅ HTML copied to clipboard!')
    console.log('\n📋 HTML length:', capturedHTML.length, 'characters')
    
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error(error.stack)
  }
}

getOrderConfirmationHTML().catch(console.error)
