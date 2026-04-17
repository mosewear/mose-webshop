import { Section } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCta from './components/EmailCta'
import EmailParagraph from './components/EmailParagraph'
import EmailCallout from './components/EmailCallout'
import {
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from './tokens'

export type LoyaltyTier = 'bronze' | 'silver' | 'gold'

export type LoyaltyStatusVariant = 'broadcast' | 'tier_up'

interface LoyaltyStatusUpdateEmailProps {
  customerName: string
  tier: LoyaltyTier
  pointsBalance: number
  lifetimePoints: number
  /** Set to previous tier when variant='tier_up' for the celebratory subtitle. */
  previousTier?: LoyaltyTier | null
  variant?: LoyaltyStatusVariant
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 500,
  gold: 1000,
}

const TIER_ACCENT: Record<LoyaltyTier, string> = {
  bronze: '#b08968',
  silver: '#9aa0a6',
  gold: '#c9a227',
}

const TIER_LABEL: Record<LoyaltyTier, { nl: string; en: string }> = {
  bronze: { nl: 'BRONS', en: 'BRONZE' },
  silver: { nl: 'ZILVER', en: 'SILVER' },
  gold: { nl: 'GOUD', en: 'GOLD' },
}

const COPY = {
  nl: {
    status: 'Loyalty Update',
    badgeBroadcast: '● Jouw Loyalty Status',
    badgeTierUp: '● Je Bent Gepromoveerd',
    heroGreetingBroadcast: 'Status',
    heroGreetingTierUp: 'Level Up',
    subtitleBroadcast:
      'Een snel overzicht van je loyalty status, de voordelen die nu voor je openstaan en hoeveel punten je nog verwijderd bent van het volgende level.',
    subtitleTierUp: (tier: string) =>
      `Mooi gedaan. Je bent nu officieel ${tier}-tier. Je voordelen zijn vanaf nu automatisch actief op elke bestelling.`,
    tierLabel: 'Huidige tier',
    pointsLabel: 'Punten saldo',
    lifetimeLabel: 'Lifetime punten',
    progressTitle: 'Voortgang naar het volgende level',
    progressGoldReached:
      'Je zit op het hoogste level: GOUD. Alle voordelen zijn voor jou al actief — van gratis verzending tot 10% korting.',
    progressTo: (points: number, next: string) =>
      `Nog ${points} punten te gaan voor ${next}. Elke €1 die je besteedt = 1 punt.`,
    benefitsTitle: 'Jouw voordelen',
    benefitsAllTitle: 'Alle tiers in één oogopslag',
    benefitBronze: 'Punten sparen · Gratis verzending (altijd, bij elke bestelling)',
    benefitSilver: '5% korting op alle bestellingen · Gratis verzending · Punten sparen',
    benefitGold: '10% korting op alle bestellingen · Gratis verzending · Punten sparen',
    nextBenefit: (next: LoyaltyTier) =>
      next === 'silver'
        ? 'ZILVER unlockt 5% korting op elke bestelling.'
        : 'GOUD unlockt 10% korting op elke bestelling.',
    cta: 'Shoppen',
    howTitle: 'Punten verdienen',
    howBody:
      'Je verdient 1 punt per euro die je besteedt. Punten tellen automatisch mee, ook voor guest-checkouts op hetzelfde e-mailadres.',
    footerNote:
      'Vragen over je loyalty status? Mail ons en we helpen je graag verder.',
    preheader: (balance: number) =>
      `Je staat op ${balance} punten — bekijk je loyalty status.`,
  },
  en: {
    status: 'Loyalty Update',
    badgeBroadcast: '● Your Loyalty Status',
    badgeTierUp: '● You\u2019ve Leveled Up',
    heroGreetingBroadcast: 'Status',
    heroGreetingTierUp: 'Level Up',
    subtitleBroadcast:
      'A quick snapshot of your loyalty status, the perks that are live for you, and how far you are from the next tier.',
    subtitleTierUp: (tier: string) =>
      `Nice work. You\u2019re officially ${tier} tier now. Your new perks are live on every order from here on out.`,
    tierLabel: 'Current tier',
    pointsLabel: 'Points balance',
    lifetimeLabel: 'Lifetime points',
    progressTitle: 'Progress to the next level',
    progressGoldReached:
      'You\u2019re at the top tier: GOLD. Every perk is unlocked — from free shipping to 10% off everything.',
    progressTo: (points: number, next: string) =>
      `${points} points to go until ${next}. Every €1 you spend = 1 point.`,
    benefitsTitle: 'Your perks',
    benefitsAllTitle: 'All tiers at a glance',
    benefitBronze: 'Earn points · Free shipping (always, every order)',
    benefitSilver: '5% off every order · Free shipping · Earn points',
    benefitGold: '10% off every order · Free shipping · Earn points',
    nextBenefit: (next: LoyaltyTier) =>
      next === 'silver'
        ? 'SILVER unlocks 5% off every order.'
        : 'GOLD unlocks 10% off every order.',
    cta: 'Shop',
    howTitle: 'How you earn',
    howBody:
      'You earn 1 point per euro you spend. Points stack automatically, including guest-checkouts on the same email.',
    footerNote:
      'Questions about your loyalty status? Hit reply — we\u2019re happy to help.',
    preheader: (balance: number) =>
      `You\u2019re at ${balance} points — check out your loyalty status.`,
  },
} as const

function pointsToNextTier(
  tier: LoyaltyTier,
  lifetime: number
): { next: LoyaltyTier | null; pointsNeeded: number; progressPct: number } {
  if (tier === 'gold') {
    return { next: null, pointsNeeded: 0, progressPct: 100 }
  }
  const next: LoyaltyTier = tier === 'bronze' ? 'silver' : 'gold'
  const lower = TIER_THRESHOLDS[tier]
  const upper = TIER_THRESHOLDS[next]
  const pointsNeeded = Math.max(upper - lifetime, 0)
  const progressPct = Math.min(
    Math.max(((lifetime - lower) / (upper - lower)) * 100, 0),
    100
  )
  return { next, pointsNeeded, progressPct: Math.round(progressPct) }
}

/**
 * Progress bar gebouwd met tables zodat Outlook het correct rendert.
 */
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const safePct = Math.max(Math.min(pct, 100), 0)
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ marginTop: '14px', marginBottom: '6px' }}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: EMAIL_COLORS.border,
              height: '10px',
              padding: 0,
              fontSize: 0,
              lineHeight: 0,
            }}
          >
            <table
              role="presentation"
              width={`${safePct}%`}
              cellPadding={0}
              cellSpacing={0}
              border={0}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: color,
                      height: '10px',
                      fontSize: 0,
                      lineHeight: 0,
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Rij in de "all tiers" breakdown. Highlighted tier krijgt een groene accent-bar.
 */
