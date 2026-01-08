/**
 * Test script voor retourlabel generatie
 * 
 * Usage: npx tsx scripts/test-return-label.ts
 * 
 * Dit script test de retourlabel generatie zonder Stripe betaling
 */

import { createReturnLabel, isSendcloudConfigured } from '../src/lib/sendcloud'

// Mock order data (zoals het in de database staat)
const mockOrder = {
  id: 'test-order-id',
  email: 'test@example.com',
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

// Mock return items
const mockReturnItems = [
  {
    order_item_id: 'test-order-item-1',
    quantity: 1,
    product_name: 'MOSE T-Shirt',
  },
]

async function testReturnLabel() {
  console.log('🧪 STARTING RETURN LABEL TEST')
  console.log('================================\n')

  // Check Sendcloud config
  if (!isSendcloudConfigured()) {
    console.error('❌ Sendcloud niet geconfigureerd!')
    console.error('   Zorg dat SENDCLOUD_PUBLIC_KEY en SENDCLOUD_SECRET_KEY in .env.local staan')
    process.exit(1)
  }

  console.log('✅ Sendcloud is geconfigureerd\n')

  // Test met mock data
  const testReturnId = `test-return-${Date.now()}`

  console.log('📋 Test data:')
  console.log('   Return ID:', testReturnId)
  console.log('   Order ID:', mockOrder.id)
  console.log('   Customer:', mockOrder.shipping_address.name)
  console.log('   Customer address:', mockOrder.shipping_address.address)
  console.log('   Return items:', mockReturnItems.length)
  console.log('')

  try {
    console.log('🔄 Attempting to create return label...\n')
    
    const labelData = await createReturnLabel(
      testReturnId,
      mockOrder as any,
      mockReturnItems as any[]
    )

    console.log('\n✅ SUCCESS! Label created:')
    console.log('   Label URL:', labelData.label_url)
    console.log('   Tracking code:', labelData.tracking_code)
    console.log('   Tracking URL:', labelData.tracking_url)
    console.log('   Sendcloud Return ID:', labelData.sendcloud_return_id)
    
    return labelData
  } catch (error: any) {
    console.error('\n❌ ERROR creating return label:')
    console.error('   Message:', error.message)
    if (error.stack) {
      console.error('\n   Stack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run test
testReturnLabel()
  .then(() => {
    console.log('\n✅ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })

