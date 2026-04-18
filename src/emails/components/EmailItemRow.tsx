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
 * Product-rij met vierkante thumbnail; foto wordt bijgesneden (object-fit: cover)
 * zodat portret/landscape niet uit verhouding raakt. Mobiel: 88×88 via EmailShell.
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
              width="132"
              valign="middle"
              style={{ width: '132px', paddingRight: '16px' }}
            >
              <table
                role="presentation"
                className="mose-product-frame"
                width={108}
                cellPadding={0}
                cellSpacing={0}
                border={0}
                style={{
                  width: '108px',
                  height: '108px',
                  maxWidth: '108px',
                  backgroundColor: EMAIL_COLORS.productBg,
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: '108px',
                        height: '108px',
                        padding: 0,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        lineHeight: 0,
                        backgroundColor: EMAIL_COLORS.productBg,
                      }}
                    >
                      <Img
                        className="mose-product-img"
                        src={resolvedImage}
                        alt={name}
                        width={108}
                        height={108}
                        style={{
                          width: '108px',
                          height: '108px',
                          maxWidth: 'none',
                          objectFit: 'cover',
                          objectPosition: 'center',
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
