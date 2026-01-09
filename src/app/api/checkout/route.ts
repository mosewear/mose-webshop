import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side checkout route using service_role to bypass RLS
export async function POST(request: Request) {
  try {
    const { order, items } = await request.json()

    console.log('🔥 SERVER CHECKOUT - Order:', order)
    console.log('🔥 SERVER CHECKOUT - Items:', items)

    // Create Supabase client with service_role key (bypasses RLS)
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

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single()

    if (orderError) {
      console.error('❌ SERVER: Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError },
        { status: 500 }
      )
    }

    console.log('✅ SERVER: Order created:', orderData)

    // Insert order items
    const orderItemsWithId = items.map((item: any) => ({
      ...item,
      order_id: orderData.id,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsWithId)

    if (itemsError) {
      console.error('❌ SERVER: Order items error:', itemsError)
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', orderData.id)
      return NextResponse.json(
        { error: 'Failed to create order items', details: itemsError },
        { status: 500 }
      )
    }

    console.log('✅ SERVER: Order items created')

    return NextResponse.json({ order: orderData })
  } catch (error: any) {
    console.error('💥 SERVER CHECKOUT ERROR:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



