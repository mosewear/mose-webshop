import { getCommercePromises } from '@/lib/settings-server'
import ShippingPageClient from './ShippingPageClient'

export const revalidate = 300
export default async function ShippingPage() {
  return <ShippingPageClient settings={await getCommercePromises()} />
}
