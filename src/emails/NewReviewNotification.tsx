import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import IconCircle from './components/IconCircle'

interface NewReviewNotificationEmailProps {
  reviewerName: string
  reviewerEmail: string
  productName: string
  productSlug: string
  rating: number
  title?: string
  comment?: string
  reviewId: string
  t: (key: string, options?: any) => string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function NewReviewNotificationEmail({
  reviewerName,
  reviewerEmail,
  productName,
  productSlug,
  rating,
  title,
  comment,
  reviewId,
  t,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 50 211 1931',
  contactAddress = 'Stavangerweg 13, 9723 JC Groningen',
}: NewReviewNotificationEmailProps) {
  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const adminUrl = `${siteUrl}/admin/reviews`

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader siteUrl={siteUrl} />

          {/* Hero Section */}
          <Section style={hero}>
            <IconCircle icon="check-circle" color="#667eea" size={38} />
            <Text style={title}>{t('newReview.title')}</Text>
            <Text style={subtitle}>
              {t('newReview.subtitle')}
            </Text>
          </Section>

          {/* Review Info */}
          <Section style={infoSection}>
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('newReview.product')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{productName}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('newReview.reviewer')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{reviewerName}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('newReview.email')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={valueText}>{reviewerEmail}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ width: '150px', verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={labelText}>{t('newReview.rating')}:</Text>
                </td>
                <td style={{ verticalAlign: 'top', paddingBottom: '12px' }}>
                  <Text style={ratingText}>{renderStars(rating)} ({rating}/5)</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Review Content */}
          {(title || comment) && (
            <Section style={messageSection}>
              {title && (
                <>
                  <Text style={messageTitle}>{t('newReview.reviewTitle')}:</Text>
                  <Section style={messageBox}>
                    <Text style={messageText}>{title}</Text>
                  </Section>
                </>
              )}
              {comment && (
                <>
                  <Text style={messageTitle}>{t('newReview.reviewComment')}:</Text>
                  <Section style={messageBox}>
                    <Text style={messageText}>{comment}</Text>
                  </Section>
                </>
              )}
            </Section>
          )}

          {/* Action Button */}
          <Section style={buttonSection}>
            <Button style={button} href={adminUrl}>
              {t('newReview.approveButton')}
            </Button>
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
                    {t('newReview.info')}
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

const ratingText = {
  margin: '0',
  fontSize: '16px',
  color: '#fbbf24',
  fontWeight: '700',
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
  marginBottom: '16px',
}

const messageText = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '22px',
  color: '#2d3748',
  whiteSpace: 'pre-wrap' as const,
}

const buttonSection = {
  padding: '0 24px 24px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#667eea',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
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

