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
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface NewsletterWelcomeEmailProps {
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

export default function NewsletterWelcomeEmail({
  email,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  promoCode,
  promoExpiry,
}: NewsletterWelcomeEmailProps) {
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
        t('newsletterWelcome.preheader') ||
        'Welkom bij MOSE. Je hoort als eerste van drops, restocks en stukken alleen voor insiders.'
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('newsletterWelcome.status') || 'Newsletter'} />

      <EmailHero
        badge={t('newsletterWelcome.badge') || '▲ Welcome'}
        title={t('newsletterWelcome.heroTitle') || 'You\u2019re\nIn.'}
        subtitle={
          t('newsletterWelcome.heroText') ||
          'Je staat op de lijst. Vanaf nu ontvang je de nieuwste drops als eerste.'
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
            {t('newsletterWelcome.promoTitle') || 'Jouw welkomstcode'}
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
          <div
            style={{
              marginTop: '14px',
              fontFamily: EMAIL_FONTS.body,
              fontSize: '12px',
              color: EMAIL_COLORS.textSubtle,
              lineHeight: 1.5,
            }}
          >
            {t('newsletterWelcome.promoSubtext', { discount: '10%' }) ||
              'Gebruik deze code voor 10% korting op je eerste bestelling.'}
          </div>
          {expiryText ? (
            <div
              style={{
                marginTop: '8px',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: EMAIL_COLORS.textSubtle,
                fontWeight: 700,
              }}
            >
              {t('newsletterWelcome.promoExpiry', { date: expiryText }) ||
                `Geldig tot ${expiryText}`}
            </div>
          ) : null}
        </EmailModule>
      ) : null}

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('newsletterWelcome.whatYouGet') ||
            'Geen spam. Alleen mail die voor jou telt.'}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('newsletterWelcome.benefitsTitle') || 'Wat je krijgt'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="bullet"
            steps={[
              {
                title: t('newsletterWelcome.benefit1Title') || 'Nieuwe drops',
                description:
                  t('newsletterWelcome.benefit1Text') ||
                  'Als eerste horen wanneer er iets nieuws lanceert.',
              },
              {
                title: t('newsletterWelcome.benefit2Title') || 'Restock alerts',
                description:
                  t('newsletterWelcome.benefit2Text') ||
                  'Direct een seintje wanneer populaire pieces terug zijn.',
              },
              {
                title: t('newsletterWelcome.benefit3Title') || 'Exclusieve deals',
                description:
                  t('newsletterWelcome.benefit3Text') ||
                  'Newsletter-only kortingen die je nergens anders krijgt.',
              },
            ]}
          />
        </div>
      </EmailModule>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('newsletterWelcome.discoverCollection') || 'Ontdek de collectie'}  →`}
        variant="teal"
        footnote={
          t('newsletterWelcome.receivedBecause', { email }) ||
          `Je ontvangt deze mail omdat je je aanmeldde met ${email}.`
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
