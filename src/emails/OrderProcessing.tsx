import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import EmailParagraph from './components/EmailParagraph'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface OrderProcessingEmailProps {
  orderNumber: string
  customerName: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function OrderProcessingEmail({
  orderNumber,
  customerName,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: OrderProcessingEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName
  const trackUrl = `${siteUrl}/${locale}/track-order`

  return (
    <EmailShell
      locale={locale}
      preview={
        t('processing.preheader', { orderNumber }) ||
        `Je MOSE order #${orderNumber} wordt nu voor je ingepakt.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('processing.status') || 'Processing'} />

      <EmailHero
        badge={t('processing.badge') || '▸ In behandeling'}
        title={`${t('processing.heroGreeting') || 'Packing'},\n${firstName}.`}
        subtitle={
          t('processing.heroSubtitle') ||
          "We pakken je bestelling zorgvuldig in. Zodra 'ie onderweg is hoor je van ons."
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('processing.orderNumber') || 'Ordernummer', value: `#${orderNumber}` },
          { label: t('processing.statusLabel') || 'Status', value: t('processing.statusValue') || 'In Behandeling' },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('processing.whatNext') || 'Wat gebeurt er nu' } />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            steps={[
              t('processing.step1') || 'Onze pakkers pakken jouw items zorgvuldig in.',
              t('processing.step2') || 'We printen je verzendlabel.',
              t('processing.step3') || 'Het pakket gaat richting onze vervoerder.',
              t('processing.step4') || 'Je ontvangt een tracking link zodra het onderweg is.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailModule padding="26px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph tone="ink">
          {t('processing.description') ||
            'Gemiddelde verwerkingstijd is 1 werkdag. Alleen gewijzigd adres? Mail ons zo snel mogelijk, we proberen het nog mee te nemen.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href={trackUrl}
        label={`${t('processing.viewOrder') || 'Bekijk mijn bestelling'}  →`}
        footnote={
          <>
            {t('processing.questions') || 'Vragen?'}{' '}
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
