import { createClient } from '@/lib/supabase/server'

/**
 * Log email sent to database for audit trail
 * NOTE: This is a server-only function
 */
export async function logEmailSent(params: {
  orderId: string
  emailType: string
  recipientEmail: string
  subject: string
  status?: 'sent' | 'failed'
  errorMessage?: string
  metadata?: any
}) {
  try {
    const supabase = await createClient()
    
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
      console.error('Error logging email:', error)
    }
    
    // Also update order's last email info
    await supabase
      .from('orders')
      .update({
        last_email_sent_at: new Date().toISOString(),
        last_email_type: params.emailType,
      })
      .eq('id', params.orderId)
    
  } catch (error) {
    console.error('Error in logEmailSent:', error)
  }
}

