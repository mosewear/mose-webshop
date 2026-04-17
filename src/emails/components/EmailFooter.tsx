import { Img, Link, Section } from '@react-email/components'
import {
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
}

const footerSection = {
  backgroundColor: EMAIL_COLORS.black,
  padding: '30px 24px',
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
  paddingTop: '14px',
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
}: EmailFooterProps) {
  const year = new Date().getFullYear()

  return (
    <Section style={footerSection}>
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
    </Section>
  )
}
