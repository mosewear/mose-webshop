import * as React from 'react'
import { Section, Link } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'
import EmailButton from './EmailButton'

interface EmailCtaProps {
  href: string
  label: string
  /** Optionele secondary tekst onder de knop (bv. "Vragen? support@...") */
  footnote?: React.ReactNode
  /** Subtitle boven de knop */
  title?: string
  /** primary (zwart) of teal */
  variant?: 'primary' | 'teal'
  /** Paper (default) of zwart achtergrond van de module */
  background?: 'paper' | 'black'
  /** Gap tot de volgende module */
  gap?: string
}

/**
 * Gecentreerde CTA module met grote button en optionele footnote.
 */
export default function EmailCta({
  href,
  label,
  footnote,
  title,
  variant = 'primary',
  background = 'paper',
  gap = '12px',
}: EmailCtaProps) {
  const bg = background === 'black' ? EMAIL_COLORS.ink : EMAIL_COLORS.paper
  const titleColor =
    background === 'black' ? EMAIL_COLORS.paper : EMAIL_COLORS.ink
  const footnoteColor =
    background === 'black' ? EMAIL_COLORS.textSubtle : EMAIL_COLORS.textMuted

  return (
    <Section style={{ paddingBottom: gap }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ backgroundColor: bg }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              className="mose-pad"
              style={{ padding: '30px 24px' }}
            >
              {title ? (
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.display,
                    fontSize: '20px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: titleColor,
                    marginBottom: '16px',
                  }}
                >
                  {title}
                </div>
              ) : null}
              <EmailButton
                href={href}
                variant={
                  background === 'black' && variant === 'primary'
                    ? 'white'
                    : variant
                }
              >
                {label}
              </EmailButton>
              {footnote ? (
                <div
                  style={{
                    marginTop: '16px',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '12px',
                    color: footnoteColor,
                    lineHeight: 1.6,
                  }}
                >
                  {footnote}
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
