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

interface OrderConfirmationEmailProps {
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
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function OrderConfirmationEmail({
  customerName,
  orderId,
  orderTotal,
  orderItems,
  shippingAddress,
  hasPresaleItems = false,
  presaleExpectedDate,
  promoCode,
  discountAmount = 0,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: OrderConfirmationEmailProps) {
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

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="check-circle" color="success" size={38} />
            <Text style={title}>{t('orderConfirmation.title')}</Text>
            <Text style={subtitle}>{t('orderConfirmation.subtitle')}</Text>
            <Text style={heroText}>
              {t('orderConfirmation.heroText', { name: customerName })}
            </Text>
            <div style={orderBadge}>#{orderId.slice(0, 8).toUpperCase()}</div>
          </Section>

          {/* Presale Warning Box (for mixed orders) */}
          {hasPresaleItems && (
            <Section style={presaleWarningBox}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '80px', verticalAlign: 'top', textAlign: 'center', paddingTop: '8px' }}>
                    <IconCircle icon="alert-circle" color="#f59e0b" size={24} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={presaleWarningTitle}>{t('orderConfirmation.presaleNotice')}</Text>
                    <Text style={presaleWarningText}>
                      {t('orderConfirmation.presaleNoticeText', { date: presaleExpectedDate })}
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          )}

          {/* Content */}
          <Section style={content}>
            {/* Order Items */}
            <Text style={sectionTitle}>{t('orderConfirmation.yourItems')}</Text>
            {orderItems.map((item, i) => (
              <div key={i}>
                <ProductItem
                  name={item.name}
                  size={item.size}
                  color={item.color}
                  quantity={item.quantity}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  siteUrl={siteUrl}
                  t={t}
                />
                {item.isPresale && (
                  <Row style={presaleItemBadge}>
                    <Column style={{ width: '24px', verticalAlign: 'middle', paddingRight: '8px' }}>
                      <IconCircle icon="package" color="#86A35A" size={16} />
                    </Column>
                    <Column style={{ verticalAlign: 'middle' }}>
                      <Text style={presaleItemText}>
                        PRE-SALE {item.presaleExpectedDate ? `• ${t('orderConfirmation.expected')}: ${item.presaleExpectedDate}` : ''}
                      </Text>
                    </Column>
                  </Row>
                )}
              </div>
            ))}

            {/* Payment Summary */}
            <Section style={summary}>
              <Text style={summaryLabel}>{t('orderConfirmation.paymentSummary')}</Text>
              <Row style={summaryLine}>
                <Column>{t('orderConfirmation.subtotal')}</Column>
                <Column style={summaryAmount}>€{subtotalExclBtw.toFixed(2)}</Column>
              </Row>
              <Row style={summaryLine}>
                <Column style={summaryVat}>{t('orderConfirmation.vat')}</Column>
                <Column style={summaryVat}>€{btw.toFixed(2)}</Column>
              </Row>
              <Row style={summaryLine}>
                <Column>{t('orderConfirmation.shipping')}</Column>
                <Column style={summaryAmount}>€{shipping.toFixed(2)}</Column>
              </Row>
              {promoCode && discountAmount > 0 && (
                <Row style={summaryLine}>
                  <Column style={discountLabel}>
                    🎟️ {t('orderConfirmation.discount')} ({promoCode})
                  </Column>
                  <Column style={discountAmount}>-€{discountAmount.toFixed(2)}</Column>
                </Row>
              )}
              <Hr style={summaryDivider} />
              <Text style={summaryTotal}>€{orderTotal.toFixed(2)}</Text>
              <Text style={summaryTotalLabel}>{t('orderConfirmation.totalPaid')}</Text>
            </Section>

            {/* Shipping Address */}
            <Section style={addressSection}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '80px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="package" color="#2ECC71" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
                    <Text style={addressTitle}>{t('orderConfirmation.shippingAddress')}</Text>
                    <Text style={addressText}>
                      {shippingAddress.name}<br />
                      {shippingAddress.address}<br />
                      {shippingAddress.postalCode} {shippingAddress.city}
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          </Section>

          {/* Footer */}
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

// Styles
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

const presaleWarningBox = {
  backgroundColor: '#fff3cd',
  border: '3px solid #ffc107',
  padding: '24px',
  margin: '24px 0',  // NO HORIZONTAL MARGIN
  width: '100%',     // FULL WIDTH
  boxSizing: 'border-box' as const,
}

const presaleWarningTitle = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#856404',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const presaleWarningText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#856404',
}

const presaleItemBadge = {
  backgroundColor: '#f0f4e8',
  border: '2px solid #86A35A',
  padding: '8px 12px',
  marginTop: '-12px',
  marginBottom: '16px',
  marginLeft: '20px',
  marginRight: '20px',
  alignItems: 'center' as const,
}

const presaleItemText = {
  margin: '0',
  color: '#4a5c2a',
  fontSize: '12px',
  fontWeight: '700',
  display: 'inline-block',
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
  marginTop: '0',
}

const summary = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '28px 24px',
  marginTop: '28px',
}

const addressSection = {
  backgroundColor: '#f8f9fa',
  padding: '20px 24px',
  borderLeft: '3px solid #2ECC71',
  marginTop: '28px',
}

const addressTitle = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  fontWeight: '900',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#000',
}

const addressText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '22px',
  color: '#4a5568',
}

const summaryLabel = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#999',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const summaryLine = {
  fontSize: '15px',
  padding: '8px 0',
  color: '#fff',
}

const summaryAmount = {
  textAlign: 'right' as const,
  fontWeight: 600,
}

const summaryVat = {
  fontSize: '13px',
  color: '#999',
  textAlign: 'right' as const,
}

const discountLabel = {
  color: '#00A676',
  fontWeight: 600,
}

const discountAmount = {
  textAlign: 'right' as const,
  color: '#00A676',
  fontWeight: 600,
}

const summaryDivider = {
  borderColor: '#333',
  margin: '12px 0',
}

const summaryTotal = {
  fontSize: '28px',
  fontWeight: 900,
  textAlign: 'center' as const,
  paddingTop: '12px',
  margin: '0',
}

const summaryTotalLabel = {
  fontSize: '12px',
  color: '#2ECC71',
  textAlign: 'center' as const,
  marginTop: '8px',
  fontWeight: 600,
  letterSpacing: '1px',
}

