import type { CampaignWritablePayload } from '@/lib/marketing-campaign-validation'
import type { CampaignPromoCodeMeta } from '@/lib/marketing-campaign-shared'

export type CampaignFormState = CampaignWritablePayload

export interface CampaignWithPromo extends CampaignWritablePayload {
  id: string
  created_at: string
  updated_at: string
  created_by: string | null
  promo_code: CampaignPromoCodeMeta | null
}
