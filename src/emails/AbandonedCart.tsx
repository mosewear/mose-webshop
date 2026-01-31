import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import IconCircle from './components/IconCircle'
import EmailButton from './components/EmailButton'

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
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function AbandonedCartEmail({
  customerName,
  items,
  totalAmount,
  cartUrl,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: AbandonedCartEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="shopping-cart" color="#FF9500" size={38} />
            <Text style={title}>{t('abandonedCart.title')}</Text>
            <Text style={subtitle}>
              {t('abandonedCart.subtitle', { name: customerName })}
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={description}>
              {t('abandonedCart.description')}
            </Text>
          </Section>

          {/* Cart Items */}
          <Section style={itemsSection}>
            {items.slice(0, 3).map((item, index) => (
              <Section key={index} style={itemBox}>
                <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                  <tr>
                    <td style={{ width: '100px', verticalAlign: 'top' }}>
                      {item.imageUrl && (
                        <Img
                          src={item.imageUrl}
                          alt={item.name}
                          style={itemImage}
                        />
                      )}
                    </td>
                    <td style={{ verticalAlign: 'middle', paddingLeft: '16px' }}>
                      <Text style={itemName}>{item.name}</Text>
                      <Text style={itemDetails}>
                        {t('abandonedCart.quantity')}: {item.quantity} × €{item.price.toFixed(2)}
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>
            ))}
            {items.length > 3 && (
              <Text style={moreItems}>
                {t('abandonedCart.moreItems', { count: items.length - 3 })}
              </Text>
            )}
          </Section>

          {/* Total */}
          <Section style={totalSection}>
            <Text style={totalLabel}>{t('abandonedCart.total')}</Text>
            <Text style={totalAmount}>€{totalAmount.toFixed(2)}</Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <EmailButton href={cartUrl}>
              {t('abandonedCart.ctaButton')}
            </EmailButton>
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="truck" color="#00B67A" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('abandonedCart.freeShipping')}
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
            t={t}
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

const itemBox = {
  marginBottom: '16px',
  padding: '16px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
}

const itemImage = {
  width: '100px',
  height: '100px',
  objectFit: 'cover' as const,
}

const itemName = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#000000',
}

const itemDetails = {
  margin: '0',
  fontSize: '14px',
  color: '#718096',
}

const moreItems = {
  margin: '16px 0 0 0',
  fontSize: '14px',
  color: '#718096',
  textAlign: 'center' as const,
  fontStyle: 'italic' as const,
}

const totalSection = {
  padding: '0 24px 24px',
  textAlign: 'center' as const,
}

const totalLabel = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#718096',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const totalAmount = {
  margin: '0',
  fontSize: '32px',
  fontWeight: '900',
  color: '#000000',
  letterSpacing: '2px',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const infoBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#F0FDF4',
  border: '2px solid #00B67A',
  boxSizing: 'border-box' as const,
}

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

