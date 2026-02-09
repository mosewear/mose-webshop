/**
 * Script to create a test order for Trustpilot invitation testing
 * This creates a test order with status 'paid' so the Trustpilot invitation can be triggered
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function createTestOrder() {
  try {
    console.log('🛒 Creating test order for Trustpilot invitation...')
    
    // Generate a test order ID (must be UUID)
    const testOrderId = generateUUID()
    const testEmail = 'h.schlimback@gmail.com'
    
    // Create test order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: testOrderId,
        email: testEmail,
        status: 'paid',
        payment_status: 'paid',
        subtotal: 49.00,
        shipping_cost: 0,
        total: 49.00,
        shipping_address: {
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          address: 'Teststraat 123',
          city: 'Groningen',
          postalCode: '9711 AA',
          country: 'NL',
          phone: '+31612345678'
        },
        billing_address: {
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          address: 'Teststraat 123',
          city: 'Groningen',
          postalCode: '9711 AA',
          country: 'NL'
        },
        created_at: new Date().toISOString(),
        locale: 'nl'
      })
      .select()
      .single()
    
    if (orderError) {
      console.error('❌ Error creating order:', orderError)
      throw orderError
    }
    
    console.log('✅ Test order created:', testOrderId)
    console.log('📧 Email:', testEmail)
    console.log('')
    console.log('🌐 Visit this URL to trigger Trustpilot invitation:')
    console.log(`   http://localhost:3000/nl/order-confirmation?order_id=${testOrderId}`)
    console.log('   (or on production: https://mosewear.com/nl/order-confirmation?order_id=' + testOrderId + ')')
    console.log('')
    console.log('📝 Note: The Trustpilot invitation will be sent to:', testEmail)
    
    // Also create a test order item
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: testOrderId,
        product_name: 'Test Product',
        size: 'M',
        color: 'Black',
        sku: 'TEST-SKU-001',
        quantity: 1,
        price_at_purchase: 49.00,
        subtotal: 49.00,
        image_url: null
      })
      .select()
      .single()
    
    if (itemError) {
      console.warn('⚠️ Warning: Could not create order item:', itemError.message)
    } else {
      console.log('✅ Test order item created')
    }
    
    console.log('')
    console.log('✨ Done! Visit the order confirmation URL above to trigger the Trustpilot invitation.')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createTestOrder()

