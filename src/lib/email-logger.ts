import { createServiceClient } from '@/lib/supabase/service'

/**
 * Shape of an email log entry we write into `order_emails`.
 *
 * The table is called `order_emails` for historical reasons but we reuse it
 * as the central email log for ALL templates (order, return, marketing,
 * insider, admin). `order_id` is nullable since 2026-04-18.
 */
export interface LogEmailParams {
  /** Human readable category (order, return, marketing, insider, admin) */
  emailType: string
  /**
   * Template identifier used to group & filter in the admin UI.
   * Falls back to `emailType` when omitted (legacy callers).
   */
  templateKey?: string
  recipientEmail: string
  subject: string
  status?: 'sent' | 'failed'
  errorMessage?: string
  /** Message id returned by Resend */
  resendId?: string
  locale?: string
  /** Optional link to an order — only for order/return related emails */
  orderId?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Log an email send to Supabase for audit and admin visibility.
 *
 * Uses the service role client so it can write regardless of RLS.
 * Never throws — logging must never break the actual email send flow.
 */
export async function logEmail(params: LogEmailParams): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.from('order_emails').insert({
      order_id: params.orderId ?? null,
      email_type: params.emailType,
      template_key: params.templateKey ?? params.emailType,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      status: params.status || 'sent',
      error_message: params.errorMessage ?? null,
      resend_id: params.resendId ?? null,
      locale: params.locale ?? null,
      metadata: params.metadata ?? null,
    })

    if (error) {
      console.error('❌ email-logger: failed to insert log row:', {
        template: params.templateKey,
        recipient: params.recipientEmail,
        error,
      })
      return
    }

    console.log('📬 email-logger: logged', {
      template: params.templateKey ?? params.emailType,
      to: params.recipientEmail,
      status: params.status || 'sent',
    })

    if (params.orderId) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: params.emailType,
        })
        .eq('id', params.orderId)

      if (updateError) {
        console.error('❌ email-logger: failed to update order metadata:', updateError)
      }
    }
  } catch (err) {
    console.error('❌ email-logger: unexpected error', err)
  }
}
