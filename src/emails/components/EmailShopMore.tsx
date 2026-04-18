import { Link, Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS, EMAIL_SITE_URL } from '../tokens'

interface EmailShopMoreProps {
  title?: string
  ctaLabel?: string
  href?: string
  /** siteUrl wordt als basis gebruikt voor default href */
  siteUrl?: string
  locale?: string
  /** Gap tot volgende module */
  gap?: string
}

/**
 * Teal "Shop more" banner module met titel + onderliggende CTA-link.
 * Zit standaard onder een CTA module in order-emails.
 */
export default function EmailShopMore({
  title = 'Ontdek meer in de MOSE collectie',
  ctaLabel = 'Shop de collectie →',
  href,
  siteUrl = EMAIL_SITE_URL,
  locale = 'nl',
  gap = '12px',
}: EmailShopMoreProps) {
  const finalHref = href || `${siteUrl}/${locale}/shop`

  return (
    <Section style={{ paddingBottom: gap }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ backgroundColor: EMAIL_COLORS.primary }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              className="mose-pad"
              style={{ padding: '22px 24px' }}
            >
              <div
                style={{
                  fontFamily: EMAIL_FONTS.display,
                  fontSize: '22px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.paper,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {title}
              </div>
              <div
                style={{
                  marginTop: '6px',
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.primaryLight,
                  fontWeight: 700,
                }}
              >
                <Link
                  href={finalHref}
                  style={{ color: EMAIL_COLORS.paper, textDecoration: 'underline' }}
                >
                  {ctaLabel}
                </Link>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
