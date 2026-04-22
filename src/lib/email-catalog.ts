/**
 * Central catalog of every email template MOSE can send.
 *
 * One source of truth for:
 *   - the admin "templates" tab
 *   - logging (`template_key`)
 *   - email-preview API
 *
 * If you add a new email template, add it here as well.
 */

export type EmailTemplateCategory =
  | 'order'
  | 'return'
  | 'marketing'
  | 'insider'
  | 'loyalty'
  | 'admin'

export interface EmailTemplateDefinition {
  /** Stable identifier. Used as template_key in the email log. */
  key: string
  /** Human readable name for the admin UI. */
  name: string
  /** Short description of when the email is sent. */
  description: string
  /** Groups templates in the admin UI. Also used as `email_type` fallback. */
  category: EmailTemplateCategory
  /** Brand color used in the admin UI. */
  accent: string
  /** Route in the email-preview API. */
  previewSlug: string
  /** Optional from address hint shown in admin. */
  from?: string
}

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: 'order_confirmation',
    name: 'Order Confirmation',
    description: 'Sent automatically after a successful payment.',
    category: 'order',
    accent: '#00A676',
    previewSlug: 'order-confirmation',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'preorder_confirmation',
    name: 'Preorder Confirmation',
    description: 'Sent when every item in the order is a preorder.',
    category: 'order',
    accent: '#f59e0b',
    previewSlug: 'preorder-confirmation',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'order_processing',
    name: 'Order Processing',
    description: 'Sent when the order moves into processing.',
    category: 'order',
    accent: '#00A676',
    previewSlug: 'order-processing',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'shipping_confirmation',
    name: 'Shipping Confirmation',
    description: 'Sent when a tracking code becomes available.',
    category: 'order',
    accent: '#2563eb',
    previewSlug: 'shipping-confirmation',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'order_delivered',
    name: 'Order Delivered',
    description: 'Sent when the carrier marks the parcel as delivered.',
    category: 'order',
    accent: '#00A676',
    previewSlug: 'order-delivered',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'order_cancelled',
    name: 'Order Cancelled',
    description: 'Sent after an order is cancelled by admin or customer.',
    category: 'order',
    accent: '#e74c3c',
    previewSlug: 'order-cancelled',
    from: 'MOSE Webshop <orders@mosewear.com>',
  },
  {
    key: 'return_requested',
    name: 'Return Requested',
    description: 'Sent when a return request is submitted.',
    category: 'return',
    accent: '#f59e0b',
    previewSlug: 'return-requested',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'return_created_by_admin',
    name: 'Return Created by Admin',
    description: 'Sent when an admin manually creates a return on behalf of a customer.',
    category: 'return',
    accent: '#00A676',
    previewSlug: 'return-created-by-admin',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'return_label_generated',
    name: 'Return Label',
    description: 'Sent with the PDF return label attached.',
    category: 'return',
    accent: '#2563eb',
    previewSlug: 'return-label',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'return_approved',
    name: 'Return Approved',
    description: 'Sent when a return is approved and refund starts.',
    category: 'return',
    accent: '#00A676',
    previewSlug: 'return-approved',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'return_refunded',
    name: 'Return Refunded',
    description: 'Sent once the refund has been processed.',
    category: 'return',
    accent: '#00A676',
    previewSlug: 'return-refunded',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'return_rejected',
    name: 'Return Rejected',
    description: 'Sent when a return request is rejected.',
    category: 'return',
    accent: '#e74c3c',
    previewSlug: 'return-rejected',
    from: 'MOSE Returns <orders@mosewear.com>',
  },
  {
    key: 'abandoned_cart',
    name: 'Abandoned Cart',
    description: 'Reminder email for carts that were left behind.',
    category: 'marketing',
    accent: '#f59e0b',
    previewSlug: 'abandoned-cart',
    from: 'MOSE Cart <orders@mosewear.com>',
  },
  {
    key: 'back_in_stock',
    name: 'Back in Stock',
    description: 'Sent when a subscribed product is restocked.',
    category: 'marketing',
    accent: '#00A676',
    previewSlug: 'back-in-stock',
    from: 'MOSE Notifications <info@mosewear.com>',
  },
  {
    key: 'newsletter_welcome',
    name: 'Newsletter Welcome',
    description: 'Welcome email for new newsletter subscribers.',
    category: 'marketing',
    accent: '#00A676',
    previewSlug: 'newsletter-welcome',
    from: 'MOSE Newsletter <info@mosewear.com>',
  },
  {
    key: 'insider_welcome',
    name: 'Insider Welcome',
    description: 'First email of the insider sequence, sent after signup.',
    category: 'insider',
    accent: '#00A676',
    previewSlug: 'insider-welcome',
    from: 'MOSE Insider Club <info@mosewear.com>',
  },
  {
    key: 'insider_community',
    name: 'Insider Community',
    description: 'Second insider email: community proof.',
    category: 'insider',
    accent: '#00A676',
    previewSlug: 'insider-community',
    from: 'MOSE Insider Club <info@mosewear.com>',
  },
  {
    key: 'insider_behind_scenes',
    name: 'Insider Behind the Scenes',
    description: 'Third insider email: the story behind the drop.',
    category: 'insider',
    accent: '#00A676',
    previewSlug: 'insider-behind-scenes',
    from: 'MOSE Insider Club <info@mosewear.com>',
  },
  {
    key: 'insider_launch_week',
    name: 'Insider Launch Week',
    description: 'Fourth insider email: launch week countdown.',
    category: 'insider',
    accent: '#f59e0b',
    previewSlug: 'insider-launch-week',
    from: 'MOSE Insider Club <info@mosewear.com>',
  },
  {
    key: 'loyalty_status_update',
    name: 'Loyalty Status Update',
    description:
      'Snapshot van tier + punten. Verstuurd als one-off broadcast én automatisch bij tier-promoties.',
    category: 'loyalty',
    accent: '#00A676',
    previewSlug: 'loyalty-status-update',
    from: 'MOSE Loyalty <info@mosewear.com>',
  },
  {
    key: 'contact_form',
    name: 'Contact Form',
    description: 'Notification to the team when a customer uses the contact form.',
    category: 'admin',
    accent: '#2563eb',
    previewSlug: 'contact-form',
    from: 'MOSE Contact <info@mosewear.com>',
  },
  {
    key: 'new_review_notification',
    name: 'New Review',
    description: 'Notification to the team when a new review awaits moderation.',
    category: 'admin',
    accent: '#f59e0b',
    previewSlug: 'new-review',
    from: 'MOSE Reviews <info@mosewear.com>',
  },
  {
    key: 'gift_card_delivery',
    name: 'Cadeaubon',
    description:
      'Sent to the recipient of a purchased or admin-created gift card with the redeem code.',
    category: 'order',
    accent: '#00A676',
    previewSlug: 'gift-card-delivery',
    from: 'MOSE Gift Cards <orders@mosewear.com>',
  },
]

export const EMAIL_TEMPLATES_BY_KEY: Record<string, EmailTemplateDefinition> =
  EMAIL_TEMPLATES.reduce(
    (acc, tpl) => {
      acc[tpl.key] = tpl
      return acc
    },
    {} as Record<string, EmailTemplateDefinition>
  )

export function getTemplateByKey(
  key: string | null | undefined
): EmailTemplateDefinition | undefined {
  if (!key) return undefined
  return EMAIL_TEMPLATES_BY_KEY[key]
}

export function getCategoryLabel(category: EmailTemplateCategory): string {
  switch (category) {
    case 'order':
      return 'Order'
    case 'return':
      return 'Return'
    case 'marketing':
      return 'Marketing'
    case 'insider':
      return 'Insider Club'
    case 'loyalty':
      return 'Loyalty'
    case 'admin':
      return 'Admin'
  }
}
