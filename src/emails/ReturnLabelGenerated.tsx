import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailCta from './components/EmailCta'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface ReturnLabelGeneratedEmailProps {
  returnNumber: string
  customerName: string
  returnLabelUrl: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnLabelGeneratedEmail({
  returnNumber,
  customerName,
  returnLabelUrl,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnLabelGeneratedEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('returnLabelGenerated.preheader', { returnNumber }) ||
        `Je retourlabel voor ${returnNumber} staat klaar. Download en plak het op je pakket.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('returnLabelGenerated.status') || 'Label Ready'}
        statusColor={EMAIL_COLORS.warning}
      />

      <EmailHero
        badge={t('returnLabelGenerated.badge') || '▼ Retourlabel Klaar'}
        badgeColor={EMAIL_COLORS.warning}
        title={`${t('returnLabelGenerated.heroGreeting') || 'Label'},\n${firstName}.`}
        subtitle={
          t('returnLabelGenerated.heroSubtitle') ||
          'Je retourlabel is klaar. Download het, plak het op het pakket en breng hem langs bij het afleverpunt.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('returnLabelGenerated.returnNumber') || 'Retour', value: `#${returnNumber}` },
          {
            label: t('returnLabelGenerated.statusLabel') || 'Status',
            value: t('returnLabelGenerated.statusValue') || 'Label Klaar',
          },
        ]}
      />

      <EmailCta
        href={returnLabelUrl}
        label={`${t('returnLabelGenerated.downloadButton') || 'Download retourlabel'}  ▼`}
        variant="teal"
        footnote={
          t('returnLabelGenerated.labelFootnote') ||
          'Kan je het label niet openen? Kopieer deze link in je browser.'
        }
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('returnLabelGenerated.instructionsTitle') || 'Hoe retourneren'}
        />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            steps={[
              t('returnLabelGenerated.step1') ||
                'Print het label en plak het goed zichtbaar op het pakket.',
              t('returnLabelGenerated.step2') ||
                'Stop de items in de originele verpakking met labels nog bevestigd.',
              t('returnLabelGenerated.step3') ||
                'Breng het pakket naar een PostNL/DHL afleverpunt in de buurt.',
              t('returnLabelGenerated.step4') ||
                'Zodra we het pakket ontvangen hoor je zo snel mogelijk van ons.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailCta
        href={`${siteUrl}/${locale}/account/returns/${returnNumber}`}
        label={`${t('returnLabelGenerated.trackCta') || 'Volg mijn retour'}  →`}
        footnote={
          <>
            {t('returnLabelGenerated.questions') || 'Iets niet duidelijk?'}{' '}
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
