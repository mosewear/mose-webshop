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
import { 
  OrderConfirmationEmail,
  ShippingConfirmationEmail,
  PreorderConfirmationEmail,
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
        orderId: props.orderId.slice(0, 8).toUpperCase() 
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
      return { success: false, error }
    }

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
        orderId: props.orderId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
 * This function uses legacy HTML generation temporarily
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

  // TODO: Create React Email template
  // For now, using simple HTML
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('processing.title')}</h1>
        <p>${t('processing.heroText', { name: props.customerName })}</p>
        <p>Order: #${props.orderId.slice(0, 8).toUpperCase()}</p>
        <p>${t('processing.whatHappensNow')}</p>
        <ul>
          <li>${t('processing.step1')}</li>
          <li>${t('processing.step2')}</li>
          <li>${t('processing.step3')}</li>
        </ul>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('processing.subject', { 
        orderId: props.orderId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('delivered.title')}</h1>
        <p>${t('delivered.heroText', { name: props.customerName })}</p>
        <p>Order: #${props.orderId.slice(0, 8).toUpperCase()}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('delivered.subject', { 
        orderId: props.orderId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('cancelled.title')}</h1>
        <p>${t('cancelled.heroText', { name: props.customerName })}</p>
        <p>Order: #${props.orderId.slice(0, 8).toUpperCase()}</p>
        ${props.cancellationReason ? `<p>${t('cancelled.reason')}: ${props.cancellationReason}</p>` : ''}
        <p>${t('cancelled.refundText')}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Webshop <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('cancelled.subject', { 
        orderId: props.orderId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('returnRequested.title')}</h1>
        <p>${t('returnRequested.heroText', { name: props.customerName })}</p>
        <p>Return: #${props.returnId.slice(0, 8).toUpperCase()}</p>
        <p>${t('returnRequested.reason')}: ${props.returnReason}</p>
        <p>${t('returnRequested.labelGeneratedText')}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRequested.subject', { 
        returnId: props.returnId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('returnLabelGenerated.title')}</h1>
        <p>${t('returnLabelGenerated.heroText', { name: props.customerName })}</p>
        <p>Return: #${props.returnId.slice(0, 8).toUpperCase()}</p>
        ${props.trackingCode ? `<p>${t('returnLabelGenerated.returnTrackingCode')}: ${props.trackingCode}</p>` : ''}
        ${props.labelUrl ? `<p><a href="${props.labelUrl}">${t('returnLabelGenerated.downloadLabel')}</a></p>` : ''}
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnLabelGenerated.subject', { 
        returnId: props.returnId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('returnApproved.title')}</h1>
        <p>${t('returnApproved.heroText', { name: props.customerName })}</p>
        <p>Return: #${props.returnId.slice(0, 8).toUpperCase()}</p>
        <p>${t('returnApproved.refundProcessingText')}</p>
        <p>${t('returnApproved.refundAmount')}: €${props.refundAmount.toFixed(2)}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnApproved.subject', { 
        returnId: props.returnId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('returnRefunded.title')}</h1>
        <p>${t('returnRefunded.heroText', { name: props.customerName })}</p>
        <p>Return: #${props.returnId.slice(0, 8).toUpperCase()}</p>
        <p>${t('returnRefunded.refundedAmount', { amount: props.refundAmount.toFixed(2) })}</p>
        <p>${t('returnRefunded.whenWillISeeItText')}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRefunded.subject', { 
        returnId: props.returnId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('returnRejected.title')}</h1>
        <p>${t('returnRejected.heroText', { name: props.customerName })}</p>
        <p>Return: #${props.returnId.slice(0, 8).toUpperCase()}</p>
        <p>${t('returnRejected.reasonForRejection')}: ${props.rejectionReason}</p>
        <p>${t('returnRejected.questionsText')}</p>
        <p>${settings.contact_email} • ${settings.contact_phone}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Returns <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('returnRejected.subject', { 
        returnId: props.returnId.slice(0, 8).toUpperCase() 
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
 * 
 * NOTE: Template not yet migrated to React Email
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

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('abandonedCart.title')}</h1>
        <p>${t('abandonedCart.heroTextPlural', { name: props.customerName, count: props.orderItems.length })}</p>
        <p><a href="${props.checkoutUrl}">${t('abandonedCart.completeOrder')}</a></p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Cart <orders@mosewear.com>',
      to: [props.customerEmail],
      subject: t('abandonedCart.subject', { name: props.customerName }),
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
 * 
 * NOTE: Template not yet migrated to React Email
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const productUrl = `${siteUrl}/product/${props.productSlug}`

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('backInStock.title')}</h1>
        <p>${t('backInStock.heroText', { productName: props.productName })}</p>
        <p><a href="${productUrl}">${t('backInStock.viewProduct')}</a></p>
      </body>
    </html>
  `

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
 * 
 * NOTE: Template not yet migrated to React Email
 */
export async function sendNewsletterWelcomeEmail(props: {
  email: string
  source?: string
  locale?: string
}) {
  const locale = props.locale || 'nl'
  const t = await getEmailT(locale)

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('newsletterWelcome.title')}</h1>
        <p>${t('newsletterWelcome.heroText')}</p>
      </body>
    </html>
  `

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
 * 
 * NOTE: Template not yet migrated to React Email
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

  const subjectLabels: Record<string, string> = {
    order: t('contactSubjects.order'),
    product: t('contactSubjects.product'),
    return: t('contactSubjects.return'),
    other: t('contactSubjects.other'),
  }
  const subjectLabel = subjectLabels[props.subject] || props.subject

  // TODO: Create React Email template
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${t('contact.title')}</h1>
        <p>${t('contact.from', { name: props.name })}</p>
        <p><strong>${t('contact.subjectLabel')}:</strong> ${subjectLabel}</p>
        <p><strong>${t('contact.message')}:</strong></p>
        <p>${props.message}</p>
        <p>${t('contact.replyText', { name: props.name })}</p>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Contact <info@mosewear.com>',
      to: [adminEmail],
      replyTo: props.email,
      subject: t('contact.subject', { subject: subjectLabel, name: props.name }),
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
