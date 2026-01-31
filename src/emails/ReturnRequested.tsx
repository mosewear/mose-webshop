import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import IconCircle from './components/IconCircle'

interface ReturnRequestedEmailProps {
  orderNumber: string
  returnNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
  }>
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnRequestedEmail({
  orderNumber,
  returnNumber,
  customerName,
  items,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ReturnRequestedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="package" color="#FF9500" size={38} />
            <Text style={title}>{t('returnRequested.title')}</Text>
            <Text style={subtitle}>
              {t('returnRequested.subtitle', { name: customerName })}
            </Text>
          </Section>

          {/* Return Info */}
          <Section style={infoSection}>
            <Text style={infoLabel}>{t('returnRequested.returnNumber')}</Text>
            <Text style={infoValue}>{returnNumber}</Text>
            <Text style={infoLabel}>{t('returnRequested.orderNumber')}</Text>
            <Text style={infoValue}>{orderNumber}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={description}>
              {t('returnRequested.description')}
            </Text>
          </Section>

          {/* Items */}
          <Section style={itemsSection}>
            <Text style={sectionTitle}>{t('returnRequested.itemsTitle')}</Text>
            {items.map((item, index) => (
              <Text key={index} style={itemText}>
                • {item.name} (x{item.quantity})
              </Text>
            ))}
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="clock" color="#FF9500" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('returnRequested.processingTime')}
                  </Text>
                </td>
              </tr>
            </table>
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

// =====================================================
// STYLES
// =====================================================

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
}

const hero = {
  padding: '40px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
}

const title = {
  margin: '20px 0 0 0',
  fontSize: '32px',
  fontWeight: '900',
  lineHeight: '1.2',
  color: '#000000',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}

const subtitle = {
  margin: '8px 0 0 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a5568',
}

const infoSection = {
  padding: '0 24px 24px',
  textAlign: 'center' as const,
}

const infoLabel = {
  margin: '16px 0 8px 0',
  fontSize: '14px',
  fontWeight: '600',
  color: '#718096',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const infoValue = {
  margin: '0',
  fontSize: '20px',
  fontWeight: '900',
  color: '#000000',
  letterSpacing: '2px',
}

const content = {
  padding: '0 24px 24px',
}

const description = {
  margin: '0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a5568',
  textAlign: 'center' as const,
}

const itemsSection = {
  padding: '0 24px 24px',
}

const sectionTitle = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const itemText = {
  margin: '8px 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4a5568',
}

const infoBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#FFF4E5',
  border: '2px solid #FF9500',
  boxSizing: 'border-box' as const,
}

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

