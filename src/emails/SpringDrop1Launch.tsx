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
  /** Producten in het grid (Tee, hoodie, sweater); volgorde = render-volgorde. */
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
        className="mose-campaign-product-card"
        style={{
          backgroundColor: EMAIL_COLORS.productBg,
          padding: '12px 12px 18px 12px',
          border: `1px solid ${EMAIL_COLORS.border}`,
          boxSizing: 'border-box',
        }}
      >
        <Img
          src={product.imageUrl}
          alt={product.name}
          width="260"
          height="260"
          className="mose-campaign-grid-img"
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
  const gridProducts = products.slice(0, 3)
  const isNl = locale !== 'en'
  const preview = isNl
    ? 'Irma & Rick uit Groningen: lente-items, sale op hoodie en sweater, staffel op de Tee.'
    : 'Irma & Rick from Groningen: spring items, sale on hoodie and sweater, bundle pricing on the Tee.'

  const headline = isNl ? 'HET IS LENTE.' : 'IT IS SPRING.'
  const headlineSub = isNl ? 'TIJD VOOR JE MOSE.' : 'TIME FOR YOUR MOSE.'

  const introParagraphs = isNl
    ? [
        'Misschien ken je ons al een beetje, of misschien is dit je eerste mail van ons. In beide gevallen: leuk dat je meeleest!',
        'Wij zijn Irma en Rick, de oprichters van MOSE. We wonen in Groningen met onze katten Bob en Marley en onze daggoe Guus. MOSE is vernoemd naar onze overleden poes Mosie, oftewel Moos. 🐱',
        'We zijn begonnen met MOSE omdat fast fashion ons mateloos irriteerde. T-shirts die na een paar keer wassen hun vorm verliezen, daar werden we gek van. Daarom maken we kleding die lang meegaat. Eerlijk, lokaal en gemaakt in een atelier in Groningen.',
        'Hieronder vind je onze 3 items voor het voorjaar: de Tee, de Hoodie en de Sweater. De hoodie en sweater staan nu in de lente-sale. Op de Tee krijg je automatisch staffelkorting in je winkelmand. Des te meer je toevoegt, des te hoger de korting. Nice!',
        'We rekenen nooit verzendkosten, en als het niet past mag je binnen 30 dagen ruilen of retourneren.',
      ]
    : [
        'Maybe you already know us a little, or maybe this is your first email from us. Either way: thanks for reading along!',
        'We are Irma and Rick, the founders of MOSE. We live in Groningen with our cats Bob and Marley and our dog Guus. MOSE is named after our late cat Mosie, or Moos. 🐱',
        'We started MOSE because fast fashion drove us up the wall. T-shirts that lost their shape after a few washes — that drove us crazy. So we make clothes that last. Honest, local, made in a studio in Groningen.',
        'Below you will find our 3 items for spring: the Tee, the Hoodie and the Sweater. The hoodie and sweater are now in the spring sale. On the Tee you get automatic tiered discount in your cart. The more you add, the higher the discount. Nice!',
        'We never charge shipping, and if it does not fit you can exchange or return within 30 days.',
      ]
  const trustLineParts = isNl
    ? ['Gratis verzending', '30 dagen retour', 'Ophalen in Groningen']
    : ['Free shipping', '30 day returns', 'Pickup in Groningen']

  const ctaLabel = isNl
    ? `Naar de shop  →`
    : `Go to the shop  →`

  const sectionTitle = isNl ? 'Drie items' : 'Three items'
  const sectionMeta = isNl ? 'Gemaakt in Groningen' : 'Made in Groningen'

  const firstPair = gridProducts.slice(0, 2)
  const third = gridProducts[2] ?? null

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
                      ? 'Drie MOSE-items in Groningen, lente 2026'
                      : 'Three MOSE items in Groningen, spring 2026')
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
        {introParagraphs.map((text, i) => (
          <EmailParagraph
            key={i}
            mt={i === 0 ? undefined : 14}
            mb={i === introParagraphs.length - 1 ? 0 : undefined}
          >
            {text}
          </EmailParagraph>
        ))}
      </EmailModule>

      {/* Productgrid: 2 + 1 gecentreerd (Tee / hoodie / sweater) */}
      <EmailModule padding="26px 22px">
        <EmailSectionTitle title={sectionTitle} meta={sectionMeta} />
        <div style={{ marginTop: '20px' }}>
          {firstPair.length > 0 ? (
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              style={{ marginTop: 0 }}
            >
              <tbody>
                <tr>
                  <td
                    valign="top"
                    width="48%"
                    className="mose-mobile-stack mose-campaign-stack-td"
                    style={{ paddingRight: '8px', verticalAlign: 'top' }}
                  >
                    {firstPair[0] ? <ProductCell product={firstPair[0]} /> : null}
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
                    className="mose-mobile-stack mose-mobile-stack-last mose-campaign-stack-td"
                    style={{ paddingLeft: '8px', verticalAlign: 'top' }}
                  >
                    {firstPair[1] ? <ProductCell product={firstPair[1]} /> : null}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {third ? (
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              style={{ marginTop: 16 }}
            >
              <tbody>
                <tr>
                  <td align="center" style={{ padding: 0 }}>
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      border={0}
                      style={{ maxWidth: '278px', width: '100%', margin: '0 auto' }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <ProductCell product={third} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}
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
            ? `Je krijgt deze mail omdat je je bij ons hebt aangemeld met ${email}.`
            : `You are receiving this email because you signed up with ${email}.`}
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
