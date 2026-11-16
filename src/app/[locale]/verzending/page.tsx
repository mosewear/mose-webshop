import { getCommercePromises } from '@/lib/settings-server'
import ShippingPageClient from './ShippingPageClient'

export const revalidate = 300
export default async function ShippingPage() {
  const shipsToUnitedStates = process.env.MOSE_US_CHECKOUT_ENABLED === 'true'
    && process.env.MOSE_US_DDP_VERIFIED === 'true'
    && process.env.MOSE_US_SHIPPING_RATES_VERIFIED === 'true'
    && process.env.MOSE_US_PAYMENT_CURRENCY_VERIFIED === 'true'
  return <ShippingPageClient settings={await getCommercePromises()} shipsToUnitedStates={shipsToUnitedStates} />
}
