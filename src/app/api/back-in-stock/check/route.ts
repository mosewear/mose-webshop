import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBackInStockEmail } from '@/lib/email'

// This endpoint should be called by a cron job to check for products back in stock
// Supports both GET (for EasyCron.com) and POST requests
export async function GET(req: NextRequest) {
  return handleCronCheck(req)
}

export async function POST(req: NextRequest) {
  return handleCronCheck(req)
}

async function handleCronCheck(req: NextRequest) {
  try {
    // Verify cron secret from query parameter (EasyCron.com) or Authorization header
    const searchParams = req.nextUrl.searchParams
    const cronSecret = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get all pending notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('back_in_stock_notifications')
      .select('*')
      .eq('is_notified', false)

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications', processed: 0 })
    }

    let processed = 0
    const errors: string[] = []

    // Process each notification
    for (const notification of notifications) {
      try {
        // Check if variant is in stock
        if (notification.variant_id) {
          const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .select('stock_quantity, is_available, size, color')
            .eq('id', notification.variant_id)
            .single()

          if (variantError || !variant) {
            continue
          }

          // Check if in stock
          if (variant.is_available && variant.stock_quantity > 0) {
            // Get product info
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('name, slug, base_price, product_images(url, is_primary)')
              .eq('id', notification.product_id)
              .single()

            if (productError || !product) {
              errors.push(`Product ${notification.product_id} not found`)
              continue
            }

            // Get primary image
            const primaryImage = (product.product_images as any[])?.find((img: any) => img.is_primary)
            const imageUrl = primaryImage?.url || (product.product_images as any[])?.[0]?.url

            // Send email
            const emailResult = await sendBackInStockEmail({
              customerEmail: notification.email,
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
                .eq('id', notification.id)

              processed++
            } else {
              errors.push(`Failed to send email to ${notification.email}`)
            }
          }
        } else {
          // Check if any variant of the product is in stock
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('stock_quantity, is_available')
            .eq('product_id', notification.product_id)

          if (variantsError || !variants) {
            continue
          }

          const inStock = variants.some(v => v.is_available && v.stock_quantity > 0)

          if (inStock) {
            // Get product info
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('name, slug, base_price, product_images(url, is_primary)')
              .eq('id', notification.product_id)
              .single()

            if (productError || !product) {
              errors.push(`Product ${notification.product_id} not found`)
              continue
            }

            // Get primary image
            const primaryImage = (product.product_images as any[])?.find((img: any) => img.is_primary)
            const imageUrl = primaryImage?.url || (product.product_images as any[])?.[0]?.url

            // Send email
            const emailResult = await sendBackInStockEmail({
              customerEmail: notification.email,
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
                .eq('id', notification.id)

              processed++
            } else {
              errors.push(`Failed to send email to ${notification.email}`)
            }
          }
        }
      } catch (error: any) {
        errors.push(`Error processing notification ${notification.id}: ${error.message}`)
        console.error('Error processing notification:', error)
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} notifications`,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error in back-in-stock check:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

