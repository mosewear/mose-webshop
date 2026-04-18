import { Img } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS, EMAIL_SITE_URL } from '../tokens'

interface EmailItemRowProps {
  name: string
  meta?: string
  price?: string
  imageUrl?: string
  siteUrl?: string
  /** Laatste item in de lijst? Dan geen divider onderaan. */
  last?: boolean
  /** Badge rechts naast de prijs (bv. "PRESALE") */
  badge?: string
  badgeColor?: string
}

const PLACEHOLDER = '/logomose.png'

/**
 * Product-rij met landscape 3:2 afbeelding (124x83), Anton titel
 * + kleine meta-regel en een Anton prijs rechts. Op mobiel schaalt
 * de afbeelding naar 96x64 via .mose-product-img.
 */
export default function EmailItemRow({
  name,
  meta,
  price,
  imageUrl,
  siteUrl = EMAIL_SITE_URL,
  last = false,
  badge,
  badgeColor = EMAIL_COLORS.primary,
}: EmailItemRowProps) {
  const resolvedImage = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${siteUrl}${imageUrl}`
    : `${siteUrl}${PLACEHOLDER}`

  return (
    <div>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
      >
        <tbody>
          <tr>
            <td
              className="mose-product-col"
              width="140"
              valign="middle"
              style={{ width: '140px', paddingRight: '20px' }}
            >
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                style={{ backgroundColor: EMAIL_COLORS.productBg }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '8px' }}>
                      <Img
                        className="mose-product-img"
                        src={resolvedImage}
                        alt={name}
                        width="124"
                        height="83"
                        style={{
                          width: '124px',
                          height: '83px',
                          display: 'block',
                          border: '0',
                          outline: 'none',
                        }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td valign="middle" style={{ verticalAlign: 'middle' }}>
              <div
                style={{
                  fontFamily: EMAIL_FONTS.display,
                  fontSize: '20px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.ink,
                  lineHeight: 1.15,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {name}
              </div>
              {meta ? (
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '12px',
                    color: EMAIL_COLORS.textMuted,
                    marginTop: '6px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {meta}
                </div>
              ) : null}
              {badge ? (
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '3px 8px',
                    backgroundColor: badgeColor,
                    color: EMAIL_COLORS.paper,
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  {badge}
                </div>
              ) : null}
            </td>
            {price ? (
              <td
                valign="middle"
                align="right"
                style={{
                  fontFamily: EMAIL_FONTS.display,
                  fontSize: '22px',
                  color: EMAIL_COLORS.ink,
                  letterSpacing: '0.02em',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                }}
              >
                {price}
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      {!last ? (
        <div
          style={{
            borderTop: `1px solid ${EMAIL_COLORS.border}`,
            marginTop: '18px',
            marginBottom: '18px',
          }}
        />
      ) : null}
    </div>
  )
}
