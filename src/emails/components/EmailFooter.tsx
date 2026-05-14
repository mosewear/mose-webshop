import { Img, Link, Section } from '@react-email/components'
import {
  EMAIL_ASSETS,
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from '../tokens'

interface EmailFooterProps {
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  locale?: string
  /** Optionele extra tekst boven de contact-regel (bv. "Made with love in Groningen") */
  tagline?: string
  /**
   * Spring-campaign mails: vaste zwarte top-spacer (~35% logo-hoogte) voor betrouwbare
   * weergave in Gmail/Outlook (Section-padding alleen is daar vaak te dun).
   */
  springCampaignFooter?: boolean
  /**
   * Optionele unsubscribe-URL. Wanneer gezet wordt onderaan een kleine
   * "Geen MOSE-mails meer? Uitschrijven" regel getoond. Verplicht voor
   * marketing/campaign-mails (CAN-SPAM/GDPR/Gmail bulk-sender vereisten).
   */
  unsubscribeUrl?: string
  /** Optionele NL/EN labels voor de unsubscribe-regel. */
  unsubscribePrompt?: string
  unsubscribeLabel?: string
}

const footerSection = {
  backgroundColor: EMAIL_COLORS.black,
  padding: '120px 24px 56px 24px',
  textAlign: 'center' as const,
}

/** Zwarte band boven het logo: ~35% van de nominale logo-hoogte (tokens). */
const FOOTER_LOGO_TOP_SPACER_PX = Math.max(
  1,
  Math.round(EMAIL_ASSETS.logoHeight * 0.35)
)

const footerSectionSpring = {
  backgroundColor: EMAIL_COLORS.black,
  padding: `0 24px 56px 24px`,
  textAlign: 'center' as const,
}

const logoStyle = {
  display: 'block',
  margin: '0 auto',
  width: '120px',
  height: '49px',
  border: '0',
  outline: 'none',
}

const contactBlock = {
  marginTop: '14px',
  fontFamily: EMAIL_FONTS.body,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: EMAIL_COLORS.textSubtle,
  lineHeight: 1.8,
  fontWeight: 600,
}

const linkStyle = {
  color: EMAIL_COLORS.primary,
  textDecoration: 'none',
}

const metaBlock = {
  marginTop: '16px',
  marginBottom: '0',
  paddingTop: '14px',
  paddingBottom: '4px',
  borderTop: `1px solid ${EMAIL_COLORS.dark700}`,
  fontFamily: EMAIL_FONTS.body,
  fontSize: '10px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: EMAIL_COLORS.dark500,
}

const taglineStyle = {
  marginTop: '6px',
  fontFamily: EMAIL_FONTS.body,
  fontSize: '11px',
  letterSpacing: '0.12em',
  color: EMAIL_COLORS.textSubtle,
  fontStyle: 'italic' as const,
}

const unsubscribeBlock = {
  marginTop: '20px',
  paddingTop: '14px',
  borderTop: `1px solid ${EMAIL_COLORS.dark700}`,
  fontFamily: EMAIL_FONTS.body,
  fontSize: '11px',
  color: EMAIL_COLORS.dark500,
  lineHeight: 1.6,
  letterSpacing: '0.04em',
}

const unsubscribeLinkStyle = {
  color: EMAIL_COLORS.textSubtle,
  textDecoration: 'underline',
  fontWeight: 600,
}

/**
 * Dark footer module met wit MOSE logo en contactgegevens.
 * Onderaan een fijne regel © & origin.
 */
export default function EmailFooter({
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  tagline,
  springCampaignFooter = false,
  unsubscribeUrl,
  unsubscribePrompt,
  unsubscribeLabel,
}: EmailFooterProps) {
  const year = new Date().getFullYear()
  const unsubText =
    unsubscribePrompt || 'Geen MOSE-mails meer ontvangen?'
  const unsubLabel = unsubscribeLabel || 'Uitschrijven'

  const inner = (
    <>
      <Link href={siteUrl} style={{ textDecoration: 'none' }}>
        <Img
          className="mose-logo-footer"
          src={`${siteUrl}/logomose_white.png`}
          width="120"
          height="49"
          alt="MOSE"
          style={logoStyle}
        />
      </Link>

      {tagline ? <div style={taglineStyle}>{tagline}</div> : null}

      <div style={contactBlock}>
        {contactAddress}
        <br />
        <Link href={`mailto:${contactEmail}`} style={linkStyle}>
          {contactEmail}
        </Link>
        {'  ·  '}
        <Link
          href={`tel:${contactPhone.replace(/\s/g, '')}`}
          style={linkStyle}
        >
          {contactPhone}
        </Link>
      </div>

      <div style={metaBlock}>© {year} MOSE · Made in Groningen</div>

      {unsubscribeUrl ? (
        <div style={unsubscribeBlock}>
          {unsubText}{' '}
          <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
            {unsubLabel}
          </Link>
        </div>
      ) : null}
    </>
  )

  if (springCampaignFooter) {
    const h = FOOTER_LOGO_TOP_SPACER_PX
    return (
      <Section style={{ margin: 0, padding: 0 }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: EMAIL_COLORS.black }}
        >
          <tbody>
            <tr>
              <td
                height={h}
                style={{
                  backgroundColor: EMAIL_COLORS.black,
                  height: `${h}px`,
                  fontSize: `${h}px`,
                  lineHeight: `${h}px`,
                }}
              >
                {'\u00a0'}
              </td>
            </tr>
            <tr>
              <td align="center" style={footerSectionSpring}>
                {inner}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
    )
  }

  return (
    <Section className="mose-email-footer" style={footerSection}>
      {inner}
    </Section>
  )
}
