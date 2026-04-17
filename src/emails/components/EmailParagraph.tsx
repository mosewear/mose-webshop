import * as React from 'react'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailParagraphProps {
  children: React.ReactNode
  /** Kleur (default text), 'muted' voor secondair */
  tone?: 'default' | 'muted' | 'ink' | 'subtitle'
  /** Font size — default 14 */
  size?: number
  /** Margin top */
  mt?: number
  /** Margin bottom */
  mb?: number
  /** Alignment */
  align?: 'left' | 'center' | 'right'
}

function toneColor(tone: NonNullable<EmailParagraphProps['tone']>) {
  switch (tone) {
    case 'muted':
      return EMAIL_COLORS.textMuted
    case 'ink':
      return EMAIL_COLORS.ink
    case 'subtitle':
      return EMAIL_COLORS.textSubtle
    default:
      return EMAIL_COLORS.text
  }
}

/**
 * Simpele body paragraph met MOSE typografie. Vervangt <Text>
 * voor consistente spacing binnen modules.
 */
export default function EmailParagraph({
  children,
  tone = 'default',
  size = 14,
  mt,
  mb,
  align,
}: EmailParagraphProps) {
  return (
    <p
      style={{
        fontFamily: EMAIL_FONTS.body,
        fontSize: `${size}px`,
        color: toneColor(tone),
        lineHeight: 1.65,
        margin: 0,
        marginTop: mt !== undefined ? `${mt}px` : undefined,
        marginBottom: mb !== undefined ? `${mb}px` : '10px',
        textAlign: align,
      }}
    >
      {children}
    </p>
  )
}
