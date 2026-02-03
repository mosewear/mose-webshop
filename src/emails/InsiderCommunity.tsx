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

interface InsiderCommunityEmailProps {
  email: string
  subscriberCount: number
  daysUntilLaunch: number
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderCommunityEmail({
  email,
  subscriberCount,
  daysUntilLaunch,
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
              {t('insiderCommunity.ps', { days: daysUntilLaunch })}
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
}

const psText = {
  margin: '16px 0 0 0',
  fontSize: '13px',
  lineHeight: '18px',
  color: '#718096',
  fontStyle: 'italic' as const,
}
