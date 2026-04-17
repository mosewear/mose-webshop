/**
 * MOSE Email Design Tokens (Modular Grid System)
 *
 * Alle email-templates gebruiken deze tokens voor een consistente,
 * brutalistische en on-brand uitstraling — matchend met de MOSE webshop.
 * Kleuren, fonts en spacing zijn afgestemd op maximale rendering-
 * compatibiliteit in Gmail, Outlook, Apple Mail en mobile clients.
 */

export const EMAIL_FONTS = {
  display: "'Anton', 'Arial Black', Impact, sans-serif",
  body: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
} as const

export const EMAIL_COLORS = {
  primary: '#00A676',
  primaryDark: '#008F66',
  primaryGlow: '#0d2a1f',
  primaryLight: '#c5f2e1',

  ink: '#000000',
  black: '#0a0a0a',
  dark900: '#0a0a0a',
  dark800: '#1a1a1a',
  dark700: '#1f1f1f',
  dark600: '#2a2a2a',
  dark500: '#555555',

  text: '#111111',
  textMuted: '#666666',
  textSubtle: '#888888',
  textFaint: '#999999',

  paper: '#ffffff',
  surface: '#eeeae2',
  productBg: '#f4f1ea',
  sectionAlt: '#f8f6f1',
  border: '#ece9e1',
  borderStrong: '#000000',

  warning: '#f59e0b',
  warningBg: '#fff7e6',
  warningBorder: '#fcd34d',
  danger: '#e74c3c',
  dangerBg: '#fdecec',
  dangerBorder: '#f5b5b1',
  success: '#00A676',
  successBg: '#e6f6ef',
  successBorder: '#8ed9bc',
  info: '#2563eb',
  infoBg: '#eaf1ff',
  infoBorder: '#b8ccf7',
} as const

export const EMAIL_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

export const EMAIL_DEFAULT_CONTACT = {
  email: 'info@mosewear.com',
  phone: '+31 50 211 1931',
  address: 'Stavangerweg 13, 9723 JC Groningen',
} as const

export const EMAIL_ASSETS = {
  logoWhite: '/logomose_white.png',
  logoBlack: '/logomose.png',
  // 512 x 210 native -> gebruik 120x49 in header/footer, 150x62 in nav
  logoWidth: 120,
  logoHeight: 49,
} as const

export type EmailStatusTone =
  | 'success'
  | 'processing'
  | 'shipping'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

export const EMAIL_TONE_COLORS: Record<EmailStatusTone, string> = {
  success: EMAIL_COLORS.primary,
  processing: EMAIL_COLORS.primary,
  shipping: EMAIL_COLORS.warning,
  warning: EMAIL_COLORS.warning,
  danger: EMAIL_COLORS.danger,
  info: EMAIL_COLORS.primary,
  neutral: EMAIL_COLORS.textSubtle,
}
