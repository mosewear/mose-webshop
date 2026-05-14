/**
 * Email Service - React Email Implementation with i18n Support
 * 
 * This service sends all customer-facing emails using React Email templates
 * with full internationalization (NL/EN) support via i18next.
 * 
 * Features:
 * - React Email templates for type-safety and maintainability
 * - i18next for multi-language support (NL/EN)
 * - Resend as email delivery provider
 * - Automatic locale detection from order/return records
 * - Backward compatibility with existing email triggers
 */

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { getSiteSettings } from './settings'
import { getEmailT } from './email-i18n'
import { logEmail } from './email-logger'
import {
  EMAIL_TEMPLATES_BY_KEY,
  type EmailTemplateDefinition,
} from './email-catalog'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { 
  OrderConfirmationEmail,
  ShippingConfirmationEmail,
  PreorderConfirmationEmail,
  NewsletterWelcomeEmail,
  BackInStockEmail,
  OrderProcessingEmail,
  OrderDeliveredEmail,
  OrderCancelledEmail,
  ReturnRequestedEmail,
  ReturnCreatedByAdminEmail,
  ReturnLabelGeneratedEmail,
  ReturnApprovedEmail,
  ReturnRefundedEmail,
  ReturnRejectedEmail,
  AbandonedCartEmail,
  ContactFormEmail,
  NewReviewNotificationEmail,
  InsiderWelcomeEmail,
  InsiderCommunityEmail,
  InsiderBehindScenesEmail,
  InsiderLaunchWeekEmail,
  LoyaltyStatusUpdateEmail,
  GiftCardDeliveryEmail,
  SpringDrop1LaunchEmail,
  SpringDrop2TeeEmail,
  SpringDrop3FoundersEmail,
} from '@/emails'
import type { SpringDropProduct } from '@/emails/SpringDrop1Launch'
import type {
  SpringDrop2TeeColor,
  SpringDrop2TeeStaffelTier,
} from '@/emails/SpringDrop2Tee'

const resend = new Resend(process.env.RESEND_API_KEY)

// =====================================================
// sendAndLog — central wrapper around Resend + email log
// =====================================================

type ResendPayload = Parameters<typeof resend.emails.send>[0]

interface SendAndLogOptions {
  /** Key from email-catalog. Required so every email ends up in the admin log. */
  templateKey: string
  /** Optional link to an order for order/return emails. */
  orderId?: string | null
  /** Locale used for rendering (nl/en). */
  locale?: string
  /** Optional extra metadata stored with the log. */
  metadata?: Record<string, unknown>
}

interface SendAndLogResult<T> {
  success: boolean
  data?: T
  error?: unknown
}

/**
 * Send an email via Resend and log the result into `order_emails`.
 * Never throws — returns a `SendAndLogResult` the caller can forward.
 */
async function sendAndLog(
  payload: ResendPayload,
  options: SendAndLogOptions
): Promise<SendAndLogResult<{ id: string }>> {
  const template: EmailTemplateDefinition | undefined =
    EMAIL_TEMPLATES_BY_KEY[options.templateKey]
  const emailType = template?.category ?? 'other'
  const recipient = Array.isArray(payload.to)
    ? payload.to[0]
    : (payload.to as string)

  try {
    const { data, error } = await resend.emails.send(payload)

    if (error) {
      console.error(`❌ ${options.templateKey}: resend error`, error)
      await logEmail({
        emailType,
        templateKey: options.templateKey,
        orderId: options.orderId ?? null,
        recipientEmail: recipient,
        subject: String(payload.subject || ''),
        status: 'failed',
        errorMessage:
          (error as any)?.message || JSON.stringify(error) || 'Unknown error',
        locale: options.locale,
        metadata: options.metadata,
      })
      return { success: false, error }
    }

    console.log(`✅ ${options.templateKey} sent`, data)
    await logEmail({
      emailType,
      templateKey: options.templateKey,
      orderId: options.orderId ?? null,
      recipientEmail: recipient,
      subject: String(payload.subject || ''),
      status: 'sent',
      resendId: data?.id,
      locale: options.locale,
      metadata: options.metadata,
    })
    return { success: true, data: data ?? undefined }
  } catch (err) {
    console.error(`❌ ${options.templateKey}: unexpected error`, err)
    await logEmail({
      emailType,
      templateKey: options.templateKey,
      orderId: options.orderId ?? null,
      recipientEmail: recipient,
      subject: String(payload.subject || ''),
      status: 'failed',
      errorMessage: (err as any)?.message || 'Unknown error',
      locale: options.locale,
      metadata: options.metadata,
    })
    return { success: false, error: err }
  }
}

// =====================================================
// ORDER EMAILS
// =====================================================

interface OrderEmailProps {
  customerName: string
  customerEmail: string
  orderId: string
  orderTotal: number
  subtotal: number
  shippingCost: number
  orderItems: {
    name: string
    size: string
    color: string
    quantity: number
    price: number
    imageUrl?: string
    isPresale?: boolean
    presaleExpectedDate?: string
  }[]
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
  promoCode?: string
  discountAmount?: number
  locale?: string
}

