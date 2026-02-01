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
  OrderConfirmationEmail,
  ShippingConfirmationEmail,
  PreorderConfirmationEmail,
  NewsletterWelcomeEmail,
  BackInStockEmail,
  OrderProcessingEmail,
  OrderDeliveredEmail,
  OrderCancelledEmail,
  ReturnRequestedEmail,
  ReturnLabelGeneratedEmail,
  ReturnApprovedEmail,
  ReturnRefundedEmail,
  ReturnRejectedEmail,
  AbandonedCartEmail,
  ContactFormEmail,
} from '@/emails'

const resend = new Resend(process.env.RESEND_API_KEY)

// =====================================================
// ORDER EMAILS
// =====================================================

interface OrderEmailProps {
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

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject,
      html,
    })

    if (error) {
      console.error('❌ Error sending order confirmation email:', error)
      // Log failed email
      await logEmail({
        orderId: props.orderId,
        emailType: isFullPresaleOrder ? 'preorder_confirmation' : 'order_confirmation',
        recipientEmail: props.customerEmail,
        subject,
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
      })
      return { success: false, error }
    }

    // Log successful email
    await logEmail({
      orderId: props.orderId,
      emailType: isFullPresaleOrder ? 'preorder_confirmation' : 'order_confirmation',
      recipientEmail: props.customerEmail,
      subject,
      status: 'sent',
    })

    console.log(`✅ ${isFullPresaleOrder ? 'Preorder' : 'Order'} confirmation email sent:`, data)
    return { success: true, data }
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

    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('shipping.subject', { 
        orderNumber: props.orderId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending shipping confirmation email:', error)
      return { success: false, error }
    }

    console.log('✅ Shipping confirmation email sent:', data)
    return { success: true, data }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('processing.subject', { 
        orderNumber: props.orderId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending processing email:', error)
      return { success: false, error }
    }

    console.log('✅ Order processing email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending processing email:', error)
    return { success: false, error }
  }
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
      customerName: props.customerName,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('delivered.subject', { 
        orderNumber: props.orderId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending delivered email:', error)
      return { success: false, error }
    }

    console.log('✅ Order delivered email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending delivered email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('cancelled.subject', { 
        orderNumber: props.orderId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending cancelled email:', error)
      return { success: false, error }
    }

    console.log('✅ Order cancelled email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending cancelled email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRequested.subject', { 
        returnNumber: props.returnId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending return requested email:', error)
      return { success: false, error }
    }

    console.log('✅ Return requested email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending return requested email:', error)
    return { success: false, error }
  }
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

  const html = await render(
    ReturnLabelGeneratedEmail({
      returnNumber: props.returnId.slice(0, 8).toUpperCase(),
      customerName: props.customerName,
      returnLabelUrl: props.labelUrl || '',
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnLabelGenerated.subject', { 
        returnNumber: props.returnId.slice(0, 8).toUpperCase() 
      }),
      html,
      attachments: props.labelUrl ? [
        {
          filename: `retourlabel-${props.returnId.slice(0, 8)}.pdf`,
          path: props.labelUrl,
        },
      ] : [],
    })

    if (error) {
      console.error('❌ Error sending return label email:', error)
      return { success: false, error }
    }

    console.log('✅ Return label email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending return label email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnApproved.subject', { 
        returnNumber: props.returnId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending return approved email:', error)
      return { success: false, error }
    }

    console.log('✅ Return approved email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending return approved email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRefunded.subject', { 
        returnNumber: props.returnId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending return refunded email:', error)
      return { success: false, error }
    }

    console.log('✅ Return refunded email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending return refunded email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error} = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRejected.subject', { 
        returnNumber: props.returnId.slice(0, 8).toUpperCase() 
      }),
      html,
    })

    if (error) {
      console.error('❌ Error sending return rejected email:', error)
      return { success: false, error }
    }

    console.log('✅ Return rejected email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending return rejected email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Cart <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('abandonedCart.subject'),
      html,
    })

    if (error) {
      console.error('❌ Error sending abandoned cart email:', error)
      return { success: false, error }
    }

    console.log('✅ Abandoned cart email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending abandoned cart email:', error)
    return { success: false, error }
  }
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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Notifications <info@mosewear.com>',
      to: [props.customerEmail],
      subject: t('backInStock.subject', { productName: props.productName }),
      html,
    })

    if (error) {
      console.error('❌ Error sending back in stock email:', error)
      return { success: false, error }
    }

    console.log('✅ Back in stock email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending back in stock email:', error)
    return { success: false, error }
  }
}

/**
 * Send newsletter welcome email
 * Triggered when user subscribes to newsletter
 */
export async function sendNewsletterWelcomeEmail(props: {
  email: string
  source?: string
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
    NewsletterWelcomeEmail({
      email: props.email,
      t,
      siteUrl,
      contactEmail,
      contactPhone,
      contactAddress,
    })
  )

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Newsletter <info@mosewear.com>',
      to: [props.email],
      subject: t('newsletterWelcome.subject'),
      html,
    })

    if (error) {
      console.error('❌ Error sending newsletter welcome email:', error)
      return { success: false, error }
    }

    console.log('✅ Newsletter welcome email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending newsletter welcome email:', error)
    return { success: false, error }
  }
}

// =====================================================
// SUPPORT EMAILS
// =====================================================

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

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Contact <info@mosewear.com>',
      to: [adminEmail],
      replyTo: props.email,
      subject: t('contact.subject', { name: props.name }),
      html,
      headers: {
        'X-Entity-Ref-ID': `contact-${Date.now()}`,
      },
    })

    if (error) {
      console.error('❌ Error sending contact form email:', error)
      return { success: false, error }
    }

    console.log('✅ Contact form email sent:', data)
    return { success: true, data }
  } catch (error: any) {
    console.error('❌ Error sending contact form email:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Helper: Normalize image URL to absolute URL
 */
function normalizeImageUrl(url: string | undefined, siteUrl: string): string {
  if (!url) return ''
  
  url = url.trim()
  
  if (url === '/placeholder.png' || url === '/placeholder-product.png' || url === '') {
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
