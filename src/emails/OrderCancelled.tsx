import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailCallout from './components/EmailCallout'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import EmailParagraph from './components/EmailParagraph'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface OrderCancelledEmailProps {
  orderNumber: string
  customerName: string
  reason?: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function OrderCancelledEmail({
  orderNumber,
  customerName,
  reason,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: OrderCancelledEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('cancelled.preheader', { orderNumber }) ||
        `Je MOSE order #${orderNumber} is geannuleerd. Je betaling wordt automatisch teruggestort.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('cancelled.status') || 'Cancelled'}
        statusColor={EMAIL_COLORS.danger}
      />

      <EmailHero
        badge={t('cancelled.badge') || '✕ Geannuleerd'}
        badgeColor={EMAIL_COLORS.danger}
        title={`${t('cancelled.heroGreeting') || 'Order Gecanceld'},\n${firstName}.`}
        subtitle={
          t('cancelled.heroSubtitle') ||
          'Je bestelling is geannuleerd. Je betaling wordt automatisch teruggestort.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('cancelled.orderNumber') || 'Ordernummer', value: `#${orderNumber}` },
          {
            label: t('cancelled.statusLabel') || 'Status',
            value: t('cancelled.statusValue') || 'Geannuleerd',
          },
        ]}
      />

      {reason ? (
        <EmailCallout tone="danger" title={t('cancelled.reason') || 'Reden van annulering'}>
          {reason}
        </EmailCallout>
      ) : null}

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('cancelled.description') ||
            'Sorry voor het ongemak. We proberen dit in de toekomst te voorkomen. Heb je vragen over deze annulering? We helpen je graag.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCallout tone="info" title={t('cancelled.refundTitle') || 'Terugbetaling'}>
        {t('cancelled.refundInfo') ||
          'Je krijgt het bedrag automatisch terug op dezelfde betaalmethode. Reken op 3 tot 5 werkdagen.'}
      </EmailCallout>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('cancelled.ctaButton') || 'Terug naar de shop'}  →`}
        footnote={
          <>
            {t('cancelled.questions') || 'Vragen over de annulering?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        }
      />

      <EmailShopMore siteUrl={siteUrl} locale={locale} />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
