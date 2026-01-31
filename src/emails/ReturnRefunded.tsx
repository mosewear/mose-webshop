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

interface ReturnRefundedEmailProps {
  returnNumber: string
  customerName: string
  refundAmount: number
  refundMethod: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnRefundedEmail({
  returnNumber,
  customerName,
  refundAmount,
  refundMethod,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: ReturnRefundedEmailProps) {
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
            <Text style={title}>{t('returnRefunded.title')}</Text>
            <Text style={subtitle}>
              {t('returnRefunded.subtitle', { name: customerName })}
            </Text>
          </Section>

          {/* Refund Info */}
          <Section style={infoSection}>
            <Text style={infoLabel}>{t('returnRefunded.returnNumber')}</Text>
            <Text style={infoValue}>{returnNumber}</Text>
            <Text style={infoLabel}>{t('returnRefunded.refundAmount')}</Text>
            <Text style={amountValue}>€{refundAmount.toFixed(2)}</Text>
            <Text style={infoLabel}>{t('returnRefunded.refundMethod')}</Text>
            <Text style={infoValue}>{refundMethod}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={description}>
              {t('returnRefunded.description')}
            </Text>
          </Section>

          {/* Info Box */}
          <Section style={infoBox}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <IconCircle icon="alert-circle" color="#00B67A" size={20} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={infoText}>
                    {t('returnRefunded.bankProcessing')}
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <EmailButton href={`${siteUrl}/shop`}>
              {t('returnRefunded.ctaButton')}
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

const amountValue = {
  margin: '0',
  fontSize: '32px',
  fontWeight: '900',
  color: '#00B67A',
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

