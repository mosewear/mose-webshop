import * as React from 'react'
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Preview,
} from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailShellProps {
  /** Korte preheader (verschijnt in inbox preview, 85–120 chars aanbevolen) */
  preview: string
  /** Locale voor <html lang=""> */
  locale?: string
  /** Kinderen worden gerenderd binnen een 600px container op een eeeae2 canvas */
  children: React.ReactNode
}

const bodyStyle = {
  margin: 0,
  padding: 0,
  width: '100%',
  backgroundColor: EMAIL_COLORS.surface,
  fontFamily: EMAIL_FONTS.body,
  color: EMAIL_COLORS.text,
  WebkitTextSizeAdjust: '100%',
  MsTextSizeAdjust: '100%',
} as const

const containerStyle = {
  width: '600px',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '24px 12px 32px 12px',
}

/**
 * Globale styles die niet inline kunnen — media queries, dark-mode
 * locks en Outlook-specifieke tweaks. Plain string zodat React Email
 * hem 1-op-1 overneemt naar de rendered HTML.
 */
const globalStyles = `
  body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${EMAIL_COLORS.surface} !important; }
  a { color:inherit; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }

  @media only screen and (max-width: 620px) {
    .mose-container { width:100% !important; padding:16px 8px 24px 8px !important; }
    .mose-pad { padding:20px !important; }
    .mose-pad-lg { padding:28px 22px !important; }
    .mose-hero-title { font-size:56px !important; line-height:0.9 !important; }
    .mose-hero-title-lg { font-size:64px !important; line-height:0.88 !important; }
    .mose-total-value { font-size:40px !important; }
    .mose-section-title { font-size:22px !important; }
    .mose-product-img { width:96px !important; height:64px !important; }
    .mose-product-col { width:112px !important; padding-right:14px !important; }
    .mose-logo-nav { width:108px !important; height:auto !important; }
    .mose-logo-footer { width:100px !important; height:auto !important; }
    .mose-mobile-stack { display:block !important; width:100% !important; box-sizing:border-box; border-right:none !important; border-bottom:1px solid ${EMAIL_COLORS.borderStrong} !important; }
    .mose-mobile-stack-last { border-bottom:none !important; }
    .mose-gutter { display:none !important; width:0 !important; font-size:0 !important; line-height:0 !important; }
    .mose-hide-mobile { display:none !important; }
    .mose-btn { display:block !important; width:100% !important; box-sizing:border-box; }
  }

  @media (prefers-color-scheme: dark) {
    .mose-force-light { background-color:${EMAIL_COLORS.surface} !important; color:${EMAIL_COLORS.text} !important; }
  }
`

export default function EmailShell({
  preview,
  locale = 'nl',
  children,
}: EmailShellProps) {
  return (
    <Html lang={locale} dir="ltr">
      <Head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, address=no, email=no"
        />
        <Font
          fontFamily="Anton"
          fallbackFontFamily={['Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v26/JTURjIg1_i6t8kCHKm45_dJE3gnD_g.woff2',
            format: 'woff2',
          }}
          fontWeight={700}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v26/JTURjIg1_i6t8kCHKm45_bZF3gnD_g.woff2',
            format: 'woff2',
          }}
          fontWeight={800}
          fontStyle="normal"
        />
        <style>{globalStyles}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={bodyStyle} className="mose-force-light">
        <Container className="mose-container" style={containerStyle}>
          {children}
        </Container>
      </Body>
    </Html>
  )
}
