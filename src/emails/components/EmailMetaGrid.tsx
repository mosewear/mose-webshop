import { Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface MetaPair {
  label: string
  value: string
}

interface EmailMetaGridProps {
  pairs: MetaPair[]
  /** Aantal kolommen. Default 2. */
  columns?: 2 | 3
  /** Harde zwarte rand rondom (brutalist). Default true. */
  bordered?: boolean
  /** Ruimte tot de volgende module */
  gap?: string
}

/**
 * 2- of 3-kolom grid met label/value paren.
 * Op mobiel stackt het verticaal met een 1px zwarte divider.
 */
export default function EmailMetaGrid({
  pairs,
  columns = 2,
  bordered = true,
  gap = '12px',
}: EmailMetaGridProps) {
  if (!pairs.length) return null
  const cellWidth = `${Math.floor(100 / columns)}%`

  return (
    <Section style={{ paddingBottom: gap }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{
          backgroundColor: EMAIL_COLORS.paper,
          border: bordered ? `2px solid ${EMAIL_COLORS.borderStrong}` : 'none',
        }}
      >
        <tbody>
          <tr>
            {pairs.map((pair, idx) => {
              const isLast = idx === pairs.length - 1
              const stackClass = `mose-mobile-stack${isLast ? ' mose-mobile-stack-last' : ''}`
              return (
                <td
                  key={idx}
                  width={cellWidth}
                  valign="top"
                  className={stackClass}
                  style={{
                    padding: '22px 22px',
                    borderRight:
                      !isLast && bordered
                        ? `2px solid ${EMAIL_COLORS.borderStrong}`
                        : 'none',
                    verticalAlign: 'top',
                  }}
                >
                  <div
                    style={{
                      fontFamily: EMAIL_FONTS.body,
                      fontSize: '10px',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      color: EMAIL_COLORS.textFaint,
                      fontWeight: 800,
                    }}
                  >
                    {pair.label}
                  </div>
                  <div
                    style={{
                      marginTop: '6px',
                      fontFamily: EMAIL_FONTS.display,
                      fontSize: '26px',
                      color: EMAIL_COLORS.ink,
                      letterSpacing: '0.06em',
                      lineHeight: 1.05,
                    }}
                  >
                    {pair.value}
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
