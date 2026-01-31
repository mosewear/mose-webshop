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

interface BackInStockEmailProps {
  email: string
  productName: string
  productSlug: string
  variantName?: string
  productImage?: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function BackInStockEmail({
  email,
  productName,
  productSlug,
  variantName,
  productImage,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: BackInStockEmailProps) {
  const productUrl = `${siteUrl}/product/${productSlug}`

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="check-circle" color="#00B67A" size={38} />
            <Text style={title}>{t('backInStock.title')}</Text>
            <Text style={subtitle}>
              {t('backInStock.subtitle')}
            </Text>
          </Section>

          {/* Product Info */}
          <Section style={productSection}>
            {productImage && (
              <Section style={imageSection}>
                <Img
                  src={productImage}
                  alt={productName}
                  style={productImg}
                />
              </Section>
            )}
            <Text style={productName}>{productName}</Text>
            {variantName && (
              <Text style={variantText}>{variantName}</Text>
            )}
            <Text style={description}>
              {t('backInStock.description')}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <EmailButton href={productUrl}>
              {t('backInStock.ctaButton')}
            </EmailButton>
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="alert-circle" color="#FF9500" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('backInStock.limitedStock')}
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

const productSection = {
  padding: '0 24px 24px',
  textAlign: 'center' as const,
}

const imageSection = {
  margin: '0 auto 20px',
  textAlign: 'center' as const,
  backgroundColor: '#f7fafc',
  padding: '20px',
  border: '2px solid #e2e8f0',
}

const productImg = {
  width: '100%',
  maxWidth: '400px',
  height: 'auto',
  display: 'block',
  margin: '0 auto',
}

const productName = {
  margin: '20px 0 8px 0',
  fontSize: '24px',
  fontWeight: '900',
  color: '#000000',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}

const variantText = {
  margin: '0 0 12px 0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#00B67A',
}

const description = {
  margin: '12px 0 0 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a5568',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const infoBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#FFF4E5',
  border: '2px solid #FFB020',
  boxSizing: 'border-box' as const,
}

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

