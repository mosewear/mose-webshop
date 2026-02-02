import { Img, Section } from '@react-email/components'

interface EmailHeaderProps {
  siteUrl?: string
}

export default function EmailHeader({ 
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com' 
}: EmailHeaderProps) {
  return (
    <Section style={logoSection}>
      <Img
        src={`${siteUrl}/logomose_white.png`}
        width="140"
        height="auto"
        alt="MOSE"
        style={logo}
      />
    </Section>
  )
}

const logoSection = {
  backgroundColor: '#000000',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
  display: 'block',
}




