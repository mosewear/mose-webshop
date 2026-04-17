import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

export interface BreakdownRow {
  label: string
  value: string
  /** Muted, normal, success (teal), danger (red). default normal */
  tone?: 'normal' | 'muted' | 'success' | 'danger' | 'highlight'
  /** Groot/bold weergeven (voor het eindtotaal) */
  strong?: boolean
}

interface EmailBreakdownProps {
  title?: string
  rows: BreakdownRow[]
}

function valueColor(tone: BreakdownRow['tone']) {
  switch (tone) {
    case 'muted':
      return EMAIL_COLORS.textMuted
    case 'success':
    case 'highlight':
      return EMAIL_COLORS.primary
    case 'danger':
      return EMAIL_COLORS.danger
    default:
      return EMAIL_COLORS.ink
  }
}

/**
 * Ordered list van label/value regels (subtotal, BTW, shipping, etc).
 * Gebruikt binnen een EmailModule.
 */
export default function EmailBreakdown({ title, rows }: EmailBreakdownProps) {
  return (
    <>
      {title ? (
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '11px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.textSubtle,
            fontWeight: 800,
            marginBottom: '12px',
          }}
        >
          {title}
        </div>
      ) : null}
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{
          fontFamily: EMAIL_FONTS.body,
          fontSize: '14px',
          color: EMAIL_COLORS.text,
        }}
      >
        <tbody>
          {rows.map((row, idx) => {
            const color = valueColor(row.tone)
            const isHighlight = row.tone === 'highlight' || row.tone === 'success'
            return (
              <tr key={idx}>
                <td
                  style={{
                    padding: '5px 0',
                    color: row.tone === 'muted' ? EMAIL_COLORS.textMuted : EMAIL_COLORS.text,
                    fontSize: row.tone === 'muted' ? '13px' : '14px',
                    fontWeight: row.strong ? 800 : 500,
                    letterSpacing: isHighlight ? '0.12em' : undefined,
                    textTransform: isHighlight ? 'uppercase' : undefined,
                  }}
                >
                  {row.label}
                </td>
                <td
                  align="right"
                  style={{
                    padding: '5px 0',
                    color,
                    fontWeight: row.strong || isHighlight ? 800 : 500,
                    fontSize: row.tone === 'muted' ? '13px' : '14px',
                    letterSpacing: isHighlight ? '0.12em' : undefined,
                    textTransform: isHighlight ? 'uppercase' : undefined,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.value}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
