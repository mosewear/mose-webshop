import { Img, Link, Section } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailModule from './components/EmailModule'
import EmailParagraph from './components/EmailParagraph'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCta from './components/EmailCta'
import {
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from './tokens'

export interface SpringDrop2TeeColor {
  name: string
  imageUrl: string
  url: string
  /** Optionele "X stuks over" tekst */
  stockNote?: string
  /** Voor een rode "uitverkocht" indicator */
  soldOut?: boolean
}

export interface SpringDrop2TeeStaffelTier {
  qtyLabel: string
  pricePerPiece: string
  totalLabel: string
  highlight?: boolean
}

interface SpringDrop2TeeEmailProps {
  email: string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  unsubscribeUrl?: string
  /** Kleurrij (4 thumbs aanbevolen) */
  colors: SpringDrop2TeeColor[]
  /** Staffel rijen (typisch 1, 2, 3 stuks) */
  staffel: SpringDrop2TeeStaffelTier[]
  /** Hero image: lookbook chapter 2 (lente / gracht / tee) */
  heroImageUrl: string
  /** CTA URL naar de Tee PDP, inclusief UTMs. */
  teeUrl: string
  /** Sub-CTA URL naar de hele shop (hoodie/sweater) */
  shopUrl: string
  /** Optionele alt text */
  heroAlt?: string
  /** Optioneel: aantal kleuren met sold-out maten */
  someSizesSoldOut?: boolean
}

function ColorThumb({ color }: { color: SpringDrop2TeeColor }) {
  return (
    <Link
      href={color.url}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div
        style={{
          backgroundColor: EMAIL_COLORS.productBg,
          border: `1px solid ${EMAIL_COLORS.border}`,
          padding: '8px',
        }}
      >
        <Img
          src={color.imageUrl}
          alt={`MOSE Tee ${color.name}`}
          width="124"
          height="124"
          className="mose-product-img"
          style={{
            width: '100%',
            height: '124px',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </div>
      <div
        style={{
          marginTop: '10px',
          textAlign: 'center',
          fontFamily: EMAIL_FONTS.body,
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: EMAIL_COLORS.ink,
        }}
      >
        {color.name}
      </div>
      {color.stockNote ? (
        <div
          style={{
            marginTop: '4px',
            textAlign: 'center',
            fontFamily: EMAIL_FONTS.body,
            fontSize: '11px',
            color: color.soldOut
              ? EMAIL_COLORS.danger
              : EMAIL_COLORS.textMuted,
          }}
        >
          {color.stockNote}
        </div>
      ) : null}
    </Link>
  )
}

export default function SpringDrop2TeeEmail({
  email,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  unsubscribeUrl,
  colors,
  staffel,
  heroImageUrl,
  teeUrl,
  shopUrl,
  heroAlt,
  someSizesSoldOut,
}: SpringDrop2TeeEmailProps) {
  const isNl = locale !== 'en'

  const preview = isNl
    ? '240 gsm jersey, gemaakt in Groningen. Bij 3 stuks 44,95 per stuk.'
    : '240 gsm jersey, made in Groningen. 3 for 44.95 each.'

  const heroBadge = isNl ? 'EEN FAVORIET' : 'A FAVORITE'
  const heroTitle = isNl ? 'DE MOSE TEE.' : 'THE MOSE TEE.'

  const greeting = isNl ? 'Hé,' : 'Hi,'
  const introLine1 = isNl
    ? 'De vraag die we het vaakst krijgen: waar begin je mee? Eerlijk antwoord: bij de Tee.'
    : 'The question we get most often: where do you start? Honest answer: with the Tee.'
  const introLine2 = isNl
    ? '240 gsm jersey, dik genoeg om mooi te vallen, licht genoeg voor warmere dagen. Strak logo, droge afwerking, gemaakt om vaak te dragen.'
    : '240 gsm jersey, heavy enough to drape well, light enough for warmer days. Crisp logo, clean finish, made to wear often.'
  const introLine3 = isNl
    ? 'In vier kleuren beschikbaar.'
    : 'Available in four colors.'

  const colorsTitle = isNl ? 'In vier kleuren' : 'In four colors'
  const colorsMeta = isNl ? 'Live voorraad' : 'Live stock'

  const sizesNote = isNl
    ? 'Sommige maten zijn al uitverkocht. Check de PDP voor de actuele stand.'
    : 'Some sizes are already sold out. Check the PDP for live availability.'

  const staffelEyebrow = isNl ? 'Staffelkorting' : 'Quantity discount'
  const staffelTitle = isNl ? 'Hoe meer Tees, hoe scherper.' : 'The more Tees, the better.'
  const staffelSubtitle = isNl
    ? 'De korting wordt automatisch toegepast in je winkelmand. Geen code nodig.'
    : 'The discount is applied automatically at checkout. No code needed.'

  const ctaLabel = isNl
    ? `Shop de Tee\u00A0\u00A0→`
    : `Shop the Tee\u00A0\u00A0→`
  const subCtaLabel = isNl
    ? 'Liever een hoodie of sweater? Bekijk de hele collectie\u00A0→'
    : 'Prefer the hoodie or sweater? View the full collection\u00A0→'

  // 4 kleuren splitsen in 2 paren voor mobile-stack 2x2
  const safeColors = colors.slice(0, 4)
  const pairs: SpringDrop2TeeColor[][] = []
  for (let i = 0; i < safeColors.length; i += 2) {
    pairs.push(safeColors.slice(i, i + 2))
  }

  return (
    <EmailShell locale={locale} preview={preview}>
      <EmailHeader siteUrl={siteUrl} status="SPRING DROP" />

      {/* Hero */}
      <Section style={{ paddingBottom: '12px' }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: EMAIL_COLORS.ink }}
        >
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>
                <Img
                  src={heroImageUrl}
                  alt={
                    heroAlt ||
                    (isNl
                      ? 'MOSE Tee in lente-licht in Groningen'
                      : 'MOSE Tee in spring light in Groningen')
                  }
                  width="600"
                  height="360"
                  className="mose-product-img mose-spring-hero"
                  style={{
                    width: '100%',
                    height: '360px',
                    objectFit: 'cover',
                    objectPosition: 'center 35%',
                    display: 'block',
                  }}
                />
              </td>
            </tr>
            <tr>
              <td
                align="left"
                className="mose-pad-lg mose-spring-hero-pad"
                style={{ padding: '34px 36px 38px 36px' }}
              >
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: EMAIL_COLORS.primary,
                    fontWeight: 800,
                    marginBottom: '12px',
                  }}
                >
                  {heroBadge}
                </div>
                <h1
                  className="mose-hero-title"
                  style={{
                    margin: 0,
                    fontFamily: EMAIL_FONTS.display,
                    fontSize: '54px',
                    lineHeight: 0.95,
                    letterSpacing: '-0.01em',
                    color: EMAIL_COLORS.paper,
                    textTransform: 'uppercase',
                  }}
                >
                  {heroTitle}
                </h1>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Persoonlijke intro */}
      <EmailModule padding="32px 32px 28px 32px">
        <EmailParagraph mb={14}>{greeting}</EmailParagraph>
        <EmailParagraph>{introLine1}</EmailParagraph>
        <EmailParagraph>{introLine2}</EmailParagraph>
        <EmailParagraph mb={0}>{introLine3}</EmailParagraph>
      </EmailModule>

      {/* Kleurenrij — 4 thumbnails op desktop, 2x2 op mobile */}
      <EmailModule padding="28px 24px">
        <EmailSectionTitle title={colorsTitle} meta={colorsMeta} />
        <div style={{ marginTop: '20px' }}>
          {/* Desktop: 4 kolommen in één rij; mobile: per paar 2x2 */}
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            className="mose-hide-mobile"
          >
            <tbody>
              <tr>
                {safeColors.map((c, idx) => {
                  const isLast = idx === safeColors.length - 1
                  return (
                    <td
                      key={c.name}
                      width="25%"
                      valign="top"
                      style={{
                        padding: `0 ${isLast ? 0 : 6}px 0 ${idx === 0 ? 0 : 6}px`,
                      }}
                    >
                      <ColorThumb color={c} />
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>

          {/* Mobile-only: 2x2 stacked pairs */}
          <div
            style={{ display: 'none' }}
            className="mose-spring-color-row"
          >
            {pairs.map((pair, pi) => (
              <div key={pi} style={{ marginBottom: pi < pairs.length - 1 ? 14 : 0 }}>
                {pair.map((c, ci) => (
                  <span
                    key={c.name}
                    className={`mose-spring-color-cell ${ci === 0 ? 'mose-spring-color-cell-l' : 'mose-spring-color-cell-r'}`}
                  >
                    <ColorThumb color={c} />
                  </span>
                ))}
              </div>
            ))}
          </div>

          {someSizesSoldOut ? (
            <div
              style={{
                marginTop: '18px',
                textAlign: 'center',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '12px',
                color: EMAIL_COLORS.textMuted,
                fontStyle: 'italic',
                lineHeight: 1.6,
              }}
            >
              {sizesNote}
            </div>
          ) : null}
        </div>
      </EmailModule>

      {/* Staffel block */}
      <EmailModule
        padding="34px 30px"
        background={EMAIL_COLORS.ink}
        align="center"
        innerClassName="mose-pad mose-spring-staffel-pad"
      >
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '11px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.primary,
            fontWeight: 800,
            marginBottom: '12px',
          }}
        >
          {staffelEyebrow}
        </div>
        <div
          className="mose-spring-staffel-title"
          style={{
            fontFamily: EMAIL_FONTS.display,
            fontSize: '30px',
            color: EMAIL_COLORS.paper,
            letterSpacing: '0.02em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          {staffelTitle}
        </div>
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            color: EMAIL_COLORS.textSubtle,
            lineHeight: 1.6,
            maxWidth: '420px',
            margin: '0 auto 20px auto',
          }}
        >
          {staffelSubtitle}
        </div>

        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{
            margin: '6px auto 0 auto',
            maxWidth: '460px',
          }}
        >
          <tbody>
            {staffel.map((tier, i) => (
              <tr key={i}>
                <td
                  align="left"
                  style={{
                    padding: '13px 14px',
                    borderTop:
                      i === 0
                        ? 'none'
                        : `1px solid ${EMAIL_COLORS.dark700}`,
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '13px',
                    color: tier.highlight
                      ? EMAIL_COLORS.primary
                      : EMAIL_COLORS.paper,
                    fontWeight: tier.highlight ? 800 : 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {tier.qtyLabel}
                </td>
                <td
                  align="right"
                  style={{
                    padding: '13px 14px',
                    borderTop:
                      i === 0
                        ? 'none'
                        : `1px solid ${EMAIL_COLORS.dark700}`,
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '13px',
                    color: tier.highlight
                      ? EMAIL_COLORS.primary
                      : EMAIL_COLORS.paper,
                    fontWeight: tier.highlight ? 800 : 700,
                  }}
                >
                  {tier.pricePerPiece}
                  <div
                    style={{
                      fontSize: '11px',
                      color: EMAIL_COLORS.textSubtle,
                      fontWeight: 500,
                      marginTop: '2px',
                    }}
                  >
                    {tier.totalLabel}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmailModule>

      <EmailCta
        href={teeUrl}
        label={ctaLabel}
        variant="teal"
        footnote={
          <Link
            href={shopUrl}
            style={{
              color: EMAIL_COLORS.textMuted,
              textDecoration: 'underline',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {subCtaLabel}
          </Link>
        }
      />

      <EmailModule padding="20px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph tone="muted" size={12} mb={0} align="center">
          {isNl
            ? `Je ontvangt deze mail omdat je je opgaf met ${email}.`
            : `You are receiving this email because you signed up with ${email}.`}
        </EmailParagraph>
      </EmailModule>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
        unsubscribeUrl={unsubscribeUrl}
        unsubscribePrompt={
          isNl
            ? 'Geen MOSE-mails meer ontvangen?'
            : 'No more MOSE emails?'
        }
        unsubscribeLabel={isNl ? 'Uitschrijven' : 'Unsubscribe'}
      />
    </EmailShell>
  )
}
