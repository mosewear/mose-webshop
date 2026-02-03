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

interface InsiderLaunchWeekEmailProps {
  email: string
  daysUntilLaunch: number
  limitedItems: string[]
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function InsiderLaunchWeekEmail({
  email,
  daysUntilLaunch,
  limitedItems,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: InsiderLaunchWeekEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="calendar" color="#00B67A" size={38} />
            <Text style={title}>{t('insiderLaunchWeek.title')}</Text>
            <Text style={subtitle}>{t('insiderLaunchWeek.subtitle', { days: daysUntilLaunch })}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={introText}>
              {t('insiderLaunchWeek.intro', { days: daysUntilLaunch })}
            </Text>

            {/* What This Means Section */}
            <Text style={sectionTitle}>{t('insiderLaunchWeek.whatThisMeansTitle')}</Text>
            
            <Section style={infoBox}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '16px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={infoText}>{t('insiderLaunchWeek.info1')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '16px' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={infoText}>{t('insiderLaunchWeek.info2')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={bulletPoint}>•</Text>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={infoText}>{t('insiderLaunchWeek.info3')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Insider Perks Remain */}
            <Text style={sectionTitle}>{t('insiderLaunchWeek.perksRemainTitle')}</Text>
            
            <Section style={perksList}>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '50px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="check-circle" color="#00B67A" size={18} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={perkText}>{t('insiderLaunchWeek.perk1')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginBottom: '12px' }}>
                <tr>
                  <td style={{ width: '50px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="check-circle" color="#00B67A" size={18} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={perkText}>{t('insiderLaunchWeek.perk2')}</Text>
                  </td>
                </tr>
              </table>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tr>
                  <td style={{ width: '50px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <IconCircle icon="check-circle" color="#00B67A" size={18} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={perkText}>{t('insiderLaunchWeek.perk3')}</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Status Check */}
            <Section style={statusSection}>
              <Text style={statusTitle}>{t('insiderLaunchWeek.statusTitle')}</Text>
              <Text style={statusText}>{t('insiderLaunchWeek.statusAlready')}</Text>
              <Text style={statusText}>{t('insiderLaunchWeek.statusNotYet')}</Text>
              
              {limitedItems.length > 0 && (
                <>
                  <Text style={statusSubtitle}>{t('insiderLaunchWeek.limitedStockTitle')}</Text>
                  {limitedItems.map((item, index) => (
                    <Text key={index} style={limitedItemText}>• {item}</Text>
                  ))}
                </>
              )}
            </Section>

            {/* CTA */}
            <Section style={ctaSection}>
              <a href={`${siteUrl}/shop`} style={button}>
                {t('insiderLaunchWeek.shopNow')}
              </a>
              <Text style={ctaSubtext}>{t('insiderLaunchWeek.presaleCode')}</Text>
            </Section>

            {/* Closing */}
            <Text style={closingText}>
              {t('insiderLaunchWeek.closing')}
            </Text>

            {/* PS */}
            <Text style={psText}>
              {t('insiderLaunchWeek.ps')}
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
  fontWeight: '700',
  color: '#00B67A',
  letterSpacing: '1px',
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

const infoBox = {
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

const infoText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

const perksList = {
  margin: '16px 0 24px 0',
}

const perkText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
  fontWeight: '600',
}

const statusSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#fff5e6',
  border: '2px solid #ffa726',
}

const statusTitle = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  fontWeight: '700',
  color: '#000000',
}

const statusText = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#2d3748',
}

const statusSubtitle = {
  margin: '16px 0 8px 0',
  fontSize: '14px',
  fontWeight: '700',
  color: '#000000',
}

const limitedItemText = {
  margin: '4px 0',
  fontSize: '13px',
  color: '#d84315',
  fontWeight: '600',
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

