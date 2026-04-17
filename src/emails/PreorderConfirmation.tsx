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
import EmailSteps from './components/EmailSteps'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import { EMAIL_DEFAULT_CONTACT, EMAIL_SITE_URL } from './tokens'

interface PreorderConfirmationEmailProps {
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
    presaleExpectedDate?: string
  }>
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
  presaleExpectedDate: string
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

export default function PreorderConfirmationEmail({
  customerName,
  orderId,
  orderTotal,
  subtotal,
  shippingCost,
  orderItems,
  shippingAddress,
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
}: PreorderConfirmationEmailProps) {
  const orderNumber = `#${orderId.slice(0, 8).toUpperCase()}`
  const subtotalExclBtw = subtotal / 1.21
  const btw = subtotal - subtotalExclBtw
  const itemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)
  const trackUrl = `${siteUrl}/${locale}/track-order`
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('preorder.preheader', { date: presaleExpectedDate }) ||
        `Je MOSE pre-order ${orderNumber} is gereserveerd. Verwacht rond ${presaleExpectedDate}.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('preorder.status') || 'Pre-order Confirmed'} />

      <EmailHero
        badge={t('preorder.badge') || '▲ Pre-Order Gereserveerd'}
        title={`${t('preorder.heroGreeting') || 'Reserved'},\n${firstName}.`}
        subtitle={
          t('preorder.heroSubtitle') ||
          'Je plek is geclaimd. Zodra de drop live gaat, pakken we jouw bestelling als eerste in.'
        }
      />

      <EmailCallout tone="warning" title={t('preorder.expectedDelivery') || 'Verwachte levering'}>
        <strong style={{ fontSize: '16px' }}>{presaleExpectedDate}</strong>
        <br />
        {t('preorder.deliveryInfo') ||
          'We houden je op de hoogte zodra je bestelling onderweg is.'}
      </EmailCallout>

      <EmailMetaGrid
        pairs={[
          { label: t('preorder.orderNumber') || 'Pre-order', value: orderNumber },
          {
            label: t('preorder.expectedLabel') || 'Verwacht',
            value: presaleExpectedDate.toUpperCase(),
          },
        ]}
      />

      <EmailModule padding="28px 30px 14px 30px">
        <EmailSectionTitle
          title={t('preorder.yourPreorder') || 'Jouw Pre-order'}
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
              badge="PRE-SALE"
            />
          ))}
        </div>
      </EmailModule>

      <EmailModule padding="26px 30px">
        <EmailSectionTitle title={t('preorder.whatHappensNow') || 'Wat gebeurt er nu'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            steps={[
              t('preorder.step1') || 'We reserveren jouw maten.',
              t('preorder.step2') || 'Zodra de drop binnenkomt pakken we jouw bestelling als eerste in.',
              t('preorder.step3') || 'Je ontvangt een track & trace zodra het pakket verzonden is.',
              t('preorder.step4') || 'Tot die tijd geen zorgen: je plek is veilig.',
            ]}
          />
        </div>
      </EmailModule>

      <EmailSplitHighlight
        left={{
          label: t('preorder.shippingAddress') || 'Bezorgadres',
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
          label: t('preorder.totalReserved') || 'Totaal Gereserveerd',
          body: <EmailTotalValue value={euro(orderTotal)} />,
          footnote: `${paymentMethod} · ${t('preorder.paid') || 'Paid'}`,
          background: 'black',
        }}
      />

      <EmailModule padding="24px 30px">
        <EmailBreakdown
          title={t('preorder.paymentSummary') || 'Breakdown'}
          rows={[
            {
              label: t('preorder.subtotal') || 'Subtotaal (excl. btw)',
              value: euro(subtotalExclBtw),
            },
            {
              label: t('preorder.btw') || 'BTW 21%',
              value: euro(btw),
              tone: 'muted',
            },
            {
              label: t('preorder.shipping') || 'Verzending',
              value:
                shippingCost === 0
                  ? (t('preorder.free') || 'Gratis')
                  : euro(shippingCost),
              tone: shippingCost === 0 ? 'success' : 'normal',
            },
            ...(promoCode && discountAmount > 0
              ? [
                  {
                    label: `▲ ${t('preorder.discount') || 'Korting'} (${promoCode})`,
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
        label={`${t('preorder.trackCta') || 'Bekijk mijn pre-order'}  →`}
        footnote={
          <>
            {t('preorder.questions') || 'Vragen?'}{' '}
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
        title={t('preorder.shopMoreTitle') || 'Ontdek meer in de MOSE collectie'}
        ctaLabel={t('preorder.shopMoreCta') || 'Shop nu →'}
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
