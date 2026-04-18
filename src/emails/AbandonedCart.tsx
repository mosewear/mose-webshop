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
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface CartItem {
  name: string
  price: number
  imageUrl?: string
  quantity: number
}

interface AbandonedCartEmailProps {
  customerName: string
  items: CartItem[]
  totalAmount: number
  cartUrl: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

function formatPrice(amount: number) {
  return `€${amount.toFixed(2).replace('.', ',')}`
}

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
}: AbandonedCartEmailProps) {
  const visibleItems = items.slice(0, 3)
  const hiddenCount = items.length > 3 ? items.length - 3 : 0

  return (
    <EmailShell
      locale={locale}
      preview={
        t('abandonedCart.preheader', { name: customerName }) ||
        `${customerName}, je winkelwagen wacht nog op je.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('abandonedCart.status') || 'Cart Reminder'} />

      <EmailHero
        badge={t('abandonedCart.badge') || '▲ Still Yours'}
        title={t('abandonedCart.heroTitle') || 'Don\u2019t\nForget.'}
        subtitle={
          t('abandonedCart.subtitle', { name: customerName }) ||
          `${customerName}, je winkelwagen staat nog voor je klaar. Niet voor altijd.`
        }
      />

      <EmailModule padding="28px 30px">
        <EmailParagraph>
          {t('abandonedCart.description') ||
            'Je hebt items achtergelaten in je winkelwagen. Rond je bestelling af voordat je maat wegraakt.'}
        </EmailParagraph>
      </EmailModule>

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('abandonedCart.itemsTitle') || 'In je cart'}
          meta={`${items.length}× ${t('abandonedCart.itemsMeta') || 'items'}`}
        />
        <div style={{ marginTop: '18px' }}>
          {visibleItems.map((item, index) => (
            <EmailItemRow
              key={index}
              name={item.name}
              meta={`${t('abandonedCart.quantity') || 'Aantal'}: ${item.quantity}`}
              price={formatPrice(item.price * item.quantity)}
              imageUrl={item.imageUrl}
              siteUrl={siteUrl}
              last={index === visibleItems.length - 1 && hiddenCount === 0}
            />
          ))}
          {hiddenCount > 0 ? (
            <EmailParagraph tone="muted" align="center" mt={10} mb={0}>
              {t('abandonedCart.moreItems', { count: hiddenCount }) ||
                `+ ${hiddenCount} meer items`}
            </EmailParagraph>
          ) : null}
        </div>
      </EmailModule>

      <EmailModule padding="24px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailBreakdown
          rows={[
            {
              label: t('abandonedCart.total') || 'Totaal',
              value: formatPrice(totalAmount),
              strong: true,
              tone: 'highlight',
            },
          ]}
        />
      </EmailModule>

      <EmailCta
        href={cartUrl}
        label={`${t('abandonedCart.ctaButton') || 'Ga terug naar je cart'}  →`}
        footnote={t('abandonedCart.ctaFootnote') || 'Jouw items wachten op je.'}
      />

      <EmailCallout tone="success" title={t('abandonedCart.freeShippingTitle') || 'Altijd gratis verzending'}>
        {t('abandonedCart.freeShipping') ||
          'Bij elke bestelling, zonder minimum. Gewoon omdat het hoort.'}
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
