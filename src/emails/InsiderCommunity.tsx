import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Row,
  Column,
  Img,
  Link,
  Button,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'

interface FeaturedProduct {
  name: string
  slug: string
  imageUrl: string
  url: string
}

interface InsiderCommunityEmailProps {
  email: string
  subscriberCount: number
  daysUntilLaunch: number
  featuredProducts?: FeaturedProduct[]
  t: (key: string, options?: any) => string
  siteUrl?: string
  locale?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderCommunityEmail({
  email,
  subscriberCount,
  daysUntilLaunch,
  featuredProducts = [],
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

            {/* Stats Section */}
            <Text style={sectionTitle}>{t('insiderCommunity.numbers')}</Text>
            
            <Section style={statsBox}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={statText}>{t('insiderCommunity.stat1', { count: subscriberCount })}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={statText}>{t('insiderCommunity.stat2')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={statText}>{t('insiderCommunity.stat3')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Featured Products Section */}
            {featuredProducts.length > 0 && (
              <>
                <Text style={sectionTitle}>{t('insiderCommunity.productsTitle')}</Text>
                <Text style={productsIntro}>{t('insiderCommunity.productsIntro')}</Text>
                
                <Section style={productsSection}>
                  <table cellPadding="0" cellSpacing="0" border={0} width="100%" style={productsTable}>
                    <tr>
                      {featuredProducts.map((product) => (
                        <td key={product.slug} style={productColumn} width="33.33%">
                          <Link href={product.url} style={productLink}>
                            <table cellPadding="0" cellSpacing="0" border={0} width="100%" style={productCard}>
                              <tr>
                                <td style={productImageCell}>
                                  {product.imageUrl && (
                                    <Img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      width="100%"
                                      style={productImage}
                                    />
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td style={productNameCell}>
                                  <Text style={productName}>{product.name}</Text>
                                </td>
                              </tr>
                              <tr>
                                <td style={productButtonCell}>
                                  <Button href={product.url} style={productButton}>
                                    {t('insiderCommunity.viewProduct')}
                                  </Button>
                                </td>
                              </tr>
                            </table>
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </table>
                </Section>
              </>
            )}

            {/* Presale CTA Section */}
            <Section style={presaleSection}>
              <Text style={presaleTitle}>{t('insiderCommunity.presaleTitle')}</Text>
              <Text style={presaleSubtitle}>{t('insiderCommunity.presaleSubtitle')}</Text>
              <Text style={presaleText}>
                {t('insiderCommunity.presaleText')}
              </Text>
              <Section style={presaleButtonContainer}>
                <Button href={`${siteUrl}/${locale}/shop`} style={presaleButton}>
                  {t('insiderCommunity.presaleCTA')}
                </Button>
              </Section>
            </Section>

            {/* Testimonials */}
            <Text style={sectionTitle}>{t('insiderCommunity.communityTitle')}</Text>
            
            <Section style={testimonialsBox}>
              <Text style={testimonialText}>{t('insiderCommunity.testimonial1')}</Text>
              <Text style={testimonialText}>{t('insiderCommunity.testimonial2')}</Text>
              <Text style={testimonialText}>{t('insiderCommunity.testimonial3')}</Text>
            </Section>

            {/* Join Community */}
            <Text style={sectionTitle}>{t('insiderCommunity.joinTitle')}</Text>
            
            <Section style={socialBox}>
              <Text style={socialText}>{t('insiderCommunity.joinText')}</Text>
              <Text style={socialHandle}>{t('insiderCommunity.socialInsta')}</Text>
              <Text style={socialHandle}>{t('insiderCommunity.socialFb')}</Text>
            </Section>

            {/* Closing */}
            <Text style={closingText}>
              {t('insiderCommunity.closing')}
            </Text>

            {/* PS */}
            <Text style={psText}>
              {(() => {
                const psText = t('insiderCommunity.ps', { days: daysUntilLaunch })
                const parts = psText.split('www.mosewear.com')
                if (parts.length === 1) return psText
                return (
                  <>
                    {parts[0]}
                    <Link href="https://www.mosewear.com" style={psLink}>
                      www.mosewear.com
                    </Link>
                    {parts[1]}
                  </>
                )
              })()}
            </Text>
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
  margin: '20px 0 0 0',
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
  margin: '0 0 24px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
  fontWeight: '500',
}

const sectionTitle = {
  margin: '32px 0 16px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const statsBox = {
  margin: '16px 0 24px 0',
  padding: '20px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
}

const bulletPoint = {
  margin: '0',
  fontSize: '20px',
  fontWeight: '700',
  color: '#00B67A',
  lineHeight: '1',
}

const statText = {
  margin: '0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
  fontWeight: '600',
}

const productsSection = {
  margin: '16px 0 24px 0',
}

const productsIntro = {
  margin: '0 0 20px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
  fontWeight: '500',
}

const productsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const productColumn = {
  width: '33.33%',
  padding: '0 8px',
  verticalAlign: 'top' as const,
}

const productLink = {
  textDecoration: 'none',
  color: 'inherit',
}

const productCard = {
  width: '100%',
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  borderCollapse: 'collapse' as const,
}

const productImageCell = {
  padding: '0',
  textAlign: 'center' as const,
}

const productImage = {
  width: '100%',
  height: 'auto',
  display: 'block',
  border: 'none',
}

const productNameCell = {
  padding: '12px 12px 8px',
  textAlign: 'center' as const,
}

const productName = {
  margin: '0',
  fontSize: '13px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  lineHeight: '18px',
}

const productButtonCell = {
  padding: '0 12px 12px',
  textAlign: 'center' as const,
}

const productButton = {
  display: 'inline-block',
  padding: '10px 16px',
  backgroundColor: '#00B67A',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  border: '2px solid #000000',
  borderRadius: '0',
}

const testimonialsBox = {
  margin: '16px 0 24px 0',
  padding: '20px',
  backgroundColor: '#fff5e6',
  border: '2px solid #ffa726',
}

const testimonialText = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontStyle: 'italic' as const,
  paddingLeft: '16px',
  borderLeft: '3px solid #00B67A',
}

const socialBox = {
  margin: '16px 0 24px 0',
  padding: '20px',
  backgroundColor: '#f0fdf4',
  border: '2px solid #00B67A',
  textAlign: 'center' as const,
}

const socialText = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
}

const socialHandle = {
  margin: '8px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#00B67A',
}

const closingText = {
  margin: '24px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
  fontWeight: '600',
}

const psText = {
  margin: '16px 0 0 0',
  fontSize: '13px',
  lineHeight: '18px',
  color: '#718096',
  fontStyle: 'italic' as const,
}

const psLink = {
  color: '#00B67A',
  textDecoration: 'underline',
  fontWeight: '600',
}

const presaleSection = {
  margin: '32px 0 24px 0',
  padding: '32px 24px',
  backgroundColor: '#00B67A',
  border: '4px solid #000000',
  textAlign: 'center' as const,
}

const presaleTitle = {
  margin: '0 0 8px 0',
  fontSize: '24px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const presaleSubtitle = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const presaleText = {
  margin: '0 0 24px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#000000',
  fontWeight: '600',
}

const presaleButtonContainer = {
  margin: '0',
  padding: '0',
}

const presaleButton = {
  display: 'inline-block',
  padding: '16px 32px',
  backgroundColor: '#000000',
  color: '#00B67A',
  fontSize: '16px',
  fontWeight: '900',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  border: '3px solid #000000',
  borderRadius: '0',
}
