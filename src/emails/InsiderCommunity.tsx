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

interface InsiderCommunityEmailProps {
  email: string
  products: {
    name: string
    description: string
    imageUrl: string
    productUrl: string
  }[]
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderCommunityEmail({
  email,
  products,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: InsiderCommunityEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <Text style={title}>{t('insiderCommunity.title')}</Text>
            <Text style={subtitle}>{t('insiderCommunity.subtitle')}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={introText}>
              {t('insiderCommunity.intro')}
            </Text>

            {/* Products List */}
            {products.map((product, index) => (
              <Section key={index} style={productSection}>
                <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                  <tr>
                    <td style={{ width: '120px', verticalAlign: 'top', paddingRight: '16px' }}>
                      <a href={product.productUrl}>
                        <Img 
                          src={product.imageUrl}
                          alt={product.name}
                          width={120}
                          height={120}
                          style={productImage}
                        />
                      </a>
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <Text style={productNumber}>{index + 1}.</Text>
                      <Text style={productName}>{product.name}</Text>
                      <Text style={productDescription}>{product.description}</Text>
                      <a href={product.productUrl} style={productLink}>
                        {t('insiderCommunity.viewItem')}
                      </a>
                    </td>
                  </tr>
                </table>
              </Section>
            ))}

            {/* Insider Tip */}
            <Section style={tipSection}>
              <Text style={tipTitle}>{t('insiderCommunity.tipTitle')}</Text>
              <Text style={tipText}>{t('insiderCommunity.tipText')}</Text>
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <a href={`${siteUrl}/shop`} style={button}>
                {t('insiderCommunity.shopNow')}
              </a>
              <Text style={ctaSubtext}>{t('insiderCommunity.presaleCode')}</Text>
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
  padding: '40px 24px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
}

const title = {
  margin: '0',
  fontSize: '24px',
  fontWeight: '900',
  lineHeight: '1.2',
  color: '#000000',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}

const subtitle = {
  margin: '12px 0 0 0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#4a5568',
  lineHeight: '24px',
}

const content = {
  padding: '0 24px 40px',
}

const introText = {
  margin: '0 0 32px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
}

const productSection = {
  margin: '0 0 24px 0',
  padding: '20px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
}

const productImage = {
  width: '120px',
  height: '120px',
  objectFit: 'cover' as const,
  border: '2px solid #000000',
}

const productNumber = {
  margin: '0 0 4px 0',
  fontSize: '14px',
  color: '#00B67A',
  fontWeight: '700',
}

const productName = {
  margin: '0 0 8px 0',
  fontSize: '17px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const productDescription = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4a5568',
}

const productLink = {
  display: 'inline-block',
  fontSize: '14px',
  color: '#00B67A',
  fontWeight: '700',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const tipSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#00B67A',
  border: '3px solid #000000',
}

const tipTitle = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const tipText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#000000',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  display: 'inline-block',
  padding: '16px 48px',
  backgroundColor: '#00B67A',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  border: '3px solid #000000',
  boxShadow: '4px 4px 0 #000000',
}

const ctaSubtext = {
  margin: '12px 0 0 0',
  fontSize: '14px',
  color: '#4a5568',
  textAlign: 'center' as const,
}

