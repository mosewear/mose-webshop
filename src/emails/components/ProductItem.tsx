import EmailItemRow from './EmailItemRow'
import { EMAIL_SITE_URL } from '../tokens'

interface ProductItemProps {
  name: string
  size?: string
  color?: string
  quantity: number
  price: number
  imageUrl?: string
  siteUrl?: string
  t: (key: string) => string
  /** Laatste item in de lijst? (geen divider onderaan) */
  last?: boolean
  /** Presale badge tonen? */
  isPresale?: boolean
}

/**
 * Backwards-compatible ProductItem die intern de nieuwe modulaire
 * <EmailItemRow /> gebruikt. Zo blijven oude call-sites werken
 * terwijl we meteen het nieuwe design krijgen.
 */
export default function ProductItem({
  name,
  size,
  color,
  quantity,
  price,
  imageUrl,
  siteUrl = EMAIL_SITE_URL,
  t,
  last = false,
  isPresale = false,
}: ProductItemProps) {
  const metaParts: string[] = []
  if (color) metaParts.push(color)
  if (size) metaParts.push(size)
  metaParts.push(`${quantity}×`)
  const meta = metaParts.join(' · ')

  const priceLabel = `€${(price * quantity).toFixed(2).replace('.', ',')}`

  return (
    <EmailItemRow
      name={name}
      meta={meta}
      price={priceLabel}
      imageUrl={imageUrl}
      siteUrl={siteUrl}
      last={last}
      badge={isPresale ? (t('common.presale') || 'PRESALE') : undefined}
    />
  )
}
