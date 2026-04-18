import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailItemRow from './components/EmailItemRow'
import EmailCta from './components/EmailCta'
import EmailCallout from './components/EmailCallout'
import EmailShopMore from './components/EmailShopMore'
import EmailParagraph from './components/EmailParagraph'
import { EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface BackInStockEmailProps {
  email: string
  productName: string
  productSlug: string
  variantName?: string
  productImage?: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function BackInStockEmail({
  productName,
  productSlug,
  variantName,
  productImage,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: BackInStockEmailProps) {
  const productUrl = `${siteUrl}/${locale}/product/${productSlug}`

  return (
    <EmailShell
      locale={locale}
      preview={
        t('backInStock.preheader', { product: productName }) ||
        `${productName} is weer op voorraad. Wees er snel bij.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('backInStock.status') || 'Back in Stock'} />

      <EmailHero
        badge={t('backInStock.badge') || '▲ Restocked'}
        title={t('backInStock.heroTitle') || 'Back\nIn Stock.'}
        subtitle={t('backInStock.subtitle') || 'Het item waar je op wachtte is er weer. Maar niet lang.'}
      />

      <EmailModule padding="28px 30px">
        <EmailItemRow
          name={productName}
          meta={variantName}
          imageUrl={productImage}
          siteUrl={siteUrl}
          last
        />
      </EmailModule>

      <EmailModule padding="20px 30px">
        <EmailParagraph align="center">
          {t('backInStock.description') ||
            'Beperkte voorraad. Geen zin in weer wachten? Schiet op.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCta
        href={productUrl}
        label={`${t('backInStock.ctaButton') || 'Bekijk product'}  →`}
        variant="teal"
      />

      <EmailCallout tone="warning" title={t('backInStock.limitedStockTitle') || 'Beperkte voorraad'}>
        {t('backInStock.limitedStock') ||
          'Op = op. Geen garantie dat deze restock lang blijft staan.'}
      </EmailCallout>

      <EmailShopMore siteUrl={siteUrl} locale={locale} />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
