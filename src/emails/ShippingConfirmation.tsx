import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailSteps from './components/EmailSteps'
import EmailCta from './components/EmailCta'
import EmailShopMore from './components/EmailShopMore'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface ShippingConfirmationEmailProps {
  customerName: string
  orderId: string
  trackingCode: string
  trackingUrl?: string
  carrier?: string
  estimatedDelivery?: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ShippingConfirmationEmail({
  customerName,
  orderId,
  trackingCode,
  trackingUrl,
  carrier,
  estimatedDelivery,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ShippingConfirmationEmailProps) {
  const orderNumber = `#${orderId.slice(0, 8).toUpperCase()}`
  const firstName = customerName.split(' ')[0] || customerName

  let deliveryText = t('shipping.workingDays') || '2–3 werkdagen'
  if (estimatedDelivery) {
    try {
      const date = new Date(estimatedDelivery)
      const loc = locale === 'en' ? 'en-GB' : 'nl-NL'
      deliveryText = date.toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    } catch {
      deliveryText = estimatedDelivery
    }
  }

  const cta = trackingUrl || `${siteUrl}/${locale}/track-order`

  return (
    <EmailShell
      locale={locale}
      preview={
        t('shipping.preheader', { orderNumber, tracking: trackingCode }) ||
        `Je MOSE pakket ${orderNumber} is onderweg. Track het met code ${trackingCode}.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('shipping.status') || 'Shipped'}
        statusColor={EMAIL_COLORS.primary}
      />

      <EmailHero
        badge={t('shipping.badge') || '→ Onderweg naar jou'}
        title={`${t('shipping.heroGreeting') || 'Shipped'},\n${firstName}.`}
        subtitle={
          t('shipping.heroSubtitle') ||
          'Je MOSE is onderweg. Track het pakket hieronder en hou je brievenbus in de gaten.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('shipping.order') || 'Ordernummer', value: orderNumber },
          {
            label: t('shipping.estimatedDelivery') || 'Verwacht',
            value: deliveryText.toUpperCase(),
          },
        ]}
      />

      <EmailModule padding="28px 30px" background={EMAIL_COLORS.ink}>
        <div
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '10px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: EMAIL_COLORS.primary,
            fontWeight: 800,
          }}
        >
          {carrier ? `${carrier} · ` : ''}
          {t('shipping.trackAndTrace') || 'Track & Trace'}
        </div>
        <div
          style={{
            marginTop: '12px',
            fontFamily: EMAIL_FONTS.display,
            fontSize: '30px',
            color: EMAIL_COLORS.paper,
            letterSpacing: '0.14em',
            wordBreak: 'break-all',
          }}
        >
          {trackingCode}
        </div>
        <div
          style={{
            marginTop: '20px',
          }}
        >
          <a
            href={cta}
            className="mose-btn"
            style={{
              display: 'inline-block',
              backgroundColor: EMAIL_COLORS.primary,
              color: EMAIL_COLORS.paper,
              fontFamily: EMAIL_FONTS.body,
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              padding: '18px 32px',
            }}
          >
            {t('shipping.trackOrder') || 'Track mijn pakket'} &nbsp;→
          </a>
        </div>
      </EmailModule>

      <EmailModule padding="26px 30px">
        <EmailSectionTitle title={t('shipping.helpfulTips') || 'Handige tips'} />
        <div style={{ marginTop: '22px' }}>
          <EmailSteps
            variant="bullet"
            steps={[
              {
                title: t('shipping.tip1Title') || 'Hou je brievenbus in de gaten',
                description: t('shipping.tip1') || 'Het pakket komt binnen 1–3 werkdagen aan.',
              },
              {
                title: t('shipping.tip2Title') || 'Mail notificaties',
                description:
                  t('shipping.tip2') || 'Je ontvangt updates van de vervoerder zodra het pakket onderweg is.',
              },
              {
                title: t('shipping.tip3Title') || 'Niet thuis?',
                description:
                  t('shipping.tip3') || 'Geen zorgen: de pakketbezorger levert opnieuw of bij de buren.',
              },
            ]}
          />
        </div>
      </EmailModule>

      <EmailCta
        href={cta}
        label={`${t('shipping.trackOrder') || 'Track mijn pakket'}  →`}
        footnote={
          <>
            {t('shipping.questions') || 'Vragen over je pakket?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        }
      />

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
