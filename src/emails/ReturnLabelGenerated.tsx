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

interface ReturnLabelGeneratedEmailProps {
  returnNumber: string
  customerName: string
  returnLabelUrl: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnLabelGeneratedEmail({
  returnNumber,
  customerName,
  returnLabelUrl,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ReturnLabelGeneratedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="truck" color="#FF9500" size={38} />
            <Text style={title}>{t('returnLabel.title')}</Text>
            <Text style={subtitle}>
              {t('returnLabel.subtitle', { name: customerName })}
            </Text>
          </Section>

          {/* Return Number */}
          <Section style={returnSection}>
            <Text style={returnLabel}>{t('returnLabel.returnNumber')}</Text>
            <Text style={returnNumberStyle}>{returnNumber}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={description}>
              {t('returnLabel.description')}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <EmailButton href={returnLabelUrl}>
              {t('returnLabel.downloadButton')}
            </EmailButton>
          </Section>

          {/* Instructions */}
          <Section style={instructionsBox}>
            <Text style={instructionsTitle}>{t('returnLabel.instructionsTitle')}</Text>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
              <tr>
                <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={stepNumber}>1</div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={stepText}>{t('returnLabel.step1')}</Text>
                </td>
              </tr>
            </table>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
              <tr>
                <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={stepNumber}>2</div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={stepText}>{t('returnLabel.step2')}</Text>
                </td>
              </tr>
            </table>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '60px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={stepNumber}>3</div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={stepText}>{t('returnLabel.step3')}</Text>
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

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const instructionsBox = {
  margin: '24px auto',
  width: 'calc(100% - 48px)',
  padding: '24px',
  backgroundColor: '#FFF4E5',
  border: '2px solid #FF9500',
  boxSizing: 'border-box' as const,
}

const instructionsTitle = {
  margin: '0 0 20px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const stepNumber = {
  width: '40px',
  height: '40px',
  minWidth: '40px',
  maxWidth: '40px',
  minHeight: '40px',
  maxHeight: '40px',
  borderRadius: '50%',
  backgroundColor: '#FF9500',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '900',
  display: 'inline-block',
  textAlign: 'center' as const,
  lineHeight: '40px',
}

const stepText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

