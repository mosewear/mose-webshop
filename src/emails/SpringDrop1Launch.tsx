import { Img, Link, Section } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailModule from './components/EmailModule'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import {
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from './tokens'

interface SpringDropProduct {
  name: string
  priceLabel: string
  badge: string
  badgeTone?: 'sale' | 'staffel' | 'scarcity'
  imageUrl: string
  url: string
  /** Optionele subtekst onder de naam (bv. "240 gsm jersey, 4 kleuren") */
  subtitle?: string
}

interface SpringDrop1LaunchProps {
  email: string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  unsubscribeUrl?: string
  /** Drie producten in stack-layout; volgorde = render-volgorde. */
  products: SpringDropProduct[]
  /** URL voor de "Bekijk de hele collectie" CTA, inclusief UTMs. */
  shopUrl: string
  /** Hero-image (lookbook hoofdstuk 1) */
  heroImageUrl: string
  /** Alt text voor hero (locale-afhankelijk) */
  heroAlt?: string
}

const HERO_FRAME_HEIGHT = 360

const wordmarkStyle = {
  fontFamily: EMAIL_FONTS.display,
  textTransform: 'uppercase' as const,
  fontSize: '54px',
  lineHeight: 0.95,
  letterSpacing: '-0.01em',
  color: EMAIL_COLORS.paper,
  margin: 0,
}

const heroOverlayBadge = {
  display: 'inline-block',
  fontFamily: EMAIL_FONTS.body,
  fontSize: '11px',
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color: EMAIL_COLORS.paper,
  fontWeight: 800,
  padding: '6px 12px',
  border: `1px solid ${EMAIL_COLORS.paper}`,
}

function badgeColors(tone: SpringDropProduct['badgeTone']) {
  switch (tone) {
    case 'sale':
      return { bg: EMAIL_COLORS.primary, color: EMAIL_COLORS.paper }
    case 'staffel':
      return { bg: EMAIL_COLORS.ink, color: EMAIL_COLORS.paper }
    case 'scarcity':
      return { bg: EMAIL_COLORS.warning, color: EMAIL_COLORS.ink }
    default:
      return { bg: EMAIL_COLORS.ink, color: EMAIL_COLORS.paper }
  }
}

function ProductCard({
  product,
  locale,
}: {
  product: SpringDropProduct
  locale: 'nl' | 'en'
}) {
  const b = badgeColors(product.badgeTone)
  const linkLabel = locale === 'en' ? 'Shop now' : 'Bekijken'

  return (
    <Link
      href={product.url}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{
          backgroundColor: EMAIL_COLORS.productBg,
          border: `1px solid ${EMAIL_COLORS.border}`,
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: 0 }}>
              <Img
                src={product.imageUrl}
                alt={product.name}
                width="558"
                height="380"
                className="mose-product-img mose-spring-product-img"
                style={{
                  width: '100%',
                  height: '380px',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            </td>
          </tr>
          <tr>
            <td
              className="mose-spring-product-pad"
              style={{ padding: '22px 24px 26px 24px' }}
            >
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tbody>
                  <tr>
                    <td valign="top" style={{ paddingRight: '12px' }}>
                      <div
                        className="mose-spring-product-name"
                        style={{
                          fontFamily: EMAIL_FONTS.display,
                          fontSize: '24px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: EMAIL_COLORS.ink,
                          lineHeight: 1.1,
                        }}
                      >
                        {product.name}
                      </div>
                      {product.subtitle ? (
                        <div
                          style={{
                            marginTop: '6px',
                            fontFamily: EMAIL_FONTS.body,
                            fontSize: '12px',
                            color: EMAIL_COLORS.textMuted,
                            lineHeight: 1.5,
                          }}
                        >
                          {product.subtitle}
                        </div>
                      ) : null}
                    </td>
                    <td
                      valign="top"
                      align="right"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <div
                        className="mose-spring-product-price"
                        style={{
                          fontFamily: EMAIL_FONTS.body,
                          fontSize: '16px',
                          fontWeight: 800,
                          color: EMAIL_COLORS.ink,
                          lineHeight: 1.1,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: product.priceLabel,
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ paddingTop: '16px' }}>
                      <table
                        role="presentation"
                        width="100%"
                        cellPadding={0}
                        cellSpacing={0}
                        border={0}
                      >
                        <tbody>
                          <tr>
                            <td valign="middle" align="left">
                              <span
                                className="mose-spring-product-badge"
                                style={{
                                  display: 'inline-block',
                                  backgroundColor: b.bg,
                                  color: b.color,
                                  fontFamily: EMAIL_FONTS.body,
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  letterSpacing: '0.18em',
                                  textTransform: 'uppercase',
                                  padding: '7px 12px',
                                  lineHeight: 1.1,
                                }}
                              >
                                {product.badge}
                              </span>
                            </td>
                            <td
                              valign="middle"
                              align="right"
                              style={{
                                fontFamily: EMAIL_FONTS.body,
                                fontSize: '12px',
                                fontWeight: 800,
                                color: EMAIL_COLORS.primary,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {linkLabel}{' '}
                              <span
                                style={{
                                  fontWeight: 400,
                                  fontFamily: EMAIL_FONTS.body,
                                }}
                              >
                                {'\u00A0→'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </Link>
  )
}

export default function SpringDrop1LaunchEmail({
  email,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  unsubscribeUrl,
  products,
  shopUrl,
  heroImageUrl,
  heroAlt,
}: SpringDrop1LaunchProps) {
  const isNl = locale !== 'en'
  const lang: 'nl' | 'en' = isNl ? 'nl' : 'en'

  const preview = isNl
    ? 'Onze eerste collectie staat klaar. Gemaakt in Groningen, eerlijk geprijsd.'
    : 'Our first collection is live. Made in Groningen, fairly priced.'

  const headline = isNl ? 'HET IS LENTE.' : 'IT IS SPRING.'
  const headlineSub = isNl ? 'TIJD VOOR JE MOSE.' : 'TIME FOR YOUR MOSE.'

  const greeting = isNl ? 'Hé,' : 'Hi,'
  const introLine1 = isNl
    ? 'In februari schreef je je in om als eerste te horen wanneer onze webshop live zou gaan. Die tijd is nu.'
    : 'In February you signed up to be the first to know when our shop would go live. That time is now.'
  const introLine2 = isNl
    ? 'Hieronder zie je drie stukken die we in Groningen hebben gemaakt. Eerlijke prijzen, gratis verzending en 30 dagen retour.'
    : 'Below are three pieces we made in Groningen. Fair pricing, free shipping and 30 day returns.'

  const trustItems = isNl
    ? ['Gratis verzending', '30 dagen retour', 'Ophalen in Groningen']
    : ['Free shipping', '30 day returns', 'Pickup in Groningen']

  const ctaLabel = isNl
    ? `Bekijk de hele collectie\u00A0\u00A0→`
    : `View the full collection\u00A0\u00A0→`

  return (
    <EmailShell locale={locale} preview={preview}>
      <EmailHeader siteUrl={siteUrl} status="SPRING DROP" />

      {/* Hero met foto + tekstblok onder de foto in dezelfde zwarte module */}
      <Section style={{ paddingBottom: '12px' }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: EMAIL_COLORS.ink }}
        >
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>
                <Img
                  src={heroImageUrl}
                  alt={
                    heroAlt ||
                    (isNl
                      ? 'MOSE-stukken in Groningen, lente 2026'
                      : 'MOSE pieces in Groningen, spring 2026')
                  }
                  width="600"
                  height={String(HERO_FRAME_HEIGHT)}
                  className="mose-product-img mose-spring-hero"
                  style={{
                    width: '100%',
                    height: `${HERO_FRAME_HEIGHT}px`,
                    objectFit: 'cover',
                    objectPosition: 'center 45%',
                    display: 'block',
                  }}
                />
              </td>
            </tr>
            <tr>
              <td
                align="left"
                className="mose-pad-lg mose-spring-hero-pad"
                style={{ padding: '34px 36px 38px 36px' }}
              >
                <div style={{ marginBottom: '18px' }}>
                  <span style={heroOverlayBadge}>Spring Drop 2026</span>
                </div>
                <h1 className="mose-hero-title" style={wordmarkStyle}>
                  {headline}
                </h1>
                <h2
                  className="mose-hero-title"
                  style={{
                    ...wordmarkStyle,
                    marginTop: '4px',
                    color: EMAIL_COLORS.primary,
                  }}
                >
                  {headlineSub}
                </h2>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Persoonlijke intro */}
      <EmailModule padding="32px 32px 28px 32px">
        <EmailParagraph mb={14}>{greeting}</EmailParagraph>
        <EmailParagraph>{introLine1}</EmailParagraph>
        <EmailParagraph mb={0}>{introLine2}</EmailParagraph>
      </EmailModule>

      {/* Drie producten als stack van full-width cards */}
      {products.slice(0, 3).map((p, idx) => (
        <EmailModule
          key={`${p.name}-${idx}`}
          padding="20px 20px"
          background={EMAIL_COLORS.paper}
        >
          <ProductCard product={p} locale={lang} />
        </EmailModule>
      ))}

      {/* CTA + trust */}
      <EmailCta
        href={shopUrl}
        label={ctaLabel}
        variant="teal"
        footnote={
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
                  align="center"
                  className="mose-spring-trust"
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: EMAIL_COLORS.textSubtle,
                    fontWeight: 700,
                    padding: '14px 16px 6px 16px',
                    lineHeight: 1.7,
                  }}
                >
                  {trustItems.map((item, i) => (
                    <span
                      key={item}
                      className="mose-spring-trust-item"
                      style={{ display: 'inline-block' }}
                    >
                      {item}
                      {i < trustItems.length - 1 ? (
                        <span
                          className="mose-spring-trust-sep"
                          style={{ padding: '0 10px', color: EMAIL_COLORS.textFaint }}
                        >
                          ·
                        </span>
                      ) : null}
                    </span>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        }
      />

      <EmailModule padding="20px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph tone="muted" size={12} mb={0} align="center">
          {isNl
            ? `Je ontvangt deze mail omdat je je in februari opgaf met ${email}.`
            : `You are receiving this email because you signed up in February with ${email}.`}
        </EmailParagraph>
      </EmailModule>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
        unsubscribeUrl={unsubscribeUrl}
        unsubscribePrompt={
          isNl
            ? 'Geen MOSE-mails meer ontvangen?'
            : 'No more MOSE emails?'
        }
        unsubscribeLabel={isNl ? 'Uitschrijven' : 'Unsubscribe'}
      />
    </EmailShell>
  )
}

export type { SpringDropProduct, SpringDrop1LaunchProps }
