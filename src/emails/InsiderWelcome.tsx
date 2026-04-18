import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import EmailCallout from './components/EmailCallout'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface InsiderWelcomeEmailProps {
  email: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  promoCode?: string
  promoExpiry?: Date
}

export default function InsiderWelcomeEmail({
  email,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  promoCode,
  promoExpiry,
}: InsiderWelcomeEmailProps) {
  const expiryText = promoExpiry
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(promoExpiry)
    : null

  return (
    <EmailShell
      locale={locale}
      preview={
        t('insiderWelcome.preheader') ||
        'Welkom in de MOSE Insider Club. Jij ziet wat er aankomt vóór de rest.'
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('insiderWelcome.status') || 'Insider Club'} />

      <EmailHero
        badge={t('insiderWelcome.badge') || '▲ Insider Club'}
        title={t('insiderWelcome.heroTitle') || 'Welcome\nInsider.'}
        subtitle={
          t('insiderWelcome.heroSubtitle') ||
          'Je zit erin. Als eerste zien wat er aankomt, toegang tot drops voor iedereen, en alleen voor insiders.'
        }
      />

      {promoCode ? (
        <EmailModule padding="30px 24px" background={EMAIL_COLORS.ink} align="center">
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
            {t('insiderWelcome.promoLabel') || 'Welcome Drop Code'}
          </div>
          <div
            style={{
              fontFamily: EMAIL_FONTS.display,
              fontSize: '44px',
              color: EMAIL_COLORS.paper,
              letterSpacing: '0.2em',
              lineHeight: 1,
            }}
          >
            {promoCode}
          </div>
          {expiryText ? (
            <div
              style={{
                marginTop: '10px',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: EMAIL_COLORS.textSubtle,
                fontWeight: 700,
              }}
            >
              {t('insiderWelcome.validUntil', { date: expiryText }) ||
                `Geldig tot ${expiryText}`}
            </div>
          ) : null}
        </EmailModule>
      ) : null}

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('insiderWelcome.intro') ||
            "Streetwear zonder poespas: doordacht, duurzaam, kleine oplages. Als insider kies jij als eerste."}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('insiderWelcome.perksTitle') || 'Wat je krijgt'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="bullet"
            steps={[
              {
                title: t('insiderWelcome.perk1Title') || 'Early Access',
                description:
                  t('insiderWelcome.perk1Text') ||
                  'Als eerste zien wat er aankomt, 24u voor iedereen.',
              },
              {
                title: t('insiderWelcome.perk2Title') || 'Gratis Verzending',
                description:
                  t('insiderWelcome.perk2Text') ||
                  'Altijd gratis verzending binnen Nederland, ook op pre-orders.',
              },
              {
                title: t('insiderWelcome.perk3Title') || 'Insider Only Drops',
                description:
                  t('insiderWelcome.perk3Text') ||
                  'Limited pieces die alleen insiders kunnen claimen.',
              },
              {
                title: t('insiderWelcome.perk4Title') || 'Behind the Scenes',
                description:
                  t('insiderWelcome.perk4Text') ||
                  'Hoe MOSE tot stand komt: materiaal, design en productie in één verhaal.',
              },
            ]}
          />
        </div>
      </EmailModule>

      <EmailCallout tone="info" title={t('insiderWelcome.emailLabel') || 'Je insider email'}>
        <strong style={{ fontWeight: 800 }}>{email}</strong>
      </EmailCallout>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('insiderWelcome.ctaButton') || 'Bekijk de collectie'}  →`}
        footnote={
          <>
            {t('insiderWelcome.questions') || 'Vragen?'}{' '}
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
        tagline={t('insiderWelcome.tagline') || 'Made in Groningen. Dressed Worldwide.'}
      />
    </EmailShell>
  )
}
