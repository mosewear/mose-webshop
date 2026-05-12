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
    ? 'Eenmalig 10% op de MOSE Tee (niet op sale). Daarna vervalt je code.'
    : 'One-off 10% on the MOSE Tee (not on sale). Then your code expires.'

  const heroEyebrow = isNl ? 'Even persoonlijk' : 'A quick personal note'
  const heroTitle = isNl
    ? 'JE MOSE-CODE\nLOOPT AF.'
    : 'YOUR MOSE CODE\nIS RUNNING OUT.'

  const greeting = isNl ? 'Hoi,' : 'Hi,'
  const par1 = isNl
    ? 'Wij zijn Irma en Rick. We bouwen MOSE in Groningen: kleding waar we zelf op zitten te wachten, zonder onnodige marketingpraat.'
    : 'We are Irma and Rick. We build MOSE in Groningen: clothing we actually want to wear, without unnecessary marketing talk.'
  const par2 = isNl
    ? `Sinds we live zijn, hebben we al ${shippedOrders} bestellingen de deur uit gedaan. Mensen die voor het eerst iets van ons droegen. Dat voelt nog steeds bijzonder.`
    : `Since we went live, we have shipped ${shippedOrders} orders. People wearing MOSE for the first time. That still feels special.`
  const par3 = isNl
    ? `Bij je aanmelding hoort een persoonlijke code voor 10% korting. Die heb je nog niet gebruikt. Je mag hem één keer gebruiken, tot ${promoExpiryLabel}. Daarna werkt hij niet meer en we sturen geen extra herinnering.`
    : `Your signup came with a personal 10% discount code. You have not used it yet. It is one-time, valid until ${promoExpiryLabel}. After that it stops working and we will not send another reminder.`
  const par4 = isNl
    ? 'Twijfel je over een maat of wil je iets weten over de stof? Antwoord gewoon op deze mail, dan kijken we er vandaag nog naar.'
    : 'Unsure about sizing or curious about the fabric? Just reply to this email and we will look at it today.'

  const sign = isNl ? 'Groetjes, Irma en Rick' : 'Irma and Rick'

  const codeLabel = isNl ? 'Jouw code' : 'Your code'
  const codeMeta = isNl
    ? `10% korting, één keer te gebruiken, geldig tot ${promoExpiryLabel}. Niet te combineren met sale-prijzen (zoals hoodie en sweater in de lente-sale).`
    : `10% off, one-time use, valid until ${promoExpiryLabel}. Cannot be combined with sale pricing (such as the hoodie and sweater in the spring sale).`

  const ctaLabel = isNl ? 'Code gebruiken in de shop  →' : 'Use my code in the shop  →'

  const psLine = isNl
    ? 'PS: met de code betaal je op de MOSE Tee €49,95 minus 10%. Hoodie en sweater staan al met korting in de shop, daar telt deze code niet bovenop. Zo blijft de checkout helder.'
    : 'PS: with the code you pay 10% off the MOSE Tee at €49.95. The hoodie and sweater are already discounted in the shop, so this code does not stack on top. That keeps checkout clear.'

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
