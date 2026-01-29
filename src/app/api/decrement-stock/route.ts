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
        // First get current stock (both regular and presale)
        const { data: currentVariant, error: fetchError } = await supabase
          .from('product_variants')
          .select('stock_quantity, presale_stock_quantity, presale_enabled')
          .eq('id', item.variant_id)
          .single()

        if (fetchError || !currentVariant) {
          console.error(`❌ Failed to fetch variant for ${item.product_name}:`, fetchError)
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: false,
            error: 'Variant not found'
          })
          continue
        }

        // Calculate total available stock
        const totalAvailable = currentVariant.stock_quantity + currentVariant.presale_stock_quantity

        // Check if enough total stock
        if (totalAvailable < item.quantity) {
          console.error(`❌ Insufficient total stock for ${item.product_name}`)
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: false,
            error: 'Insufficient stock'
          })
          continue
        }

        // DUAL INVENTORY LOGIC: Decrement regular stock first, then presale
        let remainingToDecrement = item.quantity
        let newRegularStock = currentVariant.stock_quantity
        let newPresaleStock = currentVariant.presale_stock_quantity
        let usedRegular = 0
        let usedPresale = 0

        // Step 1: Use regular stock first
        if (currentVariant.stock_quantity > 0) {
          const fromRegular = Math.min(remainingToDecrement, currentVariant.stock_quantity)
          newRegularStock -= fromRegular
          remainingToDecrement -= fromRegular
          usedRegular = fromRegular
        }

        // Step 2: Use presale stock if needed
        if (remainingToDecrement > 0 && currentVariant.presale_stock_quantity > 0) {
          const fromPresale = Math.min(remainingToDecrement, currentVariant.presale_stock_quantity)
          newPresaleStock -= fromPresale
          remainingToDecrement -= fromPresale
          usedPresale = fromPresale
        }

        // Update stock in database
        const { data: updatedVariant, error: updateError } = await supabase
          .from('product_variants')
          .update({ 
            stock_quantity: newRegularStock,
            presale_stock_quantity: newPresaleStock
          })
          .eq('id', item.variant_id)
          .select('id, stock_quantity, presale_stock_quantity')
          .single()

        if (updateError || !updatedVariant) {
          console.error(`❌ Failed to update stock for ${item.product_name}:`, updateError)
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: false,
            error: 'Failed to update stock'
          })
        } else {
          console.log(`✅ Stock decremented for ${item.product_name}:`, {
            regular: `${usedRegular} used (${updatedVariant.stock_quantity} remaining)`,
            presale: `${usedPresale} used (${updatedVariant.presale_stock_quantity} remaining)`
          })
          
          results.push({
            variant_id: item.variant_id,
            product_name: `${item.product_name} (${item.size} - ${item.color})`,
            success: true,
            new_regular_stock: updatedVariant.stock_quantity,
            new_presale_stock: updatedVariant.presale_stock_quantity,
            used_regular: usedRegular,
            used_presale: usedPresale,
            is_presale: usedPresale > 0
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

