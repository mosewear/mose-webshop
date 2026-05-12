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
  /** Optioneel: aantal kleuren met sold-out maten (voor de regel "Sommige maten zijn al uitverkocht") */
  someSizesSoldOut?: boolean
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
    ? '240 gsm jersey uit Groningen. Bij drie stuks €44,95 per stuk, automatisch in je mand.'
    : '240 gsm jersey from Groningen. Three for €44.95 each, applied automatically in your cart.'

  const heroBadge = isNl ? 'EEN FAVORIET' : 'A FAVORITE'
  const heroTitle = isNl ? 'DE MOSE TEE.' : 'THE MOSE TEE.'

  const introLine1 = isNl
    ? 'Als je met één stuk wilt beginnen, pak dan de Tee. Die dragen we zelf het meest.'
    : 'If you want to start with one piece, pick the Tee. It is what we wear most ourselves.'
  const introLine2 = isNl
    ? 'Het is 240 gsm jersey: genoeg gewicht om mooi te vallen, niet te zwaar voor warmere dagen.'
    : 'It is 240 gsm jersey: enough weight to drape well, not too heavy for warmer days.'
  const introLine3 = isNl
    ? 'Strak logo, nette afwerking, gemaakt om vaak te wassen en te dragen. Er zijn vier kleuren.'
    : 'Clean logo, neat finish, made to wash and wear often. Four colors available.'

  const colorsTitle = isNl ? 'Vier kleuren' : 'Four colors'
  const colorsMeta = isNl ? 'Voorraad live' : 'Live stock'

  const sizesNote = isNl
    ? 'Let op: sommige maten zijn al uitverkocht.'
    : 'Note: some sizes are already sold out.'

  const staffelTitle = isNl ? 'Meer stuks, lagere prijs per stuk' : 'More pieces, lower price each'
  const staffelSubtitle = isNl
    ? 'Je ziet de staffelkorting meteen in je winkelmand. Je hoeft geen code in te vullen.'
    : 'You will see the quantity discount right in your cart. No code to enter.'

  const ctaLabel = isNl ? 'Naar de MOSE Tee  →' : 'Shop the MOSE Tee  →'
  const subCtaLabel = isNl
    ? 'Liever meteen een hoodie of sweater bekijken? Naar de hele shop  →'
    : 'Prefer to browse the hoodie or sweater first? View the full shop  →'

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
                  height="320"
                  style={{
                    width: '100%',
                    height: '320px',
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
                className="mose-pad-lg"
                style={{ padding: '30px 36px 36px 36px' }}
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

      <EmailModule padding="28px 30px">
        <EmailParagraph>{introLine1}</EmailParagraph>
        <EmailParagraph>{introLine2}</EmailParagraph>
        <EmailParagraph mb={0}>{introLine3}</EmailParagraph>
      </EmailModule>

      {/* Kleurenrij - 4 thumbnails */}
      <EmailModule padding="26px 22px">
        <EmailSectionTitle title={colorsTitle} meta={colorsMeta} />
        <div style={{ marginTop: '20px' }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            border={0}
          >
            <tbody>
              <tr>
                {colors.slice(0, 4).map((c, idx) => {
                  const isLast = idx === Math.min(colors.length, 4) - 1
                  return (
                    <td
                      key={c.name}
                      width="25%"
                      valign="top"
                      className={`mose-mobile-stack mose-tee-color-td${isLast ? ' mose-mobile-stack-last' : ''}`}
                      style={{
                        padding: `0 ${isLast ? 0 : 6}px 0 ${idx === 0 ? 0 : 6}px`,
                      }}
                    >
                      <Link
                        href={c.url}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div
                          style={{
                            backgroundColor: EMAIL_COLORS.productBg,
                            border: `1px solid ${EMAIL_COLORS.border}`,
                            padding: '8px',
                          }}
                        >
                          <Img
                            src={c.imageUrl}
                            alt={`MOSE Tee ${c.name}`}
                            width="120"
                            height="120"
                            className="mose-tee-color-img"
                            style={{
                              width: '100%',
                              height: '120px',
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
                          {c.name}
                        </div>
                        {c.stockNote ? (
                          <div
                            style={{
                              marginTop: '4px',
                              textAlign: 'center',
                              fontFamily: EMAIL_FONTS.body,
                              fontSize: '11px',
                              color: c.soldOut
                                ? EMAIL_COLORS.danger
                                : EMAIL_COLORS.textMuted,
                            }}
                          >
                            {c.stockNote}
                          </div>
                        ) : null}
                      </Link>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          {someSizesSoldOut ? (
            <div
              style={{
                marginTop: '16px',
                textAlign: 'center',
                fontFamily: EMAIL_FONTS.body,
                fontSize: '12px',
                color: EMAIL_COLORS.textMuted,
                fontStyle: 'italic',
              }}
            >
              {sizesNote}
            </div>
          ) : null}
        </div>
      </EmailModule>

      {/* Staffel block */}
      <EmailModule
        padding="28px 30px"
        background={EMAIL_COLORS.ink}
        align="center"
      >
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '11px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.primary,
            fontWeight: 800,
            marginBottom: '10px',
          }}
        >
          {isNl ? 'Staffelkorting' : 'Quantity discount'}
        </div>
        <div
          style={{
            fontFamily: EMAIL_FONTS.display,
            fontSize: '28px',
            color: EMAIL_COLORS.paper,
            letterSpacing: '0.02em',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            marginBottom: '6px',
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
            margin: '0 auto 18px auto',
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
                    padding: '12px 14px',
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
                    padding: '12px 14px',
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
            }}
          >
            {subCtaLabel}
          </Link>
        }
      />

      <EmailModule padding="20px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph tone="muted" size={12} mb={0} align="center">
          {isNl
            ? `Je krijgt deze mail omdat je je bij ons hebt aangemeld met ${email}.`
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
