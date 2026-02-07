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

interface InsiderWelcomeEmailProps {
  email: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  promoCode?: string
  promoExpiry?: Date
}

export default function InsiderWelcomeEmail({
  email,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
  promoCode,
  promoExpiry,
}: InsiderWelcomeEmailProps) {
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
            <IconCircle icon="check-circle" color="#00B67A" size={38} />
            <Text style={title}>{t('insiderWelcome.title')}</Text>
            <Text style={subtitle}>{t('insiderWelcome.subtitle')}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={introText}>
              {t('insiderWelcome.intro')}
            </Text>

            <Text style={sectionTitle}>{t('insiderWelcome.perksTitle')}</Text>

            {/* Benefits List */}
            <Section style={benefitsList}>
              {/* Mystery Gift */}
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '20px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="package" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={benefitTitle}>{t('insiderWelcome.perk1Title')}</Text>
                    <Text style={benefitText}>{t('insiderWelcome.perk1Text')}</Text>
                  </td>
                </tr>
              </table>

              {/* Free Shipping */}
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '20px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="truck" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={benefitTitle}>{t('insiderWelcome.perk2Title')}</Text>
                    <Text style={benefitText}>{t('insiderWelcome.perk2Text')}</Text>
                  </td>
                </tr>
              </table>

              {/* First Dibs */}
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '20px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="alert-circle" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={benefitTitle}>{t('insiderWelcome.perk3Title')}</Text>
                    <Text style={benefitText}>{t('insiderWelcome.perk3Text')}</Text>
                  </td>
                </tr>
              </table>

              {/* Behind the Scenes */}
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '20px' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="mail" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={benefitTitle}>{t('insiderWelcome.perk4Title')}</Text>
                    <Text style={benefitText}>{t('insiderWelcome.perk4Text')}</Text>
                  </td>
                </tr>
              </table>

              {/* Insider-Only Releases */}
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '60px', verticalAlign: 'top', textAlign: 'center', paddingTop: '4px' }}>
                    <IconCircle icon="alert-circle" color="#00B67A" size={20} />
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={benefitTitle}>{t('insiderWelcome.perk5Title')}</Text>
                    <Text style={benefitText}>{t('insiderWelcome.perk5Text')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* What Now Section */}
            <Text style={sectionTitle}>{t('insiderWelcome.whatNowTitle')}</Text>

            {/* Promo Code Section (NEW!) */}
            {promoCode && (
              <Section style={promoSection}>
                <Text style={promoTitle}>{t('insiderWelcome.promoTitle')}</Text>
                <div style={promoCodeBox}>
                  <Text style={promoCodeText}>{promoCode}</Text>
                </div>
                <Text style={promoSubtext}>
                  {t('insiderWelcome.promoSubtext', { discount: '10%' })}
                </Text>
                {expiryText && (
                  <Text style={promoExpiryStyle}>
                    {t('insiderWelcome.promoExpiry', { date: expiryText })}
                  </Text>
                )}
              </Section>
            )}

            {/* CTA Button - Shop Now */}
            <Section style={ctaSection}>
              <a href={`${siteUrl}/shop`} style={button}>
                {t('insiderWelcome.shopNow')}
              </a>
              <Text style={ctaSubtext}>
                {promoCode 
                  ? t('insiderWelcome.usePromoCode') 
                  : t('insiderWelcome.presaleCode')
                }
              </Text>
            </Section>

            {/* Social CTA */}
            <Section style={socialSection}>
              <Text style={socialText}>{t('insiderWelcome.followUs')}</Text>
              <a href="https://instagram.com/mosewearcom" style={socialLink}>
                @mosewearcom {t('insiderWelcome.onInstagram')}
              </a>
            </Section>

            {/* Footer Note */}
            <Text style={footerNote}>
              {t('insiderWelcome.footerNote')}
            </Text>

            {/* PS */}
            <Text style={psText}>
              {t('insiderWelcome.ps')}
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
  fontSize: '28px',
  fontWeight: '900',
  lineHeight: '1.2',
  color: '#000000',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}

const subtitle = {
  margin: '12px 0 0 0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#00B67A',
  letterSpacing: '1px',
}

const content = {
  padding: '0 24px 40px',
}

const introText = {
  margin: '0 0 32px 0',
  fontSize: '16px',
  lineHeight: '24px',
  color: '#2d3748',
}

const sectionTitle = {
  margin: '32px 0 16px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const benefitsList = {
  margin: '16px 0 32px 0',
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
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4a5568',
}

const ctaSection = {
  margin: '24px 0',
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

const socialSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f7fafc',
  textAlign: 'center' as const,
  border: '2px solid #e2e8f0',
}

const socialText = {
  margin: '0 0 8px 0',
  fontSize: '15px',
  color: '#2d3748',
  fontWeight: '600',
}

const socialLink = {
  display: 'inline-block',
  fontSize: '15px',
  color: '#00B67A',
  fontWeight: '700',
  textDecoration: 'none',
}

const footerNote = {
  margin: '32px 0 0 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#718096',
  textAlign: 'center' as const,
}

const psText = {
  margin: '24px 0 0 0',
  fontSize: '13px',
  lineHeight: '18px',
  color: '#718096',
  fontStyle: 'italic' as const,
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

