import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

/**
 * Aggregates everything the Campagne AI overview needs to render its
 * setup checklist: env-var presence, credential rows, COGS coverage and
 * a quick health snapshot of decisions/actions tables.
 */
export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()

  const [
    metaCredsRes,
    economicsRes,
    productsRes,
    decisionsCountRes,
    actionsCountRes,
    lastDecisionRes,
  ] = await Promise.all([
    supabase.from('meta_credentials').select('id', { count: 'exact', head: true }).limit(1),
    supabase.from('ad_sku_economics').select('product_id'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'active'),
    supabase.from('ad_autopilot_decisions').select('id', { count: 'exact', head: true }),
    supabase.from('ad_autopilot_actions').select('id', { count: 'exact', head: true }),
    supabase
      .from('ad_autopilot_decisions')
      .select('run_started_at')
      .order('run_started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const hasMetaCredentials =
    (metaCredsRes.count ?? 0) > 0 ||
    Boolean(process.env.META_SYSTEM_USER_TOKEN && process.env.META_AD_ACCOUNT_ID && process.env.META_BUSINESS_ID)

  const economicsProductIds = new Set<string>(
    (economicsRes.data ?? []).map((r: { product_id: string }) => r.product_id)
  )
  const totalProductsCount = productsRes.count ?? 0
  const productsWithEconomicsCount = economicsProductIds.size
  const productsWithEconomicsPct =
    totalProductsCount > 0 ? (productsWithEconomicsCount / totalProductsCount) * 100 : 0

  return NextResponse.json({
    hasMetaCredentials,
    hasMetaPixelId: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    hasFacebookAccessToken: Boolean(process.env.FACEBOOK_ACCESS_TOKEN),
    productsWithEconomicsPct,
    totalProductsCount,
    productsWithEconomicsCount,
    decisionsLogged: decisionsCountRes.count ?? 0,
    actionsLogged: actionsCountRes.count ?? 0,
    lastDecisionAt: lastDecisionRes.data?.run_started_at ?? null,
  })
}
