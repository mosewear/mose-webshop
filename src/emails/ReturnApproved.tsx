import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailSplitHighlight, { EmailTotalValue } from './components/EmailSplitHighlight'
import EmailModule from './components/EmailModule'
import EmailParagraph from './components/EmailParagraph'
import EmailCallout from './components/EmailCallout'
import EmailCta from './components/EmailCta'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface ReturnApprovedEmailProps {
  returnNumber: string
  customerName: string
  refundAmount: number
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

const euro = (n: number) => `€${n.toFixed(2).replace('.', ',')}`

export default function ReturnApprovedEmail({
  returnNumber,
  customerName,
  refundAmount,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnApprovedEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('returnApproved.preheader', { amount: euro(refundAmount) }) ||
        `Je retour is goedgekeurd. We storten ${euro(refundAmount)} terug binnen 3–5 werkdagen.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('returnApproved.status') || 'Return Approved'} />

      <EmailHero
        badge={t('returnApproved.badge') || '✓ Goedgekeurd'}
        title={`${t('returnApproved.heroGreeting') || 'Approved'},\n${firstName}.`}
        subtitle={
          t('returnApproved.heroSubtitle') ||
          'We hebben je retour goedgekeurd. De terugbetaling wordt nu in gang gezet.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('returnApproved.returnNumber') || 'Retour', value: `#${returnNumber}` },
          {
            label: t('returnApproved.statusLabel') || 'Status',
            value: t('returnApproved.statusValue') || 'Goedgekeurd',
          },
        ]}
      />

      <EmailSplitHighlight
        left={{
          label: t('returnApproved.refundLabel') || 'Terugbetaling',
          body: (
            <>
              <strong style={{ fontWeight: 800 }}>
                {t('returnApproved.refundSoon') || 'Wordt automatisch teruggestort'}
              </strong>
              <br />
              {t('returnApproved.refundMethod') ||
                'Op de originele betaalmethode binnen 3–5 werkdagen.'}
            </>
          ),
          background: 'paper',
        }}
        right={{
          label: t('returnApproved.refundAmount') || 'Bedrag',
          body: <EmailTotalValue value={euro(refundAmount)} />,
          footnote: t('returnApproved.refundProcessing') || 'Refund · In verwerking',
          background: 'black',
        }}
      />

      <EmailModule padding="26px 30px">
        <EmailParagraph>
          {t('returnApproved.description') ||
            'Je ziet het bedrag meestal binnen 3–5 werkdagen terug op je rekening. Afhankelijk van je bank kan dit soms iets langer duren.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCallout tone="info" title={t('returnApproved.nextStepsTitle') || 'Wat nu'}>
        {t('returnApproved.nextSteps') ||
          'Zodra de terugbetaling is verwerkt sturen we je een bevestigingsmail met het exacte moment van afronding.'}
      </EmailCallout>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('returnApproved.ctaButton') || 'Terug naar shoppen'}  →`}
        variant="teal"
        footnote={
          <>
            {t('returnApproved.questions') || 'Vragen?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
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
