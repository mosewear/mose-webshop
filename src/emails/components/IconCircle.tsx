import { Section, Text } from '@react-email/components'

type IconType = 
  | 'check-circle' 
  | 'truck' 
  | 'settings' 
  | 'x' 
  | 'shopping-cart' 
  | 'package'
  | 'clock'

interface IconCircleProps {
  icon: IconType
  color?: string
  size?: number
}

const iconMap: Record<IconType, string> = {
  'check-circle': '✓',
  'truck': '🚚',
  'settings': '⚙️',
  'x': '✕',
  'shopping-cart': '🛒',
  'package': '📦',
  'clock': '⏰',
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
  const iconSymbol = iconMap[icon] || '✓'

  return (
    <Section style={container}>
      <div style={{
        ...iconCircle,
        backgroundColor: bgColor,
        width: `${size + 34}px`,
        height: `${size + 34}px`,
        lineHeight: `${size + 34}px`,
        fontSize: `${size}px`,
      }}>
        {iconSymbol}
      </div>
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
  textAlign: 'center' as const,
  margin: '0 auto',
  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
  display: 'inline-block',
}

