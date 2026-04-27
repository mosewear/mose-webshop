'use client'

import { useLocale } from 'next-intl'
import CampaignPopup from './CampaignPopup'
import { useActiveCampaignClient } from './useActiveCampaignClient'

export default function CampaignPopupWrapper() {
  const locale = useLocale()
  const data = useActiveCampaignClient(locale)

  if (!data || !data.active || !data.popup) return null

  return <CampaignPopup campaign={data} />
}
