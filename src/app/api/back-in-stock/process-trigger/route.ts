import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBackInStockEmail } from '@/lib/email'

// This endpoint is called by the database trigger via pg_net
export async function POST(req: NextRequest) {
  try {
    // Verify it's from database trigger (optional security check)
    const triggerSource = req.headers.get('x-trigger-source')
    if (triggerSource !== 'database') {
      // Allow anyway, but log it
      console.log('Warning: process-trigger called without database trigger header')
    }

    const { notification_id, product_id, variant_id, email } = await req.json()

    if (!notification_id || !product_id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    // Check if notification still exists and is not notified
    const { data: notification, error: notificationError } = await supabase
      .from('back_in_stock_notifications')
      .select('*')
      .eq('id', notification_id)
      .eq('is_notified', false)
      .single()

    if (notificationError || !notification) {
      console.log('Notification already processed or not found:', notification_id)
      return NextResponse.json({ message: 'Notification already processed' }, { status: 200 })
    }

    // Double-check stock is still available
    if (variant_id) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock_quantity, is_available, size, color')
        .eq('id', variant_id)
        .single()

      if (variantError || !variant || variant.stock_quantity === 0 || !variant.is_available) {
        console.log('Variant no longer in stock:', variant_id)
        return NextResponse.json({ message: 'Variant no longer in stock' }, { status: 200 })
      }

      // Get product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, slug, base_price, product_images(url, is_primary)')
        .eq('id', product_id)
        .single()

      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      // Get primary image
      const primaryImage = (product.product_images as any[])?.find((img: any) => img.is_primary)
      const imageUrl = primaryImage?.url || (product.product_images as any[])?.[0]?.url

      // Send email
      const emailResult = await sendBackInStockEmail({
        customerEmail: email,
        productName: product.name,
        productSlug: product.slug,
        productImageUrl: imageUrl,
        productPrice: product.base_price,
        variantInfo: {
          size: variant.size,
          color: variant.color,
        },
      })

      if (emailResult.success) {
        // Mark as notified
        await supabase
          .from('back_in_stock_notifications')
          .update({
            is_notified: true,
            notified_at: new Date().toISOString(),
          })
          .eq('id', notification_id)

        return NextResponse.json({ success: true, message: 'Email sent' })
      } else {
        console.error('Failed to send email:', emailResult.error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    } else {
      // Check if any variant is in stock
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('stock_quantity, is_available')
        .eq('product_id', product_id)

      if (variantsError || !variants) {
        return NextResponse.json({ error: 'Failed to check variants' }, { status: 500 })
      }

      const inStock = variants.some(v => v.is_available && v.stock_quantity > 0)

      if (!inStock) {
        console.log('Product no longer in stock:', product_id)
        return NextResponse.json({ message: 'Product no longer in stock' }, { status: 200 })
      }

      // Get product info
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, slug, base_price, product_images(url, is_primary)')
        .eq('id', product_id)
        .single()

      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      // Get primary image
      const primaryImage = (product.product_images as any[])?.find((img: any) => img.is_primary)
      const imageUrl = primaryImage?.url || (product.product_images as any[])?.[0]?.url

      // Send email
      const emailResult = await sendBackInStockEmail({
        customerEmail: email,
        productName: product.name,
        productSlug: product.slug,
        productImageUrl: imageUrl,
        productPrice: product.base_price,
      })

      if (emailResult.success) {
        // Mark as notified
        await supabase
          .from('back_in_stock_notifications')
          .update({
            is_notified: true,
            notified_at: new Date().toISOString(),
          })
          .eq('id', notification_id)

        return NextResponse.json({ success: true, message: 'Email sent' })
      } else {
        console.error('Failed to send email:', emailResult.error)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    }
  } catch (error: any) {
    console.error('Error in process-trigger:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

