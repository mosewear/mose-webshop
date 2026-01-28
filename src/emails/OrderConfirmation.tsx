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
  }>
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
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
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 6 12345678',
  contactAddress = 'Helperbrink 203, 9721 TC Groningen',
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

          {/* Content */}
          <Section style={content}>
            {/* Order Items */}
            <Text style={sectionTitle}>{t('orderConfirmation.yourItems')}</Text>
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
              <Hr style={summaryDivider} />
              <Text style={summaryTotal}>€{orderTotal.toFixed(2)}</Text>
              <Text style={summaryTotalLabel}>{t('orderConfirmation.totalPaid')}</Text>
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

