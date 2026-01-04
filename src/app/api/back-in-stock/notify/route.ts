import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, productId, variantId } = await req.json()

    // Validation
    if (!email || !productId) {
      return NextResponse.json(
        { error: 'Email en product ID zijn verplicht' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product niet gevonden' },
        { status: 404 }
      )
    }

    // If variantId provided, check if variant exists and is in stock
    if (variantId) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('id, stock_quantity, is_available')
        .eq('id', variantId)
        .eq('product_id', productId)
        .single()

      if (!variantError && variant) {
        // If variant is already in stock, don't add notification
        if (variant.is_available && variant.stock_quantity > 0) {
          return NextResponse.json(
            { error: 'Dit product is al op voorraad' },
            { status: 400 }
          )
        }
      }
    }

    // Insert notification (or update if exists)
    const { data, error } = await supabase
      .from('back_in_stock_notifications')
      .upsert(
        {
          email,
          product_id: productId,
          variant_id: variantId || null,
          is_notified: false,
        },
        {
          onConflict: 'email,product_id,variant_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json(
        { error: 'Kon notificatie niet aanmaken' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Je ontvangt een email zodra het product weer op voorraad is',
    })
  } catch (error: any) {
    console.error('Error in back-in-stock notify:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

