import { Link } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export default function EmailButton({ 
  href, 
  children, 
  variant = 'primary' 
}: EmailButtonProps) {
  const buttonStyle = variant === 'primary' ? primaryButton : secondaryButton

  return (
    <Link href={href} style={buttonStyle}>
      {children}
    </Link>
  )
}

const baseButton = {
  display: 'inline-block',
  padding: '15px 32px',
  textDecoration: 'none',
  fontWeight: 900,
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
  fontSize: '13px',
  borderRadius: '0px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const primaryButton = {
  ...baseButton,
  backgroundColor: '#2ECC71',
  color: '#ffffff',
}

const secondaryButton = {
  ...baseButton,
  backgroundColor: '#000000',
  color: '#ffffff',
}




