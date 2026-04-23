import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailCallout from './components/EmailCallout'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import EmailParagraph from './components/EmailParagraph'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface OrderDeliveredEmailProps {
  orderNumber: string
  customerName: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  /**
   * Full order UUID. Rendered as a hidden marker so the Trustpilot AFS
   * parser (or any other automated system) always has a stable, unambiguous
   * reference even if the short orderNumber format ever changes.
   */
  orderReferenceId?: string
}

export default function OrderDeliveredEmail({
  orderNumber,
  customerName,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
  orderReferenceId,
}: OrderDeliveredEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('delivered.preheader', { orderNumber }) ||
        `Je MOSE pakket #${orderNumber} is afgeleverd. Hopelijk geniet je ervan.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('delivered.status') || 'Delivered'} />

      <EmailHero
        badge={t('delivered.badge') || '✓ Afgeleverd'}
        title={`${t('delivered.heroGreeting') || 'Delivered'},\n${firstName}.`}
        subtitle={
          t('delivered.heroSubtitle') ||
          'Je pakket ligt waar het hoort. Tijd om die MOSE te dragen.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('delivered.orderNumber') || 'Ordernummer', value: `#${orderNumber}` },
          {
            label: t('delivered.statusLabel') || 'Status',
            value: t('delivered.statusValue') || 'Afgeleverd',
          },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('delivered.description') ||
            'Fijn dat je MOSE binnen hebt. Zit er iets niet goed? Mail ons. Dan zoeken we het samen uit.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCallout tone="success" title={t('delivered.feedbackTitle') || 'Deel je ervaring'}>
        {t('delivered.feedback') ||
          'We zijn nieuwsgierig wat je ervan vindt. Laat een review achter en help anderen hun MOSE te vinden.'}
      </EmailCallout>

      <EmailCta
        href={`${siteUrl}/${locale}/shop`}
        label={`${t('delivered.ctaButton') || 'Shop de collectie'}  →`}
        variant="teal"
        footnote={
          <>
            {t('delivered.questions') || 'Iets niet goed?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        }
      />

      <EmailShopMore
        title={t('delivered.shopMoreTitle') || 'Dubbel zo goed: shop de drop'}
        siteUrl={siteUrl}
        locale={locale}
      />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />

      {/* Hidden machine-readable reference for the Trustpilot AFS parser.
          Never shown to the customer thanks to display:none + zero-sized
          styles that survive most email clients. Intentionally kept in
          English: Trustpilot AFS is language-agnostic and only needs the
          "Order reference:" prefix to extract the ID reliably. */}
      <div
        style={{
          display: 'none',
          maxHeight: 0,
          overflow: 'hidden',
          opacity: 0,
          color: 'transparent',
          fontSize: '1px',
          lineHeight: '1px',
        }}
      >
        Order reference: {orderReferenceId || orderNumber}
      </div>
    </EmailShell>
  )
}
