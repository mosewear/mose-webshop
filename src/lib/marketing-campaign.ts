import 'server-only'

import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/server'
import {
  ACTIVE_CAMPAIGN_TAG,
  type CampaignPromoCodeMeta,
  type MarketingCampaign,
  type ResolvedCampaign,
} from '@/lib/marketing-campaign-shared'

// Re-export the entire shared surface so existing server-side
// imports of `@/lib/marketing-campaign` keep working unchanged.
export * from '@/lib/marketing-campaign-shared'

async function fetchActiveCampaignFromDb(): Promise<ResolvedCampaign | null> {
  const supabase = createAnonClient()

  try {
    const { data, error } = await supabase.rpc('get_active_marketing_campaign')
    if (error) {
      console.error('[marketing-campaign] RPC error:', error)
      return null
    }

    const row = Array.isArray(data) ? data[0] : (data as MarketingCampaign | null)
    if (!row) return null

    let promoCode: CampaignPromoCodeMeta | null = null
    if (row.promo_code_id) {
      const { data: codeData } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, is_active, expires_at')
        .eq('id', row.promo_code_id)
        .maybeSingle()

      if (codeData) {
        const isExpired =
          codeData.expires_at != null &&
          new Date(codeData.expires_at).getTime() <= Date.now()
        promoCode = codeData.is_active && !isExpired
          ? (codeData as CampaignPromoCodeMeta)
          : null
      }
    }

    return { campaign: row as MarketingCampaign, promoCode }
  } catch (err) {
    console.error('[marketing-campaign] Unexpected error:', err)
    return null
  }
}

export const getActiveMarketingCampaign = unstable_cache(
  fetchActiveCampaignFromDb,
  ['marketing-campaign:active'],
  { revalidate: 30, tags: [ACTIVE_CAMPAIGN_TAG] }
)
