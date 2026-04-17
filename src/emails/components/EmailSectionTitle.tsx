import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailSectionTitleProps {
  title: string
  /** Kleine label/badge rechts (bv. "2 stuks") */
  meta?: string
  /** Dikke divider onder de titel? default true */
  divider?: boolean
}

/**
 * Anton uppercase titel met optionele meta-label rechts en een
 * 2px zwarte streep eronder. Gebruik binnen een EmailModule.
 */
export default function EmailSectionTitle({
  title,
  meta,
  divider = true,
}: EmailSectionTitleProps) {
  return (
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
            align="left"
            className="mose-section-title"
            style={{
              fontFamily: EMAIL_FONTS.display,
              fontSize: '26px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: EMAIL_COLORS.ink,
            }}
          >
            {title}
          </td>
          {meta ? (
            <td
              align="right"
              style={{
                fontFamily: EMAIL_FONTS.body,
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: EMAIL_COLORS.textSubtle,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {meta}
            </td>
          ) : null}
        </tr>
        {divider ? (
          <tr>
            <td colSpan={2} style={{ paddingTop: '10px' }}>
              <div
                style={{
                  height: '2px',
                  backgroundColor: EMAIL_COLORS.ink,
                  fontSize: 0,
                  lineHeight: 0,
                }}
              >
                &nbsp;
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}
