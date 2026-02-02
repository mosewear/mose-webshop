import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    `mailto:info@mosewear.com`,
    vapidPublicKey,
    vapidPrivateKey
  )
}

interface OrderNotificationPayload {
  orderId: string
  orderTotal: number
  customerName: string
  itemCount: number
}

export async function sendOrderNotificationToAdmins(payload: OrderNotificationPayload) {
  try {
    console.log('[Push] Sending order notification to admins:', payload)

    // Get all admin push subscriptions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: subscriptions, error } = await supabase
      .from('admin_push_subscriptions')
      .select('subscription, user_id')

    if (error) {
      console.error('[Push] Error fetching subscriptions:', error)
      return { success: false, error: error.message }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No admin subscriptions found')
      return { success: true, sent: 0, message: 'No subscriptions' }
    }

    console.log(`[Push] Found ${subscriptions.length} admin subscription(s)`)

    // Prepare notification payload
    const notificationPayload = {
      title: '🛒 KaChing! Nieuwe Order!',
      body: `€${payload.orderTotal.toFixed(2)} - ${payload.customerName}\n${payload.itemCount} ${payload.itemCount === 1 ? 'item' : 'items'}`,
      icon: '/favicon.ico',
      badge: '/favicon-32x32.png',
      tag: `order-${payload.orderId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: `/admin/orders?highlight=${payload.orderId}`,
        orderId: payload.orderId,
        timestamp: Date.now(),
        type: 'new_order'
      },
      actions: [
        {
          action: 'view',
          title: 'Bekijk Order'
        },
        {
          action: 'close',
          title: 'Sluiten'
        }
      ]
    }

    // Send to all admin subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = sub.subscription as any
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload)
          )
          console.log(`[Push] Notification sent to user: ${sub.user_id}`)
          return { success: true, userId: sub.user_id }
        } catch (err: any) {
          console.error(`[Push] Failed to send to user ${sub.user_id}:`, err)
          
          // If subscription is invalid (410 Gone), remove it from database
          if (err.statusCode === 410) {
            console.log(`[Push] Removing invalid subscription for user: ${sub.user_id}`)
            await supabase
              .from('admin_push_subscriptions')
              .delete()
              .eq('user_id', sub.user_id)
          }
          
          return { success: false, userId: sub.user_id, error: err.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - successful

    console.log(`[Push] Notification summary: ${successful} sent, ${failed} failed`)

    return {
      success: true,
      sent: successful,
      failed: failed,
      total: results.length
    }
  } catch (error) {
    console.error('[Push] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


