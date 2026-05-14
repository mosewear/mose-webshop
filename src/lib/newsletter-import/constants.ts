/** Values allowed in DB `newsletter_subscribers.source` (must match CHECK constraint + migration). */
export const NEWSLETTER_DB_SOURCES = [
  'homepage',
  'product_page',
  'checkout',
  'footer',
  'popup',
  'early_access',
  'early_access_landing',
  'admin_import',
] as const

export type NewsletterDbSource = (typeof NEWSLETTER_DB_SOURCES)[number]

export const DEFAULT_IMPORT_SOURCE: NewsletterDbSource = 'admin_import'

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_IMPORT_ROWS = 8000

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
