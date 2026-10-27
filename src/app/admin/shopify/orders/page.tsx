import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase/admin'
import ShopifyOrders from '@/components/shopify/ShopifyOrders'

export default async function ShopifyOrderPage() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) redirect('/admin')
  return <div className="max-w-5xl mx-auto">
    <Link href="/admin/orders" className="inline-block mb-6 text-sm font-semibold underline underline-offset-4">← Alle orderroutes</Link>
    <ShopifyOrders mode="admin" />
  </div>
}
