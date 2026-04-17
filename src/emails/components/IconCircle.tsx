import { Img, Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_SITE_URL } from '../tokens'

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

/**
 * MOSE brutalist icon tile — vierkant (geen rounded corners) in de MOSE
 * brand kleur als default. Behoudt de oude API voor backwards-compat.
 */
const colorMap: Record<string, string> = {
  success: EMAIL_COLORS.primary,
  processing: EMAIL_COLORS.primary,
  shipping: EMAIL_COLORS.warning,
  cancelled: EMAIL_COLORS.danger,
  cart: EMAIL_COLORS.warning,
  warning: EMAIL_COLORS.warning,
  danger: EMAIL_COLORS.danger,
  info: EMAIL_COLORS.primary,
  neutral: EMAIL_COLORS.ink,
}

const container = {
  width: '100%',
  margin: '0 auto 20px',
  textAlign: 'center' as const,
}

const iconCell = {
  color: EMAIL_COLORS.paper,
  padding: '0',
  lineHeight: '0',
}

export default function IconCircle({
  icon,
  color = 'success',
  size = 38,
}: IconCircleProps) {
  const bgColor = colorMap[color] || color
  const tileSize = size + 26
  const iconUrl = `${EMAIL_SITE_URL}/email-icons/icon-${icon}.png`

  return (
    <Section style={container}>
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ margin: '0 auto' }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              style={{
                ...iconCell,
                backgroundColor: bgColor,
                width: `${tileSize}px`,
                height: `${tileSize}px`,
                minWidth: `${tileSize}px`,
                minHeight: `${tileSize}px`,
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
                  border: 0,
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
