import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Row,
  Column,
  Hr,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import IconCircle from './components/IconCircle'
import ProductItem from './components/ProductItem'

interface PreorderConfirmationEmailProps {
  customerName: string
  orderId: string
  orderTotal: number
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
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function PreorderConfirmationEmail({
  customerName,
  orderId,
  orderTotal,
  orderItems,
  shippingAddress,
  presaleExpectedDate,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 6 12345678',
  contactAddress = 'Helperbrink 203, 9721 TC Groningen',
}: PreorderConfirmationEmailProps) {
  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = orderTotal - subtotal
  const totalExclBtw = orderTotal / 1.21
  const btw = orderTotal - totalExclBtw
  const subtotalExclBtw = subtotal / 1.21

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section - Pre-order specific */}
          <Section style={hero}>
            <IconCircle icon="clock" color="#86A35A" size={38} />
            <Text style={title}>{t('preorder.title')}</Text>
            <Text style={subtitle}>{t('preorder.subtitle')}</Text>
            <Text style={heroText}>
              {t('preorder.heroText', { name: customerName })}
            </Text>
            <div style={orderBadge}>#{orderId.slice(0, 8).toUpperCase()}</div>
          </Section>

          {/* Expected Delivery Info Box */}
          <Section style={presaleInfoBox}>
            <Row>
              <Column style={{ width: '40px', verticalAlign: 'middle', paddingTop: '0' }}>
                <IconCircle icon="calendar" color="#86A35A" size={24} />
              </Column>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={presaleInfoTitle}>{t('preorder.expectedDelivery')}</Text>
                <Text style={presaleInfoDate}>{presaleExpectedDate}</Text>
                <Text style={presaleInfoText}>
                  {t('preorder.deliveryInfo')}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Content */}
          <Section style={content}>
            {/* What Happens Now Section */}
            <Text style={sectionTitle}>{t('preorder.whatHappensNow')}</Text>
            <Section style={timelineBox}>
              <Row style={timelineItem}>
                <Column style={{ width: '30px', verticalAlign: 'middle' }}>
                  <IconCircle icon="check" color="#86A35A" size={20} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={timelineText}>{t('preorder.step1')}</Text>
                </Column>
              </Row>
              <Row style={timelineItem}>
                <Column style={{ width: '30px', verticalAlign: 'middle' }}>
                  <div style={number}>2</div>
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={timelineText}>{t('preorder.step2')}</Text>
                </Column>
              </Row>
              <Row style={timelineItem}>
                <Column style={{ width: '30px', verticalAlign: 'middle' }}>
                  <div style={number}>3</div>
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={timelineText}>{t('preorder.step3')}</Text>
                </Column>
              </Row>
              <Row style={timelineItem}>
                <Column style={{ width: '30px', verticalAlign: 'middle' }}>
                  <div style={number}>4</div>
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={timelineText}>{t('preorder.step4')}</Text>
                </Column>
              </Row>
            </Section>

            {/* Order Items */}
            <Text style={sectionTitle}>{t('preorder.yourPreorder')}</Text>
            {orderItems.map((item, i) => (
              <ProductItem
                key={i}
                name={item.name}
                size={item.size}
                color={item.color}
                quantity={item.quantity}
                price={item.price}
                imageUrl={item.imageUrl}
                siteUrl={siteUrl}
                t={t}
              />
            ))}

            {/* Payment Summary */}
            <Section style={summary}>
              <Text style={summaryLabel}>{t('preorder.paymentSummary')}</Text>
              <Row style={summaryRow}>
                <Column><Text style={summaryText}>{t('preorder.subtotal')}</Text></Column>
                <Column align="right"><Text style={summaryText}>€{subtotalExclBtw.toFixed(2)}</Text></Column>
              </Row>
              <Row style={summaryRow}>
                <Column><Text style={summaryText}>{t('preorder.btw')}</Text></Column>
                <Column align="right"><Text style={summaryText}>€{btw.toFixed(2)}</Text></Column>
              </Row>
              <Row style={summaryRow}>
                <Column><Text style={summaryText}>{t('preorder.shipping')}</Text></Column>
                <Column align="right"><Text style={summaryText}>{shipping === 0 ? t('preorder.free') : `€${shipping.toFixed(2)}`}</Text></Column>
              </Row>
              <Hr style={summaryDivider} />
              <Row style={summaryRow}>
                <Column><Text style={summaryTotal}>{t('preorder.total')}</Text></Column>
                <Column align="right"><Text style={summaryTotal}>€{orderTotal.toFixed(2)}</Text></Column>
              </Row>
            </Section>

            {/* Shipping Address */}
            <Section style={addressBox}>
              <Text style={addressTitle}>{t('preorder.shippingAddress')}</Text>
              <Text style={addressText}>
                {shippingAddress.name}<br />
                {shippingAddress.address}<br />
                {shippingAddress.postalCode} {shippingAddress.city}
              </Text>
            </Section>

            {/* Questions Section */}
            <Section style={questionsBox}>
              <Text style={questionsTitle}>{t('preorder.questions')}</Text>
              <Text style={questionsText}>
                {t('preorder.questionsText')}
              </Text>
              <Row>
                <Column style={{ width: '24px', verticalAlign: 'middle', paddingRight: '8px' }}>
                  <IconCircle icon="mail" color="#2d3748" size={16} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={contactInfoText}>{contactEmail}</Text>
                </Column>
              </Row>
              <Row style={{ marginTop: '8px' }}>
                <Column style={{ width: '24px', verticalAlign: 'middle', paddingRight: '8px' }}>
                  <IconCircle icon="phone" color="#2d3748" size={16} />
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={contactInfoText}>{contactPhone}</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer */}
          <EmailFooter 
            siteUrl={siteUrl}
            contactEmail={contactEmail}
            contactAddress={contactAddress}
          />
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '0',
  width: '100%',
  maxWidth: '600px',
}

