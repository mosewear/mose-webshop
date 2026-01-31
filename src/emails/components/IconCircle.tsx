import { Section, Text } from '@react-email/components'

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

// SVG path definitions for each icon (lucide-react style)
const iconSvgMap: Record<IconType, string> = {
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  'check': 'M20 6 9 17l-5-5',
  'truck': 'M16 3h5v13h-5zm-7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM1 5v11h8M8 7h8',
  'settings': 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  'x': 'M18 6 6 18M6 6l12 12',
  'shopping-cart': 'M9 2 7.2 7H21l-1.8 5H9m0 0L6 21m3-9-3 9m0 0H2m5.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm12 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  'package': 'M16.5 9.4 7.55 4.24M7.45 4.26 2 7.43v9.15l5.55 3.16m0 0L13 23l5.45-3.26m0 0L23 16.57V7.42l-5.55-3.17M7.55 4.26 13 7.42m0 0v9.16m0 0 5.55-3.16',
  'clock': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v10l4 4',
  'calendar': 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'mail': 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0 8 7 8-7',
  'phone': 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  'alert-circle': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4m0 4h.01',
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
  const iconPath = iconSvgMap[icon] || iconSvgMap['check']
  const circleSize = size + 34

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
              textAlign: 'center',
              verticalAlign: 'middle',
            }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ 
                display: 'block',
                margin: '0 auto',
              }}
            >
              <path d={iconPath} />
            </svg>
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

