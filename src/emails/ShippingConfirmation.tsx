import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Row,
  Column,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import IconCircle from './components/IconCircle'
import EmailButton from './components/EmailButton'

interface ShippingConfirmationEmailProps {
  customerName: string
  orderId: string
  trackingCode: string
  trackingUrl?: string
  carrier?: string
  estimatedDelivery?: string
  t: (key: string, options?: any) => string
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
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ShippingConfirmationEmailProps) {
  // Format delivery date
  let deliveryText = t('shipping.workingDays')
  if (estimatedDelivery) {
    try {
      const date = new Date(estimatedDelivery)
      deliveryText = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch (e) {
      deliveryText = estimatedDelivery
    }
  }

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero */}
          <Section style={hero}>
            <IconCircle icon="truck" color="shipping" size={42} />
            <Text style={title}>{t('shipping.title')}</Text>
            <Text style={subtitle}>{t('shipping.subtitle')}</Text>
            <Text style={heroText}>
              {t('shipping.heroText', { name: customerName })}
            </Text>
            <div style={orderBadge}>#{orderId.slice(0, 8).toUpperCase()}</div>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={sectionTitle}>{t('shipping.trackingInfo')}</Text>
            {carrier && <div style={carrierBadge}>{carrier}</div>}
            
            <Section style={trackingBox}>
              <Text style={trackingLabel}>{t('shipping.trackAndTrace')}</Text>
              <Text style={trackingCodeStyle}>{trackingCode}</Text>
              {trackingUrl && (
                <EmailButton href={trackingUrl}>
                  {t('shipping.trackOrder')}
                </EmailButton>
              )}
            </Section>

            <Section style={infoBox}>
              <Text style={infoTitle}>{t('shipping.estimatedDelivery')}</Text>
              <Text style={infoText}>{deliveryText}</Text>
            </Section>

            <Text style={sectionTitle}>{t('shipping.helpfulTips')}</Text>
            <Section style={checklist}>
              <Row style={checklistItem}>
                <Column style={{ width: '28px', verticalAlign: 'middle' }}>
                  <IconCircle icon="check" color="#86A35A" size={18} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={checklistText}>{t('shipping.tip1')}</Text>
                </Column>
              </Row>
              <Row style={checklistItem}>
                <Column style={{ width: '28px', verticalAlign: 'middle' }}>
                  <IconCircle icon="check" color="#86A35A" size={18} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={checklistText}>{t('shipping.tip2')}</Text>
                </Column>
              </Row>
              <Row style={checklistItem}>
                <Column style={{ width: '28px', verticalAlign: 'middle' }}>
                  <IconCircle icon="check" color="#86A35A" size={18} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={checklistText}>{t('shipping.tip3')}</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          <EmailFooter 
            siteUrl={siteUrl}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactAddress={contactAddress}
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
}

const container = {
  margin: '0 auto',
  maxWidth: '600px',
}

const hero = {
  padding: '50px 20px 40px',
  textAlign: 'center' as const,
  background: 'linear-gradient(180deg, #fff 0%, #fafafa 100%)',
}

const title = {
  fontSize: '44px',
  fontWeight: 900,
  color: '#000',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '0 0 10px',
}

const subtitle = {
  fontSize: '15px',
  color: '#666',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '4px',
}

const heroText = {
  fontSize: '14px',
  color: '#999',
}

const orderBadge = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '10px 24px',
  display: 'inline-block',
  marginTop: '20px',
  fontFamily: 'monospace',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '1.5px',
}

const content = {
  padding: '32px 20px',
}

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 900,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '16px',
  marginTop: '28px',
  color: '#000',
}

const carrierBadge = {
  display: 'inline-block',
  backgroundColor: '#2ECC71',
  color: '#fff',
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '12px',
}

const trackingBox = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '28px 24px',
  borderRadius: '8px',
  margin: '20px 0',
  textAlign: 'center' as const,
}

const trackingLabel = {
  fontSize: '13px',
  color: '#999',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '8px',
}

const trackingCodeStyle = {
  fontSize: '24px',
  fontWeight: 900,
  letterSpacing: '3px',
  fontFamily: 'monospace',
  margin: '15px 0',
  padding: '15px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: '4px',
}

const infoBox = {
  backgroundColor: '#f8f8f8',
  padding: '20px',
  borderLeft: '3px solid #2ECC71',
  margin: '16px 0',
}

const infoTitle = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: 900,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const infoText = {
  margin: '0',
  fontSize: '15px',
  fontWeight: 600,
}

const checklist = {
  padding: '0',
  margin: '12px 0',
}

const checklistItem = {
  marginBottom: '12px',
  alignItems: 'center' as const,
}

const checklistText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#333',
  display: 'inline-block',
}