function TierRow({
  tier,
  description,
  current,
  locale,
}: {
  tier: LoyaltyTier
  description: string
  current: boolean
  locale: string
}) {
  const label = locale === 'en' ? TIER_LABEL[tier].en : TIER_LABEL[tier].nl
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{
        borderLeft: current
          ? `4px solid ${EMAIL_COLORS.primary}`
          : `4px solid ${EMAIL_COLORS.border}`,
        marginBottom: '8px',
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: current
                ? EMAIL_COLORS.primaryLight
                : EMAIL_COLORS.paper,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontFamily: EMAIL_FONTS.display,
                fontSize: '18px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: current ? EMAIL_COLORS.primary : TIER_ACCENT[tier],
              }}
            >
              {label}
              {current ? (
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: '10px',
                    padding: '2px 8px',
                    backgroundColor: EMAIL_COLORS.primary,
                    color: EMAIL_COLORS.paper,
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '9px',
                    letterSpacing: '0.2em',
                    verticalAlign: 'middle',
                  }}
                >
                  {locale === 'en' ? 'YOU' : 'JIJ'}
                </span>
              ) : null}
            </div>
            <div
              style={{
                marginTop: '6px',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '13px',
                lineHeight: 1.6,
                color: EMAIL_COLORS.text,
              }}
            >
              {description}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export default function LoyaltyStatusUpdateEmail({
  customerName,
  tier,
  pointsBalance,
  lifetimePoints,
  previousTier = null,
  variant = 'broadcast',
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: LoyaltyStatusUpdateEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName
  const copy = locale === 'en' ? COPY.en : COPY.nl
  const tierName = locale === 'en' ? TIER_LABEL[tier].en : TIER_LABEL[tier].nl
  const { next, pointsNeeded, progressPct } = pointsToNextTier(
    tier,
    lifetimePoints
  )
  const nextName = next
    ? locale === 'en'
      ? TIER_LABEL[next].en
      : TIER_LABEL[next].nl
    : ''

  const heroBadge =
    variant === 'tier_up' ? copy.badgeTierUp : copy.badgeBroadcast
  const heroGreeting =
    variant === 'tier_up'
      ? copy.heroGreetingTierUp
      : copy.heroGreetingBroadcast
  const heroSubtitle =
    variant === 'tier_up'
      ? copy.subtitleTierUp(tierName)
      : copy.subtitleBroadcast

  const ctaHref = `${siteUrl}/${locale}/shop`

  const yourBenefit =
    tier === 'gold'
      ? copy.benefitGold
      : tier === 'silver'
        ? copy.benefitSilver
        : copy.benefitBronze

  return (
    <EmailShell locale={locale} preview={copy.preheader(pointsBalance)}>
      <EmailHeader
        siteUrl={siteUrl}
        status={copy.status}
        statusColor={EMAIL_COLORS.primary}
      />

      <EmailHero
        badge={heroBadge}
        badgeColor={EMAIL_COLORS.primary}
        title={`${heroGreeting},\n${firstName}.`}
        subtitle={heroSubtitle}
      />

      <EmailMetaGrid
        columns={3}
        pairs={[
          { label: copy.tierLabel, value: tierName },
          { label: copy.pointsLabel, value: pointsBalance.toLocaleString('nl-NL') },
          { label: copy.lifetimeLabel, value: lifetimePoints.toLocaleString('nl-NL') },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle title={copy.progressTitle} />
        {next ? (
          <>
            <ProgressBar pct={progressPct} color={EMAIL_COLORS.primary} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: EMAIL_COLORS.textMuted,
                marginTop: '6px',
              }}
            >
              <span>{tierName}</span>
              <span>{nextName}</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              <EmailParagraph>{copy.progressTo(pointsNeeded, nextName)}</EmailParagraph>
              <EmailParagraph>{copy.nextBenefit(next)}</EmailParagraph>
            </div>
          </>
        ) : (
          <EmailParagraph>{copy.progressGoldReached}</EmailParagraph>
        )}
      </EmailModule>

      <EmailCallout tone="success" title={copy.benefitsTitle}>
        {yourBenefit}
      </EmailCallout>

      <EmailModule padding="28px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailSectionTitle title={copy.benefitsAllTitle} />
        <Section style={{ marginTop: '18px' }}>
          <TierRow
            tier="bronze"
            description={copy.benefitBronze}
            current={tier === 'bronze'}
            locale={locale}
          />
          <TierRow
            tier="silver"
            description={copy.benefitSilver}
            current={tier === 'silver'}
            locale={locale}
          />
          <TierRow
            tier="gold"
            description={copy.benefitGold}
            current={tier === 'gold'}
            locale={locale}
          />
        </Section>
      </EmailModule>

      <EmailCta href={ctaHref} label={`${copy.cta}  →`} variant="primary" />

      <EmailModule padding="24px 30px">
        <EmailSectionTitle title={copy.howTitle} />
        <div style={{ marginTop: '12px' }}>
          <EmailParagraph>{copy.howBody}</EmailParagraph>
        </div>
      </EmailModule>

      <EmailModule padding="0 30px 28px 30px">
        <EmailParagraph>{copy.footerNote}</EmailParagraph>
        <EmailParagraph>
          <a
            href={`mailto:${contactEmail}`}
            style={{
              color: EMAIL_COLORS.primary,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {contactEmail}
          </a>
          <span style={{ color: EMAIL_COLORS.textMuted }}>  ·  </span>
          <a
            href={`tel:${contactPhone.replace(/\s/g, '')}`}
            style={{
              color: EMAIL_COLORS.text,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {contactPhone}
          </a>
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

export { TIER_THRESHOLDS }
