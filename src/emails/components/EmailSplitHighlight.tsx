import * as React from 'react'
import { Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface SideContent {
  /** Kleine label-eyebrow (bv. "Bezorgadres") */
  label: string
  /** De body-content (string of React-node) */
  body: React.ReactNode
  /** Optionele footnote onder de body */
  footnote?: string
  /** Paper of black achtergrond */
  background?: 'paper' | 'black' | 'primary'
}

interface EmailSplitHighlightProps {
  left: SideContent
  right: SideContent
  /** Gap tot de volgende module */
  gap?: string
}

function cellColors(bg: SideContent['background']) {
  if (bg === 'black')
    return {
      bg: EMAIL_COLORS.ink,
      label: EMAIL_COLORS.primary,
      body: EMAIL_COLORS.paper,
      footnote: EMAIL_COLORS.textSubtle,
    }
  if (bg === 'primary')
    return {
      bg: EMAIL_COLORS.primary,
      label: EMAIL_COLORS.paper,
      body: EMAIL_COLORS.paper,
      footnote: EMAIL_COLORS.primaryLight,
    }
  return {
    bg: EMAIL_COLORS.paper,
    label: EMAIL_COLORS.textSubtle,
    body: EMAIL_COLORS.ink,
    footnote: EMAIL_COLORS.textMuted,
  }
}

/**
 * Split 50/50 met een 12px gutter ertussen die op mobiel stackt.
 * Perfect voor adres + totaal of "before/after" content.
 */
export default function EmailSplitHighlight({
  left,
  right,
  gap = '12px',
}: EmailSplitHighlightProps) {
  const L = cellColors(left.background)
  const R = cellColors(right.background)

  return (
    <Section style={{ paddingBottom: gap }}>
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
              width="50%"
              valign="top"
              className="mose-mobile-stack"
              style={{
                backgroundColor: L.bg,
                padding: '26px 24px',
                verticalAlign: 'top',
              }}
            >
              <div
                style={{
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: L.label,
                  fontWeight: 800,
                }}
              >
                {left.label}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: L.body,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {left.body}
              </div>
              {left.footnote ? (
                <div
                  style={{
                    marginTop: '10px',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '10px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: L.footnote,
                    fontWeight: 700,
                  }}
                >
                  {left.footnote}
                </div>
              ) : null}
            </td>
            <td
              width="12"
              className="mose-gutter"
              style={{ width: '12px', fontSize: 0, lineHeight: 0 }}
            >
              &nbsp;
            </td>
            <td
              width="50%"
              valign="top"
              className="mose-mobile-stack mose-mobile-stack-last"
              style={{
                backgroundColor: R.bg,
                padding: '26px 24px',
                verticalAlign: 'top',
              }}
            >
              <div
                style={{
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: R.label,
                  fontWeight: 800,
                }}
              >
                {right.label}
              </div>
              <div
                className="mose-total-value"
                style={{
                  marginTop: '4px',
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: R.body,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {right.body}
              </div>
              {right.footnote ? (
                <div
                  style={{
                    marginTop: '10px',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '10px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: R.footnote,
                    fontWeight: 700,
                  }}
                >
                  {right.footnote}
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

/** Helper voor een grote Anton-totaal in de body van een Split */
export function EmailTotalValue({ value }: { value: string }) {
  return (
    <span
      className="mose-total-value"
      style={{
        fontFamily: EMAIL_FONTS.display,
        fontSize: '44px',
        color: EMAIL_COLORS.paper,
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}
    >
      {value}
    </span>
  )
}
