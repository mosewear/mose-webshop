import { Section } from '@react-email/components'
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

interface SpringDrop3FoundersEmailProps {
  email: string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  unsubscribeUrl?: string
  /**
   * Persoonlijke promo-code (typisch WELCOME10-XXXXXX). Wanneer er geen
   * persoonlijke code is, geef dan de globale fallback `SPRING10` mee.
   */
  promoCode: string
  /** Vervaldatum, geformatteerd in NL door caller (bv. "31 juli 2026") */
  promoExpiryLabel: string
  /** "Verzilver mijn code" CTA-URL met UTMs (typisch /product/mose-tee) */
  ctaUrl: string
  /** Aantal verzonden orders sinds launch (voor sociaal bewijs in de tekst) */
  shippedOrders?: number
}

export default function SpringDrop3FoundersEmail({
  email,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  unsubscribeUrl,
  promoCode,
  promoExpiryLabel,
  ctaUrl,
  shippedOrders = 33,
}: SpringDrop3FoundersEmailProps) {
  const isNl = locale !== 'en'

  const preview = isNl
    ? `Eenmalig 10% korting, geldig op de Tee en het Horloge. Daarna is hij weg.`
    : `One-off 10% off, valid on the Tee and the Watch. Then it is gone.`

  const heroEyebrow = isNl ? 'Persoonlijke note' : 'Personal note'
  const heroTitle = isNl
    ? 'JE MOSE-CODE\nVERLOOPT.'
    : 'YOUR MOSE CODE\nIS EXPIRING.'

  const greeting = isNl ? 'Hi,' : 'Hi,'
  const par1 = isNl
    ? 'Dit is Irma en Rick. In februari heb je je opgegeven om als eerste mee te krijgen wanneer wij live zouden zijn.'
    : 'This is Irma and Rick. In February you signed up to be the first to know when we would go live.'
  const par2 = isNl
    ? `Sindsdien hebben we ${shippedOrders} orders verstuurd naar mensen die voor het eerst MOSE droegen.`
    : `Since then we shipped ${shippedOrders} orders to people who wore MOSE for the first time.`
  const par3 = isNl
    ? `Bij je welkomstmail zat een persoonlijke 10%-code. Die heb je nog niet gebruikt. Hij is eenmalig en geldig tot ${promoExpiryLabel}. Daarna verloopt hij. We sturen hierna geen reminder meer.`
    : `Your welcome email included a personal 10% code. You have not used it yet. It is one-off and valid until ${promoExpiryLabel}. After that it expires. We will not send another reminder.`
  const par4 = isNl
    ? 'Vragen over een maat of model? Antwoord op deze mail, dan helpen we je vandaag nog.'
    : 'Questions about a size or fit? Just reply to this email and we will help you today.'

  const sign = isNl ? 'Irma en Rick' : 'Irma and Rick'

  const codeLabel = isNl ? 'Jouw code' : 'Your code'
  const codeMeta = isNl
    ? `10% korting, eenmalig, geldig tot ${promoExpiryLabel}. Niet combineerbaar met sale-items.`
    : `10% off, one-off, valid until ${promoExpiryLabel}. Cannot be combined with sale items.`

  const ctaLabel = isNl ? 'Verzilver mijn code  →' : 'Use my code  →'

  const psLine = isNl
    ? 'PS: de code werkt op de Tee (49,95 → 44,96) en het Horloge (249,95 → 224,96). De Hoodie en Sweater staan al in de lente-sale en zijn daarmee uitgesloten, maar die prijzen blijven natuurlijk gewoon staan.'
    : 'PS: the code works on the Tee (49.95 → 44.96) and the Watch (249.95 → 224.96). The Hoodie and Sweater are already in the spring sale and therefore excluded, but those prices stay as they are.'

  return (
    <EmailShell locale={locale} preview={preview}>
      <EmailHeader siteUrl={siteUrl} status="SPRING DROP" />

      {/* Sober hero op wit */}
      <Section style={{ paddingBottom: '12px' }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: EMAIL_COLORS.paper }}
        >
          <tbody>
            <tr>
              <td
                align="left"
                className="mose-pad-lg"
                style={{ padding: '44px 36px 28px 36px' }}
              >
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: EMAIL_COLORS.primary,
                    fontWeight: 800,
                    marginBottom: '14px',
                  }}
                >
                  {heroEyebrow}
                </div>
                <h1
                  className="mose-hero-title"
                  style={{
                    margin: 0,
                    fontFamily: EMAIL_FONTS.display,
                    fontSize: '52px',
                    lineHeight: 0.95,
                    letterSpacing: '-0.01em',
                    color: EMAIL_COLORS.ink,
                    textTransform: 'uppercase',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: heroTitle.replace(/\n/g, '<br/>'),
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <EmailModule padding="28px 32px">
        <EmailParagraph mb={14}>{greeting}</EmailParagraph>
        <EmailParagraph>{par1}</EmailParagraph>
        <EmailParagraph>{par2}</EmailParagraph>
        <EmailParagraph>{par3}</EmailParagraph>
        <EmailParagraph mb={20}>{par4}</EmailParagraph>
        <EmailParagraph
          mb={0}
          tone="ink"
          size={14}
        >
          <strong style={{ fontWeight: 700 }}>{sign}</strong>
        </EmailParagraph>
      </EmailModule>

      {/* Code-blok (donker, opvallend) */}
      <EmailModule padding="34px 24px" background={EMAIL_COLORS.ink} align="center">
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '10px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.primary,
            fontWeight: 800,
            marginBottom: '12px',
          }}
        >
          {codeLabel}
        </div>
        <div
          style={{
            fontFamily: EMAIL_FONTS.display,
            fontSize: '40px',
            color: EMAIL_COLORS.paper,
            letterSpacing: '0.18em',
            lineHeight: 1,
            wordBreak: 'break-all',
          }}
        >
          {promoCode}
        </div>
        <div
          style={{
            marginTop: '14px',
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            color: EMAIL_COLORS.textSubtle,
            lineHeight: 1.6,
            maxWidth: '380px',
            margin: '14px auto 0 auto',
          }}
        >
          {codeMeta}
        </div>
      </EmailModule>

      <EmailCta
        href={ctaUrl}
        label={ctaLabel}
        variant="primary"
        footnote={
          <span
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: '12px',
              color: EMAIL_COLORS.textMuted,
              lineHeight: 1.6,
            }}
          >
            {psLine}
          </span>
        }
      />

      <EmailModule padding="20px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph tone="muted" size={12} mb={0} align="center">
          {isNl
            ? `Je ontvangt deze mail omdat je je opgaf met ${email}.`
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
