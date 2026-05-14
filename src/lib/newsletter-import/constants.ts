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

/** Ruim boven twee lijsten van ~15k; let op Vercel request body limits op Hobby. */
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_IMPORT_ROWS = 60000

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
