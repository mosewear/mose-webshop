import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCallout from './components/EmailCallout'
import EmailParagraph from './components/EmailParagraph'
import EmailSteps from './components/EmailSteps'
import EmailCta from './components/EmailCta'
import {
  EMAIL_COLORS,
  EMAIL_DEFAULT_CONTACT,
  EMAIL_FONTS,
  EMAIL_SITE_URL,
} from './tokens'

export type ReturnCreatedByAdminLabelMode =
  | 'customer_paid'
  | 'customer_free'
  | 'in_store'
  | 'admin_generated'

interface ReturnCreatedByAdminEmailProps {
  returnNumber: string
  orderNumber: string
  customerName: string
  labelMode: ReturnCreatedByAdminLabelMode
  inStoreState?: 'approved' | 'received'
  returnItems: Array<{
    product_name: string
    size?: string
    color?: string
    quantity: number
  }>
  refundAmount: number
  labelCost: number
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

/** Localised strings for the template, avoiding the need to bloat email-i18n. */
const COPY = {
  nl: {
    status: 'Retour Aangemaakt',
    badgePaid: '● Retour Geregistreerd',
    badgeFree: '● Gratis Retourlabel',
    badgeInStore: '● Retour in Winkel',
    badgeGenerated: '● Retourlabel Klaar',
    heroGreeting: 'Return',
    heroSubtitlePaid: (amount: string) =>
      `We hebben een retour voor je aangemaakt. Voltooi eenmalig de labelbetaling van €${amount} en het retourlabel verschijnt automatisch in je portaal.`,
    heroSubtitleFree:
      'Eenmalig voor jou: gratis retourlabel. Download het label in je klantportaal zodra je klaar bent om te verzenden.',
    heroSubtitleInStoreApproved:
      'Je retour is vooraf geregistreerd. Breng je pakket langs in de winkel en we handelen de rest af.',
    heroSubtitleInStoreReceived:
      'Je retour is geregistreerd vanuit de winkel. We verwerken je refund binnen 3 werkdagen.',
    heroSubtitleGenerated:
      'We hebben een retour voor je aangemaakt en direct het retourlabel klaargezet. Je ontvangt zo een losse mail met de download-link.',
    returnLabel: 'Retour',
    orderLabel: 'Order',
    refundLabel: 'Refund',
    itemsTitle: 'Items in deze retour',
    inStoreTitle: 'Breng langs in de winkel',
    inStoreBody: (address: string) =>
      `Je kunt je retour langsbrengen bij onze winkel op ${address}. Openingstijden op mosewear.com/contact.`,
    freeTitle: 'Gratis retourlabel',
    freeBody:
      'Als kleine extra bieden we je dit retourlabel kosteloos aan. Klik op de knop hieronder om het label aan te maken zodra je klaar bent om te verzenden.',
    paidTitle: 'Actie: betaal het retourlabel',
    paidBody: (amount: string) =>
      `Voltooi je labelbetaling van €${amount} om het retourlabel automatisch te ontvangen. Je refund blijft hierdoor onaangetast.`,
    howTitle: 'Hoe werkt het',
    ctaPaid: 'Label betalen',
    ctaFree: 'Label aanmaken',
    ctaInStore: 'Bekijk mijn retour',
    ctaGenerated: 'Bekijk mijn retour',
    stepsPaid: (amount: string) => [
      'Open je retour in het klantportaal.',
      `Betaal de eenmalige labelkosten van €${amount} met iDEAL of creditcard.`,
      'Zodra je betaling binnen is ontvang je automatisch je retourlabel per mail.',
      'Lever het pakket in bij een PostNL of DHL afleverpunt.',
    ],
    stepsFree: [
      'Open je retour in het klantportaal en klik op "Retourlabel aanmaken".',
      'Print het label en plak het goed zichtbaar op het pakket.',
      'Lever het pakket in bij een PostNL of DHL afleverpunt.',
      'Na ontvangst verwerken we je refund binnen 3 werkdagen.',
    ],
    stepsInStore: (address: string) => [
      'Stop de items in een stevige verpakking, bij voorkeur de originele doos.',
      `Breng het pakket langs bij onze winkel: ${address}.`,
      'Vermeld je retour-nummer aan de balie zodat we je direct kunnen helpen.',
      'Zodra we de items hebben gecontroleerd verwerken we je refund.',
    ],
    stepsInStoreReceived: [
      'We hebben je retour in de winkel ontvangen.',
      'Onze collega controleert de items op schade en volledigheid.',
      'Binnen 3 werkdagen storten we je refund terug op dezelfde betaalmethode.',
    ],
    stepsGenerated: [
      'Download het retourlabel uit de losse label-mail of in je portaal.',
      'Plak het label goed zichtbaar op het pakket.',
      'Lever het pakket in bij een PostNL of DHL afleverpunt.',
      'Na ontvangst verwerken we je refund binnen 3 werkdagen.',
    ],
    footerNote:
      'Heb je vragen over deze retour? Mail ons of bel gerust — we helpen je graag verder.',
    preheader: (nr: string) => `We hebben een retour (#${nr}) voor je aangemaakt.`,
    itemsCount: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
  en: {
    status: 'Return Prepared',
    badgePaid: '● Return Prepared',
    badgeFree: '● Free Return Label',
    badgeInStore: '● In-Store Return',
    badgeGenerated: '● Return Label Ready',
    heroGreeting: 'Return',
    heroSubtitlePaid: (amount: string) =>
      `We\u2019ve set up a return for you. Complete the one-off label payment of €${amount} and your return label will appear in your portal automatically.`,
    heroSubtitleFree:
      'As a small extra we covered the return label cost for you. Open your customer portal and hit "Create label" whenever you\u2019re ready to ship.',
    heroSubtitleInStoreApproved:
      'Your return is pre-registered. Drop the parcel off at our store and we take care of the rest.',
    heroSubtitleInStoreReceived:
      'Your return is logged from in-store. We\u2019ll process your refund within 3 working days.',
    heroSubtitleGenerated:
      'We\u2019ve set up your return and generated the label right away. You\u2019ll receive a separate email with the download link shortly.',
    returnLabel: 'Return',
    orderLabel: 'Order',
    refundLabel: 'Refund',
    itemsTitle: 'Items in this return',
    inStoreTitle: 'Drop off in-store',
    inStoreBody: (address: string) =>
      `You can drop your return at our store at ${address}. Opening hours at mosewear.com/contact.`,
    freeTitle: 'Free return label',
    freeBody:
      'As a small extra the return label is on us. Tap the button below to generate the label whenever you\u2019re ready to ship.',
    paidTitle: 'Action: pay the return label',
    paidBody: (amount: string) =>
      `Complete the €${amount} label payment to receive your return label automatically. Your refund amount is not affected.`,
    howTitle: 'How it works',
    ctaPaid: 'Pay label',
    ctaFree: 'Create label',
    ctaInStore: 'View my return',
    ctaGenerated: 'View my return',
    stepsPaid: (amount: string) => [
      'Open your return in the customer portal.',
      `Pay the one-off €${amount} label fee with iDEAL or card.`,
      'Once paid you\u2019ll receive the return label by email automatically.',
      'Drop the parcel off at a PostNL or DHL pickup point.',
    ],
    stepsFree: [
      'Open your return in the customer portal and tap "Create return label".',
      'Print the label and stick it clearly on the parcel.',
      'Drop the parcel off at a PostNL or DHL pickup point.',
      'Once we receive it, we process your refund within 3 working days.',
    ],
    stepsInStore: (address: string) => [
      'Pack the items in a sturdy box — the original box works great.',
      `Drop the parcel off at our store: ${address}.`,
      'Mention your return number at the counter so we can help you quickly.',
      'Once we\u2019ve checked the items we process your refund.',
    ],
    stepsInStoreReceived: [
      'We\u2019ve received your return in-store.',
      'Our team is checking the items for damage and completeness.',
      'Within 3 working days your refund lands back on the original payment method.',
    ],
    stepsGenerated: [
      'Download the return label from the separate label email or your portal.',
      'Stick the label clearly on the parcel.',
      'Drop the parcel off at a PostNL or DHL pickup point.',
      'Once we receive it, we process your refund within 3 working days.',
    ],
    footerNote:
      'Questions about this return? Just reply to this email or give us a ring — happy to help.',
    preheader: (nr: string) => `We've created a return (#${nr}) for you.`,
    itemsCount: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
} as const

export default function ReturnCreatedByAdminEmail({
  returnNumber,
  orderNumber,
  customerName,
  labelMode,
  inStoreState,
  returnItems,
  refundAmount,
  labelCost,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnCreatedByAdminEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName
  const copy = locale === 'en' ? COPY.en : COPY.nl
  const labelCostStr = labelCost.toFixed(2)

  const heroBadge =
    labelMode === 'in_store'
      ? copy.badgeInStore
      : labelMode === 'customer_free'
        ? copy.badgeFree
        : labelMode === 'customer_paid'
          ? copy.badgePaid
          : copy.badgeGenerated

  const heroBadgeColor =
    labelMode === 'customer_paid' ? EMAIL_COLORS.warning : EMAIL_COLORS.primary

  const heroSubtitle =
    labelMode === 'in_store' && inStoreState === 'received'
      ? copy.heroSubtitleInStoreReceived
      : labelMode === 'in_store'
        ? copy.heroSubtitleInStoreApproved
        : labelMode === 'customer_free'
          ? copy.heroSubtitleFree
          : labelMode === 'customer_paid'
            ? copy.heroSubtitlePaid(labelCostStr)
            : copy.heroSubtitleGenerated

  const ctaHref = `${siteUrl}/${locale}/returns/${returnNumber}`
  const ctaLabel =
    labelMode === 'in_store'
      ? copy.ctaInStore
      : labelMode === 'customer_free'
        ? copy.ctaFree
        : labelMode === 'customer_paid'
          ? copy.ctaPaid
          : copy.ctaGenerated

  const ctaVariant: 'primary' | 'teal' =
    labelMode === 'customer_paid' ? 'teal' : 'primary'

  const stepsForMode: string[] =
    labelMode === 'in_store' && inStoreState === 'received'
      ? [...copy.stepsInStoreReceived]
      : labelMode === 'in_store'
        ? [...copy.stepsInStore(contactAddress)]
        : labelMode === 'customer_free'
          ? [...copy.stepsFree]
          : labelMode === 'customer_paid'
            ? [...copy.stepsPaid(labelCostStr)]
            : [...copy.stepsGenerated]

  return (
    <EmailShell locale={locale} preview={copy.preheader(returnNumber)}>
      <EmailHeader
        siteUrl={siteUrl}
        status={copy.status}
        statusColor={heroBadgeColor}
      />

      <EmailHero
        badge={heroBadge}
        badgeColor={heroBadgeColor}
        title={`${copy.heroGreeting},\n${firstName}.`}
        subtitle={heroSubtitle}
      />

      <EmailMetaGrid
        pairs={[
          { label: copy.returnLabel, value: `#${returnNumber}` },
          { label: copy.orderLabel, value: `#${orderNumber}` },
          { label: copy.refundLabel, value: `€${refundAmount.toFixed(2)}` },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={copy.itemsTitle}
          meta={copy.itemsCount(returnItems.length)}
        />
        <div style={{ marginTop: '18px' }}>
          {returnItems.map((item, idx) => {
            const variant = [item.size, item.color].filter(Boolean).join(' · ')
            return (
              <div
                key={idx}
                style={{
                  padding: '14px 0',
                  borderBottom:
                    idx === returnItems.length - 1
                      ? 'none'
                      : `1px solid ${EMAIL_COLORS.border}`,
                }}
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
                      <td style={{ verticalAlign: 'top' }}>
                        <div
                          style={{
                            fontFamily: EMAIL_FONTS.display,
                            fontSize: '18px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: EMAIL_COLORS.ink,
                          }}
                        >
                          {item.product_name}
                        </div>
                        {variant ? (
                          <div
                            style={{
                              fontFamily: EMAIL_FONTS.body,
                              fontSize: '12px',
                              color: EMAIL_COLORS.textMuted,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              marginTop: '4px',
                            }}
                          >
                            {variant}
                          </div>
                        ) : null}
                      </td>
                      <td
                        align="right"
                        style={{
                          fontFamily: EMAIL_FONTS.body,
                          fontSize: '13px',
                          color: EMAIL_COLORS.textMuted,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          verticalAlign: 'top',
                        }}
                      >
                        {item.quantity}×
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </EmailModule>

      {labelMode === 'in_store' && inStoreState !== 'received' ? (
        <EmailCallout tone="info" title={copy.inStoreTitle}>
          {copy.inStoreBody(contactAddress)}
        </EmailCallout>
      ) : null}

      {labelMode === 'customer_free' ? (
        <EmailCallout tone="success" title={copy.freeTitle}>
          {copy.freeBody}
        </EmailCallout>
      ) : null}

      {labelMode === 'customer_paid' ? (
        <EmailCallout tone="warning" title={copy.paidTitle}>
          {copy.paidBody(labelCostStr)}
        </EmailCallout>
      ) : null}

      <EmailModule padding="28px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailSectionTitle title={copy.howTitle} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps steps={stepsForMode} />
        </div>
      </EmailModule>

      <EmailCta href={ctaHref} label={`${ctaLabel}  →`} variant={ctaVariant} />

      <EmailModule padding="24px 30px">
        <EmailParagraph>{copy.footerNote}</EmailParagraph>
        <EmailParagraph>
          <a
            href={`mailto:${contactEmail}`}
            style={{
              color: EMAIL_COLORS.primary,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {contactEmail}
          </a>
          <span style={{ color: EMAIL_COLORS.textMuted }}>  ·  </span>
          <a
            href={`tel:${contactPhone.replace(/\s/g, '')}`}
            style={{
              color: EMAIL_COLORS.text,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {contactPhone}
          </a>
        </EmailParagraph>
      </EmailModule>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
