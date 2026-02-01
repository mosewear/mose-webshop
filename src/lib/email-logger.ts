import { createServiceClient } from '@/lib/supabase/service'

/**
 * Log email sent to database for audit trail
 * 
 * Uses service role client to bypass RLS policies.
 * This is safe because:
 * - Function is only called server-side
 * - Used for system logging (emails sent by the application)
 * - No user input is directly inserted (all params are controlled by our code)
 * 
 * NOTE: This is a server-only function
 */
export async function logEmail(params: {
  orderId: string
  emailType: string
  recipientEmail: string
  subject: string
  status?: 'sent' | 'failed'
  errorMessage?: string
  metadata?: any
}) {
  try {
    // Use service client to bypass RLS (server-side only, safe for system logging)
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('order_emails')
      .insert({
        order_id: params.orderId,
        email_type: params.emailType,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        status: params.status || 'sent',
        error_message: params.errorMessage,
        metadata: params.metadata,
      })
    
    if (error) {
      console.error('❌ Error logging email to database:', error)
      console.error('   Order ID:', params.orderId)
      console.error('   Email Type:', params.emailType)
      console.error('   Recipient:', params.recipientEmail)
    } else {
      console.log('✅ Email logged to database:', {
        orderId: params.orderId,
        emailType: params.emailType,
        status: params.status || 'sent'
      })
    }
    
    // Also update order's last email info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        last_email_sent_at: new Date().toISOString(),
        last_email_type: params.emailType,
      })
      .eq('id', params.orderId)
    
    if (updateError) {
      console.error('❌ Error updating order last_email info:', updateError)
    }
    
  } catch (error) {
    console.error('❌ Error in logEmail:', error)
  }
}

