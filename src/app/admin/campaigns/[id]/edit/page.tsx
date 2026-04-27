import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import CampaignForm from '@/components/admin/campaigns/CampaignForm'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import type { CampaignPromoCodeMeta, MarketingCampaign } from '@/lib/marketing-campaign'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCampaignPage({ params }: PageProps) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    notFound()
  }

  const { id } = await params
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select(
      `
        *,
        promo_code:promo_codes (id, code, discount_type, discount_value, is_active, expires_at)
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const campaign = data as MarketingCampaign & { promo_code: CampaignPromoCodeMeta | null }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar campagnes
        </Link>
        <h1 className="text-3xl font-display font-bold">{campaign.name}</h1>
        <p className="text-sm text-gray-600 mt-1 font-mono">{campaign.slug}</p>
      </div>

      <CampaignForm
        mode="edit"
        campaignId={campaign.id}
        initial={campaign}
      />
    </div>
  )
}
