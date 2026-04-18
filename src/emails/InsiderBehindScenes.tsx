import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import EmailCallout from './components/EmailCallout'
import EmailShopMore from './components/EmailShopMore'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface InsiderBehindScenesEmailProps {
  email: string
  storyContent: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  locale?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderBehindScenesEmail({
  email,
  storyContent,
  t,
  siteUrl = EMAIL_SITE_URL,
  locale = 'nl',
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: InsiderBehindScenesEmailProps) {
  return (
    <EmailShell
      locale={locale}
      preview={
        t('insiderBehindScenes.preheader') ||
        'Achter de schermen bij MOSE: het verhaal achter de volgende drop.'
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('insiderBehindScenes.status') || 'Behind the Scenes'} />

      <EmailHero
        badge={t('insiderBehindScenes.badge') || '▲ Behind the Scenes'}
        title={t('insiderBehindScenes.heroTitle') || 'Behind\nThe Scenes.'}
        subtitle={
          t('insiderBehindScenes.subtitle') ||
          'Waar materiaal, design en productie samenkomen. Alleen voor insiders.'
        }
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('insiderBehindScenes.intro') ||
            'Drops maak je niet in een week. Dit is het verhaal achter wat er nu op ons atelier gebeurt.'}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px" background={EMAIL_COLORS.sectionAlt}>
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '15px',
            lineHeight: 1.7,
            color: EMAIL_COLORS.text,
            whiteSpace: 'pre-line',
          }}
        >
          {storyContent}
        </div>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('insiderBehindScenes.processTitle') || 'Het proces'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="numbered"
            steps={[
              t('insiderBehindScenes.process1') || 'Research & materiaal selectie.',
              t('insiderBehindScenes.process2') || 'Pattern cutting & eerste samples.',
              t('insiderBehindScenes.process3') || 'Kleine batch productie in Europa.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailCallout
        tone="success"
        title={t('insiderBehindScenes.limitedTitle') || 'Limited edition'}
      >
        {t('insiderBehindScenes.limitedText') ||
          'Elke drop is klein. Op is op, geen restocks.'}
      </EmailCallout>

      <EmailModule padding="20px 30px">
        <EmailParagraph tone="muted" align="center">
          {t('insiderBehindScenes.closing') ||
            'Bedankt dat je erbij bent. Jouw support maakt het mogelijk.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href="https://instagram.com/mosewear"
        label={`${t('insiderBehindScenes.followCTA') || 'Volg op Instagram'}  →`}
        variant="teal"
        footnote={t('insiderBehindScenes.followSubtext') || 'Daily behind-the-scenes content.'}
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
