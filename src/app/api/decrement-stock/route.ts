import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side stock decrement (called after payment success)
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()

    console.log('📦 STOCK DECREMENT - Order:', orderId)

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service_role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('variant_id, quantity, product_name, size, color')
      .eq('order_id', orderId)

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('❌ Failed to fetch order items:', itemsError)
      return NextResponse.json(
        { error: 'Order items not found' },
        { status: 404 }
      )
    }

    console.log(`📦 Decrementing stock for ${orderItems.length} items...`)

    // Decrement stock for each item
    const results = []
    for (const item of orderItems) {
      try {
        // Use atomic update to prevent race conditions
        const { data: updatedVariant, error: updateError } = await supabase
          .from('product_variants')
          .update({ 
            stock_quantity: supabase.raw(`stock_quantity - ${item.quantity}`)
          })
          .eq('id', item.variant_id)
          .gte('stock_quantity', item.quantity) // Only update if enough stock
          .select('id, stock_quantity')
          .single()

        if (updateError || !updatedVariant) {
          console.error(`❌ Failed to decrement stock for ${item.product_name}:`, updateError)
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: false,
            error: 'Insufficient stock or variant not found'
          })
        } else {
          console.log(`✅ Stock decremented for ${item.product_name}: ${updatedVariant.stock_quantity} remaining`)
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: true,
            new_stock: updatedVariant.stock_quantity
          })
        }
      } catch (err: any) {
        console.error(`💥 Exception while decrementing stock:`, err)
        results.push({
          variant_id: item.variant_id,
          product_name: `${item.product_name} (${item.size} - ${item.color})`,
          success: false,
          error: err.message
        })
      }
    }

    // Check if all decrements were successful
    const allSuccess = results.every(r => r.success)
    const successCount = results.filter(r => r.success).length

    if (!allSuccess) {
      console.warn(`⚠️ Stock decrement partial success: ${successCount}/${results.length}`)
      return NextResponse.json(
        { 
          success: false,
          message: 'Some items could not be decremented',
          results 
        },
        { status: 207 } // 207 Multi-Status
      )
    }

    console.log(`✅ Stock decremented successfully for all ${results.length} items`)
    return NextResponse.json({ 
      success: true,
      message: 'Stock decremented successfully',
      results 
    })

  } catch (error: any) {
    console.error('💥 STOCK DECREMENT ERROR:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