/**
 * Send order confirmation email
 * Triggered after successful payment
 * Routes to PreorderConfirmation if all items are presale
 */
export async function sendOrderConfirmationEmail(props: OrderEmailProps) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

  try {
    // DEBUG: Log presale detection
    console.log('═══════════════════════════════════════════')
    console.log('📧 EMAIL: ORDER CONFIRMATION')
    console.log('═══════════════════════════════════════════')
    console.log('📦 Order ID:', props.orderId)
    console.log('📧 Customer:', props.customerEmail)
    console.log('🛍️ Total Items:', props.orderItems.length)
    console.log('📋 Items:')
    props.orderItems.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.name}`)
      console.log(`     - isPresale: ${item.isPresale}`)
      console.log(`     - presaleExpectedDate: ${item.presaleExpectedDate}`)
    })
    
    // Check if this is a presale order
    const presaleItems = props.orderItems.filter(item => item.isPresale)
    const isFullPresaleOrder = presaleItems.length === props.orderItems.length && presaleItems.length > 0
    const hasPresaleItems = presaleItems.length > 0
    
    console.log('🔍 PRESALE DETECTION:')
    console.log('   - Presale items count:', presaleItems.length)
    console.log('   - Total items:', props.orderItems.length)
    console.log('   - isFullPresaleOrder:', isFullPresaleOrder)
    console.log('   - hasPresaleItems:', hasPresaleItems)
    
    // Get presale expected date (use the first one found)
    const presaleExpectedDate = presaleItems[0]?.presaleExpectedDate || ''
    
    console.log('   - presaleExpectedDate:', presaleExpectedDate)
    
    let html: string
    let subject: string

    if (isFullPresaleOrder) {
      console.log('✅ Using PRESALE EMAIL template')
      // 100% Presale Order → Use PreorderConfirmation template
      html = await render(
        PreorderConfirmationEmail({
          ...props,
          presaleExpectedDate,
          t,
          siteUrl,
          contactEmail: settings.contact_email,
          contactPhone: settings.contact_phone,
          contactAddress: settings.contact_address,
        })
      )
      subject = t('preorder.subject', { 
        orderNumber: props.orderId.slice(0, 8).toUpperCase() 
      })
    } else {
      console.log('✅ Using REGULAR EMAIL template (hasPresaleItems:', hasPresaleItems, ')')
      // Regular or Mixed Order → Use OrderConfirmation template
      html = await render(
        OrderConfirmationEmail({
          ...props,
          hasPresaleItems,
          presaleExpectedDate: hasPresaleItems ? presaleExpectedDate : undefined,
          t,
          siteUrl,
          contactEmail: settings.contact_email,
          contactPhone: settings.contact_phone,
          contactAddress: settings.contact_address,
        })
      )
      subject = t('orderConfirmation.subject', { 
        orderId: props.orderId.slice(0, 8).toUpperCase() 
      })
    }

    console.log('📬 Email Subject:', subject)
    console.log('═══════════════════════════════════════════')

    return await sendAndLog(
      {
        from: 'MOSE Webshop <orders@mosewear.com>',
        to: [props.customerEmail],
        subject,
        html,
      },
      {
        templateKey: isFullPresaleOrder
          ? 'preorder_confirmation'
          : 'order_confirmation',
        orderId: props.orderId,
        locale,
      }
    )
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error)
    return { success: false, error }
  }
}

/**
 * Send shipping confirmation email
 * Triggered when order is shipped with tracking
 */
export async function sendShippingConfirmationEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  trackingCode: string
  trackingUrl?: string
  carrier?: string
  estimatedDelivery?: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

  try {
    const html = await render(
      ShippingConfirmationEmail({
        ...props,
        t,
        siteUrl,
        contactEmail: settings.contact_email,
        contactPhone: settings.contact_phone,
        contactAddress: settings.contact_address,
      })
    )

    return await sendAndLog(
      {
        from: 'MOSE Webshop <orders@mosewear.com>',
        to: [props.customerEmail],
        subject: t('shipping.subject', {
          orderNumber: props.orderId.slice(0, 8).toUpperCase(),
        }),
        html,
      },
      {
        templateKey: 'shipping_confirmation',
        orderId: props.orderId,
        locale,
      }
    )
  } catch (error) {
    console.error('❌ Error sending shipping confirmation email:', error)
    return { success: false, error }
  }
}

/**
 * Send order processing email
 * Triggered when order status changes to 'processing'
 */
export async function sendOrderProcessingEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderTotal: number
  estimatedShipDate?: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    OrderProcessingEmail({
      orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('processing.subject', {
        orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'order_processing',
      orderId: props.orderId,
      locale,
    }
  )
}

/**
 * Send order delivered email
 * Triggered when order status changes to 'delivered'
 */
export async function sendOrderDeliveredEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderItems: Array<{
    product_id: string
    product_name: string
    image_url?: string
  }>
  shippingAddress?: any
  deliveryDate?: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    OrderDeliveredEmail({
      orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      orderReferenceId: props.orderId,
      customerName: props.customerName,
      t,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  // Trustpilot Automatic Feedback Service — BCC a unique AFS address on the
  // delivered email so Trustpilot sends a review invitation with the delay
  // configured in the Trustpilot Business portal. This is 100% server-side
  // and does NOT depend on cookie consent or third-party JS on the client.
  const trustpilotBcc = process.env.TRUSTPILOT_AFS_BCC_EMAIL?.trim()
  const bcc = trustpilotBcc ? [trustpilotBcc] : undefined

  return await sendAndLog(
    {
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      ...(bcc ? { bcc } : {}),
      subject: t('delivered.subject', {
        orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      }),
      html,
      headers: {
        'X-Trustpilot-Reference-Id': props.orderId,
      },
    },
    {
      templateKey: 'order_delivered',
      orderId: props.orderId,
      locale,
      metadata: {
        trustpilot_bcc: Boolean(bcc),
      },
    }
  )
}

/**
 * Send order cancelled email
 * Triggered when order is cancelled
 */
export async function sendOrderCancelledEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderTotal: number
  cancellationReason?: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    OrderCancelledEmail({
      orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      reason: props.cancellationReason,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('cancelled.subject', {
        orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'order_cancelled',
      orderId: props.orderId,
      locale,
    }
  )
}

// =====================================================
// RETURN EMAILS
// =====================================================

/**
 * Send return requested email
 * Triggered when customer submits return request
 */
export async function sendReturnRequestedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  returnReason: string
  returnItems: Array<{
    product_name: string
    quantity: number
    size: string
    color: string
  }>
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const items = props.returnItems.map(item => ({
    name: `${item.product_name} (${item.size} - ${item.color})`,
    quantity: item.quantity
  }))

  const html = await render(
    ReturnRequestedEmail({
      orderNumber: props.orderId.slice(0, 8).toUpperCase(),
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      items,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRequested.subject', {
        returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'return_requested',
      orderId: props.orderId,
      locale,
      metadata: { returnId: props.returnId },
    }
  )
}

/**
 * Send "return created by admin" email
 * Triggered when an admin manually creates a return on behalf of a customer.
 * Supports the 4 label handling modes; see ReturnCreatedByAdmin template.
 */
export async function sendReturnCreatedByAdminEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  labelMode: 'admin_generated' | 'customer_paid' | 'customer_free' | 'in_store'
  inStoreState?: 'approved' | 'received'
  returnItems: Array<{
    product_name: string
    size?: string
    color?: string
    quantity: number
  }>
  refundAmount: number
  labelCost: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress =
    settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const returnNumber = props.returnId.slice(0, 8).toUpperCase()
  const orderNumber = props.orderId.slice(0, 8).toUpperCase()

  const html = await render(
    ReturnCreatedByAdminEmail({
      returnNumber,
      orderNumber,
      customerName: props.customerName,
      labelMode: props.labelMode,
      inStoreState: props.inStoreState,
      returnItems: props.returnItems,
      refundAmount: props.refundAmount,
      labelCost: props.labelCost,
      t,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  // Subject varieert per mode
  const fallbackSubjects: Record<string, string> = {
    customer_paid: `Retour ${returnNumber} aangemaakt: rond de labelbetaling af`,
    customer_free: `Retour ${returnNumber} aangemaakt: gratis retourlabel klaar`,
    in_store: `Retour ${returnNumber} aangemaakt: breng langs in de winkel`,
    admin_generated: `Retour ${returnNumber} aangemaakt: label onderweg`,
  }
  const subjectKey = `returnCreatedByAdmin.subject_${props.labelMode}`
  let subject = t(subjectKey, { returnNumber })
  if (!subject || subject === subjectKey) {
    subject = fallbackSubjects[props.labelMode] || `Retour ${returnNumber} aangemaakt`
  }

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject,
      html,
    },
    {
      templateKey: 'return_created_by_admin',
      orderId: props.orderId,
      locale,
      metadata: {
        returnId: props.returnId,
        labelMode: props.labelMode,
        inStoreState: props.inStoreState ?? null,
      },
    }
  )
}

/**
 * Send return label generated email
 * Triggered when return label is created and ready to download
 */
export async function sendReturnLabelGeneratedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  trackingCode: string | null
  trackingUrl: string | null
  labelUrl: string | null
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  // The CTA button must NEVER point to the raw Sendcloud URL — that
  // endpoint requires HTTP Basic Auth and would 401 in the customer's
  // browser. Instead we link to the return detail page where the
  // customer can download the PDF through the authenticated proxy.
  const returnPageUrl = `${siteUrl}/${locale}/returns/${props.returnId}`

  // For the actual PDF attachment we fetch the file server-side using
  // the Sendcloud API credentials and embed it as a base64 buffer.
  // Resend's `path` option fetches the URL anonymously (no auth
  // headers), so passing a Sendcloud URL there silently produces an
  // empty attachment.
  let pdfAttachment: { filename: string; content: string } | null = null
  if (props.labelUrl) {
    try {
      const sendcloudKey = process.env.SENDCLOUD_PUBLIC_KEY
      const sendcloudSecret = process.env.SENDCLOUD_SECRET_KEY
      if (sendcloudKey && sendcloudSecret) {
        const auth = Buffer.from(`${sendcloudKey}:${sendcloudSecret}`).toString('base64')
        const pdfRes = await fetch(props.labelUrl, {
          headers: { Authorization: `Basic ${auth}` },
        })
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
          pdfAttachment = {
            filename: `retourlabel-${props.returnId.slice(0, 8)}.pdf`,
            content: pdfBuffer.toString('base64'),
          }
        } else {
          console.error(
            '[sendReturnLabelGeneratedEmail] Sendcloud PDF fetch failed:',
            pdfRes.status,
            pdfRes.statusText
          )
        }
      } else {
        console.error(
          '[sendReturnLabelGeneratedEmail] Missing SENDCLOUD_PUBLIC_KEY / SENDCLOUD_SECRET_KEY; sending email without PDF attachment.'
        )
      }
    } catch (attachErr) {
      console.error('[sendReturnLabelGeneratedEmail] Failed to attach label PDF:', attachErr)
    }
  }

  const html = await render(
    ReturnLabelGeneratedEmail({
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      returnLabelUrl: returnPageUrl,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnLabelGenerated.subject', {
        returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      }),
      html,
      attachments: pdfAttachment ? [pdfAttachment] : [],
    },
    {
      templateKey: 'return_label_generated',
      orderId: props.orderId,
      locale,
      metadata: { returnId: props.returnId },
    }
  )
}

/**
 * Send return approved email
 * Triggered when return is approved and refund is initiated
 */
export async function sendReturnApprovedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  returnItems: Array<{
    product_name: string
    quantity: number
  }>
  refundAmount: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    ReturnApprovedEmail({
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      refundAmount: props.refundAmount,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnApproved.subject', {
        returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'return_approved',
      orderId: props.orderId,
      locale,
      metadata: { returnId: props.returnId },
    }
  )
}

/**
 * Send return refunded email
 * Triggered when refund is completed
 */
export async function sendReturnRefundedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  refundAmount: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    ReturnRefundedEmail({
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      refundAmount: props.refundAmount,
      refundMethod: "Original Payment Method",
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRefunded.subject', {
        returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'return_refunded',
      orderId: props.orderId,
      locale,
      metadata: { returnId: props.returnId, refundAmount: props.refundAmount },
    }
  )
}

/**
 * Send return rejected email
 * Triggered when return request is rejected
 */
export async function sendReturnRejectedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  rejectionReason: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    ReturnRejectedEmail({
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      reason: props.rejectionReason,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRejected.subject', {
        returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      }),
      html,
    },
    {
      templateKey: 'return_rejected',
      orderId: props.orderId,
      locale,
      metadata: { returnId: props.returnId },
    }
  )
}

// =====================================================
// MARKETING EMAILS
// =====================================================

/**
 * Send abandoned cart email
 * Triggered when customer leaves items in cart
 */
export async function sendAbandonedCartEmail(props: {
  customerName: string
  customerEmail: string
  orderId: string
  orderTotal: number
  orderItems: {
    name: string
    size: string
    color: string
    quantity: number
    price: number
    imageUrl?: string
  }[]
  checkoutUrl: string
  hoursSinceAbandoned: number
  freeShippingThreshold?: number
  returnDays?: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const items = props.orderItems.map(item => ({
    name: item.name,
    price: item.price,
    imageUrl: normalizeImageUrl(item.imageUrl, siteUrl),
    quantity: item.quantity
  }))

  const html = await render(
    AbandonedCartEmail({
      customerName: props.customerName,
      items,
      totalAmount: props.orderTotal,
      cartUrl: props.checkoutUrl,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Cart <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('abandonedCart.subject'),
      html,
    },
    {
      templateKey: 'abandoned_cart',
      orderId: props.orderId,
      locale,
      metadata: { hoursSinceAbandoned: props.hoursSinceAbandoned },
    }
  )
}

/**
 * Send back in stock email
 * Triggered when product is back in stock
 */
export async function sendBackInStockEmail(props: {
  customerEmail: string
  productName: string
  productSlug: string
  productImageUrl?: string
  productPrice: number
  variantInfo?: {
    size: string
    color: string
  }
  freeShippingThreshold?: number
  returnDays?: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  // Normalize image URL
  const productImage = normalizeImageUrl(props.productImageUrl, siteUrl)

  // Build variant name
  const variantName = props.variantInfo
    ? `${props.variantInfo.size} - ${props.variantInfo.color}`
    : undefined

  const html = await render(
    BackInStockEmail({
      email: props.customerEmail,
      productName: props.productName,
      productSlug: props.productSlug,
      variantName,
      productImage,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Notifications <info@mosewear.com>',
      to: [props.customerEmail],
      subject: t('backInStock.subject', { productName: props.productName }),
      html,
    },
    {
      templateKey: 'back_in_stock',
      locale,
      metadata: {
        productName: props.productName,
        productSlug: props.productSlug,
      },
    }
  )
}

/**
 * Send newsletter welcome email
 * Triggered when user subscribes to newsletter
 */
export async function sendNewsletterWelcomeEmail(props: {
  email: string
  source?: string
  locale?: string
  promoCode?: string
  promoExpiry?: Date
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    NewsletterWelcomeEmail({
      email: props.email,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
      promoCode: props.promoCode,
      promoExpiry: props.promoExpiry,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Newsletter <info@mosewear.com>',
      to: [props.email],
      subject: t('newsletterWelcome.subject'),
      html,
    },
    {
      templateKey: 'newsletter_welcome',
      locale,
      metadata: { source: props.source, promoCode: props.promoCode },
    }
  )
}

// =====================================================
// SUPPORT EMAILS
// =====================================================

/**
 * Send new review notification email to admin
 * Triggered when customer submits a product review
 */
export async function sendNewReviewNotificationEmail(props: {
  reviewerName: string
  reviewerEmail: string
  productName: string
  productSlug: string
  rating: number
  title?: string
  comment?: string
  reviewId: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  const adminEmail = process.env.CONTACT_EMAIL || settings.contact_email

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    NewReviewNotificationEmail({
      reviewerName: props.reviewerName,
      reviewerEmail: props.reviewerEmail,
      productName: props.productName,
      productSlug: props.productSlug,
      rating: props.rating,
      title: props.title,
      comment: props.comment,
      reviewId: props.reviewId,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Reviews <info@mosewear.com>',
      to: [adminEmail],
      replyTo: props.reviewerEmail,
      subject: t('newReview.subject'),
      html,
      headers: {
        'X-Entity-Ref-ID': `review-${props.reviewId}`,
      },
    },
    {
      templateKey: 'new_review_notification',
      locale,
      metadata: {
        reviewId: props.reviewId,
        rating: props.rating,
        reviewerEmail: props.reviewerEmail,
        productSlug: props.productSlug,
      },
    }
  )
}

/**
 * Send contact form email
 * Triggered when customer submits contact form
 */
export async function sendContactFormEmail(props: {
  name: string
  email: string
  subject: string
  message: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  const adminEmail = process.env.CONTACT_EMAIL || settings.contact_email

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const subjectLabels: Record<string, string> = {
    order: t('contactSubjects.order'),
    product: t('contactSubjects.product'),
    return: t('contactSubjects.return'),
    other: t('contactSubjects.other'),
  }
  const subjectLabel = subjectLabels[props.subject] || props.subject

  const html = await render(
    ContactFormEmail({
      customerName: props.name,
      customerEmail: props.email,
      subject: subjectLabel,
      message: props.message,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Contact <info@mosewear.com>',
      to: [adminEmail],
      replyTo: props.email,
      subject: t('contact.subject', { name: props.name }),
      html,
      headers: {
        'X-Entity-Ref-ID': `contact-${Date.now()}`,
      },
    },
    {
      templateKey: 'contact_form',
      locale,
      metadata: {
        fromName: props.name,
        fromEmail: props.email,
        topic: props.subject,
      },
    }
  )
}

/**
 * Helper: Normalize image URL to absolute URL
 */
function normalizeImageUrl(url: string | undefined, siteUrl: string): string {
  if (!url) return ''
  
  url = url.trim()
  
  if (url === '/placeholder.png' || url === '/placeholder-product.png' || url === '/placeholder-product.svg' || url === '') {
    return ''
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  if (url.includes('supabase') && url.includes('storage')) {
    if (!url.startsWith('http')) {
      return `https://${url}`
    }
    return url
  }
  
  if (url.startsWith('/')) {
    return `${siteUrl}${url}`
  }
  
  return `${siteUrl}/${url}`
}

