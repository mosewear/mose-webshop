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
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '24px 12px 32px 12px',
  boxSizing: 'border-box' as const,
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
  /* Laat product-thumbnails hun eigen aspect (object-fit) behouden; niet forceren naar height:auto */
  img:not(.mose-product-img) { max-width:100% !important; height:auto !important; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${EMAIL_COLORS.surface} !important; }
  a { color:inherit; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  .mose-container table { max-width:100% !important; }
  .mose-hero-sub { max-width:100% !important; box-sizing:border-box !important; }

  @media only screen and (max-width: 620px) {
    .mose-container { width:100% !important; max-width:100% !important; padding:16px 8px 24px 8px !important; box-sizing:border-box !important; }
    .mose-pad { padding:20px !important; }
    .mose-pad-lg { padding:28px 22px !important; }
    .mose-hero-title { font-size:46px !important; line-height:0.92 !important; overflow-wrap:anywhere !important; word-wrap:break-word !important; }
    .mose-hero-title-lg { font-size:54px !important; line-height:0.9 !important; overflow-wrap:anywhere !important; word-wrap:break-word !important; }
    .mose-total-value { font-size:40px !important; overflow-wrap:anywhere !important; }
    .mose-section-title { font-size:22px !important; }
    .mose-product-frame { width:88px !important; height:88px !important; max-width:88px !important; }
    .mose-product-img { width:88px !important; height:88px !important; max-width:none !important; object-fit:cover !important; object-position:center !important; }
    .mose-product-col { width:108px !important; padding-right:12px !important; }
    .mose-logo-nav { width:108px !important; height:auto !important; }
    .mose-logo-footer { width:100px !important; height:auto !important; }
    .mose-mobile-stack { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; border-right:none !important; border-bottom:1px solid ${EMAIL_COLORS.borderStrong} !important; }
    .mose-mobile-stack-last { border-bottom:none !important; }
    .mose-mobile-stack-soft { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; }
    .mose-gutter { display:none !important; width:0 !important; font-size:0 !important; line-height:0 !important; height:0 !important; overflow:hidden !important; }
    .mose-hide-mobile { display:none !important; }
    .mose-btn { display:block !important; width:100% !important; box-sizing:border-box !important; }
    .mose-breakdown-value { white-space:normal !important; word-break:break-word !important; overflow-wrap:anywhere !important; }

    /* Spring Drop campaign tweaks */
    .mose-spring-hero { height:240px !important; }
    .mose-spring-hero-pad { padding:24px 22px 26px 22px !important; }
    .mose-spring-product-img { height:300px !important; }
    .mose-spring-product-pad { padding:18px 18px 22px 18px !important; }
    .mose-spring-product-name { font-size:22px !important; }
    .mose-spring-product-price { font-size:15px !important; }
    .mose-spring-product-badge { font-size:10px !important; padding:6px 10px !important; }
    .mose-spring-trust { font-size:10px !important; letter-spacing:0.14em !important; line-height:1.9 !important; padding:14px 12px 4px 12px !important; }
    .mose-spring-trust-sep { display:none !important; }
    .mose-spring-trust-item { display:block !important; }
    .mose-spring-color-row { display:block !important; width:100% !important; }
    .mose-spring-color-cell { display:inline-block !important; width:48% !important; box-sizing:border-box !important; padding:0 !important; vertical-align:top !important; }
    .mose-spring-color-cell-l { padding-right:6px !important; }
    .mose-spring-color-cell-r { padding-left:6px !important; }
    .mose-spring-color-spacer { display:block !important; width:100% !important; height:14px !important; line-height:14px !important; font-size:0 !important; }
    .mose-spring-staffel-pad { padding:26px 18px !important; }
    .mose-spring-staffel-title { font-size:24px !important; }
    .mose-spring-code-pad { padding:30px 18px !important; }
    .mose-spring-code-block { font-size:30px !important; letter-spacing:0.1em !important; word-break:break-all !important; }
    .mose-spring-code-meta { font-size:11px !important; max-width:280px !important; }
    .mose-spring-footer-spacer { padding-top:64px !important; padding-bottom:36px !important; }
  }

  /* Outlook 2007+ specific cleanup */
  body[data-outlook-cycle] .mose-btn { padding:18px 28px !important; }

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
