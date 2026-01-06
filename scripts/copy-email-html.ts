/**
 * Script to copy order confirmation email HTML to clipboard
 * Run with: npx tsx scripts/copy-email-html.ts
 */

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Mock Resend to capture HTML
let capturedHTML = ''

// Temporarily override Resend
const originalModule = require.cache[require.resolve('resend')]
if (originalModule) {
  const Resend = originalModule.exports.Resend
  const originalSend = Resend.prototype.emails.send
  
  Resend.prototype.emails.send = async function(options: any) {
    capturedHTML = options.html
    return { data: { id: 'test' }, error: null }
  }
}

// Import and call email function
import('../src/lib/email').then(async (emailModule) => {
  const testOrderItems = [
    {
      name: 'MOSE Classic Hoodie Zwart',
      size: 'M',
      color: 'Zwart',
      quantity: 1,
      price: 79.99,
      imageUrl: '/hoodieblack.png'
    }
  ]
  
  const testShippingAddress = {
    name: 'Rick Schlimback',
    address: '1 Oostersingel',
    city: 'Groningen',
    postalCode: '9713EW'
  }
  
  await emailModule.sendOrderConfirmationEmail({
    customerName: 'Rick Schlimback',
    customerEmail: 'test@example.com',
    orderId: 'test-order-12345678',
    orderTotal: 79.99,
    orderItems: testOrderItems,
    shippingAddress: testShippingAddress
  })
  
  if (capturedHTML) {
    // Write to file first
    writeFileSync('/tmp/email-html.html', capturedHTML)
    
    // Copy to clipboard (macOS)
    execSync(`cat /tmp/email-html.html | pbcopy`)
    
    console.log('✅ HTML copied to clipboard!')
    console.log('📋 HTML length:', capturedHTML.length, 'characters')
    console.log('📄 Also saved to /tmp/email-html.html')
  } else {
    console.error('❌ No HTML captured')
  }
  
  // Restore original
  if (originalModule) {
    const Resend = originalModule.exports.Resend
    Resend.prototype.emails.send = originalSend
  }
}).catch(console.error)
