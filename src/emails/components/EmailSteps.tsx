import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailStepsProps {
  steps: Array<string | { title: string; description?: string }>
  /** Genummerd (default) of bullet */
  variant?: 'numbered' | 'bullet'
}

/**
 * Geordende stappenlijst of bullet lijst met MOSE styling.
 * Op zichzelf modulair — plaats binnen een EmailModule.
 */
export default function EmailSteps({
  steps,
  variant = 'numbered',
}: EmailStepsProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
    >
      <tbody>
        {steps.map((raw, idx) => {
          const item = typeof raw === 'string' ? { title: raw } : raw
          return (
            <tr key={idx}>
              <td
                width="40"
                valign="top"
                style={{ width: '40px', paddingTop: '2px' }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    lineHeight: '28px',
                    textAlign: 'center',
                    backgroundColor:
                      variant === 'numbered'
                        ? EMAIL_COLORS.ink
                        : EMAIL_COLORS.primary,
                    color: EMAIL_COLORS.paper,
                    fontFamily: EMAIL_FONTS.display,
                    fontSize: '14px',
                  }}
                >
                  {variant === 'numbered' ? idx + 1 : '·'}
                </div>
              </td>
              <td
                valign="top"
                style={{
                  paddingBottom: idx < steps.length - 1 ? '16px' : 0,
                  paddingLeft: '6px',
                }}
              >
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontWeight: 700,
                    fontSize: '14px',
                    color: EMAIL_COLORS.ink,
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <div
                    style={{
                      marginTop: '4px',
                      fontFamily: EMAIL_FONTS.body,
                      fontSize: '13px',
                      color: EMAIL_COLORS.textMuted,
                      lineHeight: 1.55,
                    }}
                  >
                    {item.description}
                  </div>
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
