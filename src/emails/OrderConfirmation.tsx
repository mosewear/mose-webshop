import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailItemRow from './components/EmailItemRow'
import EmailSplitHighlight, {
  EmailTotalValue,
} from './components/EmailSplitHighlight'
import EmailBreakdown from './components/EmailBreakdown'
import EmailCallout from './components/EmailCallout'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import {
  EMAIL_DEFAULT_CONTACT,
  EMAIL_SITE_URL,
} from './tokens'

interface OrderConfirmationEmailProps {
  customerName: string
  orderId: string
  orderTotal: number
  subtotal: number
  shippingCost: number
  orderItems: Array<{
    name: string
    size: string
    color: string
    quantity: number
    price: number
    imageUrl?: string
    isPresale?: boolean
    presaleExpectedDate?: string
  }>
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
  hasPresaleItems?: boolean
  presaleExpectedDate?: string
  promoCode?: string
  discountAmount?: number
  paymentMethod?: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

const euro = (n: number) => `€${n.toFixed(2).replace('.', ',')}`

export default function OrderConfirmationEmail({
  customerName,
  orderId,
  orderTotal,
  subtotal,
  shippingCost,
  orderItems,
  shippingAddress,
  hasPresaleItems = false,
  presaleExpectedDate,
  promoCode,
  discountAmount = 0,
  paymentMethod = 'iDEAL',
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: OrderConfirmationEmailProps) {
  const orderNumber = `#${orderId.slice(0, 8).toUpperCase()}`
  const subtotalExclBtw = subtotal / 1.21
  const btw = subtotal - subtotalExclBtw
  const itemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)
  const trackUrl = `${siteUrl}/${locale}/track-order`
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={t('orderConfirmation.preheader', {
        orderNumber,
      }) || `Je MOSE order ${orderNumber} is bevestigd. We pakken ’m zorgvuldig voor je in.`}
    >
      <EmailHeader siteUrl={siteUrl} status={t('orderConfirmation.status') || 'Order Confirmed'} />

      <EmailHero
        badge={t('orderConfirmation.badge') || '✓ Bestelling Bevestigd'}
        title={`${t('orderConfirmation.heroGreeting') || 'Thanks'},\n${firstName}.`}
        subtitle={
          t('orderConfirmation.heroSubtitle') ||
          "Je bestelling is binnen. We pakken 'm zorgvuldig voor je in."
        }
      />

      {hasPresaleItems && presaleExpectedDate ? (
        <EmailCallout tone="warning" title={t('orderConfirmation.presaleNotice') || 'Presale items in je bestelling'}>
          {t('orderConfirmation.presaleNoticeText', { date: presaleExpectedDate }) ||
            `Een of meer items in je bestelling zijn pre-sale. Deze worden verwacht rond ${presaleExpectedDate}.`}
        </EmailCallout>
      ) : null}

      <EmailMetaGrid
        pairs={[
          {
            label: t('orderConfirmation.orderNumber') || 'Ordernummer',
            value: orderNumber,
          },
          {
            label: t('orderConfirmation.deliveryLabel') || 'Bezorging',
            value: hasPresaleItems && presaleExpectedDate
              ? presaleExpectedDate.toUpperCase()
              : (t('orderConfirmation.deliveryWindow') || '2–3 WERKDAGEN'),
          },
        ]}
      />

      <EmailModule padding="28px 30px 14px 30px" innerClassName="mose-pad">
        <EmailSectionTitle
          title={t('orderConfirmation.yourItems') || 'Jouw Items'}
          meta={`${itemCount} ${itemCount === 1 ? (t('common.piece') || 'stuk') : (t('common.pieces') || 'stuks')}`}
        />
        <div style={{ marginTop: '18px' }}>
          {orderItems.map((item, idx) => (
            <EmailItemRow
              key={idx}
              name={item.name}
              meta={[item.color, item.size, `${item.quantity}×`]
                .filter(Boolean)
                .join(' · ')}
              price={euro(item.price * item.quantity)}
              imageUrl={item.imageUrl}
              siteUrl={siteUrl}
              last={idx === orderItems.length - 1}
              badge={item.isPresale ? 'PRE-SALE' : undefined}
            />
          ))}
        </div>
      </EmailModule>

      <EmailSplitHighlight
        left={{
          label: t('orderConfirmation.shippingAddress') || 'Bezorgadres',
          body: (
            <>
              <strong style={{ fontWeight: 800 }}>{shippingAddress.name}</strong>
              <br />
              {shippingAddress.address}
              <br />
              {shippingAddress.postalCode} {shippingAddress.city}
            </>
          ),
          background: 'paper',
        }}
        right={{
          label: t('orderConfirmation.totalPaid') || 'Totaal Betaald',
          body: <EmailTotalValue value={euro(orderTotal)} />,
          footnote: `${paymentMethod} · ${t('orderConfirmation.paid') || 'Paid'}`,
          background: 'black',
        }}
      />

      <EmailModule padding="24px 30px">
        <EmailBreakdown
          title={t('orderConfirmation.paymentSummary') || 'Breakdown'}
          rows={[
            {
              label: t('orderConfirmation.subtotal') || 'Subtotaal (excl. btw)',
              value: euro(subtotalExclBtw),
            },
            {
              label: t('orderConfirmation.vat') || 'BTW 21%',
              value: euro(btw),
              tone: 'muted',
            },
            {
              label: t('orderConfirmation.shipping') || 'Verzending',
              value:
                shippingCost === 0
                  ? (t('orderConfirmation.free') || 'Gratis')
                  : euro(shippingCost),
              tone: shippingCost === 0 ? 'success' : 'normal',
            },
            ...(promoCode && discountAmount > 0
              ? [
                  {
                    label: `▲ ${t('orderConfirmation.discount') || 'Korting'} (${promoCode})`,
                    value: `−${euro(discountAmount)}`,
                    tone: 'highlight' as const,
                    strong: true,
                  },
                ]
              : []),
          ]}
        />
      </EmailModule>

      <EmailCta
        href={trackUrl}
        label={`${t('orderConfirmation.trackCta') || 'Track mijn bestelling'}  →`}
        footnote={
          <>
            {t('orderConfirmation.questions') || 'Vragen?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: '#00A676', fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        }
      />

      <EmailShopMore
        title={t('orderConfirmation.shopMoreTitle') || 'Ontdek meer in de MOSE collectie'}
        ctaLabel={t('orderConfirmation.shopMoreCta') || 'Shop de collectie →'}
        siteUrl={siteUrl}
        locale={locale}
      />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
