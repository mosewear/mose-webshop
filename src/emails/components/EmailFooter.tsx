import { Section, Text, Img, Link } from '@react-email/components'

interface EmailFooterProps {
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
  locale?: string
}

export default function EmailFooter({
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  contactEmail = 'info@mosewear.com',
  contactPhone = '+31 6 12345678',
  contactAddress = 'Helperbrink 203, 9721 TC Groningen',
  locale = 'nl',
}: EmailFooterProps) {
  const addressParts = contactAddress.split(',').map(s => s.trim())
  const addressDisplay = addressParts.join(' • ')

  return (
    <Section style={footer}>
      <Img
        src={`${siteUrl}/logomose_white.png`}
        width="100"
        height="auto"
        alt="MOSE"
        style={footerLogo}
      />
      <Text style={footerText}>
        <strong style={strong}>MOSE</strong> • {addressDisplay}
      </Text>
      <Text style={footerText}>
        <Link href={`mailto:${contactEmail}`} style={link}>
          {contactEmail}
        </Link>{' '}
        •{' '}
        <Link href={`tel:${contactPhone.replace(/\s/g, '')}`} style={link}>
          {contactPhone}
        </Link>
      </Text>
    </Section>
  )
}

const footer = {
  backgroundColor: '#000',
  color: '#888',
  padding: '28px 20px',
  textAlign: 'center' as const,
  fontSize: '12px',
}

const footerLogo = {
  margin: '0 auto 16px',
  display: 'block',
}

const footerText = {
  margin: '8px 0',
  color: '#888',
  fontSize: '12px',
}

const strong = {
  color: '#fff',
  fontWeight: 700,
}

const link = {
  color: '#2ECC71',
  fontWeight: 600,
  textDecoration: 'none',
}

