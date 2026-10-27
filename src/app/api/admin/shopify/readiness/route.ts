import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { summarizeReadiness, type IntegrationState } from '@/lib/shopify-readiness'
import { legacyPaymentDecision } from '@/lib/checkout-cutover'

export const dynamic = 'force-dynamic'
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403, headers })
  const environment = {
    storefront: Boolean(process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN),
    admin: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    session: (process.env.SHOPIFY_SESSION_SECRET?.length ?? 0) >= 32,
    webhook: Boolean(process.env.SHOPIFY_APP_CLIENT_SECRET),
    checkout: process.env.SHOPIFY_CHECKOUT_ENABLED === 'true',
    benefits: process.env.SHOPIFY_BENEFITS_VERIFIED === 'true',
    frontend: process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED === 'true',
    cutover: legacyPaymentDecision({ created_at: '1970-01-01T00:00:00Z', payment_status: 'pending', status: 'pending' }, true) === 'allow',
    sync: process.env.SHOPIFY_SYNC_ENABLED === 'true' && (process.env.CRON_SECRET?.length ?? 0) >= 24,
  }
  try {
    const db = createServiceClient()
    const [state, mappings, released, pending, failed, oldest] = await Promise.all([
      db.from('shopify_integration_state').select('app_installed,checkout_enabled,catalog_verified,inventory_verified,benefits_verified,fulfillment_verified,market_verified,last_worker_at,last_reconciled_at').eq('id', 1).maybeSingle(),
      db.from('shopify_variant_mappings').select('*', { count: 'exact', head: true }),
      db.from('shopify_variant_mappings').select('*', { count: 'exact', head: true }).eq('enabled', true),
      db.from('shopify_webhook_inbox').select('*', { count: 'exact', head: true }).is('processed_at', null).is('dead_letter_at', null),
      db.from('shopify_webhook_inbox').select('*', { count: 'exact', head: true }).not('dead_letter_at', 'is', null).is('processed_at', null),
      db.from('shopify_webhook_inbox').select('received_at').is('processed_at', null).is('dead_letter_at', null).order('received_at', { ascending: true }).limit(1).maybeSingle(),
    ])
    return NextResponse.json(summarizeReadiness(state.error ? null : state.data as IntegrationState | null, {
      mappings: mappings.error ? null : mappings.count,
      released: released.error ? null : released.count,
      pendingEvents: pending.error ? null : pending.count,
      failedEvents: failed.error ? null : failed.count,
    }, environment, new Date(), oldest.error ? null : oldest.data?.received_at ?? null), { headers })
  } catch {
    return NextResponse.json(summarizeReadiness(null, { mappings: null, released: null, pendingEvents: null, failedEvents: null }, environment), { headers })
  }
}
