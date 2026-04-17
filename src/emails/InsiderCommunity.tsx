import { Img, Link } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface FeaturedProduct {
  name: string
  slug: string
  imageUrl: string
  url: string
}

interface InsiderCommunityEmailProps {
  email: string
  subscriberCount: number
  daysUntilLaunch: number
  featuredProducts?: FeaturedProduct[]
  t: (key: string, options?: any) => string
  siteUrl?: string
  locale?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderCommunityEmail({
  email,
  subscriberCount,
  daysUntilLaunch,
  featuredProducts = [],
  t,
  siteUrl = EMAIL_SITE_URL,
  locale = 'nl',
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: InsiderCommunityEmailProps) {
  return (
    <EmailShell
      locale={locale}
      preview={
        t('insiderCommunity.preheader', { count: subscriberCount, days: daysUntilLaunch }) ||
        `${subscriberCount} insiders zijn al binnen. Nog ${daysUntilLaunch} dagen tot de drop.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('insiderCommunity.status') || 'Community'} />

      <EmailHero
        badge={t('insiderCommunity.badge') || '▲ Insider Community'}
        title={t('insiderCommunity.heroTitle') || 'Built\nTogether.'}
        subtitle={
          t('insiderCommunity.subtitle') ||
          'MOSE groeit organisch — doordat insiders het delen. Bedankt dat je erbij bent.'
        }
      />

      <EmailMetaGrid
        pairs={[
          {
            label: t('insiderCommunity.subscriberLabel') || 'Insiders',
            value: subscriberCount.toLocaleString('nl-NL'),
          },
          {
            label: t('insiderCommunity.daysLabel') || 'Dagen tot drop',
            value: String(daysUntilLaunch),
          },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('insiderCommunity.intro') ||
            'Je bent geen klant — je bent insider. Dat betekent dat jouw feedback mede bepaalt wat we volgend seizoen produceren.'}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('insiderCommunity.numbers') || 'In cijfers'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="bullet"
            steps={[
              t('insiderCommunity.stat1', { count: subscriberCount }) ||
                `${subscriberCount} insiders zijn al binnen.`,
              t('insiderCommunity.stat2') || '100% in Nederland en België geleverd.',
              t('insiderCommunity.stat3') || 'Meer dan 90% positieve reviews op onze drops.',
            ]}
          />
        </div>
      </EmailModule>

      {featuredProducts.length > 0 ? (
        <EmailModule padding="28px 30px 14px 30px">
          <EmailSectionTitle
            title={t('insiderCommunity.productsTitle') || 'Featured drops'}
          />
          <div style={{ marginTop: '18px' }}>
            <EmailParagraph tone="muted" mb={18}>
              {t('insiderCommunity.productsIntro') ||
                'Een greep uit wat nu bij insiders loopt.'}
            </EmailParagraph>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
            >
              <tbody>
                <tr>
                  {featuredProducts.slice(0, 3).map((product) => (
                    <td
                      key={product.slug}
                      width={`${Math.floor(100 / Math.min(featuredProducts.length, 3))}%`}
                      valign="top"
                      style={{ padding: '0 6px', verticalAlign: 'top' }}
                    >
                      <Link
                        href={product.url}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div
                          style={{
                            backgroundColor: EMAIL_COLORS.productBg,
                            padding: '8px',
                            marginBottom: '8px',
                          }}
                        >
                          {product.imageUrl ? (
                            <Img
                              src={product.imageUrl}
                              alt={product.name}
                              width="100%"
                              style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                border: 0,
                              }}
                            />
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontFamily: EMAIL_FONTS.display,
                            fontSize: '15px',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: EMAIL_COLORS.ink,
                            textAlign: 'center',
                            lineHeight: 1.2,
                            marginBottom: '8px',
                          }}
                        >
                          {product.name}
                        </div>
                        <div
                          style={{
                            textAlign: 'center',
                            fontFamily: EMAIL_FONTS.body,
                            fontSize: '10px',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: EMAIL_COLORS.primary,
                            fontWeight: 800,
                          }}
                        >
                          {t('insiderCommunity.viewProduct') || 'Bekijk →'}
                        </div>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </EmailModule>
      ) : null}

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('insiderCommunity.presaleCTA') || 'Claim je plek'}  →`}
        variant="teal"
        title={t('insiderCommunity.presaleSubtitle') || 'De drop komt eraan'}
        footnote={t('insiderCommunity.presaleText') || 'Als insider krijg je 24u vroege toegang.'}
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={t('insiderCommunity.communityTitle') || 'Uit de community'} />
        <div style={{ marginTop: '20px' }}>
          {[
            t('insiderCommunity.testimonial1'),
            t('insiderCommunity.testimonial2'),
            t('insiderCommunity.testimonial3'),
          ]
            .filter(Boolean)
            .map((quote, idx) => (
              <div
                key={idx}
                style={{
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: EMAIL_COLORS.text,
                  paddingLeft: '14px',
                  borderLeft: `3px solid ${EMAIL_COLORS.primary}`,
                  margin: '14px 0',
                  lineHeight: 1.55,
                }}
              >
                “{quote}”
              </div>
            ))}
        </div>
      </EmailModule>

      <EmailShopMore
        title={t('insiderCommunity.joinTitle') || 'Kom erbij op socials'}
        ctaLabel={t('insiderCommunity.socialInsta') || '@mosewear op Instagram'}
        href="https://instagram.com/mosewear"
        siteUrl={siteUrl}
        locale={locale}
      />

      <EmailModule padding="18px 24px" background={EMAIL_COLORS.sectionAlt} align="center">
        <EmailParagraph tone="muted" size={12} align="center" mb={0}>
          {t('insiderCommunity.ps', { days: daysUntilLaunch }) ||
            `PS — nog ${daysUntilLaunch} dagen tot de officiële drop op `}
          <Link
            href={siteUrl}
            style={{ color: EMAIL_COLORS.primary, textDecoration: 'underline', fontWeight: 700 }}
          >
            mosewear.com
          </Link>
        </EmailParagraph>
      </EmailModule>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
