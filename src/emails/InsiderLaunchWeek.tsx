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
import EmailMetaGrid from './components/EmailMetaGrid'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface InsiderLaunchWeekEmailProps {
  email: string
  daysUntilLaunch: number
  limitedItems: string[]
  t: (key: string, options?: any) => string
  siteUrl?: string
  locale?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderLaunchWeekEmail({
  email,
  daysUntilLaunch,
  limitedItems,
  t,
  siteUrl = EMAIL_SITE_URL,
  locale = 'nl',
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: InsiderLaunchWeekEmailProps) {
  return (
    <EmailShell
      locale={locale}
      preview={
        t('insiderLaunchWeek.preheader', { days: daysUntilLaunch }) ||
        `Nog ${daysUntilLaunch} dagen tot de drop. Dit moet je weten.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('insiderLaunchWeek.status') || 'Launch Week'} />

      <EmailHero
        badge={t('insiderLaunchWeek.badge') || '▲ Launch Week'}
        title={t('insiderLaunchWeek.heroTitle') || 'Launch\nWeek.'}
        subtitle={
          t('insiderLaunchWeek.subtitle', { days: daysUntilLaunch }) ||
          `Nog ${daysUntilLaunch} dagen. Zorg dat je klaar staat.`
        }
      />

      <EmailMetaGrid
        pairs={[
          {
            label: t('insiderLaunchWeek.countdownLabel') || 'Dagen tot drop',
            value: String(daysUntilLaunch),
          },
          {
            label: t('insiderLaunchWeek.accessLabel') || 'Early access',
            value: '24H',
          },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('insiderLaunchWeek.intro', { days: daysUntilLaunch }) ||
            `Over ${daysUntilLaunch} dagen openen we de drop. Als insider zit je vooraan.`}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('insiderLaunchWeek.whatThisMeansTitle') || 'Wat dit betekent'}
        />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="bullet"
            steps={[
              t('insiderLaunchWeek.info1') || 'Jij shopt 24 uur eerder dan de rest.',
              t('insiderLaunchWeek.info2') || 'Per stuk beperkte voorraad. Op is op.',
              t('insiderLaunchWeek.info3') || 'Geen restocks, geen tweede kansen.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('insiderLaunchWeek.perksRemainTitle') || 'Je insider perks'}
        />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="numbered"
            steps={[
              t('insiderLaunchWeek.perk1') || 'Early access tot de drop.',
              t('insiderLaunchWeek.perk2') || 'Altijd gratis verzending in NL.',
              t('insiderLaunchWeek.perk3') || 'Insider-only pieces.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailCallout
        tone="warning"
        title={t('insiderLaunchWeek.statusTitle') || 'Status check'}
      >
        <div style={{ marginBottom: '8px' }}>
          {t('insiderLaunchWeek.statusAlready') || 'Al ingelogd? Dan staat alles klaar.'}
        </div>
        <div>
          {t('insiderLaunchWeek.statusNotYet') ||
            'Nog niet? Log vandaag in zodat je op drop day geen tijd verliest.'}
        </div>
      </EmailCallout>

      {limitedItems.length > 0 ? (
        <EmailModule padding="28px 30px" background={EMAIL_COLORS.sectionAlt}>
          <EmailSectionTitle
            title={t('insiderLaunchWeek.limitedStockTitle') || 'Extra beperkt'}
          />
          <div style={{ marginTop: '14px' }}>
            {limitedItems.map((item, index) => (
              <div
                key={index}
                style={{
                  fontFamily: EMAIL_FONTS.display,
                  fontSize: '16px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.danger,
                  padding: '8px 0',
                  borderBottom:
                    index < limitedItems.length - 1
                      ? `1px solid ${EMAIL_COLORS.border}`
                      : 'none',
                }}
              >
                ▲ {item}
              </div>
            ))}
          </div>
        </EmailModule>
      ) : null}

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('insiderLaunchWeek.shopNow') || 'Shop de drop'}  →`}
        variant="teal"
        footnote={t('insiderLaunchWeek.closing') || 'Zorg dat je op tijd bent. Insider love.'}
      />

      <EmailModule padding="18px 24px" background={EMAIL_COLORS.sectionAlt} align="center">
        <EmailParagraph tone="muted" size={12} align="center" mb={0}>
          {t('insiderLaunchWeek.ps') ||
            'P.S. Zet je notificaties aan, dan mis je de drop niet.'}
        </EmailParagraph>
      </EmailModule>

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
