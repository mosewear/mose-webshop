import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { readAllAdminRows } from '@/lib/admin-order-overview'
import {
  productionPresentation,
  productionSyncOverdue,
  type StoredProduction,
} from '@/lib/tapstitch-production'
export const runtime = 'nodejs'
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized)
    return NextResponse.json(
      { error: 'Geen toegang.' },
      { status: 403, headers },
    )
  try {
    const db = createServiceClient()
    const state = await db
      .from('tapstitch_sync_runtime')
      .select(
        'enabled,state,next_run_at,started_at,last_success_at,last_error,checked_orders,failed_orders,budget_usd_micros,spent_usd_micros,reserved_usd_micros',
      )
      .eq('id', 1)
      .single()
    if (state.error) throw new Error('UNAVAILABLE')
    const rows = await readAllAdminRows(
      'tapstitch_latest_production',
      'shopify_order_id,supplier_order_id,shopify_order_name,status,header_text,source_url,observed_at,run_id',
      'shopify_order_id',
    )
    const enabled =
      process.env.TAPSTITCH_CLOUD_ENABLED === 'true' && state.data.enabled
    return NextResponse.json(
      {
        overdue: productionSyncOverdue(state.data, enabled),
        configured:
          !!process.env.TINYFISH_API_KEY &&
          !!process.env.TINYFISH_TAPSTITCH_PROFILE_ID,
        enabled,
        state: state.data,
        orders: rows.map((r) => ({
          ...r,
          ...productionPresentation(r as StoredProduction),
        })),
      },
      { headers },
    )
  } catch {
    return NextResponse.json(
      { error: 'De productieverbinding kan nu niet worden gecontroleerd.' },
      { status: 503, headers },
    )
  }
}
