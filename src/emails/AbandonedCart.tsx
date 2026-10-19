import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailItemRow from './components/EmailItemRow'
import EmailBreakdown from './components/EmailBreakdown'
import EmailCta from './components/EmailCta'
import EmailCallout from './components/EmailCallout'
import EmailShopMore from './components/EmailShopMore'
import EmailParagraph from './components/EmailParagraph'
import { EMAIL_COLORS, EMAIL_FONTS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'
import { isAltijdGratisUitWaarden } from '@/lib/verzendbelofte'

interface CartItem {
  name: string
  price: number
  imageUrl?: string
  quantity: number
  /** Maat en kleur horen hier thuis. Zonder die twee weet een klant niet
   *  waar de mail over gaat: bij kleding is "een hoodie" geen product maar
   *  een categorie. */
  size?: string
  color?: string
}

interface AbandonedCartEmailProps {
  customerName: string
  items: CartItem[]
  /**
   * Het opgeslagen totaal van de bestelling. Wordt alleen nog gebruikt als er
   * geen regels en geen subtotaal zijn: de mail rekent het te betalen bedrag
   * zelf uit met de verzendregels van vandaag, omdat een oudere bestelling een
   * verouderd totaal met zich meedraagt.
   */
  totalAmount: number
  cartUrl: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  /** Uit site_settings; de callout belooft anders gratis verzending zonder
   *  minimum, wat niet klopt zodra er een drempel is ingesteld. */
  freeShippingThreshold?: number
  shippingCost?: number
  /** Waarde van de artikelen zonder verzendkosten. */
  subtotal?: number
  /** Kortingen op de bestelling bij elkaar (code, loyaliteit, cadeaukaart). */
  discount?: number
  /** Uit site_settings, voor de retourbelofte onder de knop. */
  returnDays?: number
  /** Zichtbare afmeldlink. De List-Unsubscribe-kop alleen is te weinig:
   *  dit is een marketingmail en die hoort een uitgang in beeld te hebben. */
  unsubscribeUrl?: string
}

/**
 * Drie korte geruststellingen naast elkaar.
 *
 * Bewust niet EmailMetaGrid: die zet zijn waarde in 26px displayletter met
 * `white-space: nowrap`, gemaakt voor een bestelnummer of een bedrag. Met
 * "Atelier in Groningen" erin dwingt die regel de hele mail breder dan de
 * 600 pixels waar een mailvenster op rekent, en dan loopt alles uit het lood.
 * Hier staat gewone bodytekst die netjes afbreekt.
 */
function Vertrouwensrij({
  items,
}: {
  items: { label: string; value: string }[]
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{
        border: `2px solid ${EMAIL_COLORS.borderStrong}`,
        backgroundColor: EMAIL_COLORS.paper,
        // Zonder deze twee telt de rand bij de 100% breedte op en steekt de
        // mail een paar pixels buiten het venster uit.
        boxSizing: 'border-box',
        borderCollapse: 'collapse',
      }}
    >
      <tbody>
        <tr>
          {items.map((item, index) => (
            <td
              key={item.label}
              width={`${Math.floor(100 / items.length)}%`}
              valign="top"
              className={`mose-mobile-stack${
                index === items.length - 1 ? ' mose-mobile-stack-last' : ''
              }`}
              style={{
                padding: '16px 14px',
                verticalAlign: 'top',
                borderRight:
                  index === items.length - 1
                    ? 'none'
                    : `2px solid ${EMAIL_COLORS.borderStrong}`,
              }}
            >
              <div
                style={{
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '9px',
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  color: EMAIL_COLORS.textFaint,
                  fontWeight: 800,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  marginTop: '6px',
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: EMAIL_COLORS.ink,
                  lineHeight: 1.35,
                }}
              >
                {item.value}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Bedragen in deze mail, altijd met twee decimalen.
 *
 * Dit stond vanochtend even op de schrijfwijze van de winkel, die ronde
 * bedragen kaal laat staan (€145). Dat is de juiste keuze voor een
 * productprijs op een tegel of een knop, maar niet voor een optelsom. In deze
 * mail staat geen enkele kale productprijs: het zijn allemaal regeltotalen,
 * subtotalen, verzendkosten en eindbedragen. Die horen eruit te zien als
 * bedragen, net als op een bon en net als op het afrekenscherm waar de klant
 * straks uitkomt.
 *
 * Het decimaalteken volgt de taal.
 */
function maakPrijs(amount: number, locale: string) {
  const vast = Number(amount).toFixed(2)
  return locale === 'en' ? `€${vast}` : `€${vast.replace('.', ',')}`
}

/**
 * De herinnering aan een winkelmand die is blijven staan.
 *
 * De opzet volgt de volgorde waarin iemand zo'n mail leest: van wie komt dit,
 * wat had ik ook alweer uitgezocht, wat kost het samen, en wat moet ik nu
 * doen. Wat die vier vragen niet beantwoordt, staat eronder of staat er niet.
 *
 * Twee dingen zijn bewust zo gedaan:
 *
 *  1. De regels tonen maat en kleur. Dat is waar iemand op terugklikt, en het
 *     is ook precies de twijfel die hem tegenhield.
 *  2. Het verzendregeltje rekent voor wat er nog aan de drempel ontbreekt.
 *     "Gratis verzending vanaf honderd euro" is een mededeling; "nog
 *     vijfentwintig euro" is een bedrag waar iemand iets mee kan.
 */
export default function AbandonedCartEmail({
  customerName,
  items,
  totalAmount,
  cartUrl,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  freeShippingThreshold = 100,
  shippingCost = 6.95,
  subtotal,
  discount = 0,
  returnDays = 30,
  unsubscribeUrl,
}: AbandonedCartEmailProps) {
  const formatPrice = (bedrag: number) => maakPrijs(bedrag, locale)

  const visibleItems = items.slice(0, 3)
  const hiddenCount = items.length > 3 ? items.length - 3 : 0
  const aantalStuks = items.reduce((som, item) => som + (item.quantity || 1), 0)

  // Alleen de voornaam. "Beste Leo Wassing" leest als een aanmaning.
  const voornaam = (customerName || '').trim().split(/\s+/)[0] || customerName

  const artikelbedrag =
    typeof subtotal === 'number'
      ? subtotal
      : items.length
        ? items.reduce((som, item) => som + item.price * (item.quantity || 1), 0)
        : totalAmount

  // De verzendkosten worden hier opnieuw bepaald in plaats van overgenomen
  // uit de bestelling. Een mand van afgelopen zaterdag is aangemaakt toen de
  // drempel nog op 150 stond; die bestelling draagt 6,95 aan verzendkosten mee
  // terwijl de klant bij terugkomst gratis verzending krijgt. Wat in deze mail
  // staat, moet hetzelfde zijn als wat straks op het afrekenscherm staat.
  const verzendingGratis = artikelbedrag - discount >= freeShippingThreshold
  const verzendkosten = verzendingGratis ? 0 : shippingCost
  const teBetalen = Math.max(0, artikelbedrag - discount + verzendkosten)
  const altijdGratis = isAltijdGratisUitWaarden(freeShippingThreshold, shippingCost)
  const tekortVoorGratis = altijdGratis
    ? 0
    : Math.max(0, freeShippingThreshold - (artikelbedrag - discount))

  const regel = (item: CartItem) => {
    const delen: string[] = []
    if (item.size) delen.push(`${t('abandonedCart.size') || 'Maat'} ${item.size}`)
    if (item.color) delen.push(item.color)
    delen.push(`${t('abandonedCart.quantity') || 'Aantal'} ${item.quantity}`)
    return delen.join('  ·  ')
  }

  return (
    <EmailShell
      locale={locale}
      preview={
        t('abandonedCart.preheader', { customerName: voornaam }) ||
        `${voornaam}, je winkelmand staat nog klaar.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('abandonedCart.status') || 'Winkelmand'} />

      <EmailHero
        badge={t('abandonedCart.badge') || 'Nog van jou'}
        title={t('abandonedCart.heroTitle') || 'Niet\nvergeten.'}
        subtitle={
          t('abandonedCart.subtitle', { customerName: voornaam }) ||
          `${voornaam}, je winkelmand staat nog klaar.`
        }
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t(
            aantalStuks === 1
              ? 'abandonedCart.description'
              : 'abandonedCart.descriptionPlural',
            { count: aantalStuks }
          ) ||
            'Je bent bij het afrekenen gestopt. Alles staat nog zoals je het had klaargelegd, dus je hoeft niet opnieuw te beginnen.'}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('abandonedCart.itemsTitle') || 'In je winkelmand'}
          meta={`${aantalStuks}× ${t('abandonedCart.itemsMeta') || 'artikel'}`}
        />
        <div style={{ marginTop: '18px' }}>
          {visibleItems.map((item, index) => (
            <EmailItemRow
              key={index}
              name={item.name}
              meta={regel(item)}
              price={formatPrice(item.price * item.quantity)}
              imageUrl={item.imageUrl}
              siteUrl={siteUrl}
              last={index === visibleItems.length - 1 && hiddenCount === 0}
            />
          ))}
          {hiddenCount > 0 ? (
            <EmailParagraph tone="muted" align="center" mt={10} mb={0}>
              {t('abandonedCart.moreItems', { count: hiddenCount }) ||
                `+ nog ${hiddenCount} artikel`}
            </EmailParagraph>
          ) : null}
        </div>
      </EmailModule>

      {/* De optelsom hoort compleet te zijn. Eerder stond hier alleen een
          "Totaal" dat zeven euro hoger lag dan de artikelen bij elkaar, zonder
          dat ergens stond waar dat verschil vandaan kwam. */}
      <EmailModule padding="24px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailBreakdown
          rows={[
            {
              label: t('abandonedCart.subtotal') || 'Artikelen',
              value: formatPrice(artikelbedrag),
            },
            ...(discount > 0
              ? [
                  {
                    label: t('abandonedCart.discount') || 'Korting',
                    value: `- ${formatPrice(discount)}`,
                    tone: 'success' as const,
                  },
                ]
              : []),
            {
              label: t('abandonedCart.shipping') || 'Verzending',
              value: verzendingGratis
                ? t('abandonedCart.shippingFree') || 'Gratis'
                : formatPrice(verzendkosten),
              tone: verzendingGratis ? ('success' as const) : ('normal' as const),
            },
            {
              label: t('abandonedCart.total') || 'Totaal',
              value: formatPrice(teBetalen),
              strong: true,
              tone: 'highlight' as const,
            },
          ]}
        />
      </EmailModule>

      <EmailCta
        href={cartUrl}
        label={`${t('abandonedCart.ctaButton') || 'Bestelling afronden'}  →`}
        footnote={
          t('abandonedCart.ctaFootnote') ||
          'Je gegevens staan al ingevuld. Je hoeft alleen nog te betalen.'
        }
      />

      {/* Een drempel noemen is informatie. Het verschil noemen is een reden. */}
      <EmailCallout
        tone="success"
        title={
          altijdGratis || verzendingGratis
            ? t('abandonedCart.freeShippingReachedTitle') ||
              'De verzending is gratis'
            : t('abandonedCart.freeShippingTitle', {
                amount: formatPrice(tekortVoorGratis),
              }) || `Nog ${formatPrice(tekortVoorGratis)} tot gratis verzending`
        }
      >
        {altijdGratis
          ? t('abandonedCart.freeShippingAltijd') || 'Altijd gratis verzending!'
          : verzendingGratis
          ? t('abandonedCart.freeShippingReached', {
              threshold: freeShippingThreshold,
            }) ||
            `Je zit boven de €${freeShippingThreshold}, dus je betaalt geen verzendkosten.`
          : t('abandonedCart.freeShipping', {
              amount: formatPrice(tekortVoorGratis),
              threshold: freeShippingThreshold,
              shippingCost: formatPrice(verzendkosten),
            }) ||
            `Vanaf €${freeShippingThreshold} verzenden we gratis. Nu betaal je ${formatPrice(verzendkosten)}.`}
      </EmailCallout>

      {/* De drie bezwaren die bij kleding online het vaakst de reden zijn om
          niet af te rekenen: past het, hoe lang duurt het, en waar komt het
          vandaan. */}
      <EmailModule padding="26px 30px">
        <Vertrouwensrij
          items={[
            {
              label: t('abandonedCart.trustReturnLabel') || 'Retour',
              value:
                t('abandonedCart.trustReturnValue', { days: returnDays }) ||
                `${returnDays} dagen bedenktijd`,
            },
            {
              label: t('abandonedCart.trustDeliveryLabel') || 'Levering',
              value:
                t('abandonedCart.trustDeliveryValue') || '1 tot 2 werkdagen',
            },
            {
              label: t('abandonedCart.trustOriginLabel') || 'Herkomst',
              value: t('abandonedCart.trustOriginValue') || 'Atelier in Groningen',
            },
          ]}
        />
        <EmailParagraph tone="muted" mt={18} mb={0}>
          {t('abandonedCart.help', { email: contactEmail }) ||
            `Twijfel je over je maat? Mail ${contactEmail} en we denken met je mee.`}
        </EmailParagraph>
      </EmailModule>

      <EmailShopMore siteUrl={siteUrl} locale={locale} />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
        unsubscribeUrl={unsubscribeUrl}
        unsubscribePrompt={
          t('abandonedCart.unsubscribePrompt') ||
          'Geen herinneringen meer ontvangen?'
        }
        unsubscribeLabel={t('abandonedCart.unsubscribeLabel') || 'Uitschrijven'}
      />
    </EmailShell>
  )
}
