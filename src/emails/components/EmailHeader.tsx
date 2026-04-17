import { Img, Link, Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS, EMAIL_SITE_URL } from '../tokens'

interface EmailHeaderProps {
  siteUrl?: string
  /** Korte status rechts naast het logo (bv. "Order Confirmed", "Shipped") */
  status?: string
  /** Kleur van de status-tekst (default MOSE groen) */
  statusColor?: string
}

const wrapper = {
  paddingBottom: '12px',
}

const barOuter = {
  backgroundColor: EMAIL_COLORS.ink,
  width: '100%',
}

const logoCell = {
  padding: '16px 22px',
  verticalAlign: 'middle' as const,
}

const statusCell = {
  padding: '16px 22px',
  verticalAlign: 'middle' as const,
  textAlign: 'right' as const,
}

const linkReset = {
  textDecoration: 'none',
  display: 'inline-block',
}

const imgStyle = {
  display: 'block',
  width: '120px',
  height: '49px',
  border: '0',
  outline: 'none',
}

const statusStyle = (color: string) =>
  ({
    fontFamily: EMAIL_FONTS.body,
    fontSize: '10px',
    letterSpacing: '0.3em',
    textTransform: 'uppercase' as const,
    color,
    fontWeight: 800,
  }) as const

/**
 * Navbar-achtige header: MOSE logo links, korte status rechts.
 * Op mobiel schaalt het logo automatisch (.mose-logo-nav).
 */
export default function EmailHeader({
  siteUrl = EMAIL_SITE_URL,
  status,
  statusColor = EMAIL_COLORS.primary,
}: EmailHeaderProps) {
  return (
    <Section style={wrapper}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={barOuter}
      >
        <tbody>
          <tr>
            <td style={logoCell} align="left">
              <Link href={siteUrl} style={linkReset}>
                <Img
                  className="mose-logo-nav"
                  src={`${siteUrl}/logomose_white.png`}
                  width="120"
                  height="49"
                  alt="MOSE"
                  style={imgStyle}
                />
              </Link>
            </td>
            {status ? (
              <td style={statusCell} align="right">
                <span style={statusStyle(statusColor)}>{status}</span>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