const hero = {
  backgroundColor: '#f8f9fa',
  padding: '48px 24px',
  textAlign: 'center' as const,
  borderBottom: '4px solid #86A35A',
}

const title = {
  margin: '16px 0 0 0',
  fontSize: '32px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const subtitle = {
  margin: '8px 0 0 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#86A35A',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
}

const heroText = {
  margin: '16px 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a5568',
}

const orderBadge = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '900',
  letterSpacing: '2px',
  border: '3px solid #000000',
}

const presaleInfoBox = {
  backgroundColor: '#f0f4e8',
  border: '3px solid #86A35A',
  padding: '24px',
  margin: '24px 24px',
}

const presaleInfoTitle = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#666',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const presaleInfoDate = {
  margin: '0 0 12px 0',
  fontSize: '24px',
  fontWeight: '900',
  color: '#86A35A',
}

const presaleInfoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4a5568',
}

const content = {
  padding: '24px',
}

const sectionTitle = {
  fontSize: '18px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginTop: '32px',
  marginBottom: '16px',
  borderBottom: '3px solid #000000',
  paddingBottom: '8px',
}

const timelineBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #e2e8f0',
  padding: '16px',
  marginBottom: '24px',
}

const timelineItem = {
  marginBottom: '12px',
  alignItems: 'center' as const,
}

const number = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: '2px solid #cbd5e0',
  color: '#4a5568',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: '700',
}

const timelineText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

const summary = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #e2e8f0',
  padding: '24px',
  marginTop: '24px',
}

const summaryLabel = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#4a5568',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const summaryRow = {
  marginBottom: '8px',
}

const summaryText = {
  margin: '0',
  fontSize: '14px',
  color: '#4a5568',
}

const summaryDivider = {
  borderColor: '#cbd5e0',
  margin: '16px 0',
}

const summaryTotal = {
  margin: '0',
  fontSize: '18px',
  fontWeight: '900',
  color: '#000000',
}

const addressBox = {
  backgroundColor: '#ffffff',
  border: '2px solid #e2e8f0',
  padding: '20px',
  marginTop: '24px',
}

const addressTitle = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#4a5568',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const addressText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

const questionsBox = {
  backgroundColor: '#f8f9fa',
  padding: '24px',
  marginTop: '32px',
  textAlign: 'center' as const,
}

const questionsTitle = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const questionsText = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4a5568',
}

const contactInfoText = {
  margin: '0',
  fontSize: '14px',
  color: '#2d3748',
  fontWeight: '600',
  display: 'inline-block',
}

