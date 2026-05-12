import { Img, Link, Section } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailModule from './components/EmailModule'
import EmailParagraph from './components/EmailParagraph'
import EmailSectionTitle from './components/EmailSectionTitle'
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
}

interface SpringDrop1LaunchProps {
  /** E-mail van de ontvanger (voor de footnote) */
  email: string
  /** UTM-suffix wordt los toegevoegd aan elke link, want we kennen het slug-pad */
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  unsubscribeUrl?: string
  /** Vier producten in de 2x2 grid; volgorde = render-volgorde. */
  products: SpringDropProduct[]
  /** URL voor de "Bekijk de hele collectie" CTA, inclusief UTMs. */
  shopUrl: string
  /** Hero-image (lookbook hoofdstuk 1) */
  heroImageUrl: string
  /** Alt text voor hero (locale-afhankelijk) */
  heroAlt?: string
}

const HERO_FRAME_HEIGHT = 320 // visueel sterk maar niet teveel data

const wordmarkStyle = {
  fontFamily: EMAIL_FONTS.display,
  textTransform: 'uppercase' as const,
  fontSize: '40px',
  lineHeight: 1,
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

const trustStripStyle = {
  fontFamily: EMAIL_FONTS.body,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: EMAIL_COLORS.textSubtle,
  fontWeight: 700,
  textAlign: 'center' as const,
  padding: '14px 16px 6px 16px',
  lineHeight: 1.7,
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

function ProductCell({ product }: { product: SpringDropProduct }) {
  const b = badgeColors(product.badgeTone)
  return (
    <Link
      href={product.url}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div
        style={{
          backgroundColor: EMAIL_COLORS.productBg,
          padding: '10px 10px 18px 10px',
          border: `1px solid ${EMAIL_COLORS.border}`,
        }}
      >
        <Img
          src={product.imageUrl}
          alt={product.name}
          width="260"
          height="260"
          className="mose-product-img"
          style={{
            width: '100%',
            height: '260px',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
        <div
          style={{
            padding: '14px 6px 0 6px',
          }}
        >
          <div
            style={{
              fontFamily: EMAIL_FONTS.display,
              fontSize: '17px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: EMAIL_COLORS.ink,
              lineHeight: 1.15,
              marginBottom: '6px',
            }}
          >
            {product.name}
          </div>
          <div
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: '13px',
              fontWeight: 700,
              color: EMAIL_COLORS.text,
              marginBottom: '10px',
            }}
          >
            {product.priceLabel}
          </div>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: b.bg,
              color: b.color,
              fontFamily: EMAIL_FONTS.body,
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '6px 10px',
              lineHeight: 1.1,
            }}
          >
            {product.badge}
          </span>
        </div>
      </div>
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
  const preview = isNl
    ? 'De volledige collectie staat klaar. Gemaakt in Groningen, eerlijk geprijsd.'
    : 'The full collection is live. Made in Groningen, fairly priced.'

  const headline = isNl ? 'HET IS LENTE.' : 'IT IS SPRING.'
  const headlineSub = isNl ? 'TIJD VOOR JE MOSE.' : 'TIME FOR YOUR MOSE.'

  const introLine1 = isNl
    ? 'Drie maanden geleden zei je dat je dit wilde meemaken. We zijn rond.'
    : 'Three months ago you said you wanted in. We are ready.'
  const introLine2 = isNl
    ? 'Hieronder zie je wat we maakten in Groningen, in vier stukken die je het hele voorjaar draagt.'
    : 'Below is what we made in Groningen: four pieces to wear all spring.'
  const trustLineParts = isNl
    ? ['Gratis verzending', '30 dagen retour', 'Ophalen in Groningen']
    : ['Free shipping', '30 day returns', 'Pickup in Groningen']

  const ctaLabel = isNl
    ? `Bekijk de hele collectie  →`
    : `View the full collection  →`

  const sectionTitle = isNl ? 'Vier stukken' : 'Four pieces'
  const sectionMeta = isNl ? 'Gemaakt in Groningen' : 'Made in Groningen'

  // 4 -> 2x2 grid
  const rows: SpringDropProduct[][] = []
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2))
  }

  return (
    <EmailShell locale={locale} preview={preview}>
      <EmailHeader siteUrl={siteUrl} status={isNl ? 'SPRING DROP' : 'SPRING DROP'} />

      {/* Hero met foto + overlay */}
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
                      ? 'Drie MOSE-stukken in Groningen, lente 2026'
                      : 'Three MOSE pieces in Groningen, spring 2026')
                  }
                  width="600"
                  height={String(HERO_FRAME_HEIGHT)}
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
                className="mose-pad-lg"
                style={{ padding: '32px 36px 36px 36px' }}
              >
                <div style={{ marginBottom: '18px' }}>
                  <span style={heroOverlayBadge}>
                    {isNl ? 'Spring Drop 2026' : 'Spring Drop 2026'}
                  </span>
                </div>
                <h1
                  className="mose-hero-title"
                  style={{
                    ...wordmarkStyle,
                    fontSize: '54px',
                    lineHeight: 0.95,
                  }}
                >
                  {headline}
                </h1>
                <h2
                  className="mose-hero-title"
                  style={{
                    ...wordmarkStyle,
                    fontSize: '54px',
                    lineHeight: 0.95,
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

      <EmailModule padding="28px 30px">
        <EmailParagraph>{introLine1}</EmailParagraph>
        <EmailParagraph>{introLine2}</EmailParagraph>
        <EmailParagraph mt={6} mb={0}>
          {isNl
            ? 'Eerlijke prijzen, gratis verzending, 30 dagen retour.'
            : 'Fair pricing, free shipping, 30 day returns.'}
        </EmailParagraph>
      </EmailModule>

      {/* 2x2 product grid */}
      <EmailModule padding="26px 22px">
        <EmailSectionTitle title={sectionTitle} meta={sectionMeta} />
        <div style={{ marginTop: '20px' }}>
          {rows.map((row, idx) => (
            <table
              key={idx}
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              style={{ marginTop: idx === 0 ? 0 : 14 }}
            >
              <tbody>
                <tr>
                  <td
                    valign="top"
                    width="48%"
                    className="mose-mobile-stack"
                    style={{ paddingRight: '8px' }}
                  >
                    {row[0] ? <ProductCell product={row[0]} /> : null}
                  </td>
                  <td
                    width="4%"
                    className="mose-gutter"
                    style={{ fontSize: 0, lineHeight: 0 }}
                  >
                    &nbsp;
                  </td>
                  <td
                    valign="top"
                    width="48%"
                    className="mose-mobile-stack mose-mobile-stack-last"
                    style={{ paddingLeft: '8px' }}
                  >
                    {row[1] ? <ProductCell product={row[1]} /> : null}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      </EmailModule>

      <EmailCta
        href={shopUrl}
        label={ctaLabel}
        variant="teal"
        footnote={
          <div style={trustStripStyle}>{trustLineParts.join('  ·  ')}</div>
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