// =====================================================
// INSIDER EMAIL SEQUENCE
// =====================================================

/**
 * Send insider welcome email (Email 1)
 * Triggered immediately after early access signup
 */
export async function sendInsiderWelcomeEmail(props: {
  email: string
  locale?: string
  promoCode?: string
  promoExpiry?: Date
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    InsiderWelcomeEmail({
      email: props.email,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
      promoCode: props.promoCode,
      promoExpiry: props.promoExpiry,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Insider Club <info@mosewear.com>',
      to: [props.email],
      subject: t('insiderWelcome.title'),
      html,
    },
    {
      templateKey: 'insider_welcome',
      locale,
      metadata: { promoCode: props.promoCode },
    }
  )
}

/**
 * Send insider community email (Email 2)
 * Triggered 3 days after signup
 */
export async function sendInsiderCommunityEmail(props: {
  email: string
  subscriberCount: number
  daysUntilLaunch: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  // Fetch the 3 featured products
  const supabase = createServiceRoleClient()
  const productSlugs = ['mose-essential-tee-zwart', 'mose-crewneck-sweater', 'mose-classic-hoodie-zwart']
  
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      name_en,
      product_images(url, is_primary)
    `)
    .in('slug', productSlugs)

  // Map products with images
  const featuredProducts = productSlugs.map(slug => {
    const product = products?.find(p => p.slug === slug)
    if (!product) return null
    
    // Find primary image or first image
    const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
    const imageUrl = primaryImage?.url || ''
    const productName = locale === 'en' && product.name_en ? product.name_en : product.name
    
    return {
      name: productName,
      slug: product.slug,
      imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`) : '',
      url: `${siteUrl}/${locale}/product/${product.slug}`,
    }
  }).filter(Boolean)

  const html = await render(
    InsiderCommunityEmail({
      email: props.email,
      subscriberCount: props.subscriberCount,
      daysUntilLaunch: props.daysUntilLaunch,
      featuredProducts: featuredProducts as Array<{ name: string; slug: string; imageUrl: string; url: string }>,
      t,
      siteUrl,
      locale,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Insider Club <info@mosewear.com>',
      to: [props.email],
      subject: t('insiderCommunity.title'),
      html,
    },
    {
      templateKey: 'insider_community',
      locale,
      metadata: {
        subscriberCount: props.subscriberCount,
        daysUntilLaunch: props.daysUntilLaunch,
      },
    }
  )
}

