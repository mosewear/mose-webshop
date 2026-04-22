import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import {
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from './tokens'

interface GiftCardDeliveryEmailProps {
  code: string
  amount: number
  currency?: string
  expiresAt?: string | null
  recipientName?: string | null
  senderName?: string | null
  personalMessage?: string | null
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

function formatCurrency(amount: number, locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `€${amount.toFixed(2)}`
  }
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function GiftCardDeliveryEmail({
  code,
  amount,
  currency = 'EUR',
  expiresAt,
  recipientName,
  senderName,
  personalMessage,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: GiftCardDeliveryEmailProps) {
  const amountText = formatCurrency(amount, locale, currency)
  const expiryText = expiresAt ? formatDate(expiresAt, locale) : null
  const greetingName = recipientName?.trim() || null
  const fromName = senderName?.trim() || null

  return (
    <EmailShell
      locale={locale}
      preview={
        t('giftCardDelivery.preheader', { amount: amountText }) ||
        `Je cadeaubon van ${amountText} is klaar voor gebruik.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('giftCardDelivery.status') || 'Cadeaubon'}
      />

      <EmailHero
        badge={t('giftCardDelivery.badge') || '▲ Cadeaubon'}
        title={
          t('giftCardDelivery.heroTitle', { amount: amountText }) ||
          `${amountText}\ntegoed`
        }
        subtitle={
          greetingName
            ? t('giftCardDelivery.heroSubtitleNamed', { name: greetingName }) ||
              `Voor ${greetingName}${fromName ? ` — van ${fromName}` : ''}.`
            : t('giftCardDelivery.heroSubtitle') ||
              'Jouw persoonlijke MOSE-cadeaubon. Direct in te lossen bij afrekenen.'
        }
      />

      {personalMessage ? (
        <EmailModule padding="24px 24px 8px">
          <EmailSectionTitle
            title={t('giftCardDelivery.messageTitle') || 'Persoonlijk bericht'}
          />
          <div
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: '15px',
              lineHeight: '24px',
              color: EMAIL_COLORS.text,
              whiteSpace: 'pre-wrap',
              backgroundColor: EMAIL_COLORS.sectionAlt,
              border: `1px solid ${EMAIL_COLORS.border}`,
              padding: '16px 18px',
              marginTop: '4px',
            }}
          >
            {personalMessage}
            {fromName ? (
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.textSubtle,
                }}
              >
                — {fromName}
              </div>
            ) : null}
          </div>
        </EmailModule>
      ) : null}

      <EmailModule padding="28px 24px" background={EMAIL_COLORS.ink} align="center">
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.primary,
            fontWeight: 800,
            marginBottom: '10px',
          }}
        >
          {t('giftCardDelivery.codeLabel') || 'Jouw cadeaubon-code'}
        </div>
        <div
          style={{
            fontFamily: EMAIL_FONTS.display,
            fontSize: '28px',
            letterSpacing: '0.18em',
            color: '#ffffff',
            wordBreak: 'break-all',
            padding: '4px 0',
          }}
        >
          {code}
        </div>
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            color: '#d4d4d4',
            marginTop: '10px',
          }}
        >
          {t('giftCardDelivery.amountLabel') || 'Saldo'}: <strong>{amountText}</strong>
          {expiryText
            ? ` · ${t('giftCardDelivery.expiryLabel') || 'Geldig t/m'} ${expiryText}`
            : ''}
        </div>
      </EmailModule>

      <EmailModule padding="24px 24px 8px">
        <EmailParagraph>
          {t('giftCardDelivery.bodyIntro') ||
            'Gebruik deze code tijdens het afrekenen om je bestelling geheel of gedeeltelijk te betalen. Het resterende saldo blijft op de bon staan voor een volgende keer.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={t('giftCardDelivery.cta') || 'Shop nu'}
        footnote={
          t('giftCardDelivery.footnote', { email: contactEmail }) ||
          `Vragen? Mail ${contactEmail}`
        }
      />

      <EmailFooter
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
        siteUrl={siteUrl}
      />
    </EmailShell>
  )
}
