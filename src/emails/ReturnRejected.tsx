import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailCallout from './components/EmailCallout'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface ReturnRejectedEmailProps {
  returnNumber: string
  customerName: string
  reason: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnRejectedEmail({
  returnNumber,
  customerName,
  reason,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnRejectedEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('returnRejected.preheader', { returnNumber }) ||
        `We kunnen retour ${returnNumber} helaas niet verwerken. Neem contact op en we helpen je verder.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('returnRejected.status') || 'Return Rejected'}
        statusColor={EMAIL_COLORS.danger}
      />

      <EmailHero
        badge={t('returnRejected.badge') || '✕ Niet Verwerkbaar'}
        badgeColor={EMAIL_COLORS.danger}
        title={`${t('returnRejected.heroGreeting') || 'Sorry'},\n${firstName}.`}
        subtitle={
          t('returnRejected.heroSubtitle') ||
          'We kunnen je retour helaas niet verwerken. Neem even contact op en we helpen je verder.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('returnRejected.returnNumber') || 'Retour', value: `#${returnNumber}` },
          {
            label: t('returnRejected.statusLabel') || 'Status',
            value: t('returnRejected.statusValue') || 'Afgewezen',
          },
        ]}
      />

      <EmailCallout tone="danger" title={t('returnRejected.reasonTitle') || 'Reden'}>
        {reason}
      </EmailCallout>

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('returnRejected.description') ||
            'Deze retour voldoet helaas niet aan onze retourvoorwaarden. Als je denkt dat dit onterecht is, laat het ons weten. We kijken er graag opnieuw naar.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href={`mailto:${contactEmail}?subject=Retour ${returnNumber}`}
        label={`${t('returnRejected.ctaButton') || 'Neem contact op'}  →`}
        footnote={
          <>
            {t('returnRejected.phoneHint') || 'Liever bellen?'}{' '}
            <a
              href={`tel:${EMAIL_DEFAULT_CONTACT.phone.replace(/\s/g, '')}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {EMAIL_DEFAULT_CONTACT.phone}
            </a>
          </>
        }
      />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
