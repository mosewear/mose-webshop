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
  const signal = AbortSignal.timeout(8000)

  try {
    const { data, error } = await supabase.rpc('get_active_marketing_campaign').abortSignal(signal)
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
        .select('id, code, discount_type, discount_value, is_active, expires_at, applies_to_sale_items')
        .eq('id', row.promo_code_id)
        .abortSignal(signal)
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

// LET OP: deze cache bepaalt feitelijk het ISR-venster van de HELE storefront.
// getActiveMarketingCampaign() wordt in [locale]/layout.tsx aangeroepen, en
// Next neemt de KORTSTE revalidate in een route. Met de vorige waarde van 30
// seconden stond elke pagina in prerender-manifest.json op 30, ook de
// homepage die 3600 declareert en de shop die 1800 declareert. Elke 30
// seconden werd dus elke pagina opnieuw op de origin gerenderd, inclusief
// alle Supabase-queries.
//
// 300 seconden is een afweging die de eigenaar heeft gemaakt: tien keer
// minder origin-renders, en een geplande campagne die op datum actief wordt
// kan tot vijf minuten later zichtbaar zijn. Handmatige wijzigingen in de
// admin blijven direct zichtbaar, want die invalideren ACTIVE_CAMPAIGN_TAG
// (zie src/app/api/admin/campaigns/**).
//
// Verhoog je dit verder, verifieer dan in .next/prerender-manifest.json wat
// de routes daadwerkelijk krijgen; de declaraties in de pagina's zelf zijn
// niet leidend.
export const CAMPAIGN_CACHE_REVALIDATE_SECONDS = 300

export const getActiveMarketingCampaign = unstable_cache(
  fetchActiveCampaignFromDb,
  ['marketing-campaign:active'],
  { revalidate: CAMPAIGN_CACHE_REVALIDATE_SECONDS, tags: [ACTIVE_CAMPAIGN_TAG] }
)
