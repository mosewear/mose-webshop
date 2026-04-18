import { Link } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCallout from './components/EmailCallout'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface ContactFormEmailProps {
  customerName: string
  customerEmail: string
  subject: string
  message: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ContactFormEmail({
  customerName,
  customerEmail,
  subject,
  message,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ContactFormEmailProps) {
  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t('contact.from') || 'Van', value: customerName },
    {
      label: t('contact.email') || 'E-mail',
      value: (
        <Link
          href={`mailto:${customerEmail}`}
          style={{ color: EMAIL_COLORS.primary, textDecoration: 'none', fontWeight: 700 }}
        >
          {customerEmail}
        </Link>
      ),
    },
    { label: t('contact.subject') || 'Onderwerp', value: subject },
  ]

  return (
    <EmailShell
      locale={locale}
      preview={
        t('contact.preheader', { name: customerName, subject }) ||
        `Nieuw bericht van ${customerName} via het contactformulier.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('contact.status') || 'Contact Form'} />

      <EmailHero
        badge={t('contact.badge') || '▲ Inbox'}
        title={t('contact.heroTitle') || 'New\nMessage.'}
        subtitle={t('contact.subtitle') || 'Er is een nieuw bericht binnengekomen via het contactformulier.'}
      />

      <EmailModule padding="24px 30px">
        <EmailSectionTitle title={t('contact.detailsTitle') || 'Verzender'} />
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ marginTop: '18px' }}
        >
          <tbody>
            {infoRows.map((row, idx) => (
              <tr key={idx}>
                <td
                  width="140"
                  valign="top"
                  style={{
                    width: '140px',
                    padding: '6px 0',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: EMAIL_COLORS.textFaint,
                    fontWeight: 800,
                  }}
                >
                  {row.label}
                </td>
                <td
                  valign="top"
                  style={{
                    padding: '6px 0',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '14px',
                    color: EMAIL_COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmailModule>

      <EmailModule padding="24px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailSectionTitle title={t('contact.message') || 'Bericht'} />
        <div
          style={{
            marginTop: '16px',
            fontFamily: EMAIL_FONTS.body,
            fontSize: '15px',
            lineHeight: 1.7,
            color: EMAIL_COLORS.text,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </div>
      </EmailModule>

      <EmailCallout tone="info">
        {t('contact.replyInfo', { email: customerEmail }) ||
          `Reageer direct door te antwoorden naar ${customerEmail}.`}
      </EmailCallout>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
