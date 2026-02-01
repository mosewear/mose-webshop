import { Section, Row, Column, Img, Text } from '@react-email/components'

interface ProductItemProps {
  name: string
  size?: string
  color?: string
  quantity: number
  price: number
  imageUrl?: string
  siteUrl?: string
  t: (key: string) => string
}

export default function ProductItem({
  name,
  size,
  color,
  quantity,
  price,
  imageUrl,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com',
  t,
}: ProductItemProps) {
  // Normalize image URL
  const normalizedImageUrl = imageUrl 
    ? (imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`)
    : ''

  return (
    <Section style={productRow}>
      <Row>
        <Column style={productImageColumn}>
          {normalizedImageUrl && (
            <Img 
              src={normalizedImageUrl} 
              width="60" 
              height="80" 
              alt={name}
              style={productImage}
            />
          )}
        </Column>
        <Column style={productInfo}>
          <Text style={productName}>{name}</Text>
          <Text style={productMeta}>
            {size && `${t('common.size')} ${size}`}
            {size && color && ' • '}
            {color && color}
            {(size || color) && ' • '}
            {quantity}x {t('common.pieces')}
          </Text>
        </Column>
        <Column style={productPrice}>
          €{(price * quantity).toFixed(2)}
        </Column>
      </Row>
    </Section>
  )
}

const productRow = {
  backgroundColor: '#f8f8f8',
  padding: '16px',
  borderLeft: '3px solid #2ECC71',
  marginBottom: '10px',
}

const productImageColumn = {
  width: '60px',
  verticalAlign: 'middle' as const,
}

const productImage = {
  width: '60px',
  height: '80px',
  objectFit: 'cover' as const,
  border: '1px solid #e0e0e0',
}

const productInfo = {
  verticalAlign: 'middle' as const,
  paddingLeft: '12px',
}

const productName = {
  fontSize: '14px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  margin: '0 0 5px 0',
  color: '#000',
}

const productMeta = {
  fontSize: '12px',
  color: '#666',
  margin: '0',
}

const productPrice = {
  fontSize: '17px',
  fontWeight: 900,
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
  paddingLeft: '12px',
  color: '#000',
}



