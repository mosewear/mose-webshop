import * as React from 'react'
import { Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

interface EmailCalloutProps {
  tone?: Tone
  title?: string
  children: React.ReactNode
  /** Gap tot volgende module */
  gap?: string
}

function tonePalette(tone: Tone) {
  switch (tone) {
    case 'success':
      return {
        bg: EMAIL_COLORS.successBg,
        border: EMAIL_COLORS.successBorder,
        accent: EMAIL_COLORS.primary,
      }
    case 'warning':
      return {
        bg: EMAIL_COLORS.warningBg,
        border: EMAIL_COLORS.warningBorder,
        accent: EMAIL_COLORS.warning,
      }
    case 'danger':
      return {
        bg: EMAIL_COLORS.dangerBg,
        border: EMAIL_COLORS.dangerBorder,
        accent: EMAIL_COLORS.danger,
      }
    case 'info':
      return {
        bg: EMAIL_COLORS.infoBg,
        border: EMAIL_COLORS.infoBorder,
        accent: EMAIL_COLORS.info,
      }
    default:
      return {
        bg: EMAIL_COLORS.sectionAlt,
        border: EMAIL_COLORS.border,
        accent: EMAIL_COLORS.ink,
      }
  }
}

/**
 * Klein info/success/warning/danger blokje met een gekleurde linkerrand.
 */
export default function EmailCallout({
  tone = 'info',
  title,
  children,
  gap = '12px',
}: EmailCalloutProps) {
  const p = tonePalette(tone)

  return (
    <Section style={{ paddingBottom: gap }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{
          backgroundColor: p.bg,
          borderLeft: `4px solid ${p.accent}`,
        }}
      >
        <tbody>
          <tr>
            <td
              className="mose-pad"
              style={{ padding: '18px 22px', verticalAlign: 'top' }}
            >
              {title ? (
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: p.accent,
                    fontWeight: 800,
                    marginBottom: '6px',
                  }}
                >
                  {title}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '14px',
                  color: EMAIL_COLORS.text,
                  lineHeight: 1.6,
                }}
              >
                {children}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
