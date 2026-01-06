import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAbandonedCartEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { requireAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Only admins or cron jobs can trigger this
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check if it's a cron job with secret
    const isCronJob = authHeader === `Bearer ${cronSecret}` && cronSecret

    // If not cron, must be admin
    if (!isCronJob) {
      const { authorized } = await requireAdmin()
      if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = await createClient()

    // Get site settings for configuration
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
    
    const settingsMap: Record<string, any> = {}
    settings?.forEach(s => {
      settingsMap[s.key] = s.value
    })

    const abandonedHours = parseInt(settingsMap.abandoned_cart_hours || 24)
    const emailEnabled = settingsMap.abandoned_cart_email_enabled === 'true' || settingsMap.abandoned_cart_email_enabled === true
    const freeShippingThreshold = parseFloat(settingsMap.free_shipping_threshold || 100)
    const returnDays = parseInt(settingsMap.return_days || 14)

    if (!emailEnabled) {
      return NextResponse.json({ 
        message: 'Abandoned cart emails are disabled in settings',
        sent: 0 
      })
    }

    // Get abandoned carts using the database function
    const { data: abandonedCarts, error } = await supabase
      .rpc('get_abandoned_carts', { 
        hours_threshold: abandonedHours,
        email_not_sent_only: true 
      })

    if (error) {
      console.error('Error fetching abandoned carts:', error)
      return NextResponse.json({ error: 'Failed to fetch abandoned carts' }, { status: 500 })
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return NextResponse.json({ 
        message: 'No abandoned carts found',
        sent: 0 
      })
    }

    console.log(`📧 Found ${abandonedCarts.length} abandoned cart(s) to email`)

    const emailResults = []

    // Send email for each abandoned cart
    for (const cart of abandonedCarts) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
        const checkoutUrl = `${siteUrl}/checkout?recover=${cart.order_id}`

        const emailResult = await sendAbandonedCartEmail({
          customerName: cart.customer_name || 'Klant',
          customerEmail: cart.customer_email,
          orderId: cart.order_id,
          orderTotal: parseFloat(cart.total),
          orderItems: cart.order_items.map((item: any) => ({
            name: item.product_name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`) : '',
          })),
          checkoutUrl: checkoutUrl,
          hoursSinceAbandoned: Math.round(cart.hours_since_abandonment),
          freeShippingThreshold: freeShippingThreshold,
          returnDays: returnDays,
        })

        // Log the email
        await logEmail({
          orderId: cart.order_id,
          emailType: 'abandoned_cart',
          recipientEmail: cart.customer_email,
          subject: `${cart.customer_name || 'Klant'}, je MOSE items wachten nog op je! 🛒`,
          status: emailResult.success ? 'sent' : 'failed',
          errorMessage: emailResult.error ? JSON.stringify(emailResult.error) : undefined,
        })

        if (emailResult.success) {
          // Mark as sent in database
          await supabase.rpc('mark_abandoned_cart_email_sent', { 
            order_uuid: cart.order_id 
          })

          emailResults.push({
            orderId: cart.order_id,
            email: cart.customer_email,
            success: true,
          })

          console.log(`✅ Abandoned cart email sent to ${cart.customer_email}`)
        } else {
          emailResults.push({
            orderId: cart.order_id,
            email: cart.customer_email,
            success: false,
            error: emailResult.error,
          })

          console.error(`❌ Failed to send abandoned cart email to ${cart.customer_email}:`, emailResult.error)
        }
      } catch (error) {
        console.error(`❌ Error processing abandoned cart ${cart.order_id}:`, error)
        emailResults.push({
          orderId: cart.order_id,
          email: cart.customer_email,
          success: false,
          error: error,
        })
      }
    }

    const successCount = emailResults.filter(r => r.success).length
    const failCount = emailResults.filter(r => !r.success).length

    return NextResponse.json({
      message: `Processed ${abandonedCarts.length} abandoned cart(s)`,
      sent: successCount,
      failed: failCount,
      results: emailResults,
    })
  } catch (error: any) {
    console.error('❌ Error in abandoned cart cron:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint for manual testing (admin only)
export async function GET(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get abandoned carts stats
    const { data: abandonedCarts, error } = await supabase
      .rpc('get_abandoned_carts', { 
        hours_threshold: 24,
        email_not_sent_only: false 
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const emailNotSent = abandonedCarts?.filter((c: any) => !c.abandoned_cart_email_sent) || []
    const emailSent = abandonedCarts?.filter((c: any) => c.abandoned_cart_email_sent) || []

    return NextResponse.json({
      total_abandoned: abandonedCarts?.length || 0,
      pending_email: emailNotSent.length,
      email_sent: emailSent.length,
      carts: abandonedCarts || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