/**
 * Send insider behind scenes email (Email 3)
 * Triggered 1 week after signup
 */
export async function sendInsiderBehindScenesEmail(props: {
  email: string
  storyContent: string
  daysUntilLaunch: number
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    InsiderBehindScenesEmail({
      email: props.email,
      storyContent: props.storyContent,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Insider Club <info@mosewear.com>',
      to: [props.email],
      subject: t('insiderBehindScenes.title'),
      html,
    },
    {
      templateKey: 'insider_behind_scenes',
      locale,
      metadata: { daysUntilLaunch: props.daysUntilLaunch },
    }
  )
}

/**
 * Send insider launch week email (Email 4)
 * Triggered 3 days before launch
 */
export async function sendInsiderLaunchWeekEmail(props: {
  email: string
  daysUntilLaunch: number
  limitedItems: string[]
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress = settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const html = await render(
    InsiderLaunchWeekEmail({
      email: props.email,
      daysUntilLaunch: props.daysUntilLaunch,
      limitedItems: props.limitedItems,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  return await sendAndLog(
    {
      from: 'MOSE Insider Club <info@mosewear.com>',
      to: [props.email],
      subject: t('insiderLaunchWeek.title', { days: props.daysUntilLaunch }),
      html,
    },
    {
      templateKey: 'insider_launch_week',
      locale,
      metadata: {
        daysUntilLaunch: props.daysUntilLaunch,
        limitedItems: props.limitedItems,
      },
    }
  )
}

// =====================================================
// Loyalty Status Update — broadcast & automatic tier-up
// =====================================================

type LoyaltyTier = 'bronze' | 'silver' | 'gold'

/**
 * Stuurt de Loyalty Status Update mail.
 * - variant='broadcast' voor een algemene status-mail (bijv. vanuit admin broadcast)
 * - variant='tier_up' voor een automatische mail bij tier-promotie (Stripe webhook)
 */
export async function sendLoyaltyStatusUpdateEmail(props: {
  customerEmail: string
  customerName: string
  tier: LoyaltyTier
  pointsBalance: number
  lifetimePoints: number
  previousTier?: LoyaltyTier | null
  variant?: 'broadcast' | 'tier_up'
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const settings = await getSiteSettings()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = settings.contact_email || 'info@mosewear.com'
  const contactPhone = settings.contact_phone || '+31 50 211 1931'
  const contactAddress =
    settings.contact_address || 'Stavangerweg 13, 9723 JC Groningen'

  const variant = props.variant || 'broadcast'

  const html = await render(
    LoyaltyStatusUpdateEmail({
      customerName: props.customerName,
      tier: props.tier,
      pointsBalance: props.pointsBalance,
      lifetimePoints: props.lifetimePoints,
      previousTier: props.previousTier ?? null,
      variant,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  const tierLabelNl: Record<LoyaltyTier, string> = {
    bronze: 'Brons',
    silver: 'Zilver',
    gold: 'Goud',
  }
  const tierLabelEn: Record<LoyaltyTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
  }
  const tierLabel =
    locale === 'en' ? tierLabelEn[props.tier] : tierLabelNl[props.tier]

  const subject =
    variant === 'tier_up'
      ? locale === 'en'
        ? `You\u2019re now ${tierLabel}. Your new MOSE perks are live.`
        : `Gefeliciteerd, je bent nu ${tierLabel} bij MOSE`
      : locale === 'en'
        ? `Your MOSE loyalty status: ${tierLabel}`
        : `Je MOSE loyalty status: ${tierLabel}`

  return await sendAndLog(
    {
      from: 'MOSE Loyalty <info@mosewear.com>',
      to: [props.customerEmail],
      subject,
      html,
    },
    {
      templateKey: 'loyalty_status_update',
      locale,
      metadata: {
        tier: props.tier,
        variant,
        pointsBalance: props.pointsBalance,
        lifetimePoints: props.lifetimePoints,
        previousTier: props.previousTier ?? null,
      },
    }
  )
}

/**
 * Send a gift card delivery email to the recipient (or purchaser when no
 * separate recipient was specified).
 */
export async function sendGiftCardDeliveryEmail(props: {
  toEmail: string
  code: string
  amount: number
  currency?: string
  expiresAt?: string | null
  recipientName?: string | null
  senderName?: string | null
  personalMessage?: string | null
  locale?: string
  orderId?: string | null
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)
  const settings = await getSiteSettings()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

  try {
    const html = await render(
      GiftCardDeliveryEmail({
        code: props.code,
        amount: props.amount,
        currency: props.currency || 'EUR',
        expiresAt: props.expiresAt ?? null,
        recipientName: props.recipientName ?? null,
        senderName: props.senderName ?? null,
        personalMessage: props.personalMessage ?? null,
        t,
        locale,
        siteUrl,
        contactEmail: settings.contact_email,
        contactPhone: settings.contact_phone,
        contactAddress: settings.contact_address,
      })
    )

    const amountText = (() => {
      try {
        return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
          style: 'currency',
          currency: props.currency || 'EUR',
        }).format(props.amount)
      } catch {
        return `€${props.amount.toFixed(2)}`
      }
    })()

    const subject =
      t('giftCardDelivery.subject', { amount: amountText }) ||
      `Je MOSE cadeaubon van ${amountText}`

    return await sendAndLog(
      {
        from: 'MOSE Gift Cards <orders@mosewear.com>',
        to: [props.toEmail],
        subject,
        html,
      },
      {
        templateKey: 'gift_card_delivery',
        orderId: props.orderId ?? null,
        locale,
        metadata: {
          amount: props.amount,
          currency: props.currency || 'EUR',
          expiresAt: props.expiresAt ?? null,
          hasRecipient: !!props.recipientName,
        },
      }
    )
  } catch (error) {
    console.error('❌ Error sending gift card delivery email:', error)
    return { success: false, error }
  }
}

// =====================================================
// SPRING DROP CAMPAIGN 2026
// =====================================================
//
// Driedelige Nederlandse campagne richting nieuwsbrief-abonnees. De admin
// send-route mailt in chunks (RPC-wachtrij + parallelle Resend-calls) zodat
// grote lijsten binnen serverless-limieten blijven. Alles draait om assets
// en kortingen die al in de DB zitten:
//   - lente-sale prijzen op Hoodie / Sweater / Watch (al actief)
//   - staffelkorting op de Tee (2+, 3+ — al actief)
//   - persoonlijke WELCOME10-XXXXXX promo codes (al uitgegeven)
// Geen nieuwe marge weggeven, alleen zichtbaar maken.
//
// Compliance:
//   - elke mail krijgt een unsubscribeUrl in de footer
//   - elke send krijgt List-Unsubscribe + List-Unsubscribe-Post headers,
//     zodat Gmail/Apple Mail de native one-click unsubscribe-knop tonen
//     (CAN-SPAM + RFC 8058 + Gmail bulk sender 2024 vereisten)
// =====================================================

const SPRING_DROP_FROM = '"Irma & Rick (MOSE)" <info@mosewear.com>'
const SPRING_DROP_CAMPAIGN_KEY = 'spring_drop_2026'

function buildUnsubscribeUrl(siteUrl: string, locale: string, email: string) {
  return `${siteUrl}/${locale}/unsubscribe?email=${encodeURIComponent(email)}`
}

function buildListUnsubscribeHeaders(unsubscribeUrl: string, contactEmail: string) {
  // Volgens RFC 2369 + 8058: comma-separated mailto + https.
  // Resend rendert dit 1:1 door naar de email headers.
  return {
    'List-Unsubscribe': `<mailto:${contactEmail}?subject=unsubscribe>, <${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

function buildResendTags(mailNumber: 1 | 2 | 3) {
  return [
    { name: 'campaign', value: SPRING_DROP_CAMPAIGN_KEY },
    { name: 'mail', value: String(mailNumber) },
  ]
}

interface SpringDropBaseProps {
  email: string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

/**
 * Send Spring Drop mail 1: launch + productgrid (Tee, hoodie, sweater).
 */
export async function sendSpringDrop1LaunchEmail(
  props: SpringDropBaseProps & {
    products: SpringDropProduct[]
    shopUrl: string
    heroImageUrl: string
    heroAlt?: string
    /** Longread op de site; anders afgeleid in SpringDrop1Launch. */
    storyUrl?: string
  }
) {
  const locale = props.locale || 'nl'
  const settings = await getSiteSettings()
  const siteUrl =
    props.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail =
    props.contactEmail || settings.contact_email || 'info@mosewear.com'
  const contactPhone =
    props.contactPhone || settings.contact_phone || '+31 50 211 1931'
  const contactAddress =
    props.contactAddress ||
    settings.contact_address ||
    'Stavangerweg 13, 9723 JC Groningen'

  const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, locale, props.email)

  const html = await render(
    SpringDrop1LaunchEmail({
      email: props.email,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
      unsubscribeUrl,
      products: props.products,
      shopUrl: props.shopUrl,
      heroImageUrl: props.heroImageUrl,
      heroAlt: props.heroAlt,
      storyUrl: props.storyUrl,
    })
  )

  const subject =
    locale === 'en'
      ? 'Clothes from our studio in Groningen (not a warehouse far away)'
      : 'Kleding uit een atelier in Groningen (niet uit een magazijn ergens ver weg)'

  return await sendAndLog(
    {
      from: SPRING_DROP_FROM,
      to: [props.email],
      subject,
      html,
      headers: buildListUnsubscribeHeaders(unsubscribeUrl, contactEmail),
      tags: buildResendTags(1),
    },
    {
      templateKey: 'spring_drop_1_launch',
      locale,
      metadata: {
        campaign: SPRING_DROP_CAMPAIGN_KEY,
        mail: 1,
      },
    }
  )
}

/**
 * Send Spring Drop mail 2: Tee-focus + colors + staffel block.
 */
export async function sendSpringDrop2TeeEmail(
  props: SpringDropBaseProps & {
    colors: SpringDrop2TeeColor[]
    staffel: SpringDrop2TeeStaffelTier[]
    heroImageUrl: string
    teeUrl: string
    shopUrl: string
    heroAlt?: string
    someSizesSoldOut?: boolean
  }
) {
  const locale = props.locale || 'nl'
  const settings = await getSiteSettings()
  const siteUrl =
    props.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail =
    props.contactEmail || settings.contact_email || 'info@mosewear.com'
  const contactPhone =
    props.contactPhone || settings.contact_phone || '+31 50 211 1931'
  const contactAddress =
    props.contactAddress ||
    settings.contact_address ||
    'Stavangerweg 13, 9723 JC Groningen'

  const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, locale, props.email)

  const html = await render(
    SpringDrop2TeeEmail({
      email: props.email,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
      unsubscribeUrl,
      colors: props.colors,
      staffel: props.staffel,
      heroImageUrl: props.heroImageUrl,
      teeUrl: props.teeUrl,
      shopUrl: props.shopUrl,
      heroAlt: props.heroAlt,
      someSizesSoldOut: props.someSizesSoldOut,
    })
  )

  const subject =
    locale === 'en'
      ? 'A favourite from this shoot: the MOSE Tee.'
      : 'Een favoriet uit deze shoot: de MOSE Tee.'

  return await sendAndLog(
    {
      from: SPRING_DROP_FROM,
      to: [props.email],
      subject,
      html,
      headers: buildListUnsubscribeHeaders(unsubscribeUrl, contactEmail),
      tags: buildResendTags(2),
    },
    {
      templateKey: 'spring_drop_2_tee',
      locale,
      metadata: {
        campaign: SPRING_DROP_CAMPAIGN_KEY,
        mail: 2,
      },
    }
  )
}

/**
 * Send Spring Drop mail 3: founders note + WELCOME10-code reminder.
 *
 * `promoCode` is normaal een persoonlijke `WELCOME10-XXXXXX` (uit
 * `promo_codes.subscriber_id`). Als de subscriber geen persoonlijke code
 * heeft, valt de send-API terug op de globale `SPRING10`.
 */
export async function sendSpringDrop3FoundersEmail(
  props: SpringDropBaseProps & {
    promoCode: string
    promoExpiryLabel: string
    ctaUrl: string
    shippedOrders?: number
  }
) {
  const locale = props.locale || 'nl'
  const settings = await getSiteSettings()
  const siteUrl =
    props.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail =
    props.contactEmail || settings.contact_email || 'info@mosewear.com'
  const contactPhone =
    props.contactPhone || settings.contact_phone || '+31 50 211 1931'
  const contactAddress =
    props.contactAddress ||
    settings.contact_address ||
    'Stavangerweg 13, 9723 JC Groningen'

  const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, locale, props.email)

  const html = await render(
    SpringDrop3FoundersEmail({
      email: props.email,
      locale,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
      unsubscribeUrl,
      promoCode: props.promoCode,
      promoExpiryLabel: props.promoExpiryLabel,
      ctaUrl: props.ctaUrl,
      shippedOrders: props.shippedOrders,
    })
  )

  const subject =
    locale === 'en'
      ? 'Your MOSE code is expiring.'
      : 'Je MOSE-code verloopt binnenkort.'

  return await sendAndLog(
    {
      // Mail 3 voelt persoonlijker; we sturen vanuit info@ om
      // domain-reputatie consistent te houden (geen extra Resend domain
      // setup nodig). Reply-to staat op contact-mailbox.
      from: SPRING_DROP_FROM,
      to: [props.email],
      replyTo: contactEmail,
      subject,
      html,
      headers: buildListUnsubscribeHeaders(unsubscribeUrl, contactEmail),
      tags: buildResendTags(3),
    },
    {
      templateKey: 'spring_drop_3_founders',
      locale,
      metadata: {
        campaign: SPRING_DROP_CAMPAIGN_KEY,
        mail: 3,
        promoCode: props.promoCode,
      },
    }
  )
}

