/** Never expose provider text (or its language) to customers. Codes are stable across locales. */
const messages = {
  nl: {
    required: 'Vul alle verplichte velden in.',
    invalid_email: 'Vul een geldig e-mailadres in.',
    rate_limited: 'Te veel aanvragen. Wacht even en probeer het opnieuw.',
    subscriber_not_found: 'Dit e-mailadres staat niet op onze nieuwsbrieflijst.',
    same_password: 'Kies een ander wachtwoord dan je huidige wachtwoord.',
    weak_password: 'Kies een sterker wachtwoord van minimaal 6 tekens.',
    session_expired: 'Deze link is verlopen. Vraag een nieuwe link aan.',
  },
  en: {
    required: 'Complete all required fields.',
    invalid_email: 'Enter a valid email address.',
    rate_limited: 'Too many requests. Wait a moment and try again.',
    subscriber_not_found: 'This email address is not on our newsletter list.',
    same_password: 'Choose a different password from your current password.',
    weak_password: 'Choose a stronger password with at least 6 characters.',
    session_expired: 'This link has expired. Request a new link.',
  },
} as const

export function publicError(error: unknown, locale: string, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const value = error as { code?: string; status?: number }
  const aliases: Record<string, keyof typeof messages.nl> = {
    email_address_invalid: 'invalid_email', validation_failed: 'required',
    over_request_rate_limit: 'rate_limited', over_email_send_rate_limit: 'rate_limited',
    otp_expired: 'session_expired', session_not_found: 'session_expired',
  }
  const code = value.status === 429 ? 'rate_limited' : aliases[value.code || ''] || value.code
  const dictionary = locale === 'en' ? messages.en : messages.nl
  return code && Object.prototype.hasOwnProperty.call(dictionary, code)
    ? dictionary[code as keyof typeof dictionary] : fallback
}
