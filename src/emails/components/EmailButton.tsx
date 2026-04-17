import * as React from 'react'
import { Link } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  /** primary = zwart (default), teal = MOSE groen, outline = zwarte rand */
  variant?: 'primary' | 'teal' | 'outline' | 'white'
  /** sm | md (default) | lg */
  size?: 'sm' | 'md' | 'lg'
  /** Volledige breedte op mobiel? Default true */
  fullWidthMobile?: boolean
}

const SIZE_MAP = {
  sm: { padding: '14px 28px', fontSize: '12px' },
  md: { padding: '20px 40px', fontSize: '14px' },
  lg: { padding: '22px 44px', fontSize: '15px' },
} as const

function variantStyles(variant: NonNullable<EmailButtonProps['variant']>) {
  switch (variant) {
    case 'teal':
      return { bg: EMAIL_COLORS.primary, color: EMAIL_COLORS.paper, border: 'none' }
    case 'outline':
      return {
        bg: 'transparent',
        color: EMAIL_COLORS.ink,
        border: `2px solid ${EMAIL_COLORS.ink}`,
      }
    case 'white':
      return { bg: EMAIL_COLORS.paper, color: EMAIL_COLORS.ink, border: 'none' }
    default:
      return { bg: EMAIL_COLORS.ink, color: EMAIL_COLORS.paper, border: 'none' }
  }
}

export default function EmailButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  fullWidthMobile = true,
}: EmailButtonProps) {
  const sz = SIZE_MAP[size]
  const v = variantStyles(variant)

  return (
    <Link
      href={href}
      className={fullWidthMobile ? 'mose-btn' : undefined}
      style={{
        display: 'inline-block',
        backgroundColor: v.bg,
        color: v.color,
        border: v.border,
        fontFamily: EMAIL_FONTS.body,
        fontSize: sz.fontSize,
        fontWeight: 800,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        padding: sz.padding,
        textAlign: 'center',
        msoPaddingAlt: '0',
      }}
    >
      {children}
    </Link>
  )
}
