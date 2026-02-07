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

interface NewsletterWelcomeEmailProps {
  email: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  promoCode?: string
  promoExpiry?: Date
}

export default function NewsletterWelcomeEmail({
  email,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
  promoCode,
  promoExpiry,
}: NewsletterWelcomeEmailProps) {
  // Format expiry date
  const expiryText = promoExpiry 
    ? new Intl.DateTimeFormat('nl-NL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(promoExpiry)
    : null
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="mail" color="#00B67A" size={38} />
            <Text style={title}>{t('newsletterWelcome.title')}</Text>
            <Text style={subtitle}>{t('newsletterWelcome.subtitle')}</Text>
            <Text style={heroText}>
              {t('newsletterWelcome.heroText')}
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={welcomeText}>
              {t('newsletterWelcome.whatYouGet')}
            </Text>

            {/* Benefits List */}
            <Section style={benefitsList}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '16px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="package" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={benefitTitle}>{t('newsletterWelcome.benefit1Title')}</Text>
                    <Text style={benefitText}>{t('newsletterWelcome.benefit1Text')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '16px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="alert-circle" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={benefitTitle}>{t('newsletterWelcome.benefit2Title')}</Text>
                    <Text style={benefitText}>{t('newsletterWelcome.benefit2Text')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '16px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="shopping-cart" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={benefitTitle}>{t('newsletterWelcome.benefit3Title')}</Text>
                    <Text style={benefitText}>{t('newsletterWelcome.benefit3Text')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Promo Code Section (NEW!) */}
            {promoCode && (
              <Section style={promoSection}>
                <Text style={promoTitle}>{t('newsletterWelcome.promoTitle')}</Text>
                <div style={promoCodeBox}>
                  <Text style={promoCodeText}>{promoCode}</Text>
                </div>
                <Text style={promoSubtext}>
                  {t('newsletterWelcome.promoSubtext', { discount: '10%' })}
                </Text>
                {expiryText && (
                  <Text style={promoExpiryStyle}>
                    {t('newsletterWelcome.promoExpiry', { date: expiryText })}
                  </Text>
                )}
              </Section>
            )}

            {/* CTA Button */}
            <Section style={ctaSection}>
              <a href={`${siteUrl}/shop`} style={button}>
                {t('newsletterWelcome.discoverCollection')}
              </a>
            </Section>

            {/* Email Address */}
            <Text style={emailInfo}>
              {t('newsletterWelcome.receivedBecause')}
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
  fontWeight: '700',
  color: '#00B67A',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}

const heroText = {
  margin: '20px 0 0 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a5568',
}

const content = {
  padding: '0 24px 40px',
}

const welcomeText = {
  margin: '0 0 24px 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#2d3748',
  fontWeight: '600',
}

const benefitsList = {
  margin: '24px 0',
  padding: '24px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
}

const benefitTitle = {
  margin: '0 0 4px 0',
  fontSize: '15px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '700',
}

const benefitText = {
  margin: '0',
  fontSize: '13px',
  lineHeight: '18px',
  color: '#4a5568',
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

const emailInfo = {
  margin: '24px 0 0 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#718096',
  textAlign: 'center' as const,
}

// Promo Code Styles (NEW!)
const promoSection = {
  margin: '32px 0 24px 0',
  padding: '32px 24px',
  backgroundColor: '#B4FF39',
  border: '4px solid #000000',
  boxShadow: '8px 8px 0 #000000',
  textAlign: 'center' as const,
}

const promoTitle = {
  margin: '0 0 20px 0',
  fontSize: '20px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
}

const promoCodeBox = {
  padding: '20px 32px',
  backgroundColor: '#ffffff',
  border: '3px solid #000000',
  display: 'inline-block',
  margin: '0 auto 20px',
  boxShadow: '4px 4px 0 #000000',
}

const promoCodeText = {
  margin: '0',
  fontSize: '32px',
  fontWeight: '900',
  color: '#000000',
  letterSpacing: '3px',
  fontFamily: 'Courier New, monospace',
}

const promoSubtext = {
  margin: '0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#000000',
  lineHeight: '24px',
}

const promoExpiryStyle = {
  margin: '12px 0 0 0',
  fontSize: '14px',
  color: '#2d3748',
  fontWeight: '600',
}

