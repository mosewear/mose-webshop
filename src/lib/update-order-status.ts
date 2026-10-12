/**
 * Update Order Status Helper
 * 
 * Synchroniseert order status met return status
 */

import { createServiceClient } from '@/lib/supabase/service'

export async function updateOrderStatusForReturn(
  orderId: string,
  returnStatus: string
): Promise<void> {
  console.log('🔄 Updating order status based on return:', { orderId, returnStatus })

  // Map return status naar order status
  const statusMap: Record<string, string> = {
    'return_requested': 'return_requested',
    'return_approved': 'return_requested',
    'return_label_payment_pending': 'return_requested',
    'return_label_payment_completed': 'return_requested',
    'return_label_generated': 'return_requested',
    'return_in_transit': 'return_in_transit',
    'return_received': 'return_received',
    'refund_processing': 'return_received',
    'refunded': 'return_completed',
    'return_rejected': 'delivered', // Bij reject, blijf op delivered
  }

  const newOrderStatus = statusMap[returnStatus]

  if (!newOrderStatus) {
    console.log('⚠️ No order status mapping for return status:', returnStatus)
    return
  }

  console.log(`📝 Updating order ${orderId} to status: ${newOrderStatus}`)

  // De client wordt hier aangemaakt, niet op moduleniveau. Stond hij boven in
  // dit bestand, dan voert Next dit bestand al uit bij het verzamelen van de
  // routegegevens tijdens de build, en klapt de build eruit met
  // "supabaseKey is required" zodra SUPABASE_SERVICE_ROLE_KEY ontbreekt. Dat
  // maakte de build afhankelijk van een geheim dat hij niet nodig heeft.
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('❌ Error updating order status:', error)
    throw error
  }

  console.log('✅ Order status updated successfully')
}










