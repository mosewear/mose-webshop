import { Section, Img } from '@react-email/components'

type IconType = 
  | 'check-circle' 
  | 'check'
  | 'truck' 
  | 'settings' 
  | 'x' 
  | 'shopping-cart' 
  | 'package'
  | 'clock'
  | 'calendar'
  | 'mail'
  | 'phone'
  | 'alert-circle'

interface IconCircleProps {
  icon: IconType
  color?: string
  size?: number
}

const colorMap: Record<string, string> = {
  success: '#2ECC71',
  processing: '#667eea',
  shipping: '#FF9500',
  cancelled: '#e74c3c',
  cart: '#FF6B6B',
}

export default function IconCircle({ 
  icon, 
  color = 'success',
  size = 38 
}: IconCircleProps) {
  const bgColor = colorMap[color] || color
  const circleSize = size + 34
  
  // Use hosted PNG images from public folder (deployed to Vercel)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const iconUrl = `${siteUrl}/email-icons/icon-${icon}.png`

  return (
    <Section style={container}>
      <table cellPadding="0" cellSpacing="0" border={0} style={{ margin: '0 auto' }}>
        <tr>
          <td
            style={{
              ...iconCircle,
              backgroundColor: bgColor,
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              minWidth: `${circleSize}px`,
              minHeight: `${circleSize}px`,
              maxWidth: `${circleSize}px`,
              maxHeight: `${circleSize}px`,
              textAlign: 'center',
              verticalAlign: 'middle',
            }}
          >
            <Img
              src={iconUrl}
              width={size}
              height={size}
              alt={icon}
              style={{
                display: 'block',
                margin: '0 auto',
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
          </td>
        </tr>
      </table>
    </Section>
  )
}

const container = {
  width: '100%',
  margin: '0 auto 20px',
  textAlign: 'center' as const,
}

const iconCircle = {
  borderRadius: '50%',
  color: '#ffffff',
  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
  padding: '0',
  lineHeight: '0',
}

