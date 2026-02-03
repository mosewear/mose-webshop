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

interface InsiderBehindScenesEmailProps {
  email: string
  storyContent: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderBehindScenesEmail({
  email,
  storyContent,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: InsiderBehindScenesEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="eye" color="#00B67A" size={38} />
            <Text style={title}>{t('insiderBehindScenes.title')}</Text>
            <Text style={subtitle}>{t('insiderBehindScenes.subtitle')}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={introText}>
              {t('insiderBehindScenes.intro')}
            </Text>

            {/* Story Content */}
            <Section style={storySection}>
              <Text style={storyText}>{storyContent}</Text>
            </Section>

            {/* Process Highlights */}
            <Text style={sectionTitle}>{t('insiderBehindScenes.processTitle')}</Text>
            
            <Section style={highlightsList}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={highlightText}>{t('insiderBehindScenes.process1')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={highlightText}>{t('insiderBehindScenes.process2')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={highlightText}>{t('insiderBehindScenes.process3')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Limited Edition Note */}
            <Section style={limitedSection}>
              <Text style={limitedTitle}>{t('insiderBehindScenes.limitedTitle')}</Text>
              <Text style={limitedText}>{t('insiderBehindScenes.limitedText')}</Text>
            </Section>

            {/* Closing */}
            <Text style={closingText}>
              {t('insiderBehindScenes.closing')}
            </Text>

            {/* Social CTA */}
            <Section style={ctaSection}>
              <a href="https://instagram.com/mosewearcom" style={button}>
                {t('insiderBehindScenes.followCTA')}
              </a>
              <Text style={ctaSubtext}>{t('insiderBehindScenes.followSubtext')}</Text>
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
}

const storySection = {
  margin: '24px 0',
  padding: '24px',
  backgroundColor: '#f7fafc',
  border: '2px solid #e2e8f0',
}

const storyText = {
  margin: '0',
  fontSize: '15px',
  lineHeight: '24px',
  color: '#2d3748',
  whiteSpace: 'pre-line' as const,
}

const sectionTitle = {
  margin: '32px 0 16px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const highlightsList = {
  margin: '16px 0 24px 0',
}

const bulletPoint = {
  margin: '0',
  fontSize: '20px',
  fontWeight: '700',
  color: '#00B67A',
  lineHeight: '1',
}

const highlightText = {
  margin: '0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
}

const limitedSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#00B67A',
  border: '3px solid #000000',
}

const limitedTitle = {
  margin: '0 0 8px 0',
  fontSize: '16px',
  fontWeight: '900',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const limitedText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#000000',
}

const closingText = {
  margin: '24px 0',
  fontSize: '15px',
  lineHeight: '22px',
  color: '#2d3748',
  fontStyle: 'italic' as const,
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
  fontSize: '13px',
  color: '#4a5568',
  textAlign: 'center' as const,
}

