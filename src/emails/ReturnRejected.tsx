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
import EmailButton from './components/EmailButton'

interface ReturnRejectedEmailProps {
  returnNumber: string
  customerName: string
  reason: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnRejectedEmail({
  returnNumber,
  customerName,
  reason,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ReturnRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="x" color="#e74c3c" size={38} />
            <Text style={title}>{t('returnRejected.title')}</Text>
            <Text style={subtitle}>
              {t('returnRejected.subtitle', { name: customerName })}
            </Text>
          </Section>

          {/* Return Number */}
          <Section style={returnSection}>
            <Text style={returnLabel}>{t('returnRejected.returnNumber')}</Text>
            <Text style={returnNumberStyle}>{returnNumber}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={description}>
              {t('returnRejected.description')}
            </Text>
          </Section>

          {/* Reason Box */}
          <Section style={reasonBox}>
            <Text style={reasonTitle}>{t('returnRejected.reasonTitle')}</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="phone" color="#e74c3c" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('returnRejected.contactInfo')}
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <EmailButton href={`mailto:${contactEmail}`}>
              {t('returnRejected.ctaButton')}
            </EmailButton>
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

const returnSection = {
  padding: '0 24px 24px',
  textAlign: 'center' as const,
}

const returnLabel = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: '600',
  color: '#718096',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const returnNumberStyle = {
  margin: '0',
  fontSize: '24px',
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

const reasonBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#FEF2F2',
  border: '2px solid #e74c3c',
  boxSizing: 'border-box' as const,
}

const reasonTitle = {
  margin: '0 0 12px 0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const reasonText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const infoBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '20px 24px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
  boxSizing: 'border-box' as const,
}

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

