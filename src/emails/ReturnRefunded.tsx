import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailSplitHighlight, { EmailTotalValue } from './components/EmailSplitHighlight'
import EmailModule from './components/EmailModule'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface ReturnRefundedEmailProps {
  returnNumber: string
  customerName: string
  refundAmount: number
  refundMethod: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

const euro = (n: number) => `€${n.toFixed(2).replace('.', ',')}`

export default function ReturnRefundedEmail({
  returnNumber,
  customerName,
  refundAmount,
  refundMethod,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnRefundedEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('returnRefunded.preheader', { amount: euro(refundAmount) }) ||
        `${euro(refundAmount)} is teruggestort op je rekening. Merci voor je vertrouwen in MOSE.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('returnRefunded.status') || 'Refunded'} />

      <EmailHero
        badge={t('returnRefunded.badge') || '€ Teruggestort'}
        title={`${t('returnRefunded.heroGreeting') || 'Refunded'},\n${firstName}.`}
        subtitle={
          t('returnRefunded.heroSubtitle') ||
          'Je terugbetaling is onderweg naar je rekening. Merci voor je vertrouwen in MOSE.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('returnRefunded.returnNumber') || 'Retour', value: `#${returnNumber}` },
          {
            label: t('returnRefunded.methodLabel') || 'Methode',
            value: refundMethod.toUpperCase(),
          },
        ]}
      />

      <EmailSplitHighlight
        left={{
          label: t('returnRefunded.refundLabel') || 'Terugbetaling',
          body: (
            <>
              <strong style={{ fontWeight: 800 }}>
                {t('returnRefunded.processed') || 'Verwerking voltooid'}
              </strong>
              <br />
              {t('returnRefunded.methodBody', { method: refundMethod }) ||
                `Betaalmethode: ${refundMethod}`}
            </>
          ),
          background: 'paper',
        }}
        right={{
          label: t('returnRefunded.refundAmount') || 'Teruggestort',
          body: <EmailTotalValue value={euro(refundAmount)} />,
          footnote: t('returnRefunded.refundCompleted') || 'Refund · Completed',
          background: 'primary',
        }}
      />

      <EmailModule padding="26px 30px">
        <EmailParagraph>
          {t('returnRefunded.description') ||
            'Afhankelijk van je bank kan het 1–3 werkdagen duren voordat je het bedrag daadwerkelijk op je rekening ziet verschijnen.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('returnRefunded.ctaButton') || 'Terug naar shoppen'}  →`}
        variant="teal"
        footnote={
          <>
            {t('returnRefunded.questions') || 'Vragen?'}{' '}
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
