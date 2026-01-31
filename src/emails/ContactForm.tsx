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

interface ContactFormEmailProps {
  customerName: string
  customerEmail: string
  subject: string
  message: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ContactFormEmail({
  customerName,
  customerEmail,
  subject,
  message,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ContactFormEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="mail" color="#667eea" size={38} />
            <Text style={title}>{t('contactForm.title')}</Text>
            <Text style={subtitle}>
              {t('contactForm.subtitle')}
            </Text>
          </Section>

          {/* Customer Info */}
          <Section style={infoSection}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('contactForm.from')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{customerName}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('contactForm.email')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{customerEmail}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('contactForm.subject')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{subject}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Message */}
          <Section style={messageSection}>
            <Text style={messageTitle}>{t('contactForm.message')}:</Text>
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="alert-circle" color="#667eea" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('contactForm.replyInfo')}
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
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
  margin: '0 24px 24px',
}

const labelText = {
  margin: '0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#718096',
}

const valueText = {
  margin: '0',
  fontSize: '14px',
  color: '#2d3748',
}

const messageSection = {
  padding: '0 24px 24px',
}

const messageTitle = {
  margin: '0 0 12px 0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const messageBox = {
  padding: '20px',
  backgroundColor: '#ffffff',
  border: '2px solid #e2e8f0',
}

const messageText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '22px',
  color: '#2d3748',
  whiteSpace: 'pre-wrap' as const,
}

const infoBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#EEF2FF',
  border: '2px solid #667eea',
  boxSizing: 'border-box' as const,
}

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

